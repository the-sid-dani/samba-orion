# Architecture

> System design and component interactions for Samba AI

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React 19)                        │
├─────────────────────────────────────────────────────────────────┤
│  Zustand Store  │  Components (209)  │  Hooks (18)  │  Canvas   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js 15 App Router                         │
├─────────────────────────────────────────────────────────────────┤
│  Route Handlers (45+)  │  Middleware  │  Server Components      │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│  Better-Auth  │  │  Vercel AI SDK  │  │     Langfuse SDK        │
│   (OAuth)     │  │   (Streaming)   │  │   (Observability)       │
└───────────────┘  └────────┬────────┘  └─────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   LLM APIs    │  │   MCP Servers   │  │  App Tools      │
│ OpenAI/Claude │  │ (External)      │  │  (17 Charts)    │
└───────────────┘  └─────────────────┘  └─────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL + Drizzle ORM 0.41.0                    │
├─────────────────────────────────────────────────────────────────┤
│  18 Tables: threads, messages, agents, users, workflows, etc.  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Request Flow

### Chat API Flow

```
1. POST /api/chat
   ├── Auth middleware validates session
   ├── Load chat thread and agent context
   └── shared.chat.ts orchestrates tool loading

2. Tool Loading Pipeline (shared.chat.ts)
   ├── MCP Tools: Dynamic from connected servers
   ├── Workflow Tools: Published user workflows
   └── App Default Tools: WebSearch, Code, Artifacts

3. AI Processing (Vercel AI SDK)
   ├── streamText() with model selection
   ├── experimental_telemetry → Langfuse
   └── Tool calls execute in streaming context

4. Response Handling
   ├── Stream parts to client (text, tool-calls, artifacts)
   ├── Persist messages to PostgreSQL
   └── Canvas artifacts rendered in workspace
```

### MCP Protocol Integration

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Chat API      │────▶│   MCP Client     │────▶│  MCP Servers    │
│                 │     │ (src/lib/ai/mcp) │     │  (External)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Tool Conversion  │
                        │ MCP → Vercel SDK │
                        └──────────────────┘
```

---

## Component Architecture

### Server Components (Default)

```
src/app/
├── (auth)/layout.tsx      # Auth pages wrapper
├── (protected)/
│   ├── layout.tsx         # Main app layout with sidebar
│   └── page.tsx           # Chat interface entry
└── api/
    └── chat/route.ts      # Streaming chat endpoint
```

### Client Components

| Component | File | Purpose |
|-----------|------|---------|
| `ChatBot` | `chat-bot.tsx` | Main chat interface |
| `CanvasPanel` | `canvas-panel.tsx` | Artifact workspace |
| `WorkflowPanel` | `workflow/panel.tsx` | XYFlow canvas |
| `AgentDropdown` | `agent/dropdown.tsx` | Agent selector |
| `SelectModel` | `select-model.tsx` | LLM picker |

### State Architecture (Zustand)

```typescript
// src/app/store/index.ts
interface AppState {
  // Lists
  threadList: ChatThread[];
  mcpList: MCPServerInfo[];
  agentList: AgentSummary[];
  workflowToolList: WorkflowSummary[];
  
  // Current state
  currentThreadId: string | null;
  chatModel: ChatModel;
  toolChoice: "auto" | "none" | "manual";
  
  // Tool permissions
  allowedMcpServers: Record<string, AllowedMCPServer>;
  allowedAppDefaultToolkit: AppDefaultToolkit[];
  
  // UI state
  temporaryChat: { isOpen: boolean; instructions: string };
  voiceChat: { isOpen: boolean; options: VoiceOptions };
}
```

**Persistence:** Browser localStorage via Zustand `persist` middleware

---

## Database Architecture

### Schema Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    user      │     │   session    │     │   account    │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │◀────│ userId (FK)  │     │ userId (FK)  │
│ email        │     │ token        │     │ provider     │
│ role         │     │ expiresAt    │     │ accessToken  │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ chat_thread  │────▶│ chat_message │     │   agent      │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │     │ threadId(FK) │     │ id (PK)      │
│ userId (FK)  │     │ role         │     │ userId (FK)  │
│ title        │     │ parts (JSON) │     │ name         │
│ agentId (FK) │     │ toolInvocs   │     │ instructions │
└──────────────┘     └──────────────┘     │ allowedTools │
                                          └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  mcp_server  │     │   workflow   │     │   archive    │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ userId (FK)  │     │ userId (FK)  │     │ userId (FK)  │
│ name         │     │ name         │     │ name         │
│ config (JSON)│     │ published    │     │ itemsCount   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Table Summary

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user` | User accounts | email, role, image |
| `session` | Active sessions | token, expiresAt, userId |
| `account` | OAuth providers | provider, accessToken |
| `chat_thread` | Conversations | title, agentId, isPublic |
| `chat_message` | Messages | role, parts, toolInvocations |
| `agent` | Custom agents | instructions, allowedTools |
| `mcp_server` | MCP connections | name, config, isActive |
| `workflow` | Automation flows | structure, published |
| `archive` | Thread archives | name, itemsCount |
| `document` | Document storage | title, content, versions |

---

## Tool System Architecture

### Tool Loading Hierarchy

```
1. MCP Tools (Dynamic)
   └── Loaded per-request from connected MCP servers

2. Workflow Tools (User-defined)
   └── Published workflows exposed as callable tools

3. App Default Tools (Built-in)
   ├── WebSearch: webSearch, webContent
   ├── Http: http requests
   ├── Code: JavaScript/Python execution
   └── Artifacts: 17 chart tools
```

### Artifact Tool Pattern

```typescript
// Pattern from src/lib/ai/tools/artifacts/
export const barChartArtifactTool = createArtifactTool({
  name: "create_bar_chart",
  description: "Create bar chart visualization",
  schema: z.object({
    data: z.array(z.object({...})),
    config: z.object({...})
  }),
  execute: async function* (params) {
    yield { progress: "Building chart..." };
    return {
      shouldCreateArtifact: true,  // Critical for Canvas
      type: "bar-chart",
      data: params.data,
      config: params.config
    };
  }
});
```

---

## Observability Architecture

### Langfuse Integration

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  streamText()   │────▶│  Telemetry      │────▶│   Langfuse      │
│                 │     │  Processor      │     │   Cloud/Self    │
└─────────────────┘     └─────────────────┘     └─────────────────┘

Configuration: src/instrumentation.ts
├── register() hook (Next.js 15)
├── LangfuseSpanProcessor
└── Environment validation
```

### Traced Operations

| Operation | Span Type | Metadata |
|-----------|-----------|----------|
| Chat completion | generation | model, tokens, cost |
| Tool execution | span | tool_name, duration |
| MCP calls | span | server, tool |
| Workflow execution | trace | workflow_id, steps |

---

## Security Architecture

### Authentication Flow

```
Better-Auth (1.3.7)
├── OAuth Providers: Google, GitHub, Microsoft
├── Email/Password with verification
└── Session management with secure cookies

Middleware: src/middleware.ts
├── Protected route validation
├── Session refresh
└── CORS handling
```

### Authorization

```
Role-based access:
├── user: Standard access
├── admin: Full access + user management
└── agent_admin: Agent + user management

Agent permissions:
├── Per-user agent visibility
├── Tool access restrictions
└── MCP server allowlists
```

---

*Generated from source code analysis on 2025-12-30*

