"use server";

import {
  generateObject,
  generateText,
  jsonSchema,
  LanguageModel,
  type UIMessage,
} from "ai";

import {
  CREATE_THREAD_TITLE_PROMPT,
  generateExampleToolSchemaPrompt,
} from "lib/ai/prompts";

import type { ChatModel, ChatThread } from "app-types/chat";

import {
  agentRepository,
  chatRepository,
  mcpMcpToolCustomizationRepository,
  mcpServerCustomizationRepository,
} from "lib/db/repository";
import { customModelProvider } from "lib/ai/models";
import { toAny } from "lib/utils";
import { McpServerCustomizationsPrompt, MCPToolInfo } from "app-types/mcp";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { getSession } from "auth/server";
import logger from "logger";

import { JSONSchema7 } from "json-schema";
import { ObjectJsonSchema7 } from "app-types/util";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { Agent } from "app-types/agent";

export async function getUserId() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function generateTitleFromUserMessageAction({
  message,
  model,
}: { message: UIMessage; model: LanguageModel }) {
  await getSession();
  const prompt = toAny(message.parts?.at(-1))?.text || "unknown";

  const environment =
    process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

  const { text: title } = await generateText({
    model,
    system: CREATE_THREAD_TITLE_PROMPT,
    prompt,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        operation: "generate-title-action",
        environment,
      },
    },
  });

  return title.trim();
}

export async function selectThreadWithMessagesAction(threadId: string) {
  const session = await getSession();
  const thread = await chatRepository.selectThread(threadId);

  if (!thread) {
    logger.error("Thread not found", threadId);
    return null;
  }
  if (thread.userId !== session?.user.id) {
    return null;
  }
  let messages =
    (await chatRepository.selectMessagesByThreadId(threadId)) ?? [];

  // CRITICAL FIX: Handle double-wrapped parts from json[] schema mismatch
  // The schema uses json("parts").array() creating PostgreSQL json[], but UIMessage["parts"]
  // is already an array. This causes parts to be stored/retrieved as [[{type: "text"}]]
  // instead of [{type: "text"}]. Unwrap at read time.
  messages = messages.map((m) => {
    let parts = m.parts;

    // Unwrap double-wrapped parts: [[{type: "text"}]] -> [{type: "text"}]
    if (
      parts &&
      Array.isArray(parts) &&
      parts.length === 1 &&
      Array.isArray(parts[0]) &&
      (parts[0].length === 0 ||
        (parts[0][0] &&
          typeof parts[0][0] === "object" &&
          "type" in parts[0][0]))
    ) {
      logger.info("Unwrapping double-wrapped parts array", {
        messageId: m.id,
        originalLength: parts.length,
        unwrappedLength: parts[0].length,
      });
      parts = parts[0];
    }

    // UI SAFETY PATCH: Some historical rows may have persisted assistant messages
    // with an empty parts array (from a prior regression). Patch them at read time
    // so the thread renders instead of disappearing. This does not mutate DB.
    if (m.role === "assistant" && (!parts || parts.length === 0)) {
      return {
        ...m,
        parts: [
          {
            type: "text" as const,
            text: "(previous assistant message contained no renderable content)",
          },
        ],
      } as any;
    }

    return { ...m, parts };
  });

  // DEBUG: Log parts order when loading from DB
  messages.forEach((m) => {
    if (m.role === "assistant" && m.parts?.length > 1) {
      logger.info("🔍 DEBUG: Parts order after load", {
        messageId: m.id,
        partsCount: m.parts.length,
        partsOrder: m.parts.map((p: any, i: number) => ({
          index: i,
          type: p.type,
          isToolPart: p.type?.startsWith("tool-"),
        })),
      });
    }
  });

  return { ...thread, messages };
}

export async function deleteMessageAction(messageId: string) {
  await chatRepository.deleteChatMessage(messageId);
}

export async function deleteThreadAction(threadId: string) {
  await chatRepository.deleteThread(threadId);
}

export async function deleteMessagesByChatIdAfterTimestampAction(
  messageId: string,
) {
  "use server";
  await chatRepository.deleteMessagesByChatIdAfterTimestamp(messageId);
}

export async function updateThreadAction(
  id: string,
  thread: Partial<Omit<ChatThread, "createdAt" | "updatedAt" | "userId">>,
) {
  const userId = await getUserId();
  await chatRepository.updateThread(id, { ...thread, userId });
}

export async function deleteThreadsAction() {
  const userId = await getUserId();
  await chatRepository.deleteAllThreads(userId);
}

export async function deleteUnarchivedThreadsAction() {
  const userId = await getUserId();
  await chatRepository.deleteUnarchivedThreads(userId);
}

export async function generateExampleToolSchemaAction(options: {
  model?: ChatModel;
  toolInfo: MCPToolInfo;
  prompt?: string;
}) {
  const model = customModelProvider.getModel(options.model);
  const environment =
    process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

  const schema = jsonSchema(
    toAny({
      ...options.toolInfo.inputSchema,
      properties: options.toolInfo.inputSchema?.properties ?? {},
      additionalProperties: false,
    }),
  );
  const { object } = await generateObject({
    model,
    schema,
    prompt: generateExampleToolSchemaPrompt({
      toolInfo: options.toolInfo,
      prompt: options.prompt,
    }),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        operation: "generate-tool-example",
        toolName: options.toolInfo.name,
        environment,
      },
    },
  });

  return object;
}

export async function rememberMcpServerCustomizationsAction(userId: string) {
  const key = CacheKeys.mcpServerCustomizations(userId);

  const cachedMcpServerCustomizations =
    await serverCache.get<Record<string, McpServerCustomizationsPrompt>>(key);
  if (cachedMcpServerCustomizations) {
    return cachedMcpServerCustomizations;
  }

  const mcpServerCustomizations =
    await mcpServerCustomizationRepository.selectByUserId(userId);
  const mcpToolCustomizations =
    await mcpMcpToolCustomizationRepository.selectByUserId(userId);

  const serverIds: string[] = [
    ...mcpServerCustomizations.map(
      (mcpServerCustomization) => mcpServerCustomization.mcpServerId,
    ),
    ...mcpToolCustomizations.map(
      (mcpToolCustomization) => mcpToolCustomization.mcpServerId,
    ),
  ];

  const prompts = Array.from(new Set(serverIds)).reduce(
    (acc, serverId) => {
      const sc = mcpServerCustomizations.find((v) => v.mcpServerId == serverId);
      const tc = mcpToolCustomizations.filter(
        (mcpToolCustomization) => mcpToolCustomization.mcpServerId === serverId,
      );
      const data: McpServerCustomizationsPrompt = {
        name: sc?.serverName || tc[0]?.serverName || "",
        id: serverId,
        prompt: sc?.prompt || "",
        tools: tc.reduce(
          (acc, v) => {
            acc[v.toolName] = v.prompt || "";
            return acc;
          },
          {} as Record<string, string>,
        ),
      };
      acc[serverId] = data;
      return acc;
    },
    {} as Record<string, McpServerCustomizationsPrompt>,
  );

  serverCache.set(key, prompts, 1000 * 60 * 30); // 30 minutes
  return prompts;
}

export async function generateObjectAction({
  model,
  prompt,
  schema,
}: {
  model?: ChatModel;
  prompt: {
    system?: string;
    user?: string;
  };
  schema: JSONSchema7 | ObjectJsonSchema7;
}) {
  const environment =
    process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

  const result = await generateObject({
    model: customModelProvider.getModel(model),
    system: prompt.system,
    prompt: prompt.user || "",
    schema: jsonSchemaToZod(schema),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        operation: "generate-object-action",
        provider: model?.provider ?? "unknown",
        model: model?.model ?? "unknown",
        environment,
      },
    },
  });
  return result.object;
}

export async function rememberAgentAction(
  agent: string | undefined,
  userId: string,
) {
  if (!agent) return undefined;
  const key = CacheKeys.agentInstructions(agent);
  let cachedAgent = await serverCache.get<Agent | null>(key);
  if (!cachedAgent) {
    cachedAgent = await agentRepository.selectAgentById(agent, userId);
    await serverCache.set(key, cachedAgent);
  }
  return cachedAgent as Agent | undefined;
}
