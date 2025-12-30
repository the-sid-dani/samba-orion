# Samba AI Documentation

> AI chatbot platform built on Vercel AI SDK with Next.js 15

**Version:** 1.21.0  
**License:** MIT  
**Repository Type:** Monolith

---

## Overview

Samba AI is a branded AI chatbot platform that provides a unified interface for multiple LLM providers with advanced features including MCP protocol integration, custom AI agents, visual workflow automation, and real-time data visualization via a multi-grid Canvas system.

## Core Features

| Feature | Description |
|---------|-------------|
| **Multi-LLM Support** | OpenAI, Anthropic, Google, xAI, Ollama, OpenRouter |
| **MCP Integration** | Model Context Protocol for dynamic external tool loading |
| **Custom Agents** | User-configurable AI agents with tool permissions |
| **Workflow Builder** | Visual automation using XYFlow |
| **Canvas System** | Multi-grid dashboard with 17+ chart types |
| **Observability** | Langfuse SDK v4 for tracing and analytics |
| **Voice Chat** | OpenAI Realtime API integration |

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15.3.2 (App Router) |
| **UI** | React 19.1.1 + Tailwind CSS 4.1.12 |
| **Language** | TypeScript 5.9.2 |
| **Database** | PostgreSQL + Drizzle ORM 0.41.0 |
| **Auth** | Better-Auth 1.3.7 (OAuth + email) |
| **AI Core** | Vercel AI SDK 5.0.26 |
| **Observability** | Langfuse SDK v4.1.0 |
| **Testing** | Vitest + Playwright |
| **Linting** | Biome 1.9.4 |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm docker:pg

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

**Critical:** This project ONLY works on `localhost:3000`.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System design and component interactions |
| [Data Models](./data-models.md) | Database schema and relationships |
| [API Reference](./api-reference.md) | REST API endpoints |
| [Development Guide](./development-guide.md) | Setup and coding patterns |
| [Deployment Guide](./deployment-guide.md) | Production deployment |

## Project Structure

```
src/
├── app/                   # Next.js App Router
│   ├── (auth)/           # Auth pages (login, register)
│   ├── (protected)/      # Authenticated routes
│   └── api/              # API routes (45+ endpoints)
├── components/           # React components (209 total)
│   ├── ui/               # Base UI (70 components)
│   ├── agent/            # Agent management
│   ├── canvas/           # Data visualization
│   ├── workflow/         # Workflow builder
│   └── tool-invocation/  # Chart renderers
├── hooks/                # Custom React hooks (18)
├── lib/                  # Core logic
│   ├── ai/               # AI providers, tools, MCP
│   ├── auth/             # Better-Auth config
│   ├── db/               # Drizzle ORM, repositories
│   └── observability/    # Langfuse integration
└── types/                # TypeScript interfaces
```

## Key Abstractions

| Abstraction | Location | Purpose |
|-------------|----------|---------|
| **AI Models** | `src/lib/ai/models.ts` | Provider configuration |
| **MCP Client** | `src/lib/ai/mcp/` | External tool loading |
| **Tool Registry** | `src/lib/ai/tools/` | Default + artifact tools |
| **DB Repositories** | `src/lib/db/pg/repositories/` | Data access layer |
| **Zustand Store** | `src/app/store/index.ts` | Client state management |

## Environment Variables

Required for production:

```bash
# Database
POSTGRES_URL=postgres://...

# Auth
BETTER_AUTH_SECRET=...

# AI Provider (at least one)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Observability (optional)
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
```

---

*Generated from source code analysis on 2025-12-30*

