# Development Guide

> Setup, patterns, and best practices for Samba AI development

---

## Prerequisites

- **Node.js:** 20+ (23 recommended)
- **pnpm:** 9+ (corepack enabled)
- **Docker:** For PostgreSQL
- **Git:** Version control

---

## Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd samba-orion

# 2. Install dependencies
pnpm install

# 3. Start PostgreSQL
pnpm docker:pg

# 4. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 5. Push database schema
pnpm db:push

# 6. Start development server
pnpm dev
```

**Access:** http://localhost:3000

> ⚠️ **Critical:** This project ONLY works on `localhost:3000`. The auth system and observability require this exact port.

---

## Environment Variables

### Required

```bash
# Database
POSTGRES_URL=postgres://user:pass@localhost:5432/samba

# Authentication
BETTER_AUTH_SECRET=<random-32-char-string>
BETTER_AUTH_URL=http://localhost:3000

# At least one AI provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Optional

```bash
# Additional AI providers
XAI_API_KEY=...
OPENROUTER_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434

# OAuth providers
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...

# Observability
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Web search
EXA_API_KEY=...
```

---

## Project Structure

```
samba-orion/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── (protected)/        # Authenticated routes
│   │   ├── api/                # API route handlers
│   │   └── store/              # Zustand store
│   ├── components/             # React components
│   │   ├── ui/                 # Base primitives (Radix)
│   │   ├── agent/              # Agent management
│   │   ├── canvas/             # Data visualization
│   │   ├── workflow/           # XYFlow editor
│   │   └── tool-invocation/    # Tool renderers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Core logic
│   │   ├── ai/                 # AI providers, tools, MCP
│   │   ├── auth/               # Better-Auth config
│   │   ├── db/                 # Drizzle ORM
│   │   └── observability/      # Langfuse
│   ├── types/                  # TypeScript interfaces
│   ├── middleware.ts           # Auth middleware
│   └── instrumentation.ts      # Langfuse setup
├── app-types/                  # Shared type definitions
├── public/                     # Static assets
├── tests/                      # Test suites
└── docker/                     # Container configs
```

---

## Development Commands

### Core

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm dev:https` | Dev server with HTTPS |
| `pnpm build` | Production build |
| `pnpm build:local` | Local build (no-lint) |
| `pnpm start` | Start production server |

### Quality

| Command | Description |
|---------|-------------|
| `pnpm lint` | Run Biome linter |
| `pnpm format` | Format code with Biome |
| `pnpm check-types` | TypeScript type check |
| `pnpm check` | All checks (lint + types) |

### Database

| Command | Description |
|---------|-------------|
| `pnpm docker:pg` | Start PostgreSQL container |
| `pnpm db:generate` | Generate migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Open Drizzle Studio |

### Testing

| Command | Description |
|---------|-------------|
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:watch` | Watch mode |
| `pnpm test:e2e` | Run Playwright E2E |
| `pnpm test:e2e:ui` | Playwright UI mode |

---

## Coding Patterns

### Server Components (Default)

```typescript
// src/app/(protected)/page.tsx
import { getSession } from "lib/auth/session";

export default async function HomePage() {
  const session = await getSession();
  
  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
    </div>
  );
}
```

### Client Components

```typescript
// src/components/chat-bot.tsx
"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export function ChatBot() {
  const { messages, append, isLoading } = useChat({
    api: "/api/chat",
  });
  
  return (
    // ...
  );
}
```

### API Route Handlers

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  return NextResponse.json({ data: "..." });
}
```

### Database Access (Repository Pattern)

```typescript
// src/lib/db/pg/repositories/thread.repository.pg.ts
import { db } from "../connection";
import { ChatThreadSchema } from "../schema.pg";
import { eq } from "drizzle-orm";

export const threadRepository = {
  async findByUserId(userId: string) {
    return db.query.ChatThreadSchema.findMany({
      where: eq(ChatThreadSchema.userId, userId),
      orderBy: (threads, { desc }) => [desc(threads.updatedAt)],
    });
  },
  
  async create(data: NewThread) {
    const [thread] = await db.insert(ChatThreadSchema)
      .values(data)
      .returning();
    return thread;
  },
};
```

### Zustand Store

```typescript
// Usage in components
"use client";

import { appStore } from "app/store";

function MyComponent() {
  const threadList = appStore((state) => state.threadList);
  const mutate = appStore((state) => state.mutate);
  
  const addThread = (thread: ChatThread) => {
    mutate((state) => ({
      threadList: [thread, ...state.threadList],
    }));
  };
}
```

---

## AI Development

### Adding New AI Provider

1. Add to model registry:

```typescript
// src/lib/ai/models.ts
export const myProvider = createOpenAI({
  apiKey: process.env.MY_PROVIDER_API_KEY,
  baseURL: "https://api.myprovider.com/v1",
});

export const aiModels = {
  // ...existing
  myprovider: {
    "model-1": myProvider("model-1"),
    "model-2": myProvider("model-2"),
  },
};
```

2. Add to model selector UI.

### Creating Chart Artifact Tool

```typescript
// src/lib/ai/tools/artifacts/my-chart.ts
import { z } from "zod";
import { createArtifactTool } from "./create-artifact-tool";

export const myChartArtifactTool = createArtifactTool({
  name: "create_my_chart",
  description: "Creates custom chart visualization",
  
  schema: z.object({
    data: z.array(z.object({
      label: z.string(),
      value: z.number(),
    })),
    title: z.string().optional(),
  }),
  
  execute: async function* (params) {
    yield { progress: "Building chart..." };
    
    return {
      shouldCreateArtifact: true,  // Required for Canvas
      type: "my-chart",
      data: params.data,
      title: params.title,
    };
  },
});
```

### Tool Registration

```typescript
// src/lib/ai/tools/index.ts
export enum DefaultToolName {
  // ...existing
  CreateMyChart = "create_my_chart",
}

// src/lib/ai/tools/artifacts/index.ts
export { myChartArtifactTool } from "./my-chart";
```

---

## MCP Development

### Custom MCP Server

```typescript
// custom-mcp-server/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "my-mcp-server",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "my_tool",
    description: "Does something useful",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string" },
      },
      required: ["input"],
    },
  }],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "my_tool") {
    return {
      content: [{ type: "text", text: "Result" }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Testing

### Unit Tests (Vitest)

```typescript
// tests/example.spec.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "../src/lib/utils";

describe("myFunction", () => {
  it("should return expected value", () => {
    expect(myFunction("input")).toBe("expected");
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from "@playwright/test";

test("user can send message", async ({ page }) => {
  await page.goto("/");
  await page.fill('[data-testid="chat-input"]', "Hello");
  await page.click('[data-testid="send-button"]');
  
  await expect(page.locator('[data-testid="message"]')).toContainText("Hello");
});
```

---

## Debugging

### Langfuse Dashboard

Access at configured `LANGFUSE_HOST` to view:
- Request traces
- Token usage and costs
- Latency metrics
- Error rates

### Database Inspection

```bash
pnpm db:studio
```

Opens Drizzle Studio at http://localhost:4983

### MCP Server Status

Navigate to `/mcp` in the app to see:
- Server connection status
- Available tools
- Recent tool calls

---

## Common Issues

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check PostgreSQL container
docker ps

# Restart if needed
pnpm docker:pg
```

### TypeScript Errors After Schema Change

```bash
# Regenerate types
pnpm db:generate
pnpm check-types
```

---

## Code Style

Enforced by Biome:
- 2-space indentation
- Double quotes
- 80-character line width
- Sorted imports

```bash
# Format before committing
pnpm format
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ChatBot.tsx` |
| Hooks | camelCase + use prefix | `useChat.ts` |
| Files | kebab-case | `chat-bot.tsx` |
| Variables | camelCase | `threadList` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |

---

## Git Workflow

### Commit Messages

Use conventional commits:

```
feat: add new chart type
fix: resolve memory leak in canvas
chore: update dependencies
docs: improve API documentation
refactor: simplify tool loading
```

### Pull Request Checklist

- [ ] `pnpm check` passes
- [ ] Tests added for new features
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Environment variables documented

---

*Generated from source code analysis on 2025-12-30*

