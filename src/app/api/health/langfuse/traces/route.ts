/**
 * Langfuse Trace Health Monitoring Endpoint
 *
 * Provides detailed metrics about trace delivery and processing:
 * - Last trace sent timestamp
 * - Trace count in last hour
 * - Flush status
 * - Connection health
 */

import { NextResponse } from "next/server";
import { langfuseSpanProcessor } from "@/instrumentation";

// In-memory trace tracking (resets on server restart)
let lastTraceTimestamp: Date | null = null;
let traceCountLastHour = 0;
let lastHourReset = new Date();

// Update trace tracking (called from instrumentation)
export function recordTraceActivity() {
  lastTraceTimestamp = new Date();

  // Reset hourly counter if needed
  const now = new Date();
  const hoursSinceReset =
    (now.getTime() - lastHourReset.getTime()) / (1000 * 60 * 60);
  if (hoursSinceReset >= 1) {
    traceCountLastHour = 0;
    lastHourReset = now;
  }

  traceCountLastHour++;
}

export async function GET() {
  try {
    const now = new Date();

    // Check if required environment variables are set
    const hasPublicKey = !!process.env.LANGFUSE_PUBLIC_KEY;
    const hasSecretKey = !!process.env.LANGFUSE_SECRET_KEY;
    const baseUrl =
      process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
    const environment =
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

    // Calculate time since last trace
    const timeSinceLastTrace = lastTraceTimestamp
      ? Math.floor((now.getTime() - lastTraceTimestamp.getTime()) / 1000)
      : null;

    // Test flush capability
    let flushStatus = "unknown";
    let flushError: string | null = null;
    try {
      await langfuseSpanProcessor.forceFlush();
      flushStatus = "success";
    } catch (error) {
      flushStatus = "error";
      flushError =
        error instanceof Error ? error.message : "Unknown flush error";
    }

    // Basic connectivity check
    let connectivityStatus = "unknown";
    try {
      const response = await fetch(`${baseUrl}/api/public/health`, {
        method: "GET",
        headers: {
          "User-Agent": "samba-orion-trace-health-check",
        },
        signal: AbortSignal.timeout(5000),
      });
      connectivityStatus = response.ok ? "connected" : "error";
    } catch (_error) {
      connectivityStatus = "unreachable";
    }

    const traceHealthStatus = {
      service: "langfuse-traces",
      environment,
      traces: {
        lastTraceSentAt: lastTraceTimestamp?.toISOString() || "never",
        timeSinceLastTrace:
          timeSinceLastTrace !== null ? `${timeSinceLastTrace}s ago` : "never",
        traceCountLastHour,
        hourlyCounterResetAt: lastHourReset.toISOString(),
      },
      flush: {
        status: flushStatus,
        error: flushError,
      },
      connection: {
        status: connectivityStatus,
        baseUrl,
      },
      configuration: {
        publicKey: hasPublicKey ? "✓ set" : "✗ missing",
        secretKey: hasSecretKey ? "✓ set" : "✗ missing",
      },
      timestamp: now.toISOString(),
    };

    // Determine overall health
    const isHealthy =
      hasPublicKey &&
      hasSecretKey &&
      connectivityStatus === "connected" &&
      flushStatus === "success";

    // Warning conditions
    const warnings: string[] = [];
    if (timeSinceLastTrace && timeSinceLastTrace > 300) {
      warnings.push(
        `No traces sent in last ${Math.floor(timeSinceLastTrace / 60)} minutes`,
      );
    }
    if (traceCountLastHour === 0) {
      warnings.push("No traces recorded in the last hour");
    }

    return NextResponse.json(
      {
        healthy: isHealthy,
        warnings: warnings.length > 0 ? warnings : undefined,
        ...traceHealthStatus,
      },
      {
        status: isHealthy ? 200 : 503,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        service: "langfuse-traces",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
      },
    );
  }
}
