"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Extend WindowEventMap for custom idle events (F4 fix)
declare global {
  interface WindowEventMap {
    "idle:start": CustomEvent;
    "idle:end": CustomEvent;
  }
}

/**
 * Idle Detection Hook
 *
 * Proactively detects user idle state to prevent crashes from:
 * - Browser tab throttling after ~60s
 * - WebGL context reclamation
 * - SWR revalidation failures during idle
 * - requestAnimationFrame accumulation
 *
 * @param options.idleThreshold - ms before considered idle (default: 30000)
 * @param options.pauseOnIdle - auto-emit pause events (default: true)
 */

export interface IdleDetectionOptions {
  /** Milliseconds before considered idle (default: 30000) */
  idleThreshold?: number;
  /** Auto-pause background tasks when idle (default: true) */
  pauseOnIdle?: boolean;
}

export interface IdleDetectionResult {
  /** Whether user is currently idle */
  isIdle: boolean;
  /** Milliseconds since idle started (0 if not idle) */
  idleDuration: number;
  /** Timestamp of last user activity */
  lastActivity: number;
  /** Manually trigger pause (for components to respond to) */
  pauseBackgroundTasks: () => void;
  /** Manually trigger resume */
  resumeBackgroundTasks: () => void;
}

// Custom events for cross-component communication
const IDLE_START_EVENT = "idle:start";
const IDLE_END_EVENT = "idle:end";

/**
 * Emit custom idle events for components to listen to
 */
function emitIdleEvent(type: typeof IDLE_START_EVENT | typeof IDLE_END_EVENT) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(type));
  }
}

export function useIdleDetection(
  options: IdleDetectionOptions = {},
): IdleDetectionResult {
  const { idleThreshold = 30000, pauseOnIdle = true } = options;

  const [isIdle, setIsIdle] = useState(false);
  const [idleDuration, setIdleDuration] = useState(0);
  const [lastActivity, setLastActivity] = useState(() => Date.now());

  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const idleStartTimeRef = useRef<number | null>(null);

  // Use ref to avoid stale closure in handleActivity (F1 fix)
  const isIdleRef = useRef(isIdle);
  isIdleRef.current = isIdle;

  // Debounce activity updates to avoid excessive re-renders
  const activityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const pauseBackgroundTasks = useCallback(() => {
    emitIdleEvent(IDLE_START_EVENT);
    if (process.env.NODE_ENV === "development") {
      console.info("[Idle Detection] Background tasks paused");
    }
  }, []);

  const resumeBackgroundTasks = useCallback(() => {
    emitIdleEvent(IDLE_END_EVENT);
    if (process.env.NODE_ENV === "development") {
      console.info("[Idle Detection] Background tasks resumed");
    }
  }, []);

  const handleActivity = useCallback(() => {
    // Debounce rapid activity events (e.g., continuous mouse movement)
    if (activityDebounceRef.current) {
      clearTimeout(activityDebounceRef.current);
    }

    activityDebounceRef.current = setTimeout(() => {
      const now = Date.now();
      setLastActivity(now);

      // If we were idle, resume (use ref to get current value)
      if (isIdleRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.info(
            `[Idle Detection] User returned after ${Math.round((now - (idleStartTimeRef.current || now)) / 1000)}s`,
          );
        }
        setIsIdle(false);
        setIdleDuration(0);
        idleStartTimeRef.current = null;

        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        if (pauseOnIdle) {
          resumeBackgroundTasks();
        }
      }

      // Reset idle timeout
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      idleTimeoutRef.current = setTimeout(() => {
        if (process.env.NODE_ENV === "development") {
          console.info(
            `[Idle Detection] User idle for ${idleThreshold / 1000}s`,
          );
        }
        const idleStart = Date.now();
        idleStartTimeRef.current = idleStart;
        setIsIdle(true);

        // Start tracking idle duration
        durationIntervalRef.current = setInterval(() => {
          setIdleDuration(Date.now() - idleStart);
        }, 1000);

        if (pauseOnIdle) {
          pauseBackgroundTasks();
        }
      }, idleThreshold);
    }, 100); // 100ms debounce
  }, [idleThreshold, pauseOnIdle, pauseBackgroundTasks, resumeBackgroundTasks]);

  // Handle visibility change (tab switch, minimize)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      // User returned to tab - treat as activity
      handleActivity();
    } else {
      // Tab hidden - trigger idle immediately after short delay
      // (User might just be switching tabs briefly)
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }

      visibilityTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState === "hidden") {
          if (process.env.NODE_ENV === "development") {
            console.info("[Idle Detection] Tab hidden, entering idle state");
          }
          const idleStart = Date.now();
          idleStartTimeRef.current = idleStart;
          setIsIdle(true);

          if (pauseOnIdle) {
            pauseBackgroundTasks();
          }
        }
      }, 5000); // 5s grace period for quick tab switches
    }
  }, [handleActivity, pauseOnIdle, pauseBackgroundTasks]);

  useEffect(() => {
    // Activity events to monitor
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "wheel",
    ];

    // Register listeners
    for (const event of activityEvents) {
      window.addEventListener(event, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initialize: start idle timer
    handleActivity();

    return () => {
      // Cleanup
      for (const event of activityEvents) {
        window.removeEventListener(event, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current);
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [handleActivity, handleVisibilityChange]);

  return {
    isIdle,
    idleDuration,
    lastActivity,
    pauseBackgroundTasks,
    resumeBackgroundTasks,
  };
}

/**
 * Hook to listen for idle events (for use in components that need to pause)
 */
export function useIdleListener(callbacks: {
  onIdleStart?: () => void;
  onIdleEnd?: () => void;
}) {
  // Use refs to avoid re-registering listeners when callbacks change (F2 fix)
  const onIdleStartRef = useRef(callbacks.onIdleStart);
  const onIdleEndRef = useRef(callbacks.onIdleEnd);

  // Keep refs updated
  onIdleStartRef.current = callbacks.onIdleStart;
  onIdleEndRef.current = callbacks.onIdleEnd;

  useEffect(() => {
    const handleStart = () => onIdleStartRef.current?.();
    const handleEnd = () => onIdleEndRef.current?.();

    window.addEventListener(IDLE_START_EVENT, handleStart);
    window.addEventListener(IDLE_END_EVENT, handleEnd);

    return () => {
      window.removeEventListener(IDLE_START_EVENT, handleStart);
      window.removeEventListener(IDLE_END_EVENT, handleEnd);
    };
  }, []); // Empty deps - refs handle callback updates
}
