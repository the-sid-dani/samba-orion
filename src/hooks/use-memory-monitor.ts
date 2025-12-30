/**
 * Modern Memory Monitor Hook
 *
 * Replaces the deprecated window.performance.memory API with modern
 * memory monitoring approaches. Provides fallback for unsupported browsers
 * and follows existing Canvas memory tracking patterns.
 *
 * SECURITY: Cross-origin isolation required for measureUserAgentSpecificMemory
 * PERFORMANCE: Designed for debugging/monitoring, not high-frequency polling
 */

import { useCallback, useRef, useEffect, useState } from "react";

// Memory information interface
export interface MemoryInfo {
  used: number; // Bytes of used memory
  total: number; // Bytes of total allocated memory
  limit: number; // Bytes of memory limit
  timestamp: number; // When measurement was taken
  source: "modern" | "legacy" | "estimated"; // How memory was measured
}

// Memory monitoring options
export interface MemoryMonitorOptions {
  enableLogging?: boolean; // Log memory info to console
  logPrefix?: string; // Prefix for log messages
  estimateFromChartCount?: boolean; // Use chart count for estimation
  pollInterval?: number; // Polling interval in ms (0 = manual only)
  warningThreshold?: number; // Warning threshold as percentage (0-100)
  criticalThreshold?: number; // Critical threshold as percentage (0-100)
}

// Memory pressure levels
export type MemoryPressure = "normal" | "warning" | "critical";

// Default options following canvas-panel.tsx patterns
const DEFAULT_OPTIONS: Required<MemoryMonitorOptions> = {
  enableLogging: process.env.NODE_ENV === "development",
  logPrefix: "[Memory Monitor]",
  estimateFromChartCount: true,
  pollInterval: 0, // Manual tracking only by default
  warningThreshold: 75,
  criticalThreshold: 90,
};

/**
 * Modern memory monitoring hook
 * Replaces deprecated window.performance.memory with modern APIs
 */
export function useMemoryMonitor(options: MemoryMonitorOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [memoryPressure, setMemoryPressure] =
    useState<MemoryPressure>("normal");
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const chartCountRef = useRef<number>(0);

  // Check for modern memory monitoring support
  const checkSupport = useCallback(() => {
    if (typeof window === "undefined") return false;

    // Check for modern measureUserAgentSpecificMemory API
    if ("measureUserAgentSpecificMemory" in performance) {
      return true;
    }

    // Check for legacy window.performance.memory (deprecated but still available)
    if (window.performance && (window.performance as any).memory) {
      return true;
    }

    return false;
  }, []);

  // Modern memory measurement using measureUserAgentSpecificMemory
  const measureMemoryModern =
    useCallback(async (): Promise<MemoryInfo | null> => {
      try {
        if (!("measureUserAgentSpecificMemory" in performance)) {
          return null;
        }

        // Note: This requires cross-origin isolation and secure context
        const memoryMeasurement = await (
          performance as any
        ).measureUserAgentSpecificMemory();

        // The API returns breakdown by different categories
        // Sum up all memory usage for total used memory
        let totalUsed = 0;
        if (memoryMeasurement.breakdown) {
          for (const breakdown of memoryMeasurement.breakdown) {
            totalUsed += breakdown.bytes || 0;
          }
        } else {
          totalUsed = memoryMeasurement.bytes || 0;
        }

        return {
          used: totalUsed,
          total: totalUsed, // Modern API doesn't provide total allocation
          limit: totalUsed * 2, // Estimate limit (browsers typically allow 2x current usage)
          timestamp: Date.now(),
          source: "modern",
        };
      } catch (error) {
        // Cross-origin isolation not enabled or other issues
        if (config.enableLogging) {
          console.warn(`${config.logPrefix} Modern memory API failed:`, error);
        }
        return null;
      }
    }, [config.enableLogging, config.logPrefix]);

  // Legacy memory measurement using deprecated window.performance.memory
  const measureMemoryLegacy = useCallback((): MemoryInfo | null => {
    try {
      if (typeof window === "undefined" || !window.performance) return null;

      const memory = (window.performance as any).memory;
      if (!memory) return null;

      return {
        used: memory.usedJSHeapSize || 0,
        total: memory.totalJSHeapSize || 0,
        limit: memory.jsHeapSizeLimit || 0,
        timestamp: Date.now(),
        source: "legacy",
      };
    } catch (error) {
      if (config.enableLogging) {
        console.warn(`${config.logPrefix} Legacy memory API failed:`, error);
      }
      return null;
    }
  }, [config.enableLogging, config.logPrefix]);

  // Estimate memory usage based on chart count and other factors
  const estimateMemory = useCallback((): MemoryInfo => {
    // Rough estimation based on typical chart memory usage
    const chartCount = chartCountRef.current;
    const baseMemoryMB = 50; // Base app memory usage
    const memoryPerChartMB = 5; // Estimated MB per chart (Recharts + data)

    // Additional factors
    const complexityMultiplier = 1 + (chartCount > 10 ? 0.2 : 0); // More charts = more complexity
    const estimatedUsedMB =
      (baseMemoryMB + chartCount * memoryPerChartMB) * complexityMultiplier;
    const estimatedUsedBytes = estimatedUsedMB * 1024 * 1024;

    // Estimated limits (typical browser limits)
    const estimatedLimitBytes = 2 * 1024 * 1024 * 1024; // ~2GB typical limit
    const estimatedTotalBytes = Math.min(
      estimatedUsedBytes * 1.5,
      estimatedLimitBytes * 0.8,
    );

    return {
      used: estimatedUsedBytes,
      total: estimatedTotalBytes,
      limit: estimatedLimitBytes,
      timestamp: Date.now(),
      source: "estimated",
    };
  }, []);

  // Get memory information using best available method
  const getMemoryInfo = useCallback(async (): Promise<MemoryInfo> => {
    // Try modern API first
    const modernMemory = await measureMemoryModern();
    if (modernMemory) {
      return modernMemory;
    }

    // Fall back to legacy API
    const legacyMemory = measureMemoryLegacy();
    if (legacyMemory) {
      return legacyMemory;
    }

    // Fall back to estimation
    return estimateMemory();
  }, [measureMemoryModern, measureMemoryLegacy, estimateMemory]);

  // Calculate memory pressure level
  const calculateMemoryPressure = useCallback(
    (memory: MemoryInfo): MemoryPressure => {
      if (memory.limit === 0) return "normal";

      const usagePercent = (memory.used / memory.limit) * 100;

      if (usagePercent >= config.criticalThreshold) {
        return "critical";
      } else if (usagePercent >= config.warningThreshold) {
        return "warning";
      }

      return "normal";
    },
    [config.warningThreshold, config.criticalThreshold],
  );

  // Update chart count (used for estimation)
  const updateChartCount = useCallback((count: number) => {
    chartCountRef.current = Math.max(0, count);
  }, []);

  // Perform memory measurement and update state
  const measureMemory = useCallback(async () => {
    try {
      const memory = await getMemoryInfo();
      const pressure = calculateMemoryPressure(memory);

      setMemoryInfo(memory);
      setMemoryPressure(pressure);

      // Log memory information in development mode (following existing pattern)
      if (config.enableLogging) {
        const usedMB = Math.round(memory.used / 1024 / 1024);
        const totalMB = Math.round(memory.total / 1024 / 1024);
        const limitMB = Math.round(memory.limit / 1024 / 1024);
        const usagePercent =
          memory.limit > 0 ? Math.round((memory.used / memory.limit) * 100) : 0;

        console.log(`${config.logPrefix} Memory Usage (${memory.source}):`, {
          used: `${usedMB}MB`,
          total: `${totalMB}MB`,
          limit: `${limitMB}MB`,
          usage: `${usagePercent}%`,
          pressure,
          charts: chartCountRef.current,
        });
      }

      return memory;
    } catch (error) {
      if (config.enableLogging) {
        console.error(`${config.logPrefix} Memory measurement failed:`, error);
      }
      throw error;
    }
  }, [
    getMemoryInfo,
    calculateMemoryPressure,
    config.enableLogging,
    config.logPrefix,
  ]);

  // Start/stop automatic polling
  const startPolling = useCallback(() => {
    if (config.pollInterval <= 0) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(measureMemory, config.pollInterval);
  }, [config.pollInterval, measureMemory]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  // Format memory size for display
  const formatMemorySize = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }, []);

  // Get memory statistics
  const getMemoryStats = useCallback(() => {
    if (!memoryInfo) return null;

    const usagePercent =
      memoryInfo.limit > 0 ? (memoryInfo.used / memoryInfo.limit) * 100 : 0;

    return {
      used: formatMemorySize(memoryInfo.used),
      total: formatMemorySize(memoryInfo.total),
      limit: formatMemorySize(memoryInfo.limit),
      usagePercent: Math.round(usagePercent),
      pressure: memoryPressure,
      source: memoryInfo.source,
      chartCount: chartCountRef.current,
      timestamp: memoryInfo.timestamp,
    };
  }, [memoryInfo, memoryPressure, formatMemorySize]);

  // Initialize support detection
  useEffect(() => {
    setIsSupported(checkSupport());
  }, [checkSupport]);

  // Start polling if configured
  useEffect(() => {
    if (config.pollInterval > 0) {
      startPolling();
      // Take initial measurement
      measureMemory().catch(() => {
        // Ignore errors during initial measurement
      });
    }

    return () => {
      stopPolling();
    };
  }, [config.pollInterval, startPolling, stopPolling, measureMemory]);

  return {
    // State
    memoryInfo,
    memoryPressure,
    isSupported,

    // Actions
    measureMemory,
    updateChartCount,
    startPolling,
    stopPolling,

    // Utilities
    getMemoryStats,
    formatMemorySize,

    // Derived values
    isWarning: memoryPressure === "warning",
    isCritical: memoryPressure === "critical",
    hasMemoryData: memoryInfo !== null,
  };
}
