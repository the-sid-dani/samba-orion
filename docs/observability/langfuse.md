# Langfuse Observability

Complete AI observability for Samba AI — traces, costs, tokens, and performance monitoring.

---

## Overview

Samba AI uses **Langfuse SDK v4** with OpenTelemetry for comprehensive AI observability:

- **Trace all AI conversations** — Every chat, tool call, and agent interaction
- **Track costs** — Token usage and cost per conversation
- **Debug issues** — Full trace visibility with latency breakdowns
- **Monitor performance** — Identify slow responses and bottlenecks

---

## Quick Setup

### 1. Get Langfuse Credentials

1. Sign up at [cloud.langfuse.com](https://cloud.langfuse.com)
2. Create a project
3. Go to **Settings → API Keys**
4. Copy your public and secret keys

### 2. Configure Environment

Add to your `.env`:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# Optional: Self-hosted instance
# LANGFUSE_BASE_URL=https://your-langfuse-instance.com
```

### 3. Verify

Start the app — you should see:

```
✅ Langfuse configured: https://cloud.langfuse.com [development]
```

Traces will now appear in your Langfuse dashboard.

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  src/instrumentation.ts                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  NodeTracerProvider + LangfuseSpanProcessor         │   │
│  │  - Validates env vars at startup                     │   │
│  │  - Filters out Next.js infrastructure spans          │   │
│  │  - Exports AI traces to Langfuse                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Chat API (src/app/api/chat/route.ts)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  streamText({                                        │   │
│  │    experimental_telemetry: {                         │   │
│  │      isEnabled: true,                                │   │
│  │      functionId: "chat",                             │   │
│  │      metadata: { userId, threadId, model }           │   │
│  │    }                                                 │   │
│  │  })                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Langfuse Dashboard                                         │
│  - Traces with full conversation context                    │
│  - Token usage and cost breakdown                           │
│  - Latency analysis                                         │
│  - Error tracking                                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/instrumentation.ts` | OpenTelemetry setup, span processor |
| `src/app/api/chat/route.ts` | Telemetry metadata per request |

---

## Telemetry in Chat API

The Chat API adds metadata to each trace:

```typescript
experimental_telemetry: {
  isEnabled: true,
  functionId: agent?.name ? `agent-${agent.name}-chat` : "samba-ai-chat",
  metadata: {
    userId,
    threadId,
    modelId: model.id,
    agentId: agent?.id,
    agentName: agent?.name,
    toolCount: tools.length,
  },
}
```

This enables filtering traces by user, thread, agent, or model in Langfuse.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LANGFUSE_PUBLIC_KEY` | Yes | — | Public key from Langfuse dashboard |
| `LANGFUSE_SECRET_KEY` | Yes | — | Secret key from Langfuse dashboard |
| `LANGFUSE_BASE_URL` | No | `https://cloud.langfuse.com` | Self-hosted instance URL |
| `LANGFUSE_HOST` | No | — | Alias for `LANGFUSE_BASE_URL` |

---

## Troubleshooting

### Traces Not Appearing

1. **Check startup logs** — Look for `✅ Langfuse configured` message
2. **Verify credentials** — Ensure keys are correct and not expired
3. **Check network** — Ensure Langfuse endpoint is reachable
4. **Wait a moment** — Traces can take 10-30 seconds to appear

### Missing Configuration Warning

If you see:
```
⚠️ LANGFUSE CONFIGURATION ERROR
```

Add the required environment variables to your `.env` file.

### Self-Hosted Instance

For self-hosted Langfuse:

```bash
LANGFUSE_BASE_URL=https://langfuse.yourcompany.com
```

---

## What Gets Traced

| Event | Traced | Metadata |
|-------|--------|----------|
| Chat messages | ✅ | User, thread, model, agent |
| Tool calls | ✅ | Tool name, duration, result |
| MCP tool executions | ✅ | Server, tool, arguments |
| Streaming responses | ✅ | Token counts, latency |
| Errors | ✅ | Error type, stack trace |

---

## Cost Tracking

Langfuse automatically calculates costs based on:
- Model pricing (OpenAI, Anthropic, etc.)
- Input/output token counts
- Per-conversation and aggregate views

View costs in the Langfuse dashboard under **Analytics → Costs**.

---

## Best Practices

1. **Always enable telemetry in production** — Essential for debugging
2. **Use meaningful function IDs** — `agent-github-manager-chat` vs `chat`
3. **Include user context** — Enables per-user analysis
4. **Monitor the dashboard** — Set up alerts for errors and cost spikes

---

## Reference

- [Langfuse Documentation](https://langfuse.com/docs)
- [Vercel AI SDK Telemetry](https://sdk.vercel.ai/docs/ai-sdk-core/telemetry)
- [Archived Langfuse Docs](./../_archive/langfuse-reference/) — Original reference materials

