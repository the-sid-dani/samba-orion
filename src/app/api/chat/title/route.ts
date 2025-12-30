import { smoothStream, streamText } from "ai";
import { observe } from "@langfuse/tracing";
import { after } from "next/server";

import { langfuseSpanProcessor } from "@/instrumentation";
import { customModelProvider } from "lib/ai/models";
import { CREATE_THREAD_TITLE_PROMPT } from "lib/ai/prompts";
import globalLogger from "logger";
import { ChatModel } from "app-types/chat";
import { chatRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { handleError } from "../shared.chat";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Title API: `),
});

const handler = async (request: Request) => {
  try {
    const json = await request.json();

    const {
      chatModel,
      message = "hello",
      threadId,
    } = json as {
      chatModel?: ChatModel;
      message: string;
      threadId: string;
    };

    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    logger.info(
      `chatModel: ${chatModel?.provider}/${chatModel?.model}, threadId: ${threadId}`,
    );

    const environment =
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

    const result = streamText({
      model: customModelProvider.getModel(chatModel),
      system: CREATE_THREAD_TITLE_PROMPT,
      experimental_transform: smoothStream({ chunking: "word" }),
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          threadId,
          provider: chatModel?.provider ?? "unknown",
          model: chatModel?.model ?? "unknown",
          environment,
          operation: "title-generation",
        },
      },
      prompt: message,
      abortSignal: request.signal,
      onFinish: (ctx) => {
        chatRepository
          .upsertThread({
            id: threadId,
            title: ctx.text,
            userId: session.user.id,
          })
          .catch((err) => logger.error(err));
      },
    });

    // Force flush for serverless environments
    after(async () => {
      await langfuseSpanProcessor.forceFlush();
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    return new Response(handleError(err), { status: 500 });
  }
};

export const POST = observe(handler, {
  name: "title-generation-handler",
  endOnExit: false,
});
