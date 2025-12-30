import { NextRequest } from "next/server";
import { getSession } from "auth/server";
import { AllowedMCPServer, VercelAIMcpTool } from "app-types/mcp";
import { userRepository } from "lib/db/repository";
import {
  filterMcpServerCustomizations,
  filterMCPToolsByAllowedMCPServers,
  mergeSystemPrompt,
  loadAppDefaultTools,
} from "../shared.chat";
import { AppDefaultToolkit } from "lib/ai/tools";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildSpeechSystemPrompt,
} from "lib/ai/prompts";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { safe } from "ts-safe";
import { DEFAULT_VOICE_TOOLS } from "lib/ai/speech";
import {
  rememberAgentAction,
  rememberMcpServerCustomizationsAction,
} from "../actions";
import globalLogger from "lib/logger";
import { colorize } from "consola/utils";
import { zodSchema } from "ai";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `OpenAI Realtime API: `),
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not set" }),
        {
          status: 500,
        },
      );
    }

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { voice, allowedMcpServers, agentId, allowedAppDefaultToolkit } =
      (await request.json()) as {
        model: string;
        voice: string;
        agentId?: string;
        allowedMcpServers: Record<string, AllowedMCPServer>;
        allowedAppDefaultToolkit?: string[];
      };

    const mcpTools = await mcpClientsManager.tools();

    const agent = await rememberAgentAction(agentId, session.user.id);

    agent && logger.info(`Agent: ${agent.name}`);

    const allowedMcpTools = safe(mcpTools)
      .map((tools) => {
        return filterMCPToolsByAllowedMCPServers(tools, allowedMcpServers);
      })
      .orElse(undefined);

    const toolNames = Object.keys(allowedMcpTools ?? {});

    if (toolNames.length > 0) {
      logger.info(`${toolNames.length} tools found`);
    } else {
      logger.info(`No tools found`);
    }

    const userPreferences = await userRepository.getPreferences(
      session.user.id,
    );

    const mcpServerCustomizations = await safe()
      .map(() => {
        if (Object.keys(allowedMcpTools ?? {}).length === 0)
          throw new Error("No tools found");
        return rememberMcpServerCustomizationsAction(session.user.id);
      })
      .map((v) => filterMcpServerCustomizations(allowedMcpTools!, v))
      .orElse({});

    const openAITools = Object.entries(allowedMcpTools ?? {}).map(
      ([name, tool]) => {
        return vercelAIToolToOpenAITool(tool, name);
      },
    );

    const systemPrompt = mergeSystemPrompt(
      buildSpeechSystemPrompt(
        session.user,
        userPreferences ?? undefined,
        agent,
      ),
      buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
    );

    // Load app default tools (web search, charts, etc.)
    // Coerce string[] to AppDefaultToolkit[] by filtering valid enum values
    const validToolkits = (allowedAppDefaultToolkit ?? []).filter(
      (v): v is AppDefaultToolkit =>
        Object.values(AppDefaultToolkit).includes(v as AppDefaultToolkit),
    );
    const appDefaultTools = await loadAppDefaultTools({
      allowedAppDefaultToolkit:
        validToolkits.length > 0 ? validToolkits : undefined,
    });

    const appToolsForOpenAI = Object.entries(appDefaultTools).map(
      ([name, tool]) => {
        return vercelAIToolToOpenAITool(tool, name);
      },
    );

    if (Object.keys(appDefaultTools).length > 0) {
      logger.info(
        `${Object.keys(appDefaultTools).length} app default tools loaded`,
      );
    }

    const bindingTools = [
      ...openAITools,
      ...appToolsForOpenAI,
      ...DEFAULT_VOICE_TOOLS,
    ];

    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          audio: {
            output: {
              voice: voice || "marin",
            },
          },
        },
      }),
    });

    const sessionData = await r.json();

    // Include session configuration for client-side session.update event
    const responseData = {
      ...sessionData,
      sessionConfig: {
        instructions: systemPrompt,
        tools: bindingTools,
        input_audio_transcription: {
          model: "whisper-1",
        },
        audio: {
          input: {
            format: {
              type: "audio/pcm",
              rate: 24000,
            },
            turn_detection: {
              type: "semantic_vad",
            },
          },
          output: {
            format: {
              type: "audio/pcm",
              rate: 24000,
            },
            voice: voice || "marin",
          },
        },
        output_modalities: ["audio"],
      },
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

function vercelAIToolToOpenAITool(tool: VercelAIMcpTool, name: string) {
  // Convert Zod schema to JSON Schema format for OpenAI
  let parameters;

  try {
    // Check if inputSchema exists and is a Zod schema
    if (tool.inputSchema && typeof tool.inputSchema === "object") {
      // If already has jsonSchema property (MCP tools), use it
      if ("jsonSchema" in tool.inputSchema) {
        parameters = (tool.inputSchema as any).jsonSchema;
      } else {
        // Convert Zod schema to JSON Schema (app default tools)
        const schema = zodSchema(tool.inputSchema);
        parameters = schema.jsonSchema;
      }
    } else {
      // Fallback for tools without schema
      parameters = {
        type: "object",
        properties: {},
        required: [],
      };
    }
  } catch (error) {
    logger.error(`Failed to convert schema for tool ${name}:`, error);
    parameters = {
      type: "object",
      properties: {},
      required: [],
    };
  }

  return {
    name,
    type: "function",
    description: tool.description,
    parameters,
  };
}
