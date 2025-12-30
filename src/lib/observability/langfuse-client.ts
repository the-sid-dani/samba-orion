/**
 * Langfuse SDK Client (v4)
 *
 * This module initializes the Langfuse v4 client for observe() decorators.
 * IMPORTANT: Only import this in Node.js runtime (API routes), NOT in Edge runtime (middleware).
 */

import { LangfuseClient } from "@langfuse/client";

export const langfuse = new LangfuseClient({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  // Prioritize LANGFUSE_HOST (Langfuse docs standard) for self-hosted instances
  baseUrl:
    process.env.LANGFUSE_HOST ||
    process.env.LANGFUSE_BASE_URL ||
    "https://cloud.langfuse.com",
  // v4 SDK doesn't support release/environment in constructor
});

// Note: v4 SDK uses different flush approach - rely on instrumentation.ts for shutdown handling
