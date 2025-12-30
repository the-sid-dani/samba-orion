"use client";

import { useEffect } from "react";

/**
 * Global Error Boundary for Next.js 15
 *
 * This catches unhandled errors at the root level, including:
 * - Client-side exceptions after idle (WebGL context loss, memory pressure)
 * - Hydration mismatches
 * - Unhandled promise rejections
 *
 * The reset() function attempts to recover without a full page reload.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for observability
    // TODO: Send to error tracking service (Sentry, etc.) for production visibility
    console.error("🚨 Global Error Boundary caught:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const handleReset = () => {
    // Clear any potentially stale client state before reset
    try {
      // Clear SWR cache to prevent stale data issues
      if (typeof window !== "undefined") {
        // Clear localStorage items that might be corrupted
        const keysToPreserve = ["theme", "sidebar-state"];
        const allKeys = Object.keys(localStorage);
        for (const key of allKeys) {
          if (
            key.startsWith("$swr$") &&
            !keysToPreserve.some((k) => key.includes(k))
          ) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to clear stale state:", e);
    }

    reset();
  };

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-destructive"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                The application encountered an unexpected error. This often
                happens after the browser has been idle for a while.
              </p>
            </div>

            {/* Error Details (dev only) */}
            {process.env.NODE_ENV === "development" && (
              <div className="bg-muted rounded-lg p-4 text-left">
                <p className="text-sm font-mono text-destructive break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Go Home
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground">
              If this keeps happening, try clearing your browser cache or
              contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
