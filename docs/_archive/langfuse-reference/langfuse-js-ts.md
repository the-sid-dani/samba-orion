---
title: TypeScript SDK - Overview
description: Improved OTEL-based TypeScript SDK (v4) with better developer experience and third-party integrations.
category: SDKs
label: "Version: JS SDK v4"
---

# TypeScript SDK - Overview

https://langfuse-js-git-main-langfuse.vercel.app/

The modular Langfuse TypeScript SDK (v4) is built on **[OpenTelemetry](https://opentelemetry.io/)** for robust observability, better context management, and easy integration with third-party libraries.

<Callout type="info">
  This documentation is for the TypeScript SDK v4. If you are looking for the
  documentation for the TypeScript SDK v3, please [click
  here](https://js-sdk-v3.docs-snapshot.langfuse.com/docs/observability/sdk/typescript/guide/).
</Callout>

<Callout type="info">
  If you are self-hosting Langfuse, the TypeScript SDK v4 requires **Langfuse
  platform version ≥ 3.95.0** for all features to work correctly.
</Callout>

## Quickstart

Get your first trace into Langfuse in just a few minutes.

<Steps>

### Install packages

Install the relevant packages to get started with tracing:

```bash
npm install @langfuse/tracing @langfuse/otel @opentelemetry/sdk-node
```

Learn more about the packages [here](/docs/observability/sdk/typescript/overview#packages).

### Set up environment variables


Add your Langfuse credentials to your environment variables. Make sure that you have a `.env` file in your project root and a package like `dotenv` to load the variables.


```bash filename=".env"
LANGFUSE_SECRET_KEY = "sk-lf-..."
LANGFUSE_PUBLIC_KEY = "pk-lf-..."
LANGFUSE_BASE_URL = "https://cloud.langfuse.com" # 🇪🇺 EU region
# LANGFUSE_BASE_URL = "https://us.cloud.langfuse.com" # 🇺🇸 US region
```



### Set up OpenTelemetry

Create a file named `instrumentation.ts` to initialize the OpenTelemetry SDK. The **`LangfuseSpanProcessor`** is the key component that sends traces to Langfuse.

```ts filename="instrumentation.ts" /LangfuseSpanProcessor/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();
```

Import the `instrumentation.ts` file at the very top of your application's entry point (e.g., `index.ts`).

```ts filename="index.ts"
import "./instrumentation"; // Must be the first import
```

Learn more about setting up OpenTelemetry [here](/docs/observability/sdk/typescript/setup).

### Instrument your application

Use one of the native Langfuse framework [integrations](/integrations) to automatically trace your application.

Alternatively, manually instrument your application, e.g. by using the `startActiveObservation`. This function takes a callback and automatically manages the observation's lifecycle and the OpenTelemetry context. Any observation created inside the callback will automatically be nested under the active observation, and the observation will be ended when the callback finishes.

This is just an example, check out the [instrumentation](/docs/observability/sdk/typescript/instrumentation) page for more details.

```ts filename="index.ts" /startActiveObservation/
import "./instrumentation";
import { startActiveObservation } from "@langfuse/tracing";

async function main() {
  await startActiveObservation("my-first-trace", async (span) => {
    span.update({
      input: "Hello, Langfuse!",
      output: "This is my first trace!",
    });
  });
}

main();
```

### Run your application

Execute your application. You should see your trace appear in the Langfuse UI.

```bash
npx tsx index.ts
```

</Steps>

## Packages



The Langfuse SDK is designed to be modular. Here's an overview of the available packages:

| Package                                                                        | Description                                                            | Environment  |
| :----------------------------------------------------------------------------- | :--------------------------------------------------------------------- | :----------- |
| [**`@langfuse/core`**](https://www.npmjs.com/package/@langfuse/core)           | Core utilities, types, and logger shared across packages.              | Universal JS |
| [**`@langfuse/client`**](https://www.npmjs.com/package/@langfuse/client)       | Client for features like prompts, datasets, and scores.                | Universal JS |
| [**`@langfuse/tracing`**](https://www.npmjs.com/package/@langfuse/tracing)     | Core OpenTelemetry-based tracing functions (`startObservation`, etc.). | Universal JS |
| [**`@langfuse/otel`**](https://www.npmjs.com/package/@langfuse/otel)           | The `LangfuseSpanProcessor` to export traces to Langfuse.              | Node.js ≥ 20 |
| [**`@langfuse/openai`**](https://www.npmjs.com/package/@langfuse/openai)       | Automatic tracing integration for the OpenAI SDK.                      | Universal JS |
| [**`@langfuse/langchain`**](https://www.npmjs.com/package/@langfuse/langchain) | CallbackHandler for tracing LangChain applications.                    | Universal JS |



## OpenTelemetry foundation

Building on OpenTelemetry is a core design choice for this SDK. It offers several key advantages:

- **Standardization**: It aligns with the industry standard for observability, making it easier to integrate with existing monitoring and APM tools.
- **Robust Context Management**: OpenTelemetry provides reliable [context propagation](https://opentelemetry.io/docs/concepts/context-propagation/), ensuring that traces are correctly linked even in complex, asynchronous applications.
- **Ecosystem & Interoperability**: You can leverage a vast ecosystem of third-party instrumentations. If a library you use supports OpenTelemetry, its traces can be sent to Langfuse automatically.

## Learn more

import {
  Rocket,
  Plug,
  Beaker,
  Settings,
  LifeBuoy,
  BookOpen,
} from "lucide-react";

<Cards num={2}>
  <Card
    icon={<Rocket size="24" />}
    title="Setup"
    href="/docs/observability/sdk/typescript/setup"
    arrow
  />
  <Card
    icon={<Plug size="24" />}
    title="Instrumentation"
    href="/docs/observability/sdk/typescript/instrumentation"
    arrow
  />
  <Card
    icon={<Settings size="24" />}
    title="Advanced usage"
    href="/docs/observability/sdk/typescript/advanced-usage"
    arrow
  />
  <Card
    icon={<LifeBuoy size="24" />}
    title="Troubleshooting & FAQ"
    href="/docs/observability/sdk/typescript/troubleshooting-and-faq"
    arrow
  />
  <Card
    icon={<BookOpen size="24" />}
    title="Reference"
    href="https://js.reference.langfuse.com/"
    newWindow
    arrow
  />
</Cards>

---
title: TypeScript SDK - Setup
description: Tracing setup for the TypeScript SDK.
label: "Version: JS SDK v4"
---

# TypeScript SDK - Setup


The Langfuse TypeScript SDK offers two setup approaches:

1. [**Tracing**](#tracing-setup) for [Langfuse Observability](/docs/observability/overview) using OpenTelemetry
2. [**Client**](#client-setup) for other Langfuse features like prompt management, evaluation, or accessing the Langfuse API

## Tracing Setup [#tracing-setup]

<Steps>

### Installation

Install the relevant packages for a full tracing setup:

```bash
npm install @langfuse/tracing @langfuse/otel @opentelemetry/sdk-node
```

- **`@langfuse/tracing`**: Core tracing functions (`startObservation`, `startActiveObservation`, etc.)
- **`@langfuse/otel`**: The `LangfuseSpanProcessor` to export traces to Langfuse.
- **`@opentelemetry/sdk-node`**: The OpenTelemetry SDK for Node.js.

Learn more about the packages [here](/docs/observability/sdk/typescript/overview#packages).

### Register your credentials

Add your Langfuse credentials to your environment variables. Make sure that you have a `.env` file in your project root and a package like `dotenv` to load the variables.


```bash filename=".env"
LANGFUSE_SECRET_KEY = "sk-lf-..."
LANGFUSE_PUBLIC_KEY = "pk-lf-..."
LANGFUSE_BASE_URL = "https://cloud.langfuse.com" # 🇪🇺 EU region
# LANGFUSE_BASE_URL = "https://us.cloud.langfuse.com" # 🇺🇸 US region
```



### Initialize OpenTelemetry

The Langfuse TypeScript SDK's tracing is built on top of OpenTelemetry, so you need to set up the OpenTelemetry SDK. The `LangfuseSpanProcessor` is the key component that sends traces to Langfuse.

```ts filename="instrumentation.ts" /LangfuseSpanProcessor/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();
```

The `LangfuseSpanProcessor` is the key component that sends traces to Langfuse.

For more options to configure the LangfuseSpanProcessor such as masking, filtering, and more, see [the advanced usage](/docs/observability/sdk/typescript/advanced-usage).

You can learn more about setting up OpenTelemetry in your JS environment [here](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/).

<Callout type="info">
**Next.js users:**

If you are using Next.js, please use the OpenTelemetry setup via the `NodeSDK` described above rather than via `registerOTel` from `@vercel/otel`. This is because [the `@vercel/otel` package does not yet support the OpenTelemetry JS SDK v2](https://github.com/vercel/otel/issues/154) on which the `@langfuse/tracing` and `@langfuse/otel` packages are based.

[See here for a full example for the Vercel AI SDK with NextJS on Vercel](/docs/observability/sdk/typescript/instrumentation#native-instrumentation).

</Callout>

</Steps>

## Client Setup [#client-setup]

<Steps>

### Installation

```bash
npm install @langfuse/client
```

### Register your credentials

Add your Langfuse credentials to your environment variables. Make sure that you have a `.env` file in your project root and a package like `dotenv` to load the variables.


```bash filename=".env"
LANGFUSE_SECRET_KEY = "sk-lf-..."
LANGFUSE_PUBLIC_KEY = "pk-lf-..."
LANGFUSE_BASE_URL = "https://cloud.langfuse.com" # 🇪🇺 EU region
# LANGFUSE_BASE_URL = "https://us.cloud.langfuse.com" # 🇺🇸 US region
```



### Initialize the client

Initialize the `LangfuseClient` to interact with Langfuse. The client will automatically use the environment variables you set above.

```ts filename="client.ts"
import { LangfuseClient } from "@langfuse/client";

const langfuse = new LangfuseClient();
```

<details>
<summary>Alternative: Configure via constructor</summary>

You can also pass configuration options directly to the constructor:

```ts filename="client.ts"
import { LangfuseClient } from "@langfuse/client";

const langfuse = new LangfuseClient({
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
  baseUrl: "https://cloud.langfuse.com", // or your self-hosted instance
});
```

</details>

</Steps>

## Learn more

import {
  Rocket,
  Plug,
  Beaker,
  Settings,
  LifeBuoy,
  BookOpen,
} from "lucide-react";

<Cards num={2}>
  <Card
    icon={<Rocket size="24" />}
    title="Cookbook: Instrumentation"
    href="/guides/cookbook/js_langfuse_sdk"
    arrow
  />
  <Card
    icon={<Settings size="24" />}
    title="Advanced Usage"
    href="/docs/observability/sdk/typescript/advanced-usage"
    arrow
  />
</Cards>

---
title: TypeScript SDK - Instrumentation
description: Instrumentation methods for the TypeScript SDK.
label: "Version: JS SDK v4"
---

# TypeScript SDK - Instrumentation

To instrument your application to send traces to Langfuse, you can use

1. [**Native instrumentation**](#native-instrumentation) of llm/agent libraries for out-of-the-box tracing
2. [**Custom instrumentation**](#custom-instrumentation) methods for fine-grained control
   - Context manager: `startActiveObservation`
   - Wrapper: `observe`
   - Manual: `startObservation`

These components are interoperable. Please refer to this [API route handler](https://github.com/langfuse/langfuse-docs/blob/main/components/qaChatbot/apiHandler.ts), which powers [langfuse.com/demo](/demo), as an example of how to combine the auto-instrumentation of the AI SDK V5 with custom instrumentation. This approach captures more details and groups multiple LLM calls into a single trace.

## Native instrumentation [#native-instrumentation]

Langfuse integrates with many llm/agent libraries to automatically trace your application. For a full list, see the [Langfuse Integrations](/integrations) page.

These are the most popular ones:

<LangTabs items={["OpenAI SDK", "Vercel AI SDK", "LangChainJS", "Third-party OTel Instrumentations"]}>

<Tab>

The `@langfuse/openai` package provides a wrapper to automatically trace calls to the OpenAI SDK.

For an end-to-end example, see the [Langfuse + OpenAI JS/TS Cookbook](https://langfuse.com/guides/cookbook/js_integration_openai).

**Installation:**

```bash
npm install @langfuse/openai
```

**Usage:**

The `observeOpenAI` function wraps your OpenAI client instance. All subsequent API calls made with the wrapped client will be traced as generations and nested automatically in the current trace tree. If there's no active trace in context, a new one will be created automatically.

```typescript /observeOpenAI/
import { OpenAI } from "openai";
import { observeOpenAI } from "@langfuse/openai";

// Instantiate the OpenAI client as usual
const openai = new OpenAI();

// Wrap it with Langfuse
const tracedOpenAI = observeOpenAI(openai, {
  // Pass trace-level attributes that will be applied to all calls
  traceName: "my-openai-trace",
  sessionId: "user-session-123",
  userId: "user-abc",
  tags: ["openai-integration"],
});

// Use the wrapped client just like the original
const completion = await tracedOpenAI.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "What is OpenTelemetry?" }],
});
```

</Tab>

<Tab>

The Vercel AI SDK offers native instrumentation with OpenTelemetry. You can enable the Vercel AI SDK telemetry by passing `{ experimental_telemetry: { isEnabled: true }}` to your AI SDK function calls.

The LangfuseSpanProcessor is automatically detecting multimodal data in your traces and is handling it automatically.

Here is a full example on how to set up tracing with the

- AI SDK v5
- Next JS
- deployed on Vercel

```ts filename="instrumentation.ts"
import { LangfuseSpanProcessor, ShouldExportSpan } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

// Optional: filter our NextJS infra spans
const shouldExportSpan: ShouldExportSpan = (span) => {
  return span.otelSpan.instrumentationScope.name !== "next.js";
};

const langfuseSpanProcessor = new LangfuseSpanProcessor({
  shouldExportSpan,
});

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [langfuseSpanProcessor],
});

tracerProvider.register();
```

<Callout>
  If you are using Next.js, please use a manual OpenTelemetry setup via the
  `NodeTracerProvider` rather than via `registerOTel` from `@vercel/otel`. This
  is because [the `@vercel/otel` package does not yet support the OpenTelemetry
  JS SDK v2](https://github.com/vercel/otel/issues/154) on which the
  `@langfuse/tracing` and `@langfuse/otel` packages are based.
</Callout>

```ts filename="route.ts"
import { streamText } from "ai";
import { after } from "next/server";

import { openai } from "@ai-sdk/openai";
import {
  observe,
  updateActiveObservation,
  updateActiveTrace,
} from "@langfuse/tracing";
import { trace } from "@opentelemetry/api";

import { langfuseSpanProcessor } from "@/src/instrumentation";

const handler = async (req: Request) => {
  const {
    messages,
    chatId,
    userId,
  }: { messages: UIMessage[]; chatId: string; userId: string } =
    await req.json();

  // Set session id and user id on active trace
  const inputText = messages[messages.length - 1].parts.find(
    (part) => part.type === "text"
  )?.text;

  updateActiveObservation({
    input: inputText,
  });

  updateActiveTrace({
    name: "my-ai-sdk-trace",
    sessionId: chatId,
    userId,
    input: inputText,
  });

  const result = streamText({
    // ... other streamText options ...
    experimental_telemetry: {
      isEnabled: true,
    },
    onFinish: async (result) => {
      updateActiveObservation({
        output: result.content,
      });
      updateActiveTrace({
        output: result.content,
      });

      // End span manually after stream has finished
      trace.getActiveSpan().end();
    },
  });

  // Important in serverless environments: schedule flush after request is finished
  after(async () => await langfuseSpanProcessor.forceFlush());

  return result.toUIMessageStreamResponse();
};

export const POST = observe(handler, {
  name: "handle-chat-message",
  endOnExit: false, // end observation _after_ stream has finished
});
```

Learn more about the AI SDK Telemetry in the [Vercel AI SDK documentation on Telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry).

</Tab>

<Tab>

The `@langfuse/langchain` package offers a `CallbackHandler` to integrate Langfuse tracing into your LangChain applications.

For an end-to-end example, see the [Langfuse + LangChain JS/TS Cookbook](https://langfuse.com/guides/cookbook/js_integration_langchain).

**Installation:**

```bash
npm install @langfuse/core @langfuse/langchain
```

**Usage:**

Instantiate the `CallbackHandler` and pass it to your chain's `.invoke()` or `.stream()` method in the `callbacks` array. All operations within the chain will be traced as nested observations.

```typescript /CallbackHandler/ /langfuseHandler/
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CallbackHandler } from "@langfuse/langchain";

// 1. Initialize the Langfuse callback handler
const langfuseHandler = new CallbackHandler({
  sessionId: "user-session-123",
  userId: "user-abc",
  tags: ["langchain-test"],
});

// 2. Define your chain
const model = new ChatOpenAI({ model: "gpt-4o" });
const prompt = ChatPromptTemplate.fromTemplate("Tell me a joke about {topic}.");
const chain = prompt.pipe(model);

// 3. Add the handler to the callbacks array
const result = await chain.invoke(
  { topic: "developers" },
  {
    callbacks: [langfuseHandler],
    // This becomes the trace name if no active OTEL span is in the context
    runName: "joke-generator",
  }
);

console.log(result.content);
```

</Tab>

<Tab>

Many LLM and data libraries are built with OpenTelemetry support. If a library you use supports OTEL, you just need to ensure the `LangfuseSpanProcessor` is registered in your OTEL setup. All traces generated by that library will automatically be sent to Langfuse.

</Tab>

</LangTabs>

## Custom instrumentation [#custom-instrumentation]

You can add custom instrumentations to your application via

- the `observe` wrapper
- `startActiveObservation` context managers
- manually managing the observation lifecycle and its nesting with the `startObservation` function

<Callout>

For an end-to-end example, see the [JS Instrumentation Cookbook](/guides/cookbook/js_langfuse_sdk).

</Callout>

### Context management with callbacks

To simplify nesting and context management, you can use `startActiveObservation`. These functions take a callback and automatically manage the observation's lifecycle and the OpenTelemetry context. Any observation created inside the callback will automatically be nested under the active observation, and the observation will be ended when the callback finishes.

This is the recommended approach for most use cases as it prevents context leakage and ensures observations are properly ended.

```typescript /startActiveObservation/ /span.update/
import { startActiveObservation, startObservation } from "@langfuse/tracing";

await startActiveObservation(
  // name
  "user-request",
  // callback
  async (span) => {
    span.update({
      input: { query: "What is the capital of France?" },
    });

    // Example child, could also use startActiveObservation
    // This manually created generation (see docs below) will automatically be a child of "user-request"
    const generation = startObservation(
      "llm-call",
      {
        model: "gpt-4",
        input: [{ role: "user", content: "What is the capital of France?" }],
      },
      { asType: "generation" }
    );
    generation.update({
      usageDetails: { input: 10, output: 5 },
      output: { content: "The capital of France is Paris." },
    });
    generation.end();

    span.update({ output: "Successfully answered." });
  }
);
```

### `observe` wrapper

The `observe` wrapper is a powerful tool for tracing existing functions without modifying their internal logic. It acts as a decorator that automatically creates a **span** or **generation** around the function call. You can use the `updateActiveObservation` function to add attributes to the observation from within the wrapped function.

```typescript /observe/ /updateActiveObservation/
import { observe, updateActiveObservation } from "@langfuse/tracing";

// An existing function
async function fetchData(source: string) {
  updateActiveObservation({ metadata: { source: "API" } });
  // ... logic to fetch data
  return { data: `some data from ${source}` };
}

// Wrap the function to trace it
const tracedFetchData = observe(
  // method
  fetchData,
  // options, optional, see below
  {}
);

// Now, every time you call tracedFetchData, a span is created.
// Its input and output are automatically populated with the
// function's arguments and return value.
const result = await tracedFetchData("API");
```

You can configure the `observe` wrapper by passing an options object as the second argument:

| Option          | Description                                                                                                      | Default                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `name`          | The name of the observation.                                                                                     | The original function's name. |
| `asType`        | The [type of observation](/docs/observability/features/observation-types) to create (e.g. `span`, `generation`). | `"span"`                      |
| `captureInput`  | Whether to capture the function's arguments as the `input` of the observation.                                   | `true`                        |
| `captureOutput` | Whether to capture the function's return value or thrown error as the `output` of the observation.               | `true`                        |

### Manual observations

The core tracing function (`startObservation`) gives you full control over creating observations. You can pass the `asType` option to specify the [type of observation](/docs/observability/features/observation-types) to create.

When you call one of these functions, the new observation is automatically linked as a child of the currently active operation in the OpenTelemetry context. However, it does **not** make this new observation the active one. This means any further operations you trace will still be linked to the _original_ parent, not the one you just created.

To create nested observations manually, use the methods on the returned object (e.g., `parentSpan.startObservation(...)`).

```typescript /startObservation/ /end/ /asType/
import { startObservation } from "@langfuse/tracing";

// Start a root span for a user request
const span = startObservation(
  // name
  "user-request",
  // params
  {
    input: { query: "What is the capital of France?" },
  }
);

// Create a nested span for a e.g. tool call
const toolCall = span.startObservation(
  // name
  "fetch-weather",
  // params
  {
    input: { city: "Paris" },
  },
  // Specify observation type in asType
  // This will type the attributes argument accordingly
  // Default is 'span'
  { asType: "tool" }
);

// Simulate work and end the tool call span
await new Promise((resolve) => setTimeout(resolve, 100));
toolCall.update({ output: { temperature: "15°C" } }).end();

// Create a nested generation for the LLM call
const generation = span.startObservation(
  "llm-call",
  {
    model: "gpt-4",
    input: [{ role: "user", content: "What is the capital of France?" }],
  },
  { asType: "generation" }
);

generation.update({
  usageDetails: { input: 10, output: 5 },
  output: { content: "The capital of France is Paris." },
});

generation.end();

// End the root span
span.update({ output: "Successfully answered user request." }).end();
```

<Callout type="warning" title="Manual Ending Required">
  If you use `startObservation()`, you are responsible for calling `.end()` on
  the returned observation object. Failure to do so will result in incomplete or
  missing observations in Langfuse.
</Callout>

### Updating Traces

Often, you might not have all the information about a trace (like a `userId` or `sessionId`) when you start it. The SDK lets you add or update trace-level attributes at any point during its execution.

#### `.updateTrace()` on an observation

When you create an observation manually with `startObservation`, the returned object has an `.updateTrace()` method. You can call this at any time before the root span ends to apply attributes to the entire trace.

```typescript /updateTrace/
import { startObservation } from "@langfuse/tracing";

// Start a trace without knowing the user yet
const rootSpan = startObservation("data-processing");

// ... some initial steps ...

// Later, once the user is authenticated, update the trace
const userId = "user-123";
const sessionId = "session-abc";
rootSpan.updateTrace({
  userId: userId,
  sessionId: sessionId,
  tags: ["authenticated-user"],
  metadata: { plan: "premium" },
});

// ... continue with the rest of the trace ...
const generation = rootSpan.startObservation(
  "llm-call",
  {},
  { asType: "generation" }
);

generation.end();

rootSpan.end();
```

#### `updateActiveTrace()`

When you're inside a callback from `startActiveObservation`, or a function wrapped with `observe`, you might not have a direct reference to an observation object. In these cases, use the `updateActiveTrace()` function. It automatically finds the currently active trace in the context and applies the new attributes.

```typescript /updateActiveTrace/
import { startActiveObservation, updateActiveTrace } from "@langfuse/tracing";

await startActiveObservation("user-request", async (span) => {
  // Initial part of the request
  span.update({ input: { path: "/api/process" } });

  // Simulate fetching user data
  await new Promise((resolve) => setTimeout(resolve, 50));
  const user = { id: "user-5678", name: "Jane Doe" };

  // Update the active trace with the user's information
  updateActiveTrace({
    userId: user.id,
    metadata: { userName: user.name },
  });

  // ... continue logic ...
  span.update({ output: { status: "success" } }).end();
});
```

---
title: TypeScript SDK - Advanced Configuration
description: Advanced configuration options for the TypeScript SDK.
label: "Version: JS SDK v4"
---

# TypeScript SDK - Advanced Configuration

## Masking

To prevent sensitive data from being sent to Langfuse, you can provide a `mask` function to the `LangfuseSpanProcessor`. This function will be applied to the `input`, `output`, and `metadata` of every observation.

The function receives an object `{ data }`, where `data` is the stringified JSON of the attribute's value. It should return the masked data.

```ts filename="instrumentation.ts" /mask:/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const spanProcessor = new LangfuseSpanProcessor({
  mask: ({ data }) => {
    // A simple regex to mask credit card numbers
    const maskedData = data.replace(
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
      "***MASKED_CREDIT_CARD***"
    );
    return maskedData;
  },
});

const sdk = new NodeSDK({
  spanProcessors: [spanProcessor],
});

sdk.start();
```

## Filtering Spans

You can provide a predicate function `shouldExportSpan` to the `LangfuseSpanProcessor` to decide on a per-span basis whether it should be exported to Langfuse.

<Callout type="warning" title="Filtering Spans May Break Trace Trees">
  Filtering spans may break the parent-child relationships in your traces. For
  example, if you filter out a parent span but keep its children, you may see
  "orphaned" observations in the Langfuse UI. Consider the impact on trace
  structure when configuring `shouldExportSpan`.
</Callout>

```ts filename="instrumentation.ts" /shouldExportSpan/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor, ShouldExportSpan } from "@langfuse/otel";

// Example: Filter out all spans from the 'express' instrumentation
const shouldExportSpan: ShouldExportSpan = ({ otelSpan }) =>
  otelSpan.instrumentationScope.name !== "express";

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor({ shouldExportSpan })],
});

sdk.start();
```

If you want to include only LLM observability related spans, you can configure an allowlist like so:

```ts filename="instrumentation.ts"
import { ShouldExportSpan } from "@langfuse/otel";

const shouldExportSpan: ShouldExportSpan = ({ otelSpan }) =>
  ["langfuse-sdk", "ai"].includes(otelSpan.instrumentationScope.name);
```

<Callout type="info">
  If you would like to exclude Langfuse spans from being sent to third-party
  observability backends configured in your OpenTelemetry setup, see [the
  documentation on isolating the Langfuse tracer
  provider](#isolated-tracer-provider).
</Callout>

## Sampling

Langfuse respects OpenTelemetry's sampling decisions. You can configure a sampler in your OTEL SDK to control which traces are sent to Langfuse. This is useful for managing costs and reducing noise in high-volume applications.

Here is an example of how to configure a `TraceIdRatioBasedSampler` to send only 20% of traces:

```ts filename="instrumentation.ts" /new TraceIdRatioBasedSampler(0.2)/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";

const sdk = new NodeSDK({
  // Sample 20% of all traces
  sampler: new TraceIdRatioBasedSampler(0.2),
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();
```

For more advanced sampling strategies, refer to the [OpenTelemetry JS Sampling Documentation](https://opentelemetry.io/docs/languages/js/sampling/).

## Managing trace and observation IDs

In Langfuse, every trace and observation has a unique identifier. Understanding their format and how to set them is useful for integrating with other systems.

- **Trace IDs** are 32-character lowercase hexadecimal strings, representing 16 bytes of data
- **Observation IDs** (also known as Span IDs in OpenTelemetry) are 16-character lowercase hexadecimal strings, representing 8 bytes

While the SDK handles ID generation automatically, you may manually set them to align with external systems or create specific trace structures. This is done using the `parentSpanContext` option in tracing methods.

When starting a new trace by setting a `traceId`, you must also provide an arbitrary parent-`spanId` for the parent observation. The parent span ID value is irrelevant as long as it is a valid 16-hexchar string as the span does not actually exist but is only used for trace ID inheritance of the created observation.

You can create valid, deterministic trace IDs from a seed string using `createTraceId`. This is useful for correlating Langfuse traces with IDs from external systems, like a support ticket ID.

```typescript
import { createTraceId, startObservation } from "@langfuse/tracing";

const externalId = "support-ticket-54321";

// Generate a valid, deterministic traceId from the external ID
const langfuseTraceId = await createTraceId(externalId);

// You can now start a new trace with this ID
const rootSpan = startObservation(
  "process-ticket",
  {},
  {
    parentSpanContext: {
      traceId: langfuseTraceId,
      spanId: "0123456789abcdef", // A valid 16 hexchar string; value is irrelevant as parent span does not exist but only used for inheritance
      traceFlags: 1, // mark trace as sampled
    },
  }
);

// Later, you can regenerate the same traceId to score or retrieve the trace
const scoringTraceId = await createTraceId(externalId);
// scoringTraceId will be the same as langfuseTraceId
```

You may also access the current active trace ID via the `getActiveTraceId` function:

```typescript
import { startObservation, getActiveTraceId } from "@langfuse/tracing";

await startObservation("run", async (span) => {
  const traceId = getActiveTraceId();
  console.log(`Current trace ID: ${traceId}`);
});
```

## Logging

You can configure the global SDK logger to control the verbosity of log output. This is useful for debugging.

**In code:**

```typescript /configureGlobalLogger/
import { configureGlobalLogger, LogLevel } from "@langfuse/core";

// Set the log level to DEBUG to see all log messages
configureGlobalLogger({ level: LogLevel.DEBUG });
```

Available log levels are `DEBUG`, `INFO`, `WARN`, and `ERROR`.

**Via environment variable:**

You can also set the log level using the `LANGFUSE_LOG_LEVEL` environment variable.

```bash
export LANGFUSE_LOG_LEVEL="DEBUG"
```

## Serverless environments

In short-lived environments such as serverless functions (e.g., Vercel Functions, AWS Lambda), you must explicitly flush the traces before the process exits or the runtime environment is frozen.

<Tabs items={["Generic Serverless function", "Vercel Cloud Functions"]}>
<Tab>
{/* Generic serverless */}
Export the processor from your OTEL SDK setup file in order to flush it later.

```ts filename="instrumentation.ts" /langfuseSpanProcessor/ /forceFlush/ /exportMode: "immediate"/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// Export the processor to be able to flush it
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  exportMode: "immediate" // optional: configure immediate span export in serverless environments
});

const sdk = new NodeSDK({
  spanProcessors: [langfuseSpanProcessor],
});

sdk.start();
```

In your serverless function handler, call `forceFlush()` on the span processor before the function exits.

```ts filename="handler.ts" /forceFlush/
import { langfuseSpanProcessor } from "./instrumentation";

export async function handler(event, context) {
  // ... your application logic ...

  // Flush before exiting
  await langfuseSpanProcessor.forceFlush();
}
```

</Tab>

<Tab>
{/* Vercel Cloud Functions */}

Export the processor from your `instrumentation.ts` file in order to flush it later.

```ts filename="instrumentation.ts" /langfuseSpanProcessor/ /forceFlush/ /exportMode: "immediate"/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// Export the processor to be able to flush it
export const langfuseSpanProcessor = new LangfuseSpanProcessor();

const sdk = new NodeSDK({
  spanProcessors: [langfuseSpanProcessor],
});

sdk.start();
```

In Vercel Cloud Functions, please use the `after` utility to schedule a flush after the request has completed.

```ts filename="route.ts" /after/ /forceFlush/
import { after } from "next/server";

import { langfuseSpanProcessor } from "./instrumentation.ts";

export async function POST() {
  // ... existing request logic ...

  // Schedule flush after request has completed
  after(async () => {
    await langfuseSpanProcessor.forceFlush();
  });

  // ... send response ...
}
```

</Tab>
</Tabs>

## Isolated tracer provider

The Langfuse JS SDK uses the global OpenTelemetry TracerProvider to attach its span processor and create tracers that emit spans. This means that if you have an existing OpenTelemetry setup with another destination configured for your spans (e.g., Datadog), you will see Langfuse spans in those third-party observability backends as well.

If you'd like to avoid sending Langfuse spans to third-party observability backends in your existing OpenTelemetry setup, you will need to use an isolated OpenTelemetry TracerProvider that is separate from the global one.

<Callout type="info">
  If you would like to simply limit the spans that are sent to Langfuse and you
  have no third-party observability backend where you'd like to exclude Langfuse
  spans from, [see filtering spans instead](#filtering-spans).
</Callout>

<Callout type="warning" title="Isolated TracerProvider may break trace trees">
  Using an isolated TracerProvider may break the parent-child relationships in
  your traces, as all TracerProviders still share the same active span context.
  For example, if you have an active parent span from the global TracerProvider
  but children from an isolated TracerProvider, you may see "orphaned"
  observations in the Langfuse UI. Consider the impact on trace structure when
  configuring an isolated tracer provider.
</Callout>

```typescript /setLangfuseTracerProvider/ /LangfuseSpanProcessor/ /langfuseTracerProvider/
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { setLangfuseTracerProvider } from "@langfuse/tracing";

// Create a new TracerProvider and register the LangfuseSpanProcessor
// do not set this TracerProvider as the global TracerProvider
const langfuseTracerProvider = new NodeTracerProvider(
  spanProcessors: [new LangfuseSpanProcessor()],
)

// Register the isolated TracerProvider
setLangfuseTracerProvider(langfuseTracerProvider)
```

## Multi-project Setup

You can configure the SDK to send traces to multiple Langfuse projects. This is useful for multi-tenant applications or for sending traces to different environments. Simply register multiple `LangfuseSpanProcessor` instances, each with its own credentials.

```ts filename="instrumentation.ts"
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const sdk = new NodeSDK({
  spanProcessors: [
    new LangfuseSpanProcessor({
      publicKey: "pk-lf-public-key-project-1",
      secretKey: "sk-lf-secret-key-project-1",
    }),
    new LangfuseSpanProcessor({
      publicKey: "pk-lf-public-key-project-2",
      secretKey: "sk-lf-secret-key-project-2",
    }),
  ],
});

sdk.start();
```

This configuration will send every trace to both projects. You can also configure a custom `shouldExportSpan` filter for each processor to control which traces go to which project.

## Custom scores from browser

<Callout>
  Sending custom scores directly from the browser is not yet supported in the TypeScript SDK v4. The docs below describe the still valid approach with the SDK v3.
</Callout>

The TypeScript SDK can be used to report custom scores client-side directly from the browser. It is commonly used to ingest scores into Langfuse which are based on implicit user interactions and feedback.

**Example**

<Tabs items={["React", "Vue"]}>
<Tab>

```ts
import { LangfuseWeb } from "langfuse";

export function UserFeedbackComponent(props: { traceId: string }) {
  const langfuseWeb = new LangfuseWeb({
    publicKey: env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY,
    baseUrl: "https://cloud.langfuse.com", // 🇪🇺 EU region
    // baseUrl: "https://us.cloud.langfuse.com", // 🇺🇸 US region
  });

  const handleUserFeedback = async (value: number) =>
    await langfuseWeb.score({
      traceId: props.traceId,
      name: "user_feedback",
      value,
    });

  return (
    <div>
      <button onClick={() => handleUserFeedback(1)}>👍</button>
      <button onClick={() => handleUserFeedback(0)}>👎</button>
    </div>
  );
}
```

</Tab>
<Tab>

```html
<template>
  <div>
    <button @click="handleUserFeedback(1)">👍</button>
    <button @click="handleUserFeedback(0)">👎</button>
  </div>
</template>

<script>
  import { LangfuseWeb } from "langfuse";

  export default {
    props: {
      traceId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        langfuseWeb: null,
      };
    },
    created() {
      this.langfuseWeb = new LangfuseWeb({
        publicKey: process.env.VUE_APP_LANGFUSE_PUBLIC_KEY,
        baseUrl: "https://cloud.langfuse.com", // 🇪🇺 EU region
        // baseUrl: "https://us.cloud.langfuse.com", // 🇺🇸 US region
      });
    },
    methods: {
      async handleUserFeedback(value) {
        await this.langfuseWeb.score({
          traceId: this.traceId,
          name: "user_feedback",
          value,
        });
      },
    },
  };
</script>
```

</Tab>
</Tabs>

We integrated the Web SDK into the Vercel AI Chatbot project to collect user feedback on individual messages. Read the [blog post](/blog/showcase-llm-chatbot) for more details and code examples.

**Installation**

```sh npm2yarn
npm i langfuse # this is still the v3 installation as v4 does not yet support scores from browser env
```

In your application, set the **public api key** to create a client.

```ts
import { LangfuseWeb } from "langfuse";

const langfuseWeb = new LangfuseWeb({
  publicKey: "pk-lf-...",
  baseUrl: "https://cloud.langfuse.com", // 🇪🇺 EU region
  // baseUrl: "https://us.cloud.langfuse.com", // 🇺🇸 US region
});
```

Hint for Next.js users: you need to prefix the public key with `NEXT_PUBLIC_` to expose it in the frontend.

<Callout type="warning">

  Never set your Langfuse **secret key** in public browser code. The `LangfuseWeb` requires only the public key.

</Callout>

**Create custom scores**

Scores are used to evaluate executions/traces. They are attached to a single trace. If the score relates to a specific step of the trace, the score can optionally also be attached to the observation to enable evaluating it specifically.

<Callout type="info">
  While integrating Langfuse, it is important to either include the Langfuse Ids
  in the response to the frontend or to use an own id as the trace id which is
  available in both backend and frontend.
</Callout>

```ts
// pass traceId and observationId to front end
await langfuseWeb.score({
  traceId: message.traceId,
  observationId: message.observationId,
  name: "user-feedback",
  value: 1,
  comment: "I like how personalized the response is",
});
```

Learn more about [custom scores here](/docs/evaluation/evaluation-methods/custom-scores).

---
title: TypeScript SDK - Upgrade Path
description: Upgrade path from v3 to v4 for the TypeScript SDK.
---

# TypeScript SDK - Upgrade Path v3 to v4

Please follow each section below to upgrade your application from v3 to v4.

If you encounter any questions or issues while upgrading, please raise an [issue](/issues) on GitHub.

<iframe
  width="100%"
  src="https://www.youtube-nocookie.com/embed/BjEXs13KyV4?si=AR7e4r3vIlD2ydiO"
  title="TypeScript SDK v4 (GA)"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  className="aspect-video rounded border mt-6"
  allowFullScreen
></iframe>

## Tracing

The v4 SDK tracing is a major rewrite based on OpenTelemetry and introduces several breaking changes.

1.  **OTEL-based Architecture**: The SDK is now built on top of OpenTelemetry. An OpenTelemetry Setup is required now and done by registering the `LangfuseSpanProcessor` with an OpenTelemetry `NodeSDK`.
2.  **New Tracing Functions**: The `langfuse.trace()`, `langfuse.span()`, and `langfuse.generation()` methods have been replaced by `startObservation`, `startActiveObservation`, etc., from the `@langfuse/tracing` package.
3.  **Separation of Concerns**:
    - The **`@langfuse/tracing`** and **`@langfuse/otel`** packages are for tracing.
    - The **`@langfuse/client`** package and the `LangfuseClient` class are now only for non-tracing features like scoring, prompt management, and datasets.

See the [SDK v4 docs](/docs/observability/sdk/typescript/overview) for details on each.

## Prompt Management

- **Import**: The import of the Langfuse client is now:

  ```typescript
  import { LangfuseClient } from "@langfuse/client";
  ```

- **Usage**: The usage of the Langfuse client is now:

  ```typescript
  const langfuse = new LangfuseClient();

  const prompt = await langfuse.prompt.get("my-prompt");

  const compiledPrompt = prompt.compile({ topic: "developers" });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: compiledPrompt }],
  });
  ```

- `version` is now an optional property of the options object of `langfuse.prompt.get()` instead of a positional argument.

  ```typescript
  const prompt = await langfuse.prompt.get("my-prompt", { version: "1.0" });
  ```

## OpenAI integration

- **Import**: The import of the OpenAI integration is now:

  ```typescript
  import { observeOpenAI } from "@langfuse/openai";
  ```

- You can set the `environment` and `release` now via the `LANGFUSE_TRACING_ENVIRONMENT` and `LANGFUSE_TRACING_RELEASE` environment variables.

## Vercel AI SDK

Works very similarly to v3, but replaces `LangfuseExporter` from `langfuse-vercel` with the regular `LangfuseSpanProcessor` from `@langfuse/otel`.

Please see [full example on usage with the AI SDK](/docs/observability/sdk/typescript/instrumentation#vercel-ai-sdk) for more details.

## Langchain integration

- **Import**: The import of the Langchain integration is now:

  ```typescript
  import { CallbackHandler } from "@langfuse/langchain";
  ```

- You can set the `environment` and `release` now via the `LANGFUSE_TRACING_ENVIRONMENT` and `LANGFUSE_TRACING_RELEASE` environment variables.

## `langfuseClient.getTraceUrl`

- method is now asynchronous and returns a promise

  ```typescript
  const traceUrl = await langfuseClient.getTraceUrl(traceId);
  ```

## Scoring

- **Import**: The import of the Langfuse client is now:

  ```typescript
  import { LangfuseClient } from "@langfuse/client";
  ```

- **Usage**: The usage of the Langfuse client is now:

  ```typescript
  const langfuse = new LangfuseClient();

  await langfuse.score.create({
    traceId: "trace_id_here",
    name: "accuracy",
    value: 0.9,
  });
  ```

See [custom scores documentation](/docs/evaluation/evaluation-methods/custom-scores) for new scoring methods.

## Datasets

See [datasets documentation](/docs/evaluation/dataset-runs/remote-run#setup--run-via-sdk) for new dataset methods.

---
title: TypeScript SDK - Troubleshooting and FAQ
description: Troubleshooting and FAQ for the TypeScript SDK.
label: "Version: JS SDK v4"
---

# TypeScript SDK - Troubleshooting and FAQ

If your issue is not covered here, please see our [support page](/support).

## Missing traces in serverless environments

Please see the documentation on [serverless environments](/docs/observability/sdk/typescript/advanced-usage#serverless-environments)

## Missing traces with `@vercel/otel`

If you are using Next.js, please use a manual OpenTelemetry setup via the `NodeTracerProvider` than via `registerOTel` from `@vercel/otel`. This is because [the `@vercel/otel` package does not yet support the OpenTelemetry JS SDK v2](https://github.com/vercel/otel/issues/154) on which the `@langfuse/tracing` and `@langfuse/otel` packages are based.

If you are still missing traces, please see the documentation on [serverless environments](/docs/observability/sdk/typescript/advanced-usage#serverless-environments)
