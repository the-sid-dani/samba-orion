"use client";

import { TextPart, getToolName, isToolUIPart } from "ai";
import { DEFAULT_VOICE_TOOLS, UIMessageWithCompleted } from "lib/ai/speech";
import logger from "lib/logger";
import { generateUUID } from "lib/utils";
import { getAllChartToolNames } from "lib/ai/tools";

import {
  OPENAI_VOICE,
  useOpenAIVoiceChat as OpenAIVoiceChat,
} from "lib/ai/speech/open-ai/use-voice-chat.openai";
import { cn } from "lib/utils";
import {
  CheckIcon,
  ChevronRight,
  LayoutDashboard,
  Loader,
  MessageSquareMoreIcon,
  MessagesSquareIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  Settings2Icon,
  TriangleAlertIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Button } from "ui/button";

import { Drawer, DrawerContent, DrawerPortal, DrawerTitle } from "ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { GeminiIcon } from "ui/gemini-icon";
import { MessageLoading } from "ui/message-loading";
import { OpenAIIcon } from "ui/openai-icon";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { CanvasPanel, useCanvas } from "./canvas-panel";
import { ToolMessagePart } from "./message-parts";
import {
  VOICE_TOOL_AUTO_DISMISS_MS,
  VOICE_TOOL_DISMISSED_MAX,
  addCompletedToolIdsToDismissed,
  isVoiceToolExecutingState,
} from "./chat-bot-voice.helpers";

import { appStore } from "@/app/store";
import { Shortcuts, isShortcutEvent } from "lib/keyboard-shortcuts";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "ui/dialog";
import JsonView from "ui/json-view";
import { useShallow } from "zustand/shallow";
import { EnabledMcpToolsDropdown } from "./enabled-mcp-tools-dropdown";
import { useGenerateThreadTitle } from "@/hooks/queries/use-generate-thread-title";
import { truncateString } from "lib/utils";
import { mutate } from "swr";

const prependTools = [
  {
    id: "Browser",
    name: "Browser",
    tools: DEFAULT_VOICE_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
  },
];

export function ChatBotVoice() {
  const t = useTranslations("Chat");
  const [appStoreMutate, voiceChat, model, currentThreadId, threadList] =
    appStore(
      useShallow((state) => [
        state.mutate,
        state.voiceChat,
        state.chatModel,
        state.currentThreadId,
        state.threadList,
      ]),
    );

  const [isClosing, setIsClosing] = useState(false);
  const startAudio = useRef<HTMLAudioElement>(null);
  const [useCompactView, setUseCompactView] = useState(true);

  // Thread title generation (same as text chat)
  const generateTitle = useGenerateThreadTitle({
    threadId: currentThreadId || "",
  });

  // Canvas state management - CRITICAL missing feature from voice chat
  const {
    isVisible: isCanvasVisible,
    artifacts: canvasArtifacts,
    activeArtifactId,
    canvasName,
    userManuallyClosed,
    addArtifact: addCanvasArtifact,
    updateArtifact: updateCanvasArtifact,
    closeCanvas,
    showCanvas,
    setActiveArtifactId,
  } = useCanvas();

  // Cleanup processed tools when voice chat session changes
  const processedToolsRef = useRef(new Set<string>());

  // Track if we've initialized artifacts from history
  const isInitializedRef = useRef(false);

  const {
    isListening,
    isAssistantSpeaking,
    isLoading,
    isActive,
    isUserSpeaking,
    messages,
    error,
    start,
    startListening,
    stop,
    stopListening,
  } = OpenAIVoiceChat({
    ...voiceChat.options.providerOptions,
    agentId: voiceChat.agentId,
  });

  const startWithSound = useCallback(() => {
    if (!startAudio.current) {
      startAudio.current = new Audio("/sounds/start_voice.ogg");
    }
    start().then(() => {
      startAudio.current?.play().catch(() => {});
    });
  }, [start]);

  const endVoiceChat = useCallback(async () => {
    setIsClosing(true);

    // Generate title for new voice threads (same logic as text chat)
    if (currentThreadId && messages.length > 0) {
      const prevThread = threadList.find((v) => v.id === currentThreadId);
      const isNewThread =
        !prevThread?.title &&
        messages.filter((v) => v.role === "user" || v.role === "assistant")
          .length < 3;

      if (isNewThread) {
        const part = messages
          .slice(0, 2)
          .flatMap((m) =>
            m.parts
              .filter((v) => v.type === "text")
              .map(
                (p: any) => `${m.role}: ${truncateString(p.text || "", 500)}`,
              ),
          );
        if (part.length > 0) {
          generateTitle(part.join("\n\n"));
        }
      } else {
        mutate("/api/thread");
      }
    }

    await safe(() => stop());
    setIsClosing(false);
    isInitializedRef.current = false;
    processedToolsRef.current.clear();
    appStoreMutate({
      voiceChat: {
        ...voiceChat,
        isOpen: false,
      },
    });
  }, [messages, model, currentThreadId, threadList, generateTitle]);

  // ONE-TIME: Process all historical messages on voice chat open to restore charts
  useEffect(() => {
    // Skip if already initialized or no messages
    if (
      isInitializedRef.current ||
      messages.length === 0 ||
      !voiceChat.isOpen
    ) {
      return;
    }

    logger.info("Voice Chat: Initializing artifacts from message history", {
      messageCount: messages.length,
    });

    // Chart tool names - dynamically loaded to prevent maintenance issues
    const chartToolNames = getAllChartToolNames();

    // Process ALL assistant messages (not just last one)
    messages.forEach((message) => {
      if (message.role !== "assistant") return;

      // Extract chart tools from this message
      const chartTools = message.parts.filter(
        (part) =>
          isToolUIPart(part) && chartToolNames.includes(getToolName(part)),
      );

      // Process completed charts (same logic as real-time processing)
      chartTools.forEach((part) => {
        if (!isToolUIPart(part) || !part.state.startsWith("output")) return;

        const result = part.output as any;
        const isCompleted =
          (result?.shouldCreateArtifact && result?.status === "success") ||
          result?.success === true ||
          (result?.structuredContent?.result?.[0]?.success === true &&
            result?.isError === false);

        if (!isCompleted) return;

        const artifactId =
          result.chartId ||
          result.artifactId ||
          result.structuredContent?.result?.[0]?.artifactId ||
          generateUUID();

        const toolKey = `${message.id}-${artifactId}`;

        // Duplicate prevention
        if (processedToolsRef.current.has(toolKey)) return;
        processedToolsRef.current.add(toolKey);

        // Create artifact (simplified logic for voice chat)
        const toolName = getToolName(part);
        const isTableTool = toolName === "createTable";
        const chartData = result.chartData;
        const chartType = result.chartType;
        const title = result.title;

        const artifact = {
          id: artifactId,
          type: (isTableTool ? "table" : "chart") as "chart" | "table",
          title:
            title ||
            (isTableTool ? `Table: ${chartType}` : `${chartType} Chart`),
          canvasName:
            result.canvasName ||
            (isTableTool ? "Voice Data Table" : "Voice Data Visualization"),
          data: chartData,
          status: "completed" as const,
          metadata: {
            chartType: isTableTool ? "table" : chartType || "bar",
            dataPoints:
              result.dataPoints ||
              chartData?.data?.length ||
              chartData?.columns?.length ||
              0,
            toolName,
            lastUpdated: new Date().toISOString(),
            // voice-originated flag handled via source metadata
          },
        };

        addCanvasArtifact(artifact);
      });
    });

    isInitializedRef.current = true;
    logger.info("Voice Chat: Artifact initialization complete", {
      artifactCount: canvasArtifacts.length,
    });
  }, [
    messages.length,
    voiceChat.isOpen,
    addCanvasArtifact,
    canvasArtifacts.length,
  ]);

  // CRITICAL: Chart tool detection for Canvas integration (copied from chat-bot.tsx)
  // Voice chat needs same Canvas processing as regular chat
  const processingDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Wait for initialization before processing new messages
    if (!isInitializedRef.current) {
      return;
    }

    // Clear any existing debounce
    if (processingDebounceRef.current) {
      clearTimeout(processingDebounceRef.current);
    }

    // Debounce tool processing to prevent rapid-fire updates
    processingDebounceRef.current = setTimeout(() => {
      try {
        const lastMessage = messages[messages.length - 1];

        if (!lastMessage || lastMessage.role !== "assistant") {
          return;
        }

        logger.debug("Voice Chat Tool Processing", {
          messageId: lastMessage.id,
          partCount: lastMessage.parts.length,
          timestamp: new Date().toISOString(),
        });

        // Look for all chart tools in any state (same as regular chat)
        // Dynamically loaded to prevent maintenance issues
        const chartToolNames = getAllChartToolNames();

        const chartTools = lastMessage.parts.filter(
          (part): part is any =>
            isToolUIPart(part) && chartToolNames.includes(getToolName(part)),
        );

        logger.debug("Voice Chat Chart Tools Found", {
          toolCount: chartTools.length,
          tools: chartTools.map((t) => ({
            name: getToolName(t),
            hasOutput: isToolUIPart(t),
          })),
        });

        // Open Canvas immediately when chart/table tools are detected (unless user closed it)
        if (chartTools.length > 0 && !isCanvasVisible && !userManuallyClosed) {
          logger.info("Voice Chat Auto-opening Canvas for chart tools");
          showCanvas();
        } else if (chartTools.length > 0 && userManuallyClosed) {
          logger.debug("Voice Chat Canvas closed by user - respecting choice");
        }

        // Note: Removed loading artifact creation logic for voice chat as well

        // Process completed charts/tables with duplicate prevention (same logic as regular chat)
        const completedCharts = chartTools.filter((part) => {
          if (!isToolUIPart(part) || !part.state.startsWith("output")) {
            return false;
          }

          const result = part.output as any;

          // Support multiple result formats
          const isCompleted =
            (result?.shouldCreateArtifact && result?.status === "success") ||
            result?.success === true ||
            (result?.structuredContent?.result?.[0]?.success === true &&
              result?.isError === false);

          if (isCompleted) {
            // Use different ID fields depending on format
            const artifactId =
              result.chartId ||
              result.artifactId ||
              result.structuredContent?.result?.[0]?.artifactId ||
              generateUUID();
            const toolKey = `${lastMessage.id}-${artifactId}`;

            // Check if we've already processed this tool
            if (processedToolsRef.current.has(toolKey)) {
              logger.debug("Voice Chat Skipping Processed Chart", {
                chartId: artifactId,
                toolName: getToolName(part),
              });
              return false;
            }

            // Mark as processed
            processedToolsRef.current.add(toolKey);
            return true;
          }

          return false;
        });

        logger.debug("Voice Chat Processing Completed Charts", {
          completedCount: completedCharts.length,
          existingArtifacts: canvasArtifacts.length,
        });

        // Process completed charts using same logic as regular chat
        completedCharts.forEach((part) => {
          if (!isToolUIPart(part)) return;
          const result = part.output as any;
          const toolName = getToolName(part);

          // Handle different result formats
          const artifactId =
            result.chartId ||
            result.artifactId ||
            result.structuredContent?.result?.[0]?.artifactId ||
            generateUUID();

          // Find existing artifact
          const existingArtifact = canvasArtifacts.find(
            (a) => a.id === artifactId || a.id === part.toolCallId,
          );

          // Determine if this is a table tool or special chart type
          const isTableTool = toolName === "createTable";
          const isBANChart = toolName === "create_ban_chart";
          const isGaugeChart = toolName === "create_gauge_chart";

          if (!existingArtifact) {
            logger.info(
              `Voice Chat Creating ${isTableTool ? "table" : "chart"} artifact`,
              {
                chartId: artifactId,
                title:
                  result.title ||
                  result.artifact?.title ||
                  result.structuredContent?.result?.[0]?.artifact?.title,
                toolName,
                chartType: result.chartType,
              },
            );

            let chartData;
            let chartType;
            let title;
            let artifactType: "chart" | "table" = "chart";

            // Handle new artifact format
            const artifactData =
              result.artifact ||
              result.structuredContent?.result?.[0]?.artifact;
            if (artifactData) {
              let artifactContent;
              try {
                artifactContent = JSON.parse(artifactData.content);
              } catch (parseError) {
                logger.error("Voice Chat: Failed to parse artifact content", {
                  error: parseError,
                  artifactId,
                  toolName,
                  contentPreview: artifactData.content?.substring(0, 100),
                });
                return; // Skip this artifact if JSON is malformed
              }

              if (isTableTool) {
                artifactType = "table";
                chartType = "table";
                title = artifactData.title;
                chartData = {
                  title: artifactContent.title,
                  description: artifactContent.description,
                  columns: artifactContent.columns,
                  data: artifactContent.data,
                };
              } else {
                chartType =
                  artifactContent.metadata?.chartType ||
                  artifactContent.type.replace("-chart", "");
                title = artifactData.title;

                // Special handling for BAN and Gauge charts (no data array)
                if (isBANChart || chartType === "ban") {
                  chartData = {
                    chartType: "ban",
                    title: artifactContent.title,
                    value: artifactContent.value,
                    unit: artifactContent.unit,
                    trend: artifactContent.trend,
                    comparison: artifactContent.comparison,
                    description: artifactContent.description,
                  };
                } else if (isGaugeChart || chartType === "gauge") {
                  chartData = {
                    chartType: "gauge",
                    title: artifactContent.title,
                    value: artifactContent.value,
                    minValue: artifactContent.minValue,
                    maxValue: artifactContent.maxValue,
                    gaugeType: artifactContent.gaugeType,
                    unit: artifactContent.unit,
                    thresholds: artifactContent.thresholds,
                    description: artifactContent.description,
                  };
                } else {
                  // Standard charts with data arrays
                  chartData = {
                    chartType: chartType,
                    title: artifactContent.title,
                    data: artifactContent.data || [],
                    description: artifactContent.description,
                    yAxisLabel: artifactContent.yAxisLabel,
                    xAxisLabel: artifactContent.xAxisLabel,
                    // Add additional properties for special chart types
                    areaType: artifactContent.areaType,
                    showBubbles: artifactContent.showBubbles,
                    geoType: artifactContent.geoType,
                    colorScale: artifactContent.colorScale,
                    nodes: artifactContent.nodes,
                    links: artifactContent.links,
                    innerRadius: artifactContent.innerRadius,
                    outerRadius: artifactContent.outerRadius,
                    startDate: artifactContent.startDate,
                    endDate: artifactContent.endDate,
                  };
                }
              }
            } else {
              // Handle original format (direct from tool result)
              chartType = result.chartType;
              title = result.title;

              // CRITICAL: Set artifactType for tables
              if (isTableTool) {
                artifactType = "table";
              }

              // Use chartData directly for BAN/gauge charts (already in correct format)
              if (
                isBANChart ||
                chartType === "ban" ||
                isGaugeChart ||
                chartType === "gauge"
              ) {
                chartData = result.chartData;
              } else {
                // For standard charts, use chartData or fallback
                const structuredResult = result.structuredContent?.result?.[0];
                chartData = result.chartData || structuredResult?.chartData;
              }
            }

            const artifact = {
              id: artifactId,
              type: artifactType,
              title:
                title ||
                (isTableTool ? `Table: ${chartType}` : `${chartType} Chart`),
              canvasName:
                result.canvasName ||
                (isTableTool ? "Voice Data Table" : "Voice Data Visualization"),
              data: chartData,
              status: "completed" as const,
              metadata: {
                chartType: isTableTool ? "table" : chartType || "bar",
                dataPoints:
                  result.dataPoints ||
                  chartData?.data?.length ||
                  chartData?.columns?.length ||
                  0,
                toolName,
                lastUpdated: new Date().toISOString(),
                // voice-originated flag handled via source metadata // Mark as voice-originated
              },
            };

            addCanvasArtifact(artifact);
          } else {
            // Update existing loading artifact with completed data
            logger.debug("Voice Chat Updating Loading Artifact", {
              existingId: existingArtifact.id,
              newId: artifactId,
              toolName,
              status: existingArtifact.status,
            });

            // Extract chart data for updating (same logic as creation)
            let chartData;
            let chartType;
            let title;

            const artifactData =
              result.artifact ||
              result.structuredContent?.result?.[0]?.artifact;
            if (artifactData) {
              let artifactContent;
              try {
                artifactContent = JSON.parse(artifactData.content);
              } catch (parseError) {
                logger.error(
                  "Voice Chat: Failed to parse artifact update content",
                  {
                    error: parseError,
                    existingArtifactId: existingArtifact.id,
                    toolName,
                    contentPreview: artifactData.content?.substring(0, 100),
                  },
                );
                return; // Skip update if JSON is malformed
              }

              if (isTableTool) {
                chartType = "table";
                title = artifactData.title;
                chartData = {
                  title: artifactContent.title,
                  description: artifactContent.description,
                  columns: artifactContent.columns,
                  data: artifactContent.data,
                };
              } else {
                chartType =
                  artifactContent.metadata?.chartType ||
                  artifactContent.type.replace("-chart", "");
                title = artifactData.title;

                chartData = {
                  chartType: chartType,
                  title: artifactContent.title,
                  data: artifactContent.data || [],
                  description: artifactContent.description,
                  yAxisLabel: artifactContent.yAxisLabel,
                  xAxisLabel: artifactContent.xAxisLabel,
                  areaType: artifactContent.areaType,
                  showBubbles: artifactContent.showBubbles,
                  geoType: artifactContent.geoType,
                  colorScale: artifactContent.colorScale,
                  value: artifactContent.value,
                  minValue: artifactContent.minValue,
                  maxValue: artifactContent.maxValue,
                  gaugeType: artifactContent.gaugeType,
                  unit: artifactContent.unit,
                  thresholds: artifactContent.thresholds,
                  nodes: artifactContent.nodes,
                  links: artifactContent.links,
                  innerRadius: artifactContent.innerRadius,
                  outerRadius: artifactContent.outerRadius,
                  startDate: artifactContent.startDate,
                  endDate: artifactContent.endDate,
                };
              }
            } else {
              const structuredResult = result.structuredContent?.result?.[0];
              chartData = result.chartData || structuredResult?.chartData;
              chartType = result.chartType || structuredResult?.chartType;
              title =
                result.title ||
                structuredResult?.title ||
                structuredResult?.message;
            }

            // Update the loading artifact with completed data
            updateCanvasArtifact(existingArtifact.id, {
              data: chartData,
              status: "completed",
              title: title || existingArtifact.title,
              canvasName: result.canvasName || existingArtifact.canvasName,
              metadata: {
                ...existingArtifact.metadata,
                chartType:
                  chartType || existingArtifact.metadata?.chartType || "bar",
                dataPoints: result.dataPoints || chartData?.data?.length || 0,
                toolName,
                lastUpdated: new Date().toISOString(),
                // voice-originated flag handled via source metadata // Mark as voice-originated
              },
            });
          }
        });
      } catch (error) {
        logger.error("Voice Chat Tool Processing Error", { error });
      }
    }, 150); // 150ms debounce to prevent rapid processing

    // Cleanup function
    return () => {
      if (processingDebounceRef.current) {
        clearTimeout(processingDebounceRef.current);
      }
    };
  }, [
    messages,
    isCanvasVisible,
    userManuallyClosed,
    showCanvas,
    addCanvasArtifact,
    updateCanvasArtifact,
    canvasArtifacts,
  ]);

  // generateUUID is now imported from lib/utils for consistency

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logger.debug("Voice Chat Component Unmounting");

      // Clear any pending timeouts
      if (processingDebounceRef.current) {
        clearTimeout(processingDebounceRef.current);
      }

      // Clear processed tools cache
      processedToolsRef.current.clear();

      logger.debug("Voice Chat Cleanup Completed");
    };
  }, []);

  const statusMessage = useMemo(() => {
    if (isLoading) {
      return (
        <p className="fade-in animate-in duration-3000" key="start">
          {t("VoiceChat.preparing")}
        </p>
      );
    }
    if (!isActive)
      return (
        <p className="fade-in animate-in duration-3000" key="start">
          {t("VoiceChat.startVoiceChat")}
        </p>
      );
    if (!isListening)
      return (
        <p className="fade-in animate-in duration-3000" key="stop">
          {t("VoiceChat.yourMicIsOff")}
        </p>
      );
    if (!isAssistantSpeaking && messages.length === 0) {
      return (
        <p className="fade-in animate-in duration-3000" key="ready">
          {t("VoiceChat.readyWhenYouAreJustStartTalking")}
        </p>
      );
    }
    if (isUserSpeaking && useCompactView) {
      return <MessageLoading className="text-muted-foreground" />;
    }
    if (!isAssistantSpeaking && !isUserSpeaking) {
      return (
        <p className="delayed-fade-in" key="ready">
          {t("VoiceChat.readyWhenYouAreJustStartTalking")}
        </p>
      );
    }
  }, [
    isAssistantSpeaking,
    isUserSpeaking,
    isActive,
    isLoading,
    isListening,
    messages.length,
    useCompactView,
  ]);

  useEffect(() => {
    return () => {
      if (isActive) {
        stop();
      }
    };
  }, [voiceChat.options, isActive]);

  useEffect(() => {
    if (voiceChat.isOpen) {
      startWithSound();
    } else if (isActive) {
      stop();
    }
  }, [voiceChat.isOpen]);

  useEffect(() => {
    if (error && isActive) {
      toast.error(error.message);
      stop();
    }
  }, [error]);

  useEffect(() => {
    if (voiceChat.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isVoiceChatEvent = isShortcutEvent(e, Shortcuts.toggleVoiceChat);
      if (isVoiceChatEvent) {
        e.preventDefault();
        e.stopPropagation();
        appStoreMutate((prev) => ({
          voiceChat: {
            ...prev.voiceChat,
            isOpen: true,
            agentId: undefined,
          },
        }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [voiceChat.isOpen]);

  // Track layout decisions for Voice Chat Canvas behavior
  logger.debug("Voice Chat Layout State", {
    layout: isCanvasVisible ? "SPLIT VIEW (Voice + Canvas)" : "VOICE ONLY",
    artifactCount: canvasArtifacts.length,
    userManuallyClosed,
    activeArtifactId,
    canvasName,
    voiceChatOpen: voiceChat.isOpen,
  });

  // CRITICAL: Use ResizablePanelGroup layout instead of full-screen Drawer
  // This is the key architectural change needed for Canvas integration
  return (
    <Drawer dismissible={false} open={voiceChat.isOpen} direction="top">
      <DrawerPortal>
        <DrawerContent className="max-h-[100vh]! h-full border-none! rounded-none! flex flex-col bg-card">
          {/* Voice Chat Header (always visible) */}
          <div
            className="w-full flex p-6 gap-2 border-b"
            style={{
              userSelect: "text",
            }}
          >
            <div className="flex items-center ">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"secondary"}
                    size={"icon"}
                    onClick={() => setUseCompactView(!useCompactView)}
                  >
                    {useCompactView ? (
                      <MessageSquareMoreIcon />
                    ) : (
                      <MessagesSquareIcon />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {useCompactView
                    ? t("VoiceChat.compactDisplayMode")
                    : t("VoiceChat.conversationDisplayMode")}
                </TooltipContent>
              </Tooltip>
            </div>
            <DrawerTitle className="flex items-center gap-2 w-full">
              <EnabledMcpToolsDropdown
                align="start"
                side="bottom"
                prependTools={prependTools}
              />

              <div className="flex-1" />
              {/* Canvas Controls */}
              {canvasArtifacts.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isCanvasVisible ? "default" : "secondary"}
                      size={"icon"}
                      onClick={() => {
                        if (isCanvasVisible) {
                          closeCanvas();
                        } else {
                          showCanvas();
                        }
                      }}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isCanvasVisible ? "Hide Canvas" : "Show Canvas"}
                  </TooltipContent>
                </Tooltip>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={"ghost"} size={"icon"}>
                    <Settings2Icon className="text-foreground size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="left"
                  className="min-w-40"
                  align="start"
                >
                  <DropdownMenuGroup className="cursor-pointer">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger
                        className="flex items-center gap-2 cursor-pointer"
                        icon=""
                      >
                        <OpenAIIcon className="size-3.5 stroke-none fill-foreground" />
                        Open AI
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {Object.entries(OPENAI_VOICE).map(([key, value]) => (
                            <DropdownMenuItem
                              className="cursor-pointer flex items-center justify-between"
                              onClick={() =>
                                appStoreMutate({
                                  voiceChat: {
                                    ...voiceChat,
                                    options: {
                                      provider: "openai",
                                      providerOptions: {
                                        voice: value,
                                      },
                                    },
                                  },
                                })
                              }
                              key={key}
                            >
                              {key}

                              {value ===
                                voiceChat.options.providerOptions?.voice && (
                                <CheckIcon className="size-3.5" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                          className="flex items-center gap-2 text-muted-foreground"
                          icon=""
                        >
                          <GeminiIcon className="size-3.5" />
                          Gemini
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <div className="text-xs text-muted-foreground p-6">
                              Not Implemented Yet
                            </div>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </DrawerTitle>
          </div>

          {/* CRITICAL: Resizable integrated layout with Canvas support */}
          {isCanvasVisible ? (
            <ResizablePanelGroup
              key="voice-canvas-layout"
              direction="horizontal"
              className="flex-1 min-h-0"
            >
              {/* Voice Chat Panel */}
              <ResizablePanel defaultSize={50} minSize={35} maxSize={75}>
                <VoiceChatContent
                  error={error}
                  isLoading={isLoading}
                  useCompactView={useCompactView}
                  messages={messages}
                  statusMessage={statusMessage}
                  isClosing={isClosing}
                  isActive={isActive}
                  isListening={isListening}
                  isUserSpeaking={isUserSpeaking}
                  startWithSound={startWithSound}
                  startListening={startListening}
                  stopListening={stopListening}
                  endVoiceChat={endVoiceChat}
                  t={t}
                />
              </ResizablePanel>

              {/* Resizable Handle */}
              <ResizableHandle className="w-1 bg-border hover:bg-border/80 transition-colors" />

              {/* Canvas Panel */}
              <ResizablePanel defaultSize={50} minSize={25} maxSize={65}>
                <CanvasPanel
                  isVisible={isCanvasVisible}
                  onClose={closeCanvas}
                  artifacts={canvasArtifacts}
                  activeArtifactId={activeArtifactId}
                  onArtifactSelect={setActiveArtifactId}
                  canvasName={canvasName}
                  isIntegrated={true}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div key="voice-only-layout" className="flex-1 min-h-0">
              <VoiceChatContent
                error={error}
                isLoading={isLoading}
                useCompactView={useCompactView}
                messages={messages}
                statusMessage={statusMessage}
                isClosing={isClosing}
                isActive={isActive}
                isListening={isListening}
                isUserSpeaking={isUserSpeaking}
                startWithSound={startWithSound}
                startListening={startListening}
                stopListening={stopListening}
                endVoiceChat={endVoiceChat}
                t={t}
              />
            </div>
          )}
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

// Extracted VoiceChatContent component for cleaner layout organization
interface VoiceChatContentProps {
  error: Error | null;
  isLoading: boolean;
  useCompactView: boolean;
  messages: UIMessageWithCompleted[];
  statusMessage: React.ReactNode;
  isClosing: boolean;
  isActive: boolean;
  isListening: boolean;
  isUserSpeaking: boolean;
  startWithSound: () => void;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  endVoiceChat: () => Promise<void>;
  t: (key: string) => string;
}

function VoiceChatContent({
  error,
  isLoading,
  useCompactView,
  messages,
  statusMessage,
  isClosing,
  isActive,
  isListening,
  isUserSpeaking,
  startWithSound,
  startListening,
  stopListening,
  endVoiceChat,
  t,
}: VoiceChatContentProps) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0 mx-auto w-full">
        {error ? (
          <div className="max-w-3xl mx-auto p-6">
            <Alert variant={"destructive"}>
              <TriangleAlertIcon className="size-4 " />
              <AlertTitle className="">Error</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>

              <AlertDescription className="my-4 ">
                <p className="text-muted-foreground ">
                  {t("VoiceChat.pleaseCloseTheVoiceChatAndTryAgain")}
                </p>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
        {isLoading ? (
          <div className="flex-1"></div>
        ) : (
          <div className="h-full w-full">
            {useCompactView ? (
              <CompactMessageView messages={messages} />
            ) : (
              <ConversationView messages={messages} />
            )}
          </div>
        )}
      </div>
      <div className="relative w-full p-6 flex items-center justify-center gap-4">
        <div className="text-sm text-muted-foreground absolute -top-5 left-0 w-full justify-center flex items-center">
          {statusMessage}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"secondary"}
              size={"icon"}
              disabled={isClosing || isLoading}
              onClick={() => {
                if (!isActive) {
                  startWithSound();
                } else if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={cn(
                "rounded-full p-6 transition-colors duration-300",

                isLoading
                  ? "bg-accent-foreground text-accent animate-pulse"
                  : !isActive
                    ? "bg-green-500/10 text-green-500 hover:bg-green-500/30"
                    : !isListening
                      ? "bg-destructive/30 text-destructive hover:bg-destructive/10"
                      : isUserSpeaking
                        ? "bg-input text-foreground"
                        : "",
              )}
            >
              {isLoading || isClosing ? (
                <Loader className="size-6 animate-spin" />
              ) : !isActive ? (
                <PhoneIcon className="size-6 fill-green-500 stroke-none" />
              ) : isListening ? (
                <MicIcon
                  className={`size-6 ${isUserSpeaking ? "text-primary" : "text-muted-foreground transition-colors duration-300"}`}
                />
              ) : (
                <MicOffIcon className="size-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {!isActive
              ? t("VoiceChat.startConversation")
              : isListening
                ? t("VoiceChat.closeMic")
                : t("VoiceChat.openMic")}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"secondary"}
              size={"icon"}
              className="rounded-full p-6"
              disabled={isLoading || isClosing}
              onClick={endVoiceChat}
            >
              <XIcon className="text-foreground size-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("VoiceChat.endConversation")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function ConversationView({
  messages,
}: { messages: UIMessageWithCompleted[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);
  return (
    <div className="select-text w-full overflow-y-auto h-full" ref={ref}>
      <div className="max-w-4xl mx-auto flex flex-col px-6 gap-6 pb-44 min-h-0 min-w-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex px-4 py-3",
              message.role == "user" &&
                "ml-auto max-w-2xl text-foreground rounded-2xl w-fit bg-input/40",
            )}
          >
            {!message.completed ? (
              <MessageLoading
                className={cn(
                  message.role == "user"
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              />
            ) : (
              message.parts.map((part, index) => {
                if (part.type === "text") {
                  if (!part.text) {
                    return (
                      <MessageLoading
                        key={index}
                        className={cn(
                          message.role == "user"
                            ? "text-muted-foreground"
                            : "text-foreground",
                        )}
                      />
                    );
                  }
                  return (
                    <p key={index}>
                      {(part.text || "...")
                        ?.trim()
                        .split(" ")
                        .map((word, wordIndex) => (
                          <span
                            key={wordIndex}
                            className="animate-in fade-in duration-3000"
                          >
                            {word}{" "}
                          </span>
                        ))}
                    </p>
                  );
                } else if (isToolUIPart(part)) {
                  return (
                    <ToolMessagePart
                      key={index}
                      part={part}
                      showActions={false}
                      messageId={message.id}
                      isLast={part.state.startsWith("input")}
                    />
                  );
                }
                return <p key={index}>{part.type} unknown part</p>;
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactMessageView({
  messages,
}: {
  messages: UIMessageWithCompleted[];
}) {
  // Track dismissed tool IDs and auto-dismiss interval
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const {
    visibleTools,
    textPart,
    userTextPart,
    lastCompleted,
    completedIds,
    completedIdsKey,
  } = useMemo(() => {
    const all = messages
      .filter((m) => m.parts.some(isToolUIPart))
      .flatMap((m) =>
        m.parts.filter(isToolUIPart).map((part) => {
          const rawId = (part as any).toolCallId as string | undefined;
          const fallbackId = `${m.id}-${getToolName(part as any)}`;
          const toolId = rawId || fallbackId;
          return {
            part,
            toolId,
            isExecuting: isVoiceToolExecutingState(part.state),
          };
        }),
      );

    const notDismissed = all.filter((t) => !dismissed.has(t.toolId));
    const executing = notDismissed.filter((t) => t.isExecuting);
    const completedAll = all.filter(
      (t) => !t.isExecuting && t.part.state.startsWith("output"),
    );
    const completed = notDismissed.filter(
      (t) => !t.isExecuting && t.part.state.startsWith("output"),
    );
    const lastCompleted = completed.at(-1);
    const visibleTools = lastCompleted
      ? [...executing, lastCompleted]
      : executing;
    const completedIds = completedAll.map((t) => t.toolId);

    const textPart = messages.findLast((m) => m.role === "assistant")
      ?.parts[0] as TextPart;
    const userTextPart = messages.findLast((m) => m.role === "user")
      ?.parts[0] as TextPart;

    return {
      visibleTools,
      textPart,
      userTextPart,
      lastCompleted,
      completedIds,
      completedIdsKey: completedIds.join("|"),
    };
  }, [messages, dismissed]);

  // Auto-dismiss the latest completed tool after a delay
  useEffect(() => {
    if (!lastCompleted) return;
    const t = setTimeout(() => {
      setDismissed((prev) =>
        addCompletedToolIdsToDismissed(
          prev,
          completedIds,
          lastCompleted.toolId,
          VOICE_TOOL_DISMISSED_MAX,
        ),
      );
    }, VOICE_TOOL_AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [lastCompleted?.toolId, completedIdsKey]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute bottom-6 max-h-[80vh] overflow-y-auto left-6 z-10 flex-col gap-2 hidden md:flex">
        {visibleTools.map(({ part: toolPart, toolId }) => {
          const isExecuting = toolPart?.state.startsWith("input");
          if (!toolPart) return null;
          return (
            <Dialog key={toolId}>
              <DialogTrigger asChild>
                <div className="transition-opacity max-w-xs w-full">
                  <Button
                    variant={"outline"}
                    size={"icon"}
                    className="w-full bg-card flex items-center gap-2 px-2 text-xs text-muted-foreground"
                  >
                    <WrenchIcon className="size-3.5" />
                    <span className="text-sm font-bold min-w-0 truncate mr-auto">
                      {getToolName(toolPart)}
                    </span>
                    {isExecuting ? (
                      <Loader className="size-3.5 animate-spin" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </Button>
                </div>
              </DialogTrigger>
              <DialogContent className="z-50 md:max-w-2xl! max-h-[80vh] overflow-y-auto p-8">
                <DialogTitle>{getToolName(toolPart)}</DialogTitle>
                <div className="flex flex-row gap-4 text-sm ">
                  <div className="w-1/2 min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 pt-2 pb-1 z-10">
                      <h5 className="text-muted-foreground text-sm font-medium">
                        Inputs
                      </h5>
                    </div>
                    <JsonView data={toolPart.input} />
                  </div>

                  <div className="w-1/2 min-w-0 pl-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pt-2 pb-1  z-10">
                      <h5 className="text-muted-foreground text-sm font-medium">
                        Outputs
                      </h5>
                    </div>
                    <JsonView
                      data={
                        toolPart.state === "output-available"
                          ? toolPart.output
                          : toolPart.state == "output-error"
                            ? toolPart.errorText
                            : {}
                      }
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>

      {/* User Transcription - Show when speaking or recently spoke */}
      {userTextPart && userTextPart.text && (
        <div className="absolute top-6 left-6 right-6 z-20">
          <div className="bg-card/90 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
            <p className="text-sm text-muted-foreground mb-1">You said:</p>
            <p className="text-base font-medium">
              {userTextPart.text?.split(" ").map((word, wordIndex) => (
                <span
                  key={wordIndex}
                  className="animate-in fade-in duration-1000"
                >
                  {word}{" "}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Current Message - Prominent */}
      {textPart && (
        <div className="w-full mx-auto h-full max-h-[80vh] overflow-y-auto px-4 lg:max-w-4xl flex-1 flex items-center">
          <div className="animate-in fade-in-50 duration-1000">
            <p className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight tracking-wide">
              {textPart.text?.split(" ").map((word, wordIndex) => (
                <span
                  key={wordIndex}
                  className="animate-in fade-in duration-5000"
                >
                  {word}{" "}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
