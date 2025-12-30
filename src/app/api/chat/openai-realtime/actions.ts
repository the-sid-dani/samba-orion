"use server";

import { APP_DEFAULT_TOOL_KIT } from "lib/ai/tools/tool-kit";
import { DefaultToolNameType } from "lib/ai/tools";
import { Tool } from "ai";
import logger from "lib/logger";
import { chatRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { generateUUID } from "lib/utils";

/**
 * Execute app default tools (charts, code, web search) from voice chat
 * Handles both async generators (chart tools) and regular async functions
 */
export async function callAppDefaultToolAction(toolName: string, args: any) {
  try {
    logger.info(`Voice chat calling app default tool: ${toolName}`);
    logger.info(`Raw args:`, JSON.stringify(args, null, 2));

    // Search across all toolkits for the tool
    let tool: Tool | undefined = undefined;
    let toolkitName = "";

    for (const [toolkit, tools] of Object.entries(APP_DEFAULT_TOOL_KIT)) {
      const toolsMap = tools as Partial<Record<DefaultToolNameType, Tool>>;
      if (toolName in toolsMap) {
        tool = toolsMap[toolName as DefaultToolNameType];
        toolkitName = toolkit;
        break;
      }
    }

    if (!tool) {
      logger.error(`App default tool not found: ${toolName}`);
      throw new Error(`Tool ${toolName} not found in APP_DEFAULT_TOOL_KIT`);
    }

    logger.info(`Executing tool from toolkit: ${toolkitName}`);

    // CRITICAL: Validate and coerce parameters through Zod schema (like Vercel AI SDK does)
    let validatedArgs = args;
    if (tool.inputSchema && "parse" in tool.inputSchema) {
      try {
        validatedArgs = tool.inputSchema.parse(args);
        logger.info(`Parameters validated successfully through Zod schema`);
      } catch (zodError: any) {
        logger.error(`Zod validation failed for ${toolName}:`, {
          error: zodError.message,
          issues: zodError.issues,
          rawArgs: args,
        });
        throw new Error(
          `Invalid parameters for ${toolName}: ${zodError.message}`,
        );
      }
    }

    // Execute the tool with validated parameters (same as Vercel AI SDK does)
    if (!tool.execute) {
      throw new Error(`Tool ${toolName} does not have an execute function`);
    }
    const result = tool.execute(validatedArgs, {
      toolCallId: `voice-${Date.now()}`,
      abortSignal: new AbortController().signal,
      messages: [],
    });

    // Check if it's an async generator (chart tools use this pattern)
    if (Symbol.asyncIterator in Object(result)) {
      logger.info(`Tool ${toolName} is async generator, consuming yields`);

      // Consume all yields and return final value
      let finalValue;
      let yieldCount = 0;

      try {
        for await (const value of result) {
          yieldCount++;
          finalValue = value;
          logger.info(`Yield #${yieldCount} from ${toolName}:`, {
            status: value.status,
            hasChartData: !!value.chartData,
            hasShouldCreateArtifact: !!value.shouldCreateArtifact,
            progress: value.progress,
          });
        }

        logger.info(
          `Tool ${toolName} completed after ${yieldCount} yields, returning final value:`,
          {
            status: finalValue?.status,
            hasChartData: !!finalValue?.chartData,
            shouldCreateArtifact: finalValue?.shouldCreateArtifact,
          },
        );
        return finalValue;
      } catch (genError) {
        logger.error(
          `Error during async generator consumption for ${toolName}:`,
          {
            error: genError,
            yieldCount,
            lastValue: finalValue,
          },
        );
        throw genError;
      }
    }

    // Regular async function
    logger.info(`Tool ${toolName} is regular async, awaiting result`);
    return await result;
  } catch (error) {
    logger.error(`Error executing app default tool ${toolName}:`, error);
    throw error;
  }
}

/**
 * Persist voice chat message to database
 * Called from client-side voice chat hook via server action
 */
export async function persistVoiceMessageAction(message: {
  threadId: string;
  id: string;
  role: "user" | "assistant";
  parts: any[];
  metadata?: any;
}) {
  const session = await getSession();
  if (!session?.user.id) {
    throw new Error("Unauthorized");
  }

  logger.info(`Persisting voice message: ${message.id}`);

  // Ensure thread exists before persisting message
  await getOrCreateVoiceThreadAction(message.threadId);

  await chatRepository.upsertMessage({
    threadId: message.threadId,
    id: message.id,
    role: message.role,
    parts: message.parts,
    metadata: {
      ...message.metadata,
      source: "voice",
      timestamp: new Date().toISOString(),
    },
  });

  logger.info(`Voice message persisted successfully: ${message.id}`);
}

/**
 * Get or create thread for voice chat
 * Ensures voice messages have a valid thread
 */
export async function getOrCreateVoiceThreadAction(threadId?: string) {
  const session = await getSession();
  if (!session?.user.id) {
    throw new Error("Unauthorized");
  }

  if (threadId) {
    const existing = await chatRepository.selectThreadDetails(threadId);
    if (existing && existing.userId === session.user.id) {
      return existing;
    }
  }

  // Create new thread
  const newThreadId = threadId || generateUUID();
  await chatRepository.insertThread({
    id: newThreadId,
    title: "Voice Chat",
    userId: session.user.id,
  });

  return await chatRepository.selectThreadDetails(newThreadId);
}

/**
 * Load recent messages for conversation history
 * Returns last N messages in format compatible with voice chat UI
 */
export async function loadThreadMessagesAction(
  threadId: string,
  limit: number = 20,
) {
  const session = await getSession();
  if (!session?.user.id) {
    throw new Error("Unauthorized");
  }

  const thread = await chatRepository.selectThreadDetails(threadId);

  if (!thread || thread.userId !== session.user.id) {
    logger.warn(`Thread ${threadId} not found or unauthorized`);
    return [];
  }

  const messages = thread.messages || [];

  // Return last N messages (simple truncation)
  const recentMessages = messages.slice(-limit);

  logger.info(
    `Loaded ${recentMessages.length} messages for thread ${threadId}`,
  );

  return recentMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: msg.parts,
    completed: true,
  }));
}
