"use client";
import { useEffect } from "react";
import { SWRConfig } from "swr";

/**
 * SWR Configuration Provider
 *
 * Provides global error handling to prevent SWR revalidation errors
 * from bubbling up to the error boundary, especially during:
 * - Tab idle/return focus revalidation
 * - Network hiccups
 * - Browser throttling
 */
export function SWRConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    console.log(
      "%c█▄▄ █▀▀ ▀█▀ ▀█▀ █▀▀ █▀█\n█▄█ █▄▄  █   █  █▄▄ █▀▄\n\n%c🧡 Samba AI - The Future of Agentic Advertising\nhttps://github.com/samba-tv/samba-ai",
      "color: #00d4ff; font-weight: bold; font-family: monospace; font-size: 16px; text-shadow: 0 0 10px #00d4ff;",
      "color: #888; font-size: 12px;",
    );
  }, []);

  return (
    <SWRConfig
      value={{
        focusThrottleInterval: 30000,
        dedupingInterval: 2000,
        errorRetryCount: 3,

        // Global error handler - log but don't throw to error boundary
        onError: (error, key) => {
          // Suppress during idle recovery - these are expected
          const isNetworkError =
            error?.name === "TypeError" ||
            error?.message?.includes("fetch") ||
            error?.message?.includes("network");

          const isAbortError = error?.name === "AbortError";

          if (isAbortError) {
            // Abort errors are intentional - don't log
            return;
          }

          if (isNetworkError) {
            if (process.env.NODE_ENV === "development") {
              console.info(
                "[SWR] Network error during revalidation (suppressed):",
                {
                  key,
                  error: error?.message,
                },
              );
            }
            return;
          }

          // Log other errors for debugging but don't throw
          if (process.env.NODE_ENV === "development") {
            console.warn("[SWR] Revalidation error (suppressed):", {
              key,
              error: error?.message || error,
            });
          }
        },

        // Custom retry logic with exponential backoff
        onErrorRetry: (error, key, _config, revalidate, { retryCount }) => {
          // Never retry on 4xx client errors
          if (error?.status >= 400 && error?.status < 500) {
            if (process.env.NODE_ENV === "development") {
              console.info("[SWR] Client error - not retrying:", {
                key,
                status: error.status,
              });
            }
            return;
          }

          // Never retry abort errors
          if (error?.name === "AbortError") {
            return;
          }

          // Cap retries at 3
          if (retryCount >= 3) {
            if (process.env.NODE_ENV === "development") {
              console.info("[SWR] Max retries reached:", { key, retryCount });
            }
            return;
          }

          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.min(1000 * 2 ** retryCount, 30000);
          if (process.env.NODE_ENV === "development") {
            console.info(
              `[SWR] Retrying in ${delay}ms (attempt ${retryCount + 1}):`,
              { key },
            );
          }

          setTimeout(() => {
            revalidate({ retryCount });
          }, delay);
        },

        // Don't revalidate on focus if document was hidden for a while
        // (prevents error storms when returning from idle)
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
