# Data Models

> Database schema and entity relationships for Samba AI

**ORM:** Drizzle ORM 0.41.0  
**Database:** PostgreSQL 17  
**Schema Location:** `src/lib/db/pg/schema.pg.ts`

---

## Entity Relationship Diagram

```
                              ┌─────────────────┐
                              │      user       │
                              │─────────────────│
                              │ id: text (PK)   │
                              │ name: text      │
                              │ email: text     │
                              │ image: text     │
                              │ role: enum      │
                              │ createdAt: ts   │
                              └────────┬────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐            ┌─────────────────┐            ┌─────────────────┐
│   session     │            │   account       │            │  verification   │
│───────────────│            │─────────────────│            │─────────────────│
│ id: text (PK) │            │ id: text (PK)   │            │ id: text (PK)   │
│ userId (FK)   │            │ userId (FK)     │            │ identifier: text│
│ token: text   │            │ provider: text  │            │ value: text     │
│ expiresAt: ts │            │ accessToken     │            │ expiresAt: ts   │
└───────────────┘            └─────────────────┘            └─────────────────┘

        │                              │
        │                              │
        ▼                              ▼
┌───────────────┐            ┌─────────────────┐            ┌─────────────────┐
│  chat_thread  │◀───────────│   agent         │            │   mcp_server    │
│───────────────│            │─────────────────│            │─────────────────│
│ id: text (PK) │            │ id: text (PK)   │            │ id: text (PK)   │
│ userId (FK)   │            │ userId (FK)     │            │ userId (FK)     │
│ agentId (FK)  │            │ name: text      │            │ name: text      │
│ title: text   │            │ instructions    │            │ config: json    │
│ isPublic: bool│            │ allowedTools    │            │ isActive: bool  │
└───────┬───────┘            │ chatModel: json │            └─────────────────┘
        │                    └─────────────────┘
        │
        ▼
┌───────────────┐            ┌─────────────────┐
│ chat_message  │            │    workflow     │
│───────────────│            │─────────────────│
│ id: text (PK) │            │ id: text (PK)   │
│ threadId (FK) │            │ userId (FK)     │
│ role: text    │            │ name: text      │
│ parts: json   │            │ structure: json │
│ toolInvocs    │            │ published: bool │
│ createdAt: ts │            │ toolConfig: json│
└───────────────┘            └─────────────────┘
```

---

## Core Tables

### user

Primary user account table managed by Better-Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | UUID identifier |
| `name` | text | NOT NULL | Display name |
| `email` | text | UNIQUE, NOT NULL | Email address |
| `emailVerified` | boolean | DEFAULT false | Verification status |
| `image` | text | nullable | Avatar URL |
| `role` | enum | DEFAULT 'user' | user/admin/agent_admin |
| `createdAt` | timestamp | NOT NULL | Account creation |
| `updatedAt` | timestamp | NOT NULL | Last update |

```typescript
// Role enum
export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin", 
  "agent_admin"
]);
```

### chat_thread

Conversation containers linking users to message sequences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Thread UUID |
| `userId` | text | FK → user.id | Owner |
| `agentId` | text | FK → agent.id | Optional agent |
| `title` | text | NOT NULL | Display title |
| `isPublic` | boolean | DEFAULT false | Shareable |
| `createdAt` | timestamp | NOT NULL | Creation time |
| `updatedAt` | timestamp | NOT NULL | Last activity |

### chat_message

Individual messages within threads, storing content as structured parts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Message UUID |
| `threadId` | text | FK → chat_thread.id | Parent thread |
| `role` | text | NOT NULL | user/assistant/system/tool |
| `parts` | jsonb | NOT NULL | Message content parts |
| `toolInvocations` | jsonb | nullable | Tool call results |
| `createdAt` | timestamp | NOT NULL | Message time |

**Parts Schema:**

```typescript
type MessagePart = 
  | { type: "text"; text: string }
  | { type: "image"; image: string | URL }
  | { type: "file"; data: string; mimeType: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; args: object }
  | { type: "tool-result"; toolCallId: string; result: any };
```

### agent

Custom AI agent configurations with tool permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Agent UUID |
| `userId` | text | FK → user.id | Creator |
| `name` | text | NOT NULL | Display name |
| `description` | text | nullable | Agent purpose |
| `instructions` | text | nullable | System prompt |
| `iconId` | text | DEFAULT 'default' | Icon identifier |
| `allowedMcpServers` | jsonb | nullable | MCP server access |
| `allowedAppDefaultToolkit` | jsonb | nullable | Built-in tool access |
| `chatModel` | jsonb | nullable | Model override |
| `isActive` | boolean | DEFAULT true | Visibility |
| `createdAt` | timestamp | NOT NULL | Creation time |

**Allowed Tools Schema:**

```typescript
interface AllowedMCPServer {
  enabledToolNames?: string[];  // Whitelist of tools
  disableAll?: boolean;         // Block all tools
}

type AllowedMcpServers = Record<string, AllowedMCPServer>;
```

---

## MCP Tables

### mcp_server

MCP server connection configurations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Server UUID |
| `userId` | text | FK → user.id | Owner |
| `name` | text | NOT NULL | Display name |
| `config` | jsonb | NOT NULL | Connection config |
| `isActive` | boolean | DEFAULT true | Enabled state |
| `createdAt` | timestamp | NOT NULL | Creation time |

**Config Schema:**

```typescript
interface MCPServerConfig {
  transport: "stdio" | "sse" | "streamable-http";
  command?: string;           // For stdio
  args?: string[];            // For stdio
  url?: string;               // For SSE/HTTP
  headers?: Record<string, string>;
}
```

### mcp_server_custom_instructions

Per-server custom instructions for tool behavior.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | UUID |
| `mcpServerId` | text | FK → mcp_server.id | Server reference |
| `instructions` | text | NOT NULL | Custom prompt |
| `createdAt` | timestamp | NOT NULL | Creation time |

### mcp_server_tool_custom_instructions

Per-tool custom instructions within an MCP server.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | UUID |
| `mcpServerId` | text | FK → mcp_server.id | Server reference |
| `toolName` | text | NOT NULL | Tool identifier |
| `instructions` | text | NOT NULL | Custom prompt |
| `createdAt` | timestamp | NOT NULL | Creation time |

---

## Workflow Tables

### workflow

Visual workflow automation definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Workflow UUID |
| `userId` | text | FK → user.id | Creator |
| `name` | text | NOT NULL | Display name |
| `description` | text | nullable | Purpose |
| `structure` | jsonb | NOT NULL | XYFlow graph |
| `published` | boolean | DEFAULT false | Available as tool |
| `toolConfig` | jsonb | nullable | Tool interface |
| `createdAt` | timestamp | NOT NULL | Creation time |
| `updatedAt` | timestamp | NOT NULL | Last edit |

### workflow_node

Individual nodes within a workflow graph.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Node UUID |
| `workflowId` | text | FK → workflow.id | Parent workflow |
| `type` | text | NOT NULL | Node type |
| `position` | jsonb | NOT NULL | {x, y} coordinates |
| `data` | jsonb | NOT NULL | Node configuration |

### workflow_edge

Connections between workflow nodes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Edge UUID |
| `workflowId` | text | FK → workflow.id | Parent workflow |
| `source` | text | NOT NULL | Source node ID |
| `target` | text | NOT NULL | Target node ID |
| `sourceHandle` | text | nullable | Output port |
| `targetHandle` | text | nullable | Input port |

---

## Archive Tables

### archive

Named collections for organizing threads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Archive UUID |
| `userId` | text | FK → user.id | Owner |
| `name` | text | NOT NULL | Display name |
| `description` | text | nullable | Purpose |
| `createdAt` | timestamp | NOT NULL | Creation time |

### archive_item

Links between archives and threads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Item UUID |
| `archiveId` | text | FK → archive.id | Parent archive |
| `threadId` | text | FK → chat_thread.id | Linked thread |
| `createdAt` | timestamp | NOT NULL | Added time |

---

## Document Tables

### document

Document storage with versioning.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Document UUID |
| `userId` | text | FK → user.id | Owner |
| `title` | text | NOT NULL | Display title |
| `content` | text | nullable | Current content |
| `kind` | text | DEFAULT 'text' | Document type |
| `createdAt` | timestamp | NOT NULL | Creation time |
| `updatedAt` | timestamp | NOT NULL | Last edit |

### document_version

Historical versions of documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Version UUID |
| `documentId` | text | FK → document.id | Parent document |
| `content` | text | NOT NULL | Version content |
| `createdAt` | timestamp | NOT NULL | Save time |

---

## Permission Tables

### agent_user_permission

Per-user agent visibility controls.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK | Permission UUID |
| `agentId` | text | FK → agent.id | Target agent |
| `userId` | text | FK → user.id | Target user |
| `status` | enum | NOT NULL | visible/hidden |
| `createdAt` | timestamp | NOT NULL | Creation time |

---

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_chat_thread_user ON chat_thread(userId);
CREATE INDEX idx_chat_message_thread ON chat_message(threadId);
CREATE INDEX idx_agent_user ON agent(userId);
CREATE INDEX idx_workflow_user ON workflow(userId);
CREATE INDEX idx_mcp_server_user ON mcp_server(userId);

-- Unique constraints
CREATE UNIQUE INDEX idx_agent_permission_unique 
  ON agent_user_permission(agentId, userId);
```

---

## Repository Pattern

All database access uses the repository pattern:

```
src/lib/db/pg/repositories/
├── thread.repository.pg.ts
├── message.repository.pg.ts
├── agent.repository.pg.ts
├── mcp.repository.pg.ts
├── workflow.repository.pg.ts
├── archive.repository.pg.ts
└── document.repository.pg.ts
```

**Usage:**

```typescript
import { threadRepository } from "lib/db/pg/repositories/thread.repository.pg";

// Create
const thread = await threadRepository.create({ userId, title });

// Read
const threads = await threadRepository.findByUserId(userId);

// Update
await threadRepository.update(threadId, { title: "New Title" });

// Delete
await threadRepository.delete(threadId);
```

---

*Generated from schema analysis on 2025-12-30*

