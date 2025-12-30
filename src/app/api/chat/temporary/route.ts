import { redirect } from "next/navigation";
import { getSession } from "auth/server";
import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { observe } from "@langfuse/tracing";
import { after } from "next/server";

import { langfuseSpanProcessor } from "@/instrumentation";
import { customModelProvider } from "lib/ai/models";
import globalLogger from "logger";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { userRepository } from "lib/db/repository";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Temporary Chat API: `),
});

const handler = async (request: Request) => {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return redirect("/sign-in");
    }

    const { messages, chatModel, instructions } = json as {
      messages: UIMessage[];
      chatModel?: {
        provider: string;
        model: string;
      };
      instructions?: string;
    };

    logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);
    const model = customModelProvider.getModel(chatModel);
    const userPreferences =
      (await userRepository.getPreferences(session.user.id)) || undefined;

    const environment =
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

    const result = streamText({
      model,
      system: `${buildUserSystemPrompt(session.user, userPreferences)} ${
        instructions ? `\n\n${instructions}` : ""
      }`.trim(),
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          userId: session.user.id,
          provider: chatModel?.provider ?? "unknown",
          model: chatModel?.model ?? "unknown",
          environment,
          operation: "temporary-chat",
          hasInstructions: !!instructions,
        },
      },
    });

    // Force flush for serverless environments
    after(async () => {
      await langfuseSpanProcessor.forceFlush();
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
};

export const POST = observe(handler, {
  name: "temporary-chat-handler",
  endOnExit: false,
});
