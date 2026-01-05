# 🏗️ **Samba AI: Vercel AI SDK-Centric Architecture**

## 📋 **Executive Summary**

Samba AI is built **entirely on Vercel AI SDK** as the foundational AI framework, providing a unified interface to multiple LLM providers with comprehensive observability through Langfuse SDK v4 integration. Every AI operation, tool execution, and streaming response leverages Vercel AI SDK abstractions.

## 🎯 **Architectural Foundation**

### **1. Vercel AI SDK as Core Framework**
```typescript
// All AI operations built on these foundations:
import { streamText, generateText, tool, createUIMessageStream } from "ai";

// Unified provider interface
const model = customModelProvider.getModel(chatModel); // Returns Vercel AI SDK model
const result = streamText({
  model, // Any provider (OpenAI, Anthropic, Google, xAI, Ollama, OpenRouter)
  experimental_telemetry: { isEnabled: true }, // Automatic observability
});
```

### **2. Observability Integration (Langfuse SDK v4)**
```typescript
// instrumentation.ts - Automatic tracing setup
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

// API routes - Automatic trace capture
export const POST = observe(handler, {
  name: "handle-chat-message",
  endOnExit: false, // Streaming-optimized
});
```

## 🔄 **Data Flow Architecture**

### **Complete Request Lifecycle**
```
1. Frontend Component (React)
   ↓ sends user message
2. API Route (/api/chat/route.ts)
   ↓ wrapped with observe() for tracing
3. Tool Loading Pipeline (shared.chat.ts)
   ↓ converts MCP/Workflow/App tools → Vercel AI SDK tools
4. Vercel AI SDK Processing
   ↓ streamText() with experimental_telemetry
5. Provider Execution (OpenAI/Anthropic/Google/etc.)
   ↓ automatic span creation and tool call tracing
6. Response Streaming
   ↓ createUIMessageStream with real-time observability
7. UI Components
   ↓ handle Vercel AI SDK message streams
8. Langfuse Dashboard
   ↓ receives complete traces with user context, costs, performance
```

## 🔧 **Integration Patterns**

### **1. Tool Conversion Pattern**
```typescript
// MCP tools → Vercel AI SDK tools
const MCP_TOOLS = await loadMcpTools({ mentions, allowedMcpServers });

// Workflow tools → Vercel AI SDK tools
const WORKFLOW_TOOLS = await loadWorkFlowTools({ mentions, dataStream });

// App default tools → Vercel AI SDK tools
const APP_DEFAULT_TOOLS = await loadAppDefaultTools({ mentions, allowedAppDefaultToolkit });

// Combined into unified Vercel AI SDK tool interface
const vercelAITools = { ...MCP_TOOLS, ...WORKFLOW_TOOLS, ...APP_DEFAULT_TOOLS };
```

### **2. Observability Pattern**
```typescript
// Automatic tracing via Vercel AI SDK
const result = streamText({
  model,
  tools: vercelAITools,
  experimental_telemetry: {
    isEnabled: true,
    // Metadata automatically captured by Langfuse:
    // - User context (userId, sessionId)
    // - Model performance (tokens, costs, latency)
    // - Tool execution (individual calls, success/failure)
    // - Streaming metrics (response times, chunk delivery)
  },
});
```

### **3. Multi-Provider Pattern**
```typescript
// Unified interface across all providers
const providers = {
  openai: openai("gpt-4o"),
  anthropic: anthropic("claude-4-sonnet"),
  google: google("gemini-2.5-pro"),
  xai: xai("grok-4"),
  ollama: ollama("gemma3:8b"),
  openRouter: openrouter("qwen/qwen-2.5-8b"),
};

// Same interface, same observability, same tool integration
```

## 📊 **Observability Coverage**

### **Automatic Trace Capture**
- ✅ **Complete Conversations**: End-to-end user interactions with full context
- ✅ **Tool Execution**: Individual MCP, Workflow, and App tool calls
- ✅ **Multi-Provider LLM Calls**: Consistent tracing across all AI providers
- ✅ **Streaming Performance**: Real-time response delivery metrics
- ✅ **Cost Tracking**: Token usage and costs per conversation and provider
- ✅ **User Journey**: Session analytics and engagement patterns
- ✅ **Error Tracking**: Comprehensive failure capture and debugging context

### **Langfuse Dashboard Metrics**
- **User Analytics**: Session duration, message counts, feature usage
- **AI Performance**: Token efficiency, response latency, cost per conversation
- **Tool Analytics**: MCP server health, tool execution success rates
- **Agent Effectiveness**: Agent selection patterns and performance metrics
- **System Health**: Error rates, response times, resource utilization

## 🚀 **Production Benefits**

### **Cost Optimization**
- Real-time token and cost tracking across all providers
- Model performance comparison for cost efficiency
- Tool usage analytics for feature optimization
- Budget monitoring and cost alerts

### **Performance Monitoring**
- Response latency tracking across AI providers
- Tool execution performance monitoring
- Streaming response optimization opportunities
- User experience metrics and conversion tracking

### **Debugging & Development**
- Complete trace visibility for troubleshooting
- Tool execution debugging with full context
- User journey analysis for UX improvements
- A/B testing capabilities for model and feature comparison

## 🎯 **Key Architectural Decisions**

### **Why Vercel AI SDK Foundation?**
1. **Unified Interface**: Single API across all LLM providers
2. **Built-in Observability**: `experimental_telemetry` integration
3. **Streaming Optimized**: Real-time responses with automatic tool execution
4. **Tool Abstraction**: Universal tool interface for MCP, Workflow, and App tools
5. **Future-Proof**: New providers easily added through SDK abstractions

### **Why Langfuse SDK v4?**
1. **OpenTelemetry Native**: Built on industry-standard observability framework
2. **Vercel AI SDK Compatible**: Automatic trace capture for all AI operations
3. **Production Ready**: Comprehensive metrics, cost tracking, and performance monitoring
4. **Developer Experience**: Rich dashboard with actionable insights

## 📚 **Documentation Structure**

### **Updated CLAUDE.md Files**
- **`/CLAUDE.md`**: Main project documentation with Vercel AI SDK emphasis and observability architecture
- **`src/app/CLAUDE.md`**: App Router structure optimized for Vercel AI SDK streaming patterns
- **`src/app/api/CLAUDE.md`**: API layer documentation with comprehensive observability integration
- **`src/components/CLAUDE.md`**: UI components designed for Vercel AI SDK data structures

### **Key Documentation Sections Added**
- 🔍 **Observability Architecture**: Complete Langfuse SDK v4 integration guide
- ⚡ **Vercel AI SDK Patterns**: Best practices and integration guidelines
- 🔧 **Troubleshooting**: Common issues and debugging procedures
- 📊 **Trace Structure**: Understanding the observability data flow

## ✅ **Implementation Status**

### **Complete Integration**
- ✅ **Vercel AI SDK Foundation**: All AI operations standardized
- ✅ **Langfuse Observability**: Comprehensive tracing with SDK v4
- ✅ **Multi-Provider Support**: Unified interface across all providers
- ✅ **Tool Integration**: MCP, Workflow, App tools through SDK abstractions
- ✅ **Production Ready**: Health monitoring, error boundaries, performance optimization
- ✅ **Documentation**: Complete architectural guidance across all CLAUDE.md files

This architecture provides enterprise-grade AI capabilities with comprehensive observability, built on the solid foundation of Vercel AI SDK abstractions for maximum reliability, performance, and maintainability.