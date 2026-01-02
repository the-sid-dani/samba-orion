"use client";
import { useEffect } from "react";
import { SWRConfig } from "swr";

// Extend Window for activity tracking
declare global {
  interface Window {
    __lastActivityTimestamp?: number;
  }
}

// Global error interceptor - catches errors BEFORE they hit React error boundary
if (typeof window !== "undefined") {
  // Track last activity for debugging
  window.__lastActivityTimestamp = Date.now();
  ["mousemove", "keydown", "click", "scroll"].forEach((event) => {
    window.addEventListener(
      event,
      () => {
        window.__lastActivityTimestamp = Date.now();
      },
      { passive: true },
    );
  });

  // Catch unhandled errors at window level BEFORE React error boundary
  window.addEventListener(
    "error",
    (event) => {
      const idleDuration =
        Date.now() - (window.__lastActivityTimestamp || Date.now());
      const isAfterIdle = idleDuration > 30000; // 30s of no activity

      console.warn("🔍 [Global Error Intercept]", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        idleDuration: `${Math.floor(idleDuration / 1000)}s`,
        isAfterIdle,
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString(),
      });

      // If this is an idle-recovery error (network/WebGL), try to suppress it
      const errorMsg = (event.message || "").toLowerCase();
      const isRecoverableIdleError =
        isAfterIdle &&
        (errorMsg.includes("fetch") ||
          errorMsg.includes("network") ||
          errorMsg.includes("webgl") ||
          errorMsg.includes("context"));

      if (isRecoverableIdleError) {
        console.info("✨ Suppressing recoverable idle error");
        event.preventDefault();
        return false;
      }
    },
    true,
  ); // Capture phase to catch early

  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const idleDuration =
      Date.now() - (window.__lastActivityTimestamp || Date.now());
    const isAfterIdle = idleDuration > 30000;

    console.warn("🔍 [Global Rejection Intercept]", {
      reason: event.reason,
      idleDuration: `${Math.floor(idleDuration / 1000)}s`,
      isAfterIdle,
      timestamp: new Date().toISOString(),
    });

    // Suppress network-related rejections after idle
    const reason = String(event.reason || "").toLowerCase();
    const isRecoverableIdleRejection =
      isAfterIdle &&
      (reason.includes("fetch") ||
        reason.includes("network") ||
        reason.includes("abort"));

    if (isRecoverableIdleRejection) {
      console.info("✨ Suppressing recoverable idle rejection");
      event.preventDefault();
    }
  });
}

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
