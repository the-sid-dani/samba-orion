# Langfuse Agent Observability Guide

## 🤖 Multi-Agent Platform Analytics

This guide explains how to use Langfuse to monitor and analyze agent performance in your multi-agent Better Chatbot platform.

## 🎯 Agent-Specific Trace Naming

### How It Works

Traces are automatically named based on which agent handled the conversation:

- **Agent conversation**: `agent-{AgentName}-chat`
- **Default conversation**: `samba-orion-chat`

### Example Trace Names

```
agent-CodeAssistant-chat
agent-ResearchAgent-chat
agent-ContentWriter-chat
samba-orion-chat (no agent used)
```

### Implementation

Located in [src/app/api/chat/route.ts:135](../src/app/api/chat/route.ts#L135):

```typescript
updateActiveTrace({
  name: agent?.name ? `agent-${agent.name}-chat` : "samba-orion-chat",
  sessionId: id,
  userId: session.user.id,
  // ...
});
```

## 📊 Filtering Traces by Agent

### In Langfuse Dashboard

1. **Navigate to Traces** → Click "Tracing" in left sidebar
2. **Filter by trace name**:
   - Use the search bar: `agent-CodeAssistant-chat`
   - Or use the filter dropdown → "Trace Name"
3. **Filter by tags**:
   - Click "Tags" filter
   - Select: `agent:CodeAssistant`

### Using Tags

All agent conversations include an `agent:{AgentName}` tag:

```typescript
tags: [
  "chat",
  `provider:${chatModel?.provider}`,
  `model:${chatModel?.model}`,
  `agent:${agent.name}`,        // ← Agent tag
  `environment:${environment}`,
]
```

## 🔍 Agent Performance Analysis

### Key Metrics to Track

#### 1. **Agent Usage Distribution**

Filter by trace name pattern:
- `agent-*-chat` → All agent conversations
- `samba-orion-chat` → Non-agent conversations

**Questions to answer:**
- Which agents are used most frequently?
- What percentage of conversations use agents vs. default?
- Are certain agents preferred for specific tasks?

#### 2. **Agent Performance Comparison**

Compare metrics across different agents:

| Metric | CodeAssistant | ResearchAgent | ContentWriter |
|--------|---------------|---------------|---------------|
| Avg Tokens | 2,500 | 3,800 | 1,200 |
| Avg Latency | 2.3s | 4.1s | 1.8s |
| Avg Cost | $0.05 | $0.08 | $0.02 |
| Tool Usage | 12 tools/conv | 8 tools/conv | 3 tools/conv |

**How to analyze:**
1. Filter traces by `agent:CodeAssistant`
2. View "Statistics" tab for averages
3. Repeat for each agent
4. Compare results

#### 3. **Tool Usage by Agent**

Check `toolExecutionCount` in trace metadata:

```json
{
  "toolExecutionCount": 5,
  "mcpToolCount": 12,
  "workflowToolCount": 3,
  "appToolCount": 8,
  "totalToolsAvailable": 23
}
```

**Questions to answer:**
- Which agents execute the most tools per conversation?
- What's the tool availability vs. actual usage rate?
- Are certain agents over/under-utilizing available tools?

#### 4. **Agent Cost Analysis**

Track costs per agent to optimize spending:

**Filter Setup:**
1. Filter by: `tag:agent:CodeAssistant`
2. Group by: `model` (to see which models the agent uses)
3. View: Total cost, avg cost per conversation

**Optimization opportunities:**
- Switch expensive agents to cheaper models
- Identify agents with high token usage
- Find agents with low value-to-cost ratio

## 📈 Creating Agent Dashboards

### Dashboard 1: Agent Usage Overview

**Purpose:** See which agents are most popular

**Filters:**
- Environment: `production`
- Time Range: Last 7 days

**Metrics:**
- Total conversations by trace name
- Unique users per agent
- Conversations with vs. without agents

**Visual:** Bar chart showing conversation count per agent

### Dashboard 2: Agent Performance

**Purpose:** Compare agent efficiency

**Metrics per agent:**
- Average latency
- Average token usage (input/output)
- Average cost per conversation
- Tool execution rate
- Error rate

**Visual:** Table comparing all agents side-by-side

### Dashboard 3: Agent Cost Tracking

**Purpose:** Monitor agent spending

**Filters:**
- Environment: `production`
- Group by: `agent` tag

**Metrics:**
- Total cost per agent (weekly)
- Cost trend over time
- Cost per conversation by agent
- Model usage distribution by agent

**Visual:** Line chart showing weekly costs per agent

### Dashboard 4: Tool Usage by Agent

**Purpose:** Understand tool utilization patterns

**Metrics:**
- `toolExecutionCount` per agent
- `mcpToolCount`, `workflowToolCount`, `appToolCount` availability
- Tool execution frequency
- Most-used tools by agent

**Queries:**
- Filter by `agent:CodeAssistant`
- View trace metadata for tool counts
- Aggregate tool execution across conversations

## 🏷️ Using Tags Effectively

### Available Tags

Every trace includes these tags:

```typescript
[
  "chat",                           // All conversations
  "provider:anthropic",              // AI provider
  "model:claude-sonnet-4-5",        // Specific model
  "agent:CodeAssistant",            // Agent name (if used)
  "environment:production",          // Deployment environment
]
```

### Tag Filtering Strategies

#### Strategy 1: Agent + Environment
```
tag:agent:CodeAssistant AND tag:environment:production
```
**Use case:** Production performance of specific agent

#### Strategy 2: Agent + Provider
```
tag:agent:ResearchAgent AND tag:provider:openai
```
**Use case:** See how agent performs with specific provider

#### Strategy 3: Multi-Agent Comparison
```
tag:agent:* AND tag:environment:production
```
**Use case:** All production agent usage

#### Strategy 4: Model Cost Analysis
```
tag:agent:CodeAssistant AND tag:model:gpt-4o
```
**Use case:** Cost analysis for specific agent+model combo

## 🔔 Setting Up Agent Alerts

### Alert 1: High Agent Cost

**Trigger:** When daily cost for an agent exceeds threshold

**Setup:**
1. Go to Langfuse → Alerts
2. Create alert: "Agent Cost Threshold"
3. Filter: `tag:agent:{AgentName}`
4. Condition: `sum(cost) > $10` per day
5. Notify: Email/Slack

### Alert 2: Agent Error Rate

**Trigger:** When agent error rate exceeds 5%

**Setup:**
1. Filter: `tag:agent:{AgentName}` AND `status:error`
2. Condition: `error_rate > 5%` over 1 hour
3. Notify: Team channel

### Alert 3: Unusual Tool Usage

**Trigger:** When tool execution count is abnormally high

**Setup:**
1. Filter: `tag:agent:{AgentName}`
2. Condition: `metadata.toolExecutionCount > 20` per conversation
3. Notify: Engineering team

## 📊 Sample Queries

### Query 1: Top 5 Most Used Agents
```
Filter: tag:agent:*
Group by: trace name
Sort by: conversation count (descending)
Limit: 5
```

### Query 2: Agent Performance by Hour
```
Filter: tag:agent:CodeAssistant AND tag:environment:production
Group by: hour
Metrics: avg(latency), avg(tokens), avg(cost)
Time range: Last 24 hours
```

### Query 3: Tool-Heavy Conversations
```
Filter: metadata.toolExecutionCount > 10
Group by: agent tag
Metrics: count, avg(toolExecutionCount), avg(cost)
```

### Query 4: Agent Model Preference
```
Filter: tag:agent:*
Group by: agent tag, model tag
Metrics: conversation count, avg(cost)
Visual: Stacked bar chart
```

## 🎯 Agent Optimization Workflow

### Step 1: Identify High-Cost Agents

1. Filter traces by `tag:agent:*`
2. Sort by total cost
3. Identify top 3 most expensive agents

### Step 2: Analyze Cost Drivers

For each expensive agent:
- Check `metadata.model` - Are they using expensive models?
- Check `metadata.toolExecutionCount` - Excessive tool usage?
- Check avg token usage - Are prompts too long?

### Step 3: Optimize Configuration

**Option A: Switch to cheaper model**
```typescript
// In agent configuration
model: "claude-sonnet-4-5" → "claude-haiku-3-5"
```

**Option B: Reduce tool availability**
- Review `mcpToolCount` in metadata
- Remove unused tools from agent permissions

**Option C: Optimize system prompts**
- Reduce instruction length
- Remove redundant context

### Step 4: Monitor Impact

Create before/after comparison:
- Cost reduction %
- Performance impact (latency, quality)
- User satisfaction (error rate, completion rate)

## 🔗 Related Documentation

- [Langfuse Production Environment Setup](./langfuse-production-environment-setup.md)
- [Langfuse Vercel AI SDK Integration](./langfuse-vercel-ai-sdk-integration.md)
- [Langfuse Official Docs](https://langfuse.com/docs)

## ✅ Quick Reference

### Finding Agent Traces
```
Langfuse → Tracing → Traces
Filter: trace name contains "agent-"
Or: tag:agent:*
```

### Viewing Agent Metadata
```
Click any trace → View metadata section
Look for:
- agentId
- agentName
- toolExecutionCount
- mcpServerList
- environment
```

### Health Monitoring
```bash
# Check trace health
curl http://localhost:3000/api/health/langfuse/traces

# Returns:
# - Last trace timestamp
# - Trace count in last hour
# - Flush status
# - Connection health
```

### Environment Filtering
```
production: tag:environment:production
preview: tag:environment:preview
development: tag:environment:development
```
