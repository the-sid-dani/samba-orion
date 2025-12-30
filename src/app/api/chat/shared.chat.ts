import "server-only";
import {
  LoadAPIKeyError,
  UIMessage,
  Tool,
  jsonSchema,
  tool as createTool,
  isToolUIPart,
  UIMessagePart,
  ToolUIPart,
  getToolName,
  UIMessageStreamWriter,
  NoSuchToolError,
} from "ai";
import {
  ChatMention,
  ChatMetadata,
  ManualToolConfirmTag,
} from "app-types/chat";
import { errorToString, exclude, generateUUID, objectFlow } from "lib/utils";
import logger from "logger";
import {
  AllowedMCPServer,
  McpServerCustomizationsPrompt,
  VercelAIMcpTool,
  VercelAIMcpToolTag,
} from "app-types/mcp";
import { MANUAL_REJECT_RESPONSE_PROMPT } from "lib/ai/prompts";

import { ObjectJsonSchema7 } from "app-types/util";
import { safe } from "ts-safe";
import { workflowRepository } from "lib/db/repository";

import {
  VercelAIWorkflowTool,
  VercelAIWorkflowToolStreaming,
  VercelAIWorkflowToolStreamingResultTag,
  VercelAIWorkflowToolTag,
} from "app-types/workflow";
import { createWorkflowExecutor } from "lib/ai/workflow/executor/workflow-executor";
import { NodeKind } from "lib/ai/workflow/workflow.interface";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { APP_DEFAULT_TOOL_KIT } from "lib/ai/tools/tool-kit";
import { AppDefaultToolkit, DefaultToolName } from "lib/ai/tools";

export function filterMCPToolsByMentions(
  tools: Record<string, VercelAIMcpTool>,
  mentions: ChatMention[],
) {
  if (mentions.length === 0) {
    return tools;
  }
  const toolMentions = mentions.filter(
    (mention) => mention.type == "mcpTool" || mention.type == "mcpServer",
  );

  const metionsByServer = toolMentions.reduce(
    (acc, mention) => {
      if (mention.type == "mcpServer") {
        return {
          ...acc,
          [mention.serverId]: Object.values(tools).map(
            (tool) => tool._originToolName,
          ),
        };
      }
      return {
        ...acc,
        [mention.serverId]: [...(acc[mention.serverId] ?? []), mention.name],
      };
    },
    {} as Record<string, string[]>,
  );

  return objectFlow(tools).filter((_tool) => {
    if (!metionsByServer[_tool._mcpServerId]) return false;
    return metionsByServer[_tool._mcpServerId].includes(_tool._originToolName);
  });
}

export function filterMCPToolsByAllowedMCPServers(
  tools: Record<string, VercelAIMcpTool>,
  allowedMcpServers?: Record<string, AllowedMCPServer>,
): Record<string, VercelAIMcpTool> {
  // No restrictions specified = allow all available tools
  if (!allowedMcpServers || Object.keys(allowedMcpServers).length === 0) {
    return tools;
  }
  return objectFlow(tools).filter((_tool) => {
    if (!allowedMcpServers[_tool._mcpServerId]?.tools) return false;
    return allowedMcpServers[_tool._mcpServerId].tools.includes(
      _tool._originToolName,
    );
  });
}

export function excludeToolExecution(
  tool: Record<string, Tool>,
): Record<string, Tool> {
  return objectFlow(tool).map((value) => {
    return createTool({
      inputSchema: value.inputSchema,
      description: value.description,
    });
  });
}

export function mergeSystemPrompt(
  ...prompts: (string | undefined | false)[]
): string {
  const filteredPrompts = prompts
    .map((prompt) => (prompt ? prompt.trim() : ""))
    .filter(Boolean);
  return filteredPrompts.join("\n\n");
}

export function manualToolExecuteByLastMessage(
  part: ToolUIPart,
  tools: Record<string, VercelAIMcpTool | VercelAIWorkflowTool | Tool>,
  abortSignal?: AbortSignal,
) {
  const { input } = part;

  const toolName = getToolName(part);

  const tool = tools[toolName];
  return safe(() => {
    if (!tool) throw new Error(`tool not found: ${toolName}`);
    if (!ManualToolConfirmTag.isMaybe(part.output))
      throw new Error("manual tool confirm not found");
    return part.output;
  })
    .map(({ confirm }) => {
      if (!confirm) return MANUAL_REJECT_RESPONSE_PROMPT;
      if (VercelAIWorkflowToolTag.isMaybe(tool)) {
        return tool.execute!(input, {
          toolCallId: part.toolCallId,
          abortSignal: abortSignal ?? new AbortController().signal,
          messages: [],
        });
      } else if (VercelAIMcpToolTag.isMaybe(tool)) {
        return mcpClientsManager.toolCall(
          tool._mcpServerId,
          tool._originToolName,
          input,
        );
      }
      return tool.execute!(input, {
        toolCallId: part.toolCallId,
        abortSignal: abortSignal ?? new AbortController().signal,
        messages: [],
      });
    })
    .ifFail((error) => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error),
    }))
    .unwrap();
}

export function handleError(error: any) {
  // Enhanced error handling for Vercel AI SDK 5.0
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message;
  }

  // Handle specific AI SDK 5.0 tool errors
  if (NoSuchToolError.isInstance(error)) {
    logger.error("🚨 NoSuchToolError in route:", {
      toolName: error.toolName,
      message: error.message,
      suggestion: "Tool not found in registry - check APP_DEFAULT_TOOL_KIT",
    });
    return `Tool not found: ${error.toolName}. Please check if the tool is properly registered.`;
  }

  if (
    error instanceof Error &&
    error.message.includes("tool") &&
    error.message.includes("argument")
  ) {
    // Handle tool argument errors generically (AI SDK version compatibility)
    logger.error("🚨 Tool Arguments Error in route:", {
      message: error.message,
      stack: error.stack,
      suggestion: "Tool arguments don't match expected schema",
    });
    return `Invalid tool arguments: ${error.message}`;
  }

  // General error handling
  logger.error("🚨 Route Error:", {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  logger.error(error);
  logger.error(`Route Error: ${error.name}`);
  return errorToString(error.message);
}

export function extractInProgressToolPart(message: UIMessage): ToolUIPart[] {
  if (message.role != "assistant") return [];
  if ((message.metadata as ChatMetadata)?.toolChoice != "manual") return [];
  return message.parts.filter(
    (part) =>
      isToolUIPart(part) &&
      part.state == "output-available" &&
      ManualToolConfirmTag.isMaybe(part.output),
  ) as ToolUIPart[];
}

export function filterMcpServerCustomizations(
  tools: Record<string, VercelAIMcpTool>,
  mcpServerCustomization: Record<string, McpServerCustomizationsPrompt>,
): Record<string, McpServerCustomizationsPrompt> {
  const toolNamesByServerId = Object.values(tools).reduce(
    (acc, tool) => {
      if (!acc[tool._mcpServerId]) acc[tool._mcpServerId] = [];
      acc[tool._mcpServerId].push(tool._originToolName);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return Object.entries(mcpServerCustomization).reduce(
    (acc, [serverId, mcpServerCustomization]) => {
      if (!(serverId in toolNamesByServerId)) return acc;

      if (
        !mcpServerCustomization.prompt &&
        !Object.keys(mcpServerCustomization.tools ?? {}).length
      )
        return acc;

      const prompts: McpServerCustomizationsPrompt = {
        id: serverId,
        name: mcpServerCustomization.name,
        prompt: mcpServerCustomization.prompt,
        tools: mcpServerCustomization.tools
          ? objectFlow(mcpServerCustomization.tools).filter((_, key) => {
              return toolNamesByServerId[serverId].includes(key as string);
            })
          : {},
      };

      acc[serverId] = prompts;

      return acc;
    },
    {} as Record<string, McpServerCustomizationsPrompt>,
  );
}

export const workflowToVercelAITool = ({
  id,
  description,
  schema,
  dataStream,
  name,
}: {
  id: string;
  name: string;
  description?: string;
  schema: ObjectJsonSchema7;
  dataStream: UIMessageStreamWriter;
}): VercelAIWorkflowTool => {
  const toolName = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase();

  const tool = createTool({
    description: `${name} ${description?.trim().slice(0, 50)}`,
    inputSchema: jsonSchema(schema),
    execute(query, { toolCallId, abortSignal }) {
      const history: VercelAIWorkflowToolStreaming[] = [];
      const toolResult = VercelAIWorkflowToolStreamingResultTag.create({
        toolCallId,
        workflowName: name,

        startedAt: Date.now(),
        endedAt: Date.now(),
        history,
        result: undefined,
        status: "running",
      });
      return safe(id)
        .map((id) =>
          workflowRepository.selectStructureById(id, {
            ignoreNote: true,
          }),
        )
        .map((workflow) => {
          if (!workflow) throw new Error("Not Found Workflow");
          const executor = createWorkflowExecutor({
            nodes: workflow.nodes,
            edges: workflow.edges,
          });
          toolResult.workflowIcon = workflow.icon;

          abortSignal?.addEventListener("abort", () => executor.exit());
          executor.subscribe((e) => {
            if (
              e.eventType == "WORKFLOW_START" ||
              e.eventType == "WORKFLOW_END"
            )
              return;
            if (e.node.name == "SKIP") return;
            if (e.eventType == "NODE_START") {
              const node = workflow.nodes.find(
                (node) => node.id == e.node.name,
              )!;
              if (!node) return;
              history.push({
                id: e.nodeExecutionId,
                name: node.name,
                status: "running",
                startedAt: e.startedAt,
                kind: node.kind as NodeKind,
              });
            } else if (e.eventType == "NODE_END") {
              const result = history.find((r) => r.id == e.nodeExecutionId);
              if (result) {
                if (e.isOk) {
                  result.status = "success";
                  result.result = {
                    input: e.node.output.getInput(e.node.name),
                    output: e.node.output.getOutput({
                      nodeId: e.node.name,
                      path: [],
                    }),
                  };
                } else {
                  result.status = "fail";
                  result.error = {
                    name: e.error?.name || "ERROR",
                    message: errorToString(e.error),
                  };
                }
                result.endedAt = e.endedAt;
              }
            }

            dataStream.write({
              type: "tool-output-available",
              toolCallId,
              output: toolResult,
            });
          });
          return executor.run(
            {
              query: query ?? ({} as any),
            },
            {
              disableHistory: true,
            },
          );
        })
        .map((result) => {
          toolResult.endedAt = Date.now();
          toolResult.status = result.isOk ? "success" : "fail";
          toolResult.error = result.error
            ? {
                name: result.error.name || "ERROR",
                message: errorToString(result.error) || "Unknown Error",
              }
            : undefined;
          const outputNodeResults = history
            .filter((h) => h.kind == NodeKind.Output)
            .map((v) => v.result?.output)
            .filter(Boolean);
          toolResult.history = history.map((h) => ({
            ...h,
            result: undefined, // save tokens.
          }));
          toolResult.result =
            outputNodeResults.length == 1
              ? outputNodeResults[0]
              : outputNodeResults;
          return toolResult;
        })
        .ifFail((err) => {
          return {
            error: {
              name: err?.name || "ERROR",
              message: errorToString(err),
              history,
            },
          };
        })
        .unwrap();
    },
  }) as VercelAIWorkflowTool;

  tool._workflowId = id;
  tool._originToolName = name;
  tool._toolName = toolName;

  return VercelAIWorkflowToolTag.create(tool);
};

export const workflowToVercelAITools = (
  workflows: {
    id: string;
    name: string;
    description?: string;
    schema: ObjectJsonSchema7;
  }[],
  dataStream: UIMessageStreamWriter,
) => {
  return workflows
    .map((v) =>
      workflowToVercelAITool({
        ...v,
        dataStream,
      }),
    )
    .reduce(
      (prev, cur) => {
        prev[cur._toolName] = cur;
        return prev;
      },
      {} as Record<string, VercelAIWorkflowTool>,
    );
};

export const loadMcpTools = (opt?: {
  mentions?: ChatMention[];
  allowedMcpServers?: Record<string, AllowedMCPServer>;
}) =>
  safe(() => mcpClientsManager.tools())
    .map((tools) => {
      // First apply allowed servers filter (security/permission layer)
      const serverFilteredTools = filterMCPToolsByAllowedMCPServers(
        tools,
        opt?.allowedMcpServers,
      );

      // If no mentions, return all server-filtered tools
      if (!opt?.mentions?.length) {
        return serverFilteredTools;
      }

      // If mentions exist, they should be additive - return all server-filtered tools
      // The mentions are for agent instructions, not for restricting available tools
      return serverFilteredTools;
    })
    .orElse({} as Record<string, VercelAIMcpTool>);

export const loadWorkFlowTools = (opt: {
  mentions?: ChatMention[];
  dataStream: UIMessageStreamWriter;
}) =>
  safe(() =>
    opt?.mentions?.length
      ? workflowRepository.selectToolByIds(
          opt?.mentions
            ?.filter((m) => m.type == "workflow")
            .map((v) => v.workflowId),
        )
      : [],
  )
    .map((tools) => workflowToVercelAITools(tools, opt.dataStream))
    .orElse({} as Record<string, VercelAIWorkflowTool>);

export const loadAppDefaultTools = (opt?: {
  mentions?: ChatMention[];
  allowedAppDefaultToolkit?: AppDefaultToolkit[];
}) => {
  const debugEnabled = !!process.env.DEBUG_CHAT_PERSISTENCE;

  // Add resilient import check before using APP_DEFAULT_TOOL_KIT
  try {
    if (!APP_DEFAULT_TOOL_KIT) {
      logger.error("APP_DEFAULT_TOOL_KIT is undefined!");
      return {};
    }
    if (!APP_DEFAULT_TOOL_KIT.artifacts) {
      logger.error("APP_DEFAULT_TOOL_KIT.artifacts is missing!", {
        availableToolkits: Object.keys(APP_DEFAULT_TOOL_KIT),
      });
    }
  } catch (error) {
    logger.error("Critical error accessing APP_DEFAULT_TOOL_KIT", { error });
    return {};
  }

  return safe(APP_DEFAULT_TOOL_KIT)
    .map((tools) => {
      // CRITICAL FIX: Agent mentions are ADDITIVE, not restrictive
      // Agents should ALWAYS have access to all allowed tools
      const allowedAppDefaultToolkit =
        opt?.allowedAppDefaultToolkit ?? Object.values(AppDefaultToolkit);

      const finalTools =
        allowedAppDefaultToolkit.reduce(
          (acc, key) => ({ ...acc, ...tools[key] }),
          {} as Record<string, Tool>,
        ) || {};

      // Debug logging (enable via DEBUG_CHAT_PERSISTENCE=1)
      if (debugEnabled) {
        const expectedChartTools = Object.values(DefaultToolName).filter(
          (name) => name.includes("chart"),
        );
        const missingChartTools = expectedChartTools.filter(
          (expected) =>
            !Object.prototype.hasOwnProperty.call(finalTools, expected),
        );

        logger.debug("Tool registry loaded", {
          totalToolCount: Object.keys(finalTools).length,
          chartToolsFound: Object.keys(finalTools).filter((key) =>
            key.includes("chart"),
          ).length,
          missingChartTools:
            missingChartTools.length > 0 ? missingChartTools : undefined,
        });
      }

      return finalTools;
    })
    .ifFail((e) => {
      logger.error("APP_DEFAULT_TOOL_KIT loading failed", {
        error: e.message,
        stack: e.stack,
        toolkitsRequested: opt?.allowedAppDefaultToolkit,
      });

      // For production: don't throw, return minimal tools to prevent complete failure
      if (process.env.NODE_ENV === "production") {
        logger.warn(
          "Production mode: Returning empty tools instead of throwing",
        );
        return {} as Record<string, Tool>;
      }

      // For development: throw to surface issues
      throw e;
    })
    .orElse(() => {
      logger.warn("APP_DEFAULT_TOOL_KIT failed - returning empty tools");
      return {} as Record<string, Tool>;
    });
};

export const convertToSavePart = <T extends UIMessagePart<any, any>>(
  part: T,
) => {
  return safe(
    exclude(part as any, ["providerMetadata", "callProviderMetadata"]) as T,
  )
    .map((v) => {
      if (isToolUIPart(v) && v.state.startsWith("output")) {
        if (VercelAIWorkflowToolStreamingResultTag.isMaybe(v.output)) {
          return {
            ...v,
            output: {
              ...v.output,
              history: v.output.history.map((h: any) => {
                return {
                  ...h,
                  result: undefined,
                };
              }),
            },
          };
        }
      }
      return v;
    })
    .unwrap();
};

export function normalizeToolUIPartFromHistory(part: ToolUIPart): {
  part: ToolUIPart;
  changed: boolean;
} {
  const normalized: ToolUIPart = { ...part };
  let changed = false;

  if (!normalized.toolCallId) {
    normalized.toolCallId = generateUUID();
    changed = true;
  }

  // Normalize state if output exists but state doesn't reflect it
  const currentState = normalized.state as string;
  if (
    normalized.output !== undefined &&
    normalized.output !== null &&
    (currentState === "input-available" ||
      currentState === "input-streaming" ||
      currentState === "call")
  ) {
    (normalized as any).state = "output-available";
    changed = true;
  }

  if (
    normalized.output !== undefined &&
    normalized.output !== null &&
    normalized.providerExecuted !== true
  ) {
    normalized.providerExecuted = true;
    changed = true;
  }

  return { part: normalized, changed };
}

export function ensureAssistantMessageHasRenderableParts(
  message: UIMessage,
  fallbackText: string,
): {
  message: UIMessage;
  fallbackApplied: boolean;
} {
  if (message.parts && message.parts.length > 0) {
    return { message, fallbackApplied: false };
  }

  return {
    message: {
      ...message,
      parts: [
        {
          type: "text" as const,
          text: fallbackText,
        },
      ],
    },
    fallbackApplied: true,
  };
}

export function buildAssistantErrorStub(
  baseMetadata: ChatMetadata,
  error: {
    type: string;
    message: string;
    details: unknown;
  },
  text = "The assistant encountered an error and could not complete the response.",
): {
  message: UIMessage;
  metadata: ChatMetadata;
  persistedAt: string;
} {
  const persistedAt = new Date().toISOString();

  const metadata: ChatMetadata = {
    ...baseMetadata,
    errorInfo: {
      type: error.type,
      message: error.message,
      details: error.details,
      persistedAt,
    },
  };

  return {
    message: {
      id: generateUUID(),
      role: "assistant",
      parts: [
        {
          type: "text" as const,
          text,
        },
      ],
    },
    metadata,
    persistedAt,
  };
}

/**
 * Build UIMessage from streamText result for database persistence.
 * Extracts text and tool parts from completed stream.
 *
 * Note: Uses `any` because Vercel AI SDK's StreamTextResult<TOOLS, PARTIAL_OUTPUT>
 * is a complex generic type that varies based on tool configuration.
 *
 * Fields accessed from result:
 * - id?: string
 * - text?: string (cumulative text fallback)
 * - steps?: Array<{ text?, toolCalls[], toolResults[] }>
 *
 * @param result - streamText result object (StreamTextResult from 'ai' SDK)
 * @param originalMessage - Original user message for ID fallback
 * @returns UIMessage ready for database persistence
 */
export function buildResponseMessageFromStreamResult(
  result: any,
  originalMessage: UIMessage,
): UIMessage {
  const parts: any[] = [];

  // Process steps in order to preserve correct sequence of text, tool calls, and results
  // Each step represents a turn in the conversation flow
  if (result.steps && Array.isArray(result.steps)) {
    for (const step of result.steps) {
      // 1. First, add tool calls for this step (they happen before text response)
      if (step.toolCalls && Array.isArray(step.toolCalls)) {
        for (const toolCall of step.toolCalls) {
          // Note: Vercel AI SDK uses `input` not `args` for tool call parameters
          parts.push({
            type: `tool-${toolCall.toolName}`,
            toolCallId: toolCall.toolCallId,
            input: toolCall.input ?? toolCall.args ?? {},
            state: "call",
          });
        }
      }

      // 2. Then, update tool calls with their results (in same step)
      // Note: Vercel AI SDK uses `output` not `result`, and also includes `input`
      if (step.toolResults && Array.isArray(step.toolResults)) {
        for (const toolResult of step.toolResults) {
          // Find the corresponding call part
          const callPart = parts.find(
            (p: any) => p.toolCallId === toolResult.toolCallId,
          );

          const outputValue = toolResult.output ?? toolResult.result;
          const inputValue = toolResult.input ?? {};

          if (callPart) {
            callPart.state = "output-available";
            callPart.output = outputValue;
            if (!callPart.input || Object.keys(callPart.input).length === 0) {
              callPart.input = inputValue;
            }
          } else {
            // No call part found - create result part directly
            parts.push({
              type: `tool-${toolResult.toolName}`,
              toolCallId: toolResult.toolCallId,
              input: inputValue,
              state: "output-available",
              output: outputValue,
            });
          }
        }
      }

      // 3. Finally, add text content for this step (after tool execution)
      // Note: step.text contains the text for this specific step
      if (step.text && step.text.trim()) {
        parts.push({
          type: "text",
          text: step.text,
        });
      }
    }
  }

  // Check if we captured any text from steps
  const hasTextPart = parts.some((p) => p.type === "text");

  // Fallback: If no text parts but result.text exists (cumulative text)
  // This handles cases where step.text is empty but AI generated text
  if (!hasTextPart && result.text && result.text.trim()) {
    // Add text at the END (after tool calls) since that's the natural flow
    parts.push({
      type: "text",
      text: result.text,
    });
  }

  // Build the response message
  return {
    id: result.id || originalMessage.id,
    role: "assistant" as const,
    parts,
  };
}
