"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

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
  useEffect(() => {
    // Log for debugging and observability
    // TODO: Send to error tracking service (Sentry, etc.) for production visibility
    console.error("🚨 Error Boundary caught:", {
      message: error.message,
      digest: error.digest,
      name: error.name,
      timestamp: new Date().toISOString(),
    });

    // If this is a WebGL context loss, it might auto-recover
    if (
      error.message.includes("WebGL") ||
      error.message.includes("context lost")
    ) {
      console.info(
        "ℹ️ WebGL context loss detected - will attempt auto-recovery",
      );
    }
  }, [error]);

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
    <div className="flex-1 flex items-center justify-center p-8">
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
            {error.message.includes("WebGL") ||
            error.message.includes("context")
              ? "The graphics context was lost after being idle. This is normal browser behavior."
              : "An unexpected error occurred. You can try again or return to the home page."}
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
