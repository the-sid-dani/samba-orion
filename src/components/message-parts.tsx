"use client";

import { getToolName, ToolUIPart, UIMessage } from "ai";
import {
  Check,
  Copy,
  Loader,
  Pencil,
  ChevronDownIcon,
  ChevronUp,
  RefreshCw,
  X,
  Trash2,
  ChevronRight,
  TriangleAlert,
  HammerIcon,
  EllipsisIcon,
  BarChart3,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Button } from "ui/button";
import { Markdown } from "./markdown";
import { cn, safeJSONParse, truncateString } from "lib/utils";
import JsonView from "ui/json-view";
import { useMemo, useState, memo, useEffect, useRef, useCallback } from "react";
import { MessageEditor } from "./message-editor";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useCopy } from "@/hooks/use-copy";

import { AnimatePresence, motion } from "framer-motion";
import { SelectModel } from "./select-model";
import {
  deleteMessageAction,
  deleteMessagesByChatIdAfterTimestampAction,
} from "@/app/api/chat/actions";

import { toast } from "sonner";
import { safe } from "ts-safe";
import { ChatMetadata, ChatModel, ManualToolConfirmTag } from "app-types/chat";

import { useTranslations } from "next-intl";
import { extractMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { Separator } from "ui/separator";

import { TextShimmer } from "ui/text-shimmer";
import equal from "lib/equal";
import {
  VercelAIWorkflowToolStreamingResult,
  VercelAIWorkflowToolStreamingResultTag,
} from "app-types/workflow";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { DefaultToolName } from "lib/ai/tools";
import {
  Shortcut,
  getShortcutKeyList,
  isShortcutEvent,
} from "lib/keyboard-shortcuts";

import { WorkflowInvocation } from "./tool-invocation/workflow-invocation";
import dynamic from "next/dynamic";
import { notify } from "lib/notify";
import { ModelProviderIcon } from "ui/model-provider-icon";
import { appStore } from "@/app/store";
import { BACKGROUND_COLORS, EMOJI_DATA } from "lib/const";

type MessagePart = UIMessage["parts"][number];
type TextMessagePart = Extract<MessagePart, { type: "text" }>;
type AssistMessagePart = Extract<MessagePart, { type: "text" }>;

const TOOL_INPUT_FALLBACK = {
  notice: "Tool did not provide structured input.",
} as const;

const hasRenderableContent = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return false;
};

const extractInputCandidate = (result: unknown): unknown => {
  if (!result || typeof result !== "object") return null;
  const payload = result as Record<string, unknown>;
  const directKeys = [
    "input",
    "request",
    "arguments",
    "args",
    "parameters",
    "params",
  ] as const;

  for (const key of directKeys) {
    const candidate = payload[key];
    if (hasRenderableContent(candidate)) return candidate;
  }

  const payloadInput =
    payload.payload &&
    typeof payload.payload === "object" &&
    (payload.payload as Record<string, unknown>).input;
  if (hasRenderableContent(payloadInput)) {
    return payloadInput;
  }

  const structured = payload.structuredContent as
    | Record<string, unknown>
    | undefined;
  if (!structured) return null;

  const structuredKeys = ["request", "input", "args", "parameters"] as const;
  for (const key of structuredKeys) {
    const candidate = structured[key];
    if (hasRenderableContent(candidate)) return candidate;
  }

  const structuredResult = structured.result;
  if (Array.isArray(structuredResult)) {
    for (const entry of structuredResult) {
      if (!entry || typeof entry !== "object") continue;
      for (const key of [...directKeys, "payload"]) {
        const candidate = (entry as Record<string, unknown>)[key];
        if (hasRenderableContent(candidate)) {
          return candidate;
        }
        if (
          key === "payload" &&
          candidate &&
          typeof candidate === "object" &&
          hasRenderableContent((candidate as Record<string, unknown>).input)
        ) {
          return (candidate as Record<string, unknown>).input;
        }
      }
    }
  }

  return null;
};

const resolveToolInputForDisplay = (
  rawInput: unknown,
  toolResult: unknown,
): unknown => {
  if (hasRenderableContent(rawInput)) return rawInput;
  const fallback = extractInputCandidate(toolResult);
  if (hasRenderableContent(fallback)) return fallback;
  return null;
};

interface UserMessagePartProps {
  part: TextMessagePart;
  isLast: boolean;
  message: UIMessage;
  setMessages: UseChatHelpers<UIMessage>["setMessages"];
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  status: UseChatHelpers<UIMessage>["status"];
  isError?: boolean;
}

interface AssistMessagePartProps {
  part: AssistMessagePart;
  isLast: boolean;
  isLoading: boolean;
  message: UIMessage;
  prevMessage: UIMessage;
  showActions: boolean;
  threadId?: string;
  setMessages: UseChatHelpers<UIMessage>["setMessages"];
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  isError?: boolean;
}

interface ToolMessagePartProps {
  part: ToolUIPart;
  messageId: string;
  showActions: boolean;
  isLast?: boolean;
  isManualToolInvocation?: boolean;
  addToolResult?: UseChatHelpers<UIMessage>["addToolResult"];
  isError?: boolean;
  setMessages?: UseChatHelpers<UIMessage>["setMessages"];
}

const MAX_TEXT_LENGTH = 600;
export const UserMessagePart = memo(
  function UserMessagePart({
    part,
    isLast,
    status,
    message,
    setMessages,
    sendMessage,
    isError,
  }: UserMessagePartProps) {
    const { copied, copy } = useCopy();
    const t = useTranslations();
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [isDeleting, setIsDeleting] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const scrolledRef = useRef(false);

    const isLongText = part.text.length > MAX_TEXT_LENGTH;
    const displayText =
      expanded || !isLongText
        ? part.text
        : truncateString(part.text, MAX_TEXT_LENGTH);

    const deleteMessage = useCallback(async () => {
      const ok = await notify.confirm({
        title: "Delete Message",
        description: "Are you sure you want to delete this message?",
      });
      if (!ok) return;
      safe(() => setIsDeleting(true))
        .ifOk(() => deleteMessageAction(message.id))
        .ifOk(() =>
          setMessages((messages) => {
            const index = messages.findIndex((m) => m.id === message.id);
            if (index !== -1) {
              return messages.filter((_, i) => i !== index);
            }
            return messages;
          }),
        )
        .ifFail((error) => toast.error(error.message))
        .watch(() => setIsDeleting(false))
        .unwrap();
    }, [message.id]);

    useEffect(() => {
      if (status === "submitted" && isLast && !scrolledRef.current) {
        scrolledRef.current = true;
        ref.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [status]);

    if (mode === "edit") {
      return (
        <div className="flex flex-row gap-2 items-start w-full">
          <MessageEditor
            message={message}
            setMode={setMode}
            setMessages={setMessages}
            sendMessage={sendMessage}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 items-end my-2">
        <div
          data-testid="message-content"
          className={cn(
            "flex flex-col gap-4 max-w-full ring ring-input relative overflow-hidden",
            {
              "bg-accent text-accent-foreground px-4 py-3 rounded-2xl": isLast,
              "opacity-50": isError,
            },
            isError && "border-destructive border",
          )}
        >
          {isLongText && !expanded && (
            <div className="absolute pointer-events-none bg-gradient-to-t from-accent to-transparent w-full h-40 bottom-0 left-0" />
          )}
          <p className={cn("whitespace-pre-wrap text-sm break-words")}>
            {displayText}
          </p>
          {isLongText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-auto p-1 text-xs z-10 text-muted-foreground hover:text-foreground self-start"
            >
              <span className="flex items-center gap-1">
                {t(expanded ? "Common.showLess" : "Common.showMore")}
                {expanded ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDownIcon className="size-3" />
                )}
              </span>
            </Button>
          )}
        </div>
        {isLast && (
          <div className="flex w-full justify-end opacity-0 group-hover/message:opacity-100 transition-opacity duration-300">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="message-edit-button"
                  variant="ghost"
                  size="icon"
                  className={cn("size-3! p-4!")}
                  onClick={() => copy(part.text)}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="message-edit-button"
                  variant="ghost"
                  size="icon"
                  className="size-3! p-4!"
                  onClick={() => setMode("edit")}
                >
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={isDeleting}
                  onClick={deleteMessage}
                  variant="ghost"
                  size="icon"
                  className="size-3! p-4! hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-destructive" side="bottom">
                Delete Message
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        <div ref={ref} className="min-w-0" />
      </div>
    );
  },
  (prev, next) => {
    if (prev.part.text != next.part.text) return false;
    if (prev.isError != next.isError) return false;
    if (prev.isLast != next.isLast) return false;
    if (prev.status != next.status) return false;
    if (prev.message.id != next.message.id) return false;
    if (!equal(prev.part, next.part)) return false;
    return true;
  },
);
UserMessagePart.displayName = "UserMessagePart";

export const AssistMessagePart = memo(function AssistMessagePart({
  part,
  showActions,
  message,
  prevMessage,
  isError,
  threadId,
  setMessages,
  sendMessage,
}: AssistMessagePartProps) {
  const { copied, copy } = useCopy();
  const [isLoading, setIsLoading] = useState(false);
  const agentList = appStore((state) => state.agentList);
  const [isDeleting, setIsDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const metadata = message.metadata as ChatMetadata | undefined;

  const agent = useMemo(() => {
    return agentList.find((a) => a.id === metadata?.agentId);
  }, [metadata, agentList]);

  const deleteMessage = useCallback(async () => {
    const ok = await notify.confirm({
      title: "Delete Message",
      description: "Are you sure you want to delete this message?",
    });
    if (!ok) return;
    safe(() => setIsDeleting(true))
      .ifOk(() => deleteMessageAction(message.id))
      .ifOk(() =>
        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === message.id);
          if (index !== -1) {
            return messages.filter((_, i) => i !== index);
          }
          return messages;
        }),
      )
      .ifFail((error) => toast.error(error.message))
      .watch(() => setIsDeleting(false))
      .unwrap();
  }, [message.id]);

  const handleModelChange = (model: ChatModel) => {
    safe(() => setIsLoading(true))
      .ifOk(() =>
        threadId
          ? deleteMessagesByChatIdAfterTimestampAction(message.id)
          : Promise.resolve(),
      )
      .ifOk(() =>
        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === prevMessage.id);
          if (index !== -1) {
            return [...messages.slice(0, index)];
          }
          return messages;
        }),
      )
      .ifOk(() =>
        sendMessage(prevMessage, {
          body: {
            model,
          },
        }),
      )
      .ifFail((error) => toast.error(error.message))
      .watch(() => setIsLoading(false))
      .unwrap();
  };

  return (
    <div
      className={cn(
        isLoading && "animate-pulse",
        "flex flex-col gap-2 group/message",
      )}
    >
      <div
        data-testid="message-content"
        className={cn("flex flex-col gap-4 px-2", {
          "opacity-50 border border-destructive bg-card rounded-lg": isError,
        })}
      >
        <Markdown>{part.text}</Markdown>
      </div>
      {showActions && (
        <div className="flex w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="message-edit-button"
                variant="ghost"
                size="icon"
                className="size-3! p-4!"
                onClick={() => copy(part.text)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SelectModel onSelect={handleModelChange}>
                  <Button
                    data-testid="message-edit-button data-[state=open]:bg-secondary!"
                    variant="ghost"
                    size="icon"
                    className="size-3! p-4!"
                  >
                    {<RefreshCw />}
                  </Button>
                </SelectModel>
              </div>
            </TooltipTrigger>
            <TooltipContent>Change Model</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                onClick={deleteMessage}
                className="size-3! p-4! hover:text-destructive"
              >
                {isDeleting ? <Loader className="animate-spin" /> : <Trash2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-destructive">
              Delete Message
            </TooltipContent>
          </Tooltip>
          {metadata && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-3! p-4! opacity-0 group-hover/message:opacity-100 transition-opacity duration-300"
                >
                  <EllipsisIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="p-4 w-72 bg-card border shadow-lg">
                <div className="space-y-4">
                  {agent && (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          Agent
                        </h4>
                        <div className="flex gap-3 items-center">
                          <div
                            className="p-1.5 rounded-full ring-2 ring-border/50 bg-background shadow-sm"
                            style={{
                              backgroundColor:
                                agent.icon?.style?.backgroundColor ||
                                BACKGROUND_COLORS[0],
                            }}
                          >
                            <Avatar className="size-3">
                              <AvatarImage
                                src={agent.icon?.value || EMOJI_DATA[0]}
                              />
                              <AvatarFallback className="bg-transparent text-xs">
                                {agent.name[0]}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <span className="font-medium text-sm">
                            {agent.name}
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-border/50" />
                    </>
                  )}

                  {metadata.chatModel && (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          Model
                        </h4>
                        <div className="flex gap-3 items-center">
                          <ModelProviderIcon
                            provider={metadata.chatModel.provider}
                            className="size-5 flex-shrink-0"
                          />
                          <div className="space-y-0.5 flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {metadata.chatModel.provider}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {metadata.chatModel.model}
                              {metadata.toolCount !== undefined &&
                                metadata.toolCount > 0 && (
                                  <span className="ml-2">
                                    • {metadata.toolCount} tools
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-border/50" />
                    </>
                  )}

                  {metadata.usage && (
                    <>
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          Token Usage
                          <span className="text-xs text-muted-foreground font-normal">
                            {
                              message.parts.filter(
                                (v) => v.type != "step-start",
                              ).length
                            }{" "}
                            Steps
                          </span>
                        </h4>
                        <p className="px-2 mb-2 text-xs text-muted-foreground">
                          High input token usage may occur when many tools are
                          available.
                        </p>
                        <div className="space-y-2">
                          {metadata.usage.inputTokens !== undefined && (
                            <div className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30">
                              <span className="text-xs text-muted-foreground">
                                Input
                              </span>
                              <span className="text-xs font-mono font-medium">
                                {metadata.usage.inputTokens.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {metadata.usage.outputTokens !== undefined && (
                            <div className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30">
                              <span className="text-xs text-muted-foreground">
                                Output
                              </span>
                              <span className="text-xs font-mono font-medium">
                                {metadata.usage.outputTokens.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {metadata.usage.totalTokens !== undefined && (
                            <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-primary/10 border border-primary/20">
                              <span className="text-xs font-medium text-primary">
                                Total
                              </span>
                              <span className="text-xs font-mono font-bold text-primary">
                                {metadata.usage.totalTokens.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      <div ref={ref} className="min-w-0" />
    </div>
  );
});
AssistMessagePart.displayName = "AssistMessagePart";
const variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  expanded: {
    height: "auto",
    opacity: 1,
    marginTop: "1rem",
    marginBottom: "0.5rem",
  },
};
export const ReasoningPart = memo(function ReasoningPart({
  reasoningText,
  isThinking,
}: {
  reasoningText: string;
  isThinking?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isThinking);

  useEffect(() => {
    if (!isThinking && isExpanded) {
      setIsExpanded(false);
    }
  }, [isThinking]);

  return (
    <div
      className="flex flex-col cursor-pointer"
      onClick={() => {
        setIsExpanded(!isExpanded);
      }}
    >
      <div className="flex flex-row gap-2 items-center text-ring hover:text-primary transition-colors">
        {isThinking ? (
          <TextShimmer>Reasoned for a few seconds</TextShimmer>
        ) : (
          <div className="font-medium">Reasoned for a few seconds</div>
        )}

        <button
          data-testid="message-reasoning-toggle"
          type="button"
          className="cursor-pointer"
        >
          <ChevronDownIcon size={16} />
        </button>
      </div>

      <div className="pl-4">
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              data-testid="message-reasoning"
              key="content"
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={variants}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
              className="pl-6 text-muted-foreground border-l flex flex-col gap-4"
            >
              <Markdown>
                {reasoningText || (isThinking ? "" : "Hmm, let's see...🤔")}
              </Markdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
ReasoningPart.displayName = "ReasoningPart";

const loading = memo(function Loading() {
  return (
    <div className="px-6 py-4">
      <div className="h-44 w-full rounded-md opacity-0" />
    </div>
  );
});

// Interactive table dynamic import - kept for future use
// const InteractiveTable = dynamic(
//   () =>
//     import("./tool-invocation/interactive-table").then(
//       (mod) => mod.InteractiveTable,
//     ),
//   {
//     ssr: false,
//     loading,
//   },
// );

const WebSearchToolInvocation = dynamic(
  () =>
    import("./tool-invocation/web-search").then(
      (mod) => mod.WebSearchToolInvocation,
    ),
  {
    ssr: false,
    loading,
  },
);

const CodeExecutor = dynamic(
  () =>
    import("./tool-invocation/code-executor").then((mod) => mod.CodeExecutor),
  {
    ssr: false,
    loading,
  },
);

// Local shortcuts for tool invocation approval/rejection
const approveToolInvocationShortcut: Shortcut = {
  description: "approveToolInvocation",
  shortcut: {
    key: "Enter",
    command: true,
  },
};

const rejectToolInvocationShortcut: Shortcut = {
  description: "rejectToolInvocation",
  shortcut: {
    key: "Escape",
    command: true,
  },
};

export const ToolMessagePart = memo(
  ({
    part,
    isLast,
    showActions,
    addToolResult,

    isError,
    messageId,
    setMessages,
    isManualToolInvocation,
  }: ToolMessagePartProps) => {
    const t = useTranslations("");

    const { output, toolCallId, state, input, errorText } = part;

    const toolName = useMemo(() => getToolName(part), [part.type]);

    const isCompleted = useMemo(() => {
      return state.startsWith("output");
    }, [state]);

    const [expanded, setExpanded] = useState(false);
    const { copied: copiedInput, copy: copyInput } = useCopy();
    const { copied: copiedOutput, copy: copyOutput } = useCopy();
    const [isDeleting, setIsDeleting] = useState(false);

    // Artifact creation is now handled in ChatBot component

    // Handle keyboard shortcuts for approve/reject actions
    useEffect(() => {
      // Only enable shortcuts when manual tool invocation buttons are shown
      if (!isManualToolInvocation) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        const isApprove = isShortcutEvent(e, approveToolInvocationShortcut);
        const isReject = isShortcutEvent(e, rejectToolInvocationShortcut);

        if (!isApprove && !isReject) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (isApprove) {
          addToolResult?.({
            tool: toolName,
            toolCallId,
            output: ManualToolConfirmTag.create({ confirm: true }),
          });
        }

        if (isReject) {
          addToolResult?.({
            tool: toolName,
            toolCallId,
            output: ManualToolConfirmTag.create({ confirm: false }),
          });
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isManualToolInvocation, isLast]);

    const deleteMessage = useCallback(async () => {
      const ok = await notify.confirm({
        title: "Delete Message",
        description: "Are you sure you want to delete this message?",
      });
      if (!ok) return;
      safe(() => setIsDeleting(true))
        .ifOk(() => deleteMessageAction(messageId))
        .ifOk(() =>
          setMessages?.((messages) => {
            const index = messages.findIndex((m) => m.id === messageId);
            if (index !== -1) {
              return messages.filter((_, i) => i !== index);
            }
            return messages;
          }),
        )
        .ifFail((error) => toast.error(error.message))
        .watch(() => setIsDeleting(false))
        .unwrap();
    }, [messageId]);

    const onToolCallDirect = useCallback(
      (result: any) => {
        addToolResult?.({
          tool: toolName,
          toolCallId,
          output: result,
        });
      },
      [addToolResult, toolCallId],
    );

    const result = useMemo(() => {
      if (state == "output-error") {
        return errorText;
      }
      if (isCompleted) {
        return Array.isArray(output)
          ? {
              ...output,
              content: output.map((node) => {
                // mcp tools
                if (node?.type === "text" && typeof node?.text === "string") {
                  const parsed = safeJSONParse(node.text);
                  return {
                    ...node,
                    text: parsed.success ? parsed.value : node.text,
                  };
                }
                return node;
              }),
            }
          : output;
      }
      return null;
    }, [isCompleted, output, state, errorText]);

    const requestPreview = useMemo(() => {
      const resolved = resolveToolInputForDisplay(input, result);
      return resolved ?? TOOL_INPUT_FALLBACK;
    }, [input, result]);

    const isWorkflowTool = useMemo(
      () => VercelAIWorkflowToolStreamingResultTag.isMaybe(result),
      [result],
    );

    const CustomToolComponent = useMemo(() => {
      if (
        toolName === DefaultToolName.WebSearch ||
        toolName === DefaultToolName.WebContent
      ) {
        return <WebSearchToolInvocation part={part} />;
      }

      if (toolName === DefaultToolName.JavascriptExecution) {
        return (
          <CodeExecutor
            part={part}
            key={part.toolCallId}
            onResult={onToolCallDirect}
            type="javascript"
          />
        );
      }

      if (toolName === DefaultToolName.PythonExecution) {
        return (
          <CodeExecutor
            part={part}
            key={part.toolCallId}
            onResult={onToolCallDirect}
            type="python"
          />
        );
      }

      // Tables now render ONLY in Canvas (removed inline rendering)
      // All chart and table artifacts go to Canvas workspace
      return null;
    }, [toolName, state, onToolCallDirect, result, input]);

    const { serverName: mcpServerName, toolName: mcpToolName } = useMemo(() => {
      return extractMCPToolId(toolName);
    }, [toolName]);

    const isExpanded = useMemo(() => {
      return expanded || result === null || isWorkflowTool;
    }, [expanded, result, isWorkflowTool]);

    const isExecuting = useMemo(() => {
      if (isWorkflowTool)
        return (
          (result as VercelAIWorkflowToolStreamingResult)?.status == "running"
        );
      return !isCompleted && isLast;
    }, [isWorkflowTool, isCompleted, result, isLast]);

    return (
      <div className="group w-full">
        {CustomToolComponent ? (
          CustomToolComponent
        ) : (
          <div className="flex flex-col fade-in duration-300 animate-in">
            <div
              className="flex gap-2 items-center cursor-pointer group/title"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="p-1.5 text-primary bg-input/40 rounded">
                {isExecuting ? (
                  <Loader className="size-3.5 animate-spin" />
                ) : isError ? (
                  <TriangleAlert className="size-3.5 text-destructive" />
                ) : isWorkflowTool ? (
                  <Avatar className="size-3.5">
                    <AvatarImage
                      src={
                        (result as VercelAIWorkflowToolStreamingResult)
                          .workflowIcon?.value
                      }
                    />
                    <AvatarFallback>
                      {toolName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <HammerIcon className="size-3.5" />
                )}
              </div>
              <span className="font-bold flex items-center gap-2">
                {isExecuting ? (
                  <TextShimmer>{mcpServerName}</TextShimmer>
                ) : (
                  mcpServerName
                )}
              </span>
              {mcpToolName && (
                <>
                  <ChevronRight className="size-3.5" />
                  <span className="text-muted-foreground group-hover/title:text-primary transition-colors duration-300">
                    {mcpToolName}
                  </span>
                </>
              )}
              <div className="ml-auto group-hover/title:bg-input p-1.5 rounded transition-colors duration-300">
                <ChevronDownIcon
                  className={cn(isExpanded && "rotate-180", "size-3.5")}
                />
              </div>
            </div>
            <div className="flex gap-2 py-2">
              <div className="w-7 flex justify-center">
                <Separator
                  orientation="vertical"
                  className="h-full bg-gradient-to-t from-transparent to-border to-5%"
                />
              </div>
              <div className="w-full flex flex-col gap-2">
                <div
                  className={cn(
                    "min-w-0 w-full p-4 rounded-lg bg-card px-4 border text-xs transition-colors fade-300",
                    !isExpanded && "hover:bg-secondary cursor-pointer",
                  )}
                  onClick={() => {
                    if (!isExpanded) {
                      setExpanded(true);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <h5 className="text-muted-foreground font-medium select-none transition-colors">
                      Request
                    </h5>
                    <div className="flex-1" />
                    {copiedInput ? (
                      <Check className="size-3" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-3 text-muted-foreground"
                        onClick={() =>
                          copyInput(
                            JSON.stringify(requestPreview, null, 2) ?? "",
                          )
                        }
                      >
                        <Copy className="size-3" />
                      </Button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="p-2 max-h-[300px] overflow-y-auto ">
                      <JsonView data={requestPreview} />
                    </div>
                  )}
                </div>
                {!result ? null : isWorkflowTool ? (
                  <WorkflowInvocation
                    result={result as VercelAIWorkflowToolStreamingResult}
                  />
                ) : (
                  <div
                    className={cn(
                      "min-w-0 w-full p-4 rounded-lg bg-card px-4 border text-xs mt-2 transition-colors fade-300",
                      !isExpanded && "hover:bg-secondary cursor-pointer",
                    )}
                    onClick={() => {
                      if (!isExpanded) {
                        setExpanded(true);
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <h5 className="text-muted-foreground font-medium select-none">
                        Response
                      </h5>
                      <div className="flex-1" />

                      {/* Canvas button for chart/dashboard tools - outside the collapsed area */}
                      {(() => {
                        const chartToolNames = [
                          "create_chart",
                          "create_dashboard",
                          // Main chart artifact tools
                          "create_area_chart",
                          "create_scatter_chart",
                          "create_radar_chart",
                          "create_funnel_chart",
                          "create_treemap_chart",
                          "create_sankey_chart",
                          "create_radial_bar_chart",
                          "create_composed_chart",
                          "create_geographic_chart",
                          "create_gauge_chart",
                          "create_calendar_heatmap",
                          // Basic artifact tools (from artifacts/index.ts)
                          "create_bar_chart",
                          "create_line_chart",
                          "create_pie_chart",
                          // Special artifact tools
                          "create_ban_chart",
                          "createTable", // FIXED: Use camelCase to match enum
                        ];

                        const isChartTool = chartToolNames.includes(toolName);
                        const isSuccessful =
                          (result as any)?.status === "success" ||
                          (result as any)?.success === true ||
                          // New format: check structuredContent.result[0].success and isError
                          ((result as any)?.structuredContent?.result?.[0]
                            ?.success === true &&
                            (result as any)?.isError === false);

                        return isChartTool && isSuccessful;
                      })() && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs mr-2"
                          onClick={() => {
                            try {
                              console.log(
                                "🎯 Message Debug: Open Canvas button clicked",
                                {
                                  toolName,
                                  resultStatus: (result as any)?.status,
                                  resultId: (result as any)?.chartId,
                                  timestamp: new Date().toISOString(),
                                },
                              );
                              console.log(
                                "🔍 Message Debug: Tool result data:",
                                result,
                              );

                              // Enhanced event dispatch with error handling and timeout
                              const canvasEvent = new CustomEvent(
                                "canvas:show",
                                {
                                  detail: {
                                    source: "open-canvas-button",
                                    toolName,
                                    resultId: (result as any)?.chartId,
                                    timestamp: Date.now(),
                                  },
                                },
                              );

                              console.log(
                                "📡 Message Debug: Dispatching canvas:show event with details:",
                                canvasEvent.detail,
                              );

                              // Dispatch event with retry mechanism
                              let eventDispatched = false;
                              try {
                                eventDispatched =
                                  window.dispatchEvent(canvasEvent);
                                console.log(
                                  "✅ Message Debug: Canvas show event dispatched",
                                  { success: eventDispatched },
                                );
                              } catch (dispatchError) {
                                console.error(
                                  "🚨 Message Debug: Error dispatching canvas event:",
                                  dispatchError,
                                );
                                // Fallback: try again after small delay
                                setTimeout(() => {
                                  try {
                                    window.dispatchEvent(canvasEvent);
                                    console.log(
                                      "🔄 Message Debug: Canvas show event retry successful",
                                    );
                                  } catch (retryError) {
                                    console.error(
                                      "🚨 Message Debug: Canvas event retry failed:",
                                      retryError,
                                    );
                                  }
                                }, 100);
                              }

                              // Additional safety check - verify the canvas should be able to show
                              if (!eventDispatched) {
                                console.warn(
                                  "⚠️ Message Debug: Canvas event was not dispatched properly - Canvas may not open",
                                );
                              }
                            } catch (error) {
                              console.error(
                                "🚨 Message Debug: Critical error in Open Canvas button:",
                                error,
                              );
                            }
                          }}
                        >
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Open Canvas
                        </Button>
                      )}

                      {copiedOutput ? (
                        <Check className="size-3" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-3 text-muted-foreground"
                          onClick={() => copyOutput(JSON.stringify(result))}
                        >
                          <Copy className="size-3" />
                        </Button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                        {(() => {
                          const chartToolNames = [
                            "create_chart",
                            "create_dashboard",
                            "create_area_chart",
                            "create_scatter_chart",
                            "create_radar_chart",
                            "create_funnel_chart",
                            "create_treemap_chart",
                            "create_sankey_chart",
                            "create_radial_bar_chart",
                            "create_composed_chart",
                            "create_geographic_chart",
                            "create_gauge_chart",
                            "create_calendar_heatmap",
                            "create_bar_chart",
                            "create_line_chart",
                            "create_pie_chart",
                            "create_ban_chart",
                            "createTable", // FIXED: Use camelCase to match enum
                          ];

                          const isChartTool = chartToolNames.includes(toolName);
                          const isSuccessful =
                            (result as any)?.success === true ||
                            (result as any)?.status === "success";

                          return isChartTool && isSuccessful;
                        })() ? (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                              <BarChart3 className="w-4 h-4" />
                              <span className="font-medium">
                                {toolName === "create_dashboard"
                                  ? "Dashboard"
                                  : "Chart"}{" "}
                                Created in Canvas
                              </span>
                            </div>
                            <div className="text-xs space-y-1">
                              {(result as any).chartType && (
                                <div>
                                  <strong>Type:</strong>{" "}
                                  {(result as any).chartType}
                                </div>
                              )}
                              {(result as any).chartCount && (
                                <div>
                                  <strong>Charts:</strong>{" "}
                                  {(result as any).chartCount}
                                </div>
                              )}
                              {(result as any).metricCount && (
                                <div>
                                  <strong>Metrics:</strong>{" "}
                                  {(result as any).metricCount}
                                </div>
                              )}
                              {((result as any).dataPoints ||
                                (result as any).totalDataPoints) && (
                                <div>
                                  <strong>Data Points:</strong>{" "}
                                  {(result as any).totalDataPoints ||
                                    (result as any).dataPoints}
                                </div>
                              )}
                              {(result as any).series && (
                                <div>
                                  <strong>Series:</strong>{" "}
                                  {(result as any).series?.join(", ")}
                                </div>
                              )}
                              {(result as any).chartTypes && (
                                <div>
                                  <strong>Chart Types:</strong>{" "}
                                  {(result as any).chartTypes?.join(", ")}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {toolName === "create_dashboard"
                                ? "Dashboard"
                                : "Chart"}{" "}
                              created successfully. Use the &ldquo;Open
                              Canvas&rdquo; button above to view the interactive
                              visualization.
                            </div>
                          </div>
                        ) : (
                          <JsonView data={result} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {isManualToolInvocation && (
                  <div className="flex flex-row gap-2 items-center mt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full text-xs hover:ring py-2"
                      onClick={() =>
                        addToolResult?.({
                          tool: toolName,
                          toolCallId,
                          output: ManualToolConfirmTag.create({
                            confirm: true,
                          }),
                        })
                      }
                    >
                      <Check />
                      {t("Common.approve")}
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-muted-foreground">
                        {getShortcutKeyList(approveToolInvocationShortcut).join(
                          " ",
                        )}
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs py-2"
                      onClick={() =>
                        addToolResult?.({
                          tool: toolName,
                          toolCallId,
                          output: ManualToolConfirmTag.create({
                            confirm: false,
                          }),
                        })
                      }
                    >
                      <X />
                      {t("Common.reject")}
                      <Separator orientation="vertical" />
                      <span className="text-muted-foreground">
                        {getShortcutKeyList(rejectToolInvocationShortcut).join(
                          " ",
                        )}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {showActions && (
              <div className="flex flex-row gap-2 items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={isDeleting}
                      onClick={deleteMessage}
                      variant="ghost"
                      size="icon"
                      className="size-3! p-4! opacity-0 group-hover/message:opacity-100 hover:text-destructive"
                    >
                      {isDeleting ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-destructive" side="bottom">
                    Delete Message
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.isError !== next.isError) return false;
    if (prev.isLast !== next.isLast) return false;
    if (prev.showActions !== next.showActions) return false;
    if (prev.isManualToolInvocation !== next.isManualToolInvocation)
      return false;
    if (prev.messageId !== next.messageId) return false;
    if (!equal(prev.part, next.part)) return false;
    return true;
  },
);

ToolMessagePart.displayName = "ToolMessagePart";
