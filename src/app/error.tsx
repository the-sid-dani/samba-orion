"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

/**
 * Categorize error source for telemetry and debugging
 */
type ErrorSource = "webgl" | "swr" | "network" | "hydration" | "unknown";

function categorizeError(error: Error): {
  source: ErrorSource;
  isRecoverable: boolean;
  userMessage: string;
} {
  const msg = error.message?.toLowerCase() || "";
  const name = error.name?.toLowerCase() || "";

  // WebGL/Canvas errors
  if (
    msg.includes("webgl") ||
    msg.includes("context lost") ||
    msg.includes("canvas")
  ) {
    return {
      source: "webgl",
      isRecoverable: true,
      userMessage:
        "The graphics context was lost after being idle. This is normal browser behavior.",
    };
  }

  // Network/Fetch errors
  if (
    (name === "typeerror" &&
      (msg.includes("fetch") || msg.includes("network"))) ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror")
  ) {
    return {
      source: "network",
      isRecoverable: true,
      userMessage:
        "A network request failed. Please check your connection and try again.",
    };
  }

  // SWR revalidation errors
  if (msg.includes("revalidat") || msg.includes("swr")) {
    return {
      source: "swr",
      isRecoverable: true,
      userMessage: "Data refresh failed. Click Try Again to reload.",
    };
  }

  // Hydration errors
  if (msg.includes("hydrat") || msg.includes("mismatch")) {
    return {
      source: "hydration",
      isRecoverable: true,
      userMessage: "Page state became stale. Refreshing will fix this.",
    };
  }

  return {
    source: "unknown",
    isRecoverable: false,
    userMessage:
      "An unexpected error occurred. You can try again or return to the home page.",
  };
}

/**
 * App-level Error Boundary
 *
 * Catches client-side errors within the app routes, providing
 * a graceful recovery path without losing navigation context.
 *
 * Common causes caught here:
 * - WebGL context loss after browser idle
 * - Memory pressure from long sessions
 * - Network failures during SWR revalidation
 * - Stale hydration state
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorInfo = useMemo(() => categorizeError(error), [error]);

  useEffect(() => {
    // Structured error telemetry for observability
    const telemetry = {
      source: errorInfo.source,
      isRecoverable: errorInfo.isRecoverable,
      message: error.message,
      name: error.name,
      digest: error.digest,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    // Log structured data for debugging
    console.error("🚨 Error Boundary caught:", telemetry);

    // Log to console with source tag for filtering
    console.error(`[ErrorBoundary:${errorInfo.source}]`, error);

    // Future: Send to Langfuse/Sentry
    // if (typeof window !== "undefined" && window.Langfuse) {
    //   window.Langfuse.captureException(error, { extra: telemetry });
    // }

    // Auto-recovery for WebGL - the context often restores automatically
    if (errorInfo.source === "webgl") {
      console.info(
        "ℹ️ WebGL context loss detected - will attempt auto-recovery",
      );
    }
  }, [error, errorInfo]);

  const handleReset = () => {
    // Trigger SWR revalidation on reset (SWR listens for focus events)
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("focus"));
      }
    } catch (_e) {
      // Ignore errors
    }

    reset();
  };

  return (
    <div
      className="flex-1 flex items-center justify-center p-8"
      data-error-source={errorInfo.source}
    >
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            {errorInfo.userMessage}
          </p>
        </div>

        {/* Dev-only error details */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-muted/50 rounded-lg p-3 text-left border">
            <p className="text-xs font-mono text-destructive break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Recovery Actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={handleReset} size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/")}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>

        {/* Subtle hint */}
        <p className="text-xs text-muted-foreground/70">
          If this persists after refreshing, try clearing your browser cache.
        </p>
      </div>
    </div>
  );
}
