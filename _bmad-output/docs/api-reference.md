# API Reference

> REST API endpoints for Samba AI

**Base URL:** `http://localhost:3000`  
**Authentication:** Better-Auth session cookies  
**Content-Type:** `application/json`

---

## Chat API

### Stream Chat Completion

```http
POST /api/chat
```

Main chat endpoint with streaming response.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | array | ✓ | Conversation messages |
| `threadId` | string | ✓ | Thread identifier |
| `model` | object | | {provider, model} |
| `agentId` | string | | Agent to use |
| `toolChoice` | string | | auto/none/manual |
| `allowedMcpServers` | object | | MCP server permissions |
| `allowedAppDefaultToolkit` | array | | Built-in tool access |

**Response:** Server-Sent Events stream with Vercel AI SDK data format.

---

### Get Chat Models

```http
GET /api/chat/models
```

Returns available AI models by provider.

**Response:**

```json
{
  "models": {
    "openai": ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini"],
    "anthropic": ["claude-4-sonnet", "claude-3-5-sonnet", "claude-3-5-haiku"],
    "google": ["gemini-2.0-flash", "gemini-1.5-pro"],
    "xai": ["grok-3", "grok-2"]
  }
}
```

---

### Generate Thread Title

```http
POST /api/chat/title
```

AI-generates title from first message.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `threadId` | string | ✓ | Thread to title |
| `message` | string | ✓ | First user message |

**Response:**

```json
{
  "title": "Building a React Dashboard"
}
```

---

### Temporary Chat

```http
POST /api/chat/temporary
```

Ephemeral chat without persistence.

---

## Thread API

### List Threads

```http
GET /api/thread
```

Returns user's chat threads sorted by recent activity.

**Response:**

```json
{
  "threads": [
    {
      "id": "uuid",
      "title": "Thread Title",
      "agentId": "agent-uuid",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### Get Thread

```http
GET /api/thread/[id]
```

Returns thread with messages.

---

### Create Thread

```http
POST /api/thread
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | | Initial title |
| `agentId` | string | | Associated agent |

---

### Update Thread

```http
PATCH /api/thread/[id]
```

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | New title |
| `isPublic` | boolean | Sharing status |

---

### Delete Thread

```http
DELETE /api/thread/[id]
```

---

## Agent API

### List Agents

```http
GET /api/agent
```

Returns agents visible to current user.

**Response:**

```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "Research Assistant",
      "description": "Helps with research tasks",
      "iconId": "search",
      "isActive": true
    }
  ]
}
```

---

### Get Agent

```http
GET /api/agent/[id]
```

Returns full agent configuration.

---

### Create Agent

```http
POST /api/agent
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✓ | Display name |
| `description` | string | | Purpose description |
| `instructions` | string | | System prompt |
| `iconId` | string | | Icon identifier |
| `allowedMcpServers` | object | | MCP permissions |
| `allowedAppDefaultToolkit` | array | | Tool access |
| `chatModel` | object | | Model override |

---

### Update Agent

```http
PATCH /api/agent/[id]
```

Same fields as create.

---

### Delete Agent

```http
DELETE /api/agent/[id]
```

---

### AI Generate Agent

```http
POST /api/agent/ai
```

Generate agent configuration from description.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✓ | Description of desired agent |

**Response:**

```json
{
  "agent": {
    "name": "Generated Name",
    "description": "Auto-generated description",
    "instructions": "Generated system prompt..."
  }
}
```

---

## MCP API

### List MCP Servers

```http
GET /api/mcp
```

Returns configured MCP servers.

---

### Get MCP Server

```http
GET /api/mcp/[id]
```

---

### Create MCP Server

```http
POST /api/mcp
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✓ | Display name |
| `config` | object | ✓ | Connection config |
| `isActive` | boolean | | Enabled state |

**Config Examples:**

```json
// stdio transport
{
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@mcp/server-name"]
}

// SSE transport
{
  "transport": "sse",
  "url": "https://mcp.example.com/sse"
}
```

---

### Update MCP Server

```http
PATCH /api/mcp/[id]
```

---

### Delete MCP Server

```http
DELETE /api/mcp/[id]
```

---

### List Available Tools

```http
GET /api/mcp/list
```

Returns tools from all active MCP servers.

**Response:**

```json
{
  "servers": [
    {
      "id": "server-uuid",
      "name": "Server Name",
      "tools": [
        {
          "name": "tool_name",
          "description": "What the tool does",
          "inputSchema": {...}
        }
      ]
    }
  ]
}
```

---

### Server Customizations

```http
GET /api/mcp/server-customizations/[server]
POST /api/mcp/server-customizations/[server]
```

Manage per-server custom instructions.

---

### Tool Customizations

```http
GET /api/mcp/tool-customizations/[server]/[tool]
POST /api/mcp/tool-customizations/[server]/[tool]
```

Manage per-tool custom instructions.

---

## Workflow API

### List Workflows

```http
GET /api/workflow
```

Returns user's workflows.

---

### Get Workflow

```http
GET /api/workflow/[id]
```

---

### Create Workflow

```http
POST /api/workflow
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✓ | Display name |
| `description` | string | | Purpose |
| `structure` | object | | XYFlow graph |

---

### Update Workflow

```http
PATCH /api/workflow/[id]
```

---

### Delete Workflow

```http
DELETE /api/workflow/[id]
```

---

### Get Workflow Structure

```http
GET /api/workflow/[id]/structure
```

Returns full graph definition.

---

### Execute Workflow

```http
POST /api/workflow/[id]/execute
```

Executes workflow as tool.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input` | object | ✓ | Tool input parameters |

---

### List Workflow Tools

```http
GET /api/workflow/tools
```

Returns published workflows as callable tools.

---

## Archive API

### List Archives

```http
GET /api/archive
```

---

### Create Archive

```http
POST /api/archive
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✓ | Archive name |
| `description` | string | | Purpose |

---

### Get Archive

```http
GET /api/archive/[id]
```

---

### Update Archive

```http
PATCH /api/archive/[id]
```

---

### Delete Archive

```http
DELETE /api/archive/[id]
```

---

### List Archive Items

```http
GET /api/archive/[id]/items
```

---

### Add Item to Archive

```http
POST /api/archive/[id]/items
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `threadId` | string | ✓ | Thread to archive |

---

### Remove Item from Archive

```http
DELETE /api/archive/[id]/items/[itemId]
```

---

## Admin API

**Required Role:** `admin` or `agent_admin`

### List All Agents

```http
GET /api/admin/agents
```

Returns all agents across all users.

---

### List All Users

```http
GET /api/admin/users
```

---

### Update User Role

```http
PATCH /api/admin/users/[id]/role
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | ✓ | user/admin/agent_admin |

---

### Manage Agent Permissions

```http
GET /api/admin/agent-permissions
POST /api/admin/agent-permissions
DELETE /api/admin/agent-permissions/[id]
```

---

## Artifact API

### List Artifacts

```http
GET /api/artifacts
```

Returns Canvas artifacts for current thread.

---

### Get Artifact

```http
GET /api/artifacts/[id]
```

---

### Get Artifact Versions

```http
GET /api/artifacts/[id]/versions
```

---

## Health API

### Langfuse Health

```http
GET /api/health/langfuse
```

Returns Langfuse connection status.

---

### Langfuse Traces

```http
GET /api/health/langfuse/traces
```

Returns recent trace summary.

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

*Generated from route analysis on 2025-12-30*

