# Samba AI

**Enterprise AI Platform** — Multi-provider LLM chat with MCP tools, visual workflows, custom agents, and real-time data visualization.

[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-v5.0.26-black)](https://sdk.vercel.ai/)
[![Built on better-chatbot](https://img.shields.io/badge/Built_on-better--chatbot-blue)](https://github.com/cgoinglove/better-chatbot)

> **Built on [better-chatbot](https://github.com/cgoinglove/better-chatbot)** — An excellent open-source AI chat platform by [@cgoinglove](https://github.com/cgoinglove). We extend our thanks to the original project and its contributors.

---

## What Is This?

Samba AI is our internal AI platform for conversations, data visualization, and workflow automation. It provides:

- **Unified LLM Access** — OpenAI, Anthropic, Google, xAI, Ollama, OpenRouter through one interface
- **MCP Protocol** — Dynamic tool loading from external servers (Playwright, databases, APIs)
- **Custom Agents** — Create AI personas with specific instructions and tool permissions
- **Visual Workflows** — Drag-and-drop automation builder that becomes callable tools
- **Canvas Workspace** — 17+ chart types for real-time data visualization
- **Voice Assistant** — OpenAI Realtime API with full tool integration
- **Observability** — Complete tracing via Langfuse (costs, tokens, performance)

---

## Quick Start

> **⚠️ Port Requirement**: Must run on `localhost:3000` — auth and observability are hardcoded to this port.

```bash
# 1. Install dependencies (auto-generates .env)
pnpm i

# 2. Start PostgreSQL
pnpm docker:pg

# 3. Add at least one LLM API key to .env
# OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY

# 4. Run the app
pnpm dev                        # Development with hot-reload
# OR
pnpm build:local && pnpm start  # Production build
```

Open [http://localhost:3000](http://localhost:3000) — database tables auto-create on first run.

---

## Essential Commands

```bash
# Development
pnpm dev                    # Dev server (Turbopack)
pnpm build:local && pnpm start  # Production build

# Quality
pnpm check                  # Lint + types + tests (run before PRs)
pnpm test                   # Unit tests (Vitest)
pnpm test:e2e              # E2E tests (Playwright)

# Database
pnpm db:generate           # Generate migrations
pnpm db:push              # Push schema changes
pnpm db:studio            # Open Drizzle Studio (DB GUI)

# Docker
pnpm docker:pg             # Start PostgreSQL container
pnpm docker-compose:up     # Full stack deployment
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js 15 App                          │
├─────────────────────────────────────────────────────────────────┤
│  /api/chat/route.ts          │  Vercel AI SDK streaming         │
│  streamText() + telemetry    │  Langfuse observability          │
├──────────────────────────────┼──────────────────────────────────┤
│  Tool Loading Pipeline       │  MCP + Workflow + App Tools      │
│  src/app/api/chat/shared.chat.ts                                │
├─────────────────────────────────────────────────────────────────┤
│  Canvas System               │  17 chart tools → multi-grid     │
│  src/lib/ai/tools/artifacts/ │  Progressive streaming           │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL + Drizzle ORM    │  Repository pattern              │
│  src/lib/db/pg/              │  16 migrations                   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Flow

1. **Chat API** (`/api/chat/route.ts`) — Handles streaming with Langfuse tracing
2. **Tool Loading** (`shared.chat.ts`) — Merges MCP, workflow, and app tools
3. **AI Processing** — `streamText()` with `experimental_telemetry`
4. **Canvas** — Chart tools stream to workspace via `async function*`
5. **Persistence** — Drizzle ORM repositories for messages/state

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/chat/          # Main chat API (route.ts, shared.chat.ts)
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (chat)/            # Chat interface
│   └── (admin)/           # Admin dashboard
├── components/
│   ├── agent/             # Agent creation/management (6 components)
│   ├── canvas/            # Chart workspace
│   ├── chat/              # Chat UI components
│   ├── layouts/           # Sidebar, headers
│   ├── ui/                # Radix-based primitives
│   └── workflow/          # Visual workflow builder
├── lib/
│   ├── ai/
│   │   ├── mcp/           # MCP protocol integration
│   │   ├── tools/         # Built-in tools + artifacts
│   │   └── models.ts      # AI provider configuration
│   ├── auth/              # Better-Auth setup
│   └── db/pg/             # Drizzle schema + repositories
├── hooks/                  # React hooks
└── instrumentation.ts      # Langfuse setup (CRITICAL - only one file!)
```

---

## Key Files to Know

| Purpose | File |
|---------|------|
| **Chat API** | `src/app/api/chat/route.ts` |
| **Tool Loading** | `src/app/api/chat/shared.chat.ts` |
| **AI Models** | `src/lib/ai/models.ts` |
| **DB Schema** | `src/lib/db/pg/schema.pg.ts` |
| **Observability** | `src/instrumentation.ts` |
| **Main Chat UI** | `src/components/chat-bot.tsx` |
| **Canvas Panel** | `src/components/canvas-panel.tsx` |
| **Agent System** | `src/components/agent/` |
| **Workflows** | `src/components/workflow/` |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **AI Framework** | Vercel AI SDK v5.0.26 |
| **Observability** | Langfuse SDK v4.1.0 + OpenTelemetry |
| **Framework** | Next.js 15.3.2, React 19.1.1 |
| **Database** | PostgreSQL, Drizzle ORM 0.41.0 |
| **Auth** | Better-Auth 1.3.7 (OAuth + email) |
| **UI** | Tailwind CSS, Radix UI, Framer Motion |
| **Testing** | Vitest, Playwright |
| **Code Quality** | TypeScript 5.9.2, Biome |

---

## Key Features

### 🤖 Multi-Provider AI
Access OpenAI, Anthropic, Google AI, xAI, Ollama, and OpenRouter through unified Vercel AI SDK interface.

### 🛠️ MCP Protocol
Dynamic tool loading from external servers. Test connections at `/mcp` page.

### 🎯 Custom Agents
Create AI personas with:
- Custom system prompts and instructions
- Tool access control (which MCP servers, workflows, tools)
- Granular permissions (use/edit, public/private/admin)

### 📊 Canvas Workspace
17+ chart types with progressive building:
- Bar, line, pie, area, funnel, radar, scatter
- Treemap, sankey, radial bar, composed charts
- Geographic (world/US maps with TopoJSON)
- Gauge, calendar heatmaps

### ⚡ Visual Workflows
Drag-and-drop builder (XYFlow) — connect LLM and Tool nodes, publish as callable `@workflow` tools.

### 🎙️ Voice Assistant
OpenAI Realtime API with full MCP tool support.

### 🔍 Observability
Langfuse integration tracks:
- Conversation costs and token usage
- Tool execution and MCP server health
- Performance metrics and debugging

---

## Environment Variables

```bash
# Required: At least one LLM provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Required: Database & Auth
POSTGRES_URL=postgres://postgres:password@localhost:5433/better_chatbot
BETTER_AUTH_SECRET=...  # Auto-generated

# Recommended
EXA_API_KEY=...         # Web search (free tier: 1000 req/month)

# Optional
LANGFUSE_PUBLIC_KEY=... # Observability
LANGFUSE_SECRET_KEY=...
LANGFUSE_BASEURL=...

# Admin Controls
DISABLE_SIGN_UP=0       # 1 = disable registration
```

See `.env.example` for full list.

---

## Development Notes

### Critical Rules

1. **Port 3000 Only** — Auth and Langfuse are hardcoded to `localhost:3000`
2. **One Instrumentation File** — Only `src/instrumentation.ts` should exist
3. **Agent Tool Config** — Never disable tools based on mentions; agents ALWAYS need tool configuration

### Patterns

- **Database**: Repository pattern, generate migrations with `pnpm db:generate`
- **Components**: Server components for data, `"use client"` for interactivity
- **AI Tools**: Convert to Vercel AI SDK interface, enable `experimental_telemetry`
- **Canvas Charts**: Use `async function*` with `yield`, return `shouldCreateArtifact: true`

### Debugging

- `/mcp` page — Check MCP server connections
- `pnpm db:studio` — Inspect database
- `DEBUG_CHAT_PERSISTENCE=1` — Verbose chat logging

---

## Documentation

### Developer Docs

| Doc | Purpose |
|-----|---------|
| [`docs/index.md`](./docs/index.md) | **Documentation hub** — start here |
| `CLAUDE.md` | AI assistant context (architecture, patterns) |
| `docs/architecture/` | Core system docs (AI SDK, Canvas, persistence) |
| `docs/guides/` | Setup guides (Docker, Vercel, OAuth, MCP) |
| `docs/observability/` | Langfuse tracing and monitoring |
| `docs/incidents/` | Historical issues and resolutions |

### Project Knowledge (`_bmad-output/`)

Generated project documentation and planning artifacts:

| Folder | Contents |
|--------|----------|
| `_bmad-output/docs/` | API reference, architecture, data models, deployment guide |
| `_bmad-output/planning-artifacts/` | Product brief, implementation readiness reports |
| `_bmad-output/implementation-artifacts/` | Tech specs for features and fixes |
| `_bmad-output/analysis/` | Brainstorming sessions and research |

---

## Testing

```bash
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests
pnpm test:e2e:ui    # E2E with Playwright UI
```

Tests are in `tests/` — mirrors `src/` structure.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Acknowledgments

**Samba AI** is built on [better-chatbot](https://github.com/cgoinglove/better-chatbot), an open-source AI chat platform created by [@cgoinglove](https://github.com/cgoinglove). We are grateful for their work and the open-source community that makes projects like this possible.

---

*Samba AI v1.21.0*
