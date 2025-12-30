/**
 * Chart Count Limits and Memory Management Hook
 *
 * Implements chart count tracking, memory-based limits, and warning system
 * to prevent app crashes from excessive chart creation. Integrates with
 * the modern memory monitoring system for comprehensive resource management.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useMemoryMonitor } from "./use-memory-monitor";

// Chart metadata for tracking
export interface ChartInfo {
  id: string;
  type: string;
  title?: string;
  dataPoints?: number;
  createdAt: number;
  memoryEstimate?: number; // Estimated memory usage in bytes
}

// Chart limits configuration
export interface ChartLimitsConfig {
  maxCharts: number; // Hard limit on number of charts
  warningThreshold: number; // Warning when chart count reaches this
  memoryBasedLimits: boolean; // Enable memory-based dynamic limits
  enableLogging?: boolean; // Log chart limit events
  logPrefix?: string; // Prefix for log messages
  chartMemoryEstimate: number; // Estimated memory per chart in MB
}

// Chart limits state
export interface ChartLimitsState {
  chartCount: number;
  maxChartsAllowed: number;
  warningActive: boolean;
  memoryPressureActive: boolean;
  recommendedAction?: string;
}

// Chart limit warnings and errors
export interface ChartLimitResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
  recommendation?: string;
}

// Default configuration - conservative limits for stability
const DEFAULT_CONFIG: Required<ChartLimitsConfig> = {
  maxCharts: 25, // Conservative limit to prevent crashes
  warningThreshold: 20, // Warn at 20 charts
  memoryBasedLimits: true, // Enable dynamic limits based on memory
  enableLogging: process.env.NODE_ENV === "development",
  logPrefix: "[Chart Limits]",
  chartMemoryEstimate: 5, // 5MB per chart (Recharts + data)
};

/**
 * Chart count limits and memory management hook
 */
export function useChartLimits(config: Partial<ChartLimitsConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Memory monitoring integration
  const {
    memoryPressure,
    measureMemory,
    updateChartCount: updateMemoryChartCount,
    getMemoryStats,
    isSupported: memoryMonitorSupported,
  } = useMemoryMonitor({
    enableLogging: fullConfig.enableLogging,
    logPrefix: fullConfig.logPrefix,
    estimateFromChartCount: true,
  });

  // Chart tracking state
  const [charts, setCharts] = useState<Map<string, ChartInfo>>(new Map());
  const [dynamicMaxCharts, setDynamicMaxCharts] = useState<number>(
    fullConfig.maxCharts,
  );
  const warningShownRef = useRef<Set<string>>(new Set()); // Track shown warnings

  // Calculate current chart count
  const chartCount = charts.size;

  // Determine effective max charts (static or memory-based)
  const effectiveMaxCharts = fullConfig.memoryBasedLimits
    ? dynamicMaxCharts
    : fullConfig.maxCharts;

  // Calculate chart limits state
  const getChartLimitsState = useCallback((): ChartLimitsState => {
    const warningActive = chartCount >= fullConfig.warningThreshold;
    const memoryPressureActive =
      memoryPressure === "warning" || memoryPressure === "critical";

    let recommendedAction: string | undefined;

    if (memoryPressure === "critical") {
      recommendedAction =
        "Remove charts immediately - critical memory usage detected";
    } else if (memoryPressure === "warning") {
      recommendedAction = "Consider removing some charts to free up memory";
    } else if (chartCount >= effectiveMaxCharts * 0.9) {
      recommendedAction =
        "Approaching chart limit - consider removing older charts";
    }

    return {
      chartCount,
      maxChartsAllowed: effectiveMaxCharts,
      warningActive,
      memoryPressureActive,
      recommendedAction,
    };
  }, [
    chartCount,
    effectiveMaxCharts,
    memoryPressure,
    fullConfig.warningThreshold,
  ]);

  // Estimate memory usage for a chart based on type and data points
  const estimateChartMemory = useCallback(
    (chartType: string, dataPoints = 100): number => {
      const baseMemoryMB = fullConfig.chartMemoryEstimate;

      // Different chart types have different memory requirements
      const typeMultipliers = {
        table: 1.5, // Tables with many rows use more memory
        scatter: 2.0, // Scatter plots with many points
        geographic: 2.5, // Geographic charts load TopoJSON data
        sankey: 2.0, // Complex node-link diagrams
        "calendar-heatmap": 1.8, // Many data points for full year
        dashboard: 3.0, // Multiple charts in one
        composed: 1.5, // Multiple chart types combined
        default: 1.0, // Standard charts
      };

      const multiplier =
        typeMultipliers[chartType as keyof typeof typeMultipliers] ||
        typeMultipliers.default;

      // Adjust for data size
      const dataPointMultiplier = Math.max(1, Math.sqrt(dataPoints / 100));

      const estimatedMB = baseMemoryMB * multiplier * dataPointMultiplier;
      return estimatedMB * 1024 * 1024; // Convert to bytes
    },
    [fullConfig.chartMemoryEstimate],
  );

  // Update dynamic chart limits based on memory availability
  const updateDynamicLimits = useCallback(async () => {
    if (!fullConfig.memoryBasedLimits || !memoryMonitorSupported) {
      return;
    }

    try {
      await measureMemory();
      const memoryStats = getMemoryStats();

      if (!memoryStats) return;

      // Calculate how many charts we can safely support
      const availableMemoryBytes =
        memoryStats.usagePercent < 50
          ? ((100 - memoryStats.usagePercent) / 100) *
            parseInt(memoryStats.limit)
          : parseInt(memoryStats.limit) * 0.2; // Conservative if already high usage

      const avgChartMemory = fullConfig.chartMemoryEstimate * 1024 * 1024; // Convert to bytes
      const safeChartCount = Math.floor(availableMemoryBytes / avgChartMemory);

      // Never go below 10 charts or above configured max
      const newMaxCharts = Math.min(
        Math.max(safeChartCount + chartCount, 10), // At least 10 total
        fullConfig.maxCharts,
      );

      if (newMaxCharts !== dynamicMaxCharts) {
        setDynamicMaxCharts(newMaxCharts);

        if (fullConfig.enableLogging) {
          console.log(`${fullConfig.logPrefix} Dynamic limit updated:`, {
            previousLimit: dynamicMaxCharts,
            newLimit: newMaxCharts,
            availableMemoryMB: Math.round(availableMemoryBytes / 1024 / 1024),
            memoryUsage: `${memoryStats.usagePercent}%`,
            currentCharts: chartCount,
          });
        }
      }
    } catch (error) {
      if (fullConfig.enableLogging) {
        console.warn(
          `${fullConfig.logPrefix} Failed to update dynamic limits:`,
          error,
        );
      }
    }
  }, [
    fullConfig.memoryBasedLimits,
    fullConfig.maxCharts,
    fullConfig.enableLogging,
    fullConfig.logPrefix,
    fullConfig.chartMemoryEstimate,
    memoryMonitorSupported,
    measureMemory,
    getMemoryStats,
    chartCount,
    dynamicMaxCharts,
  ]);

  // Check if adding a new chart is allowed
  const canAddChart = useCallback(
    (chartType = "default", dataPoints = 100): ChartLimitResult => {
      // Check hard limit
      if (chartCount >= effectiveMaxCharts) {
        return {
          allowed: false,
          reason: `Chart limit reached (${effectiveMaxCharts} charts maximum)`,
          recommendation: "Remove existing charts before creating new ones",
        };
      }

      // Check memory pressure
      if (memoryPressure === "critical") {
        return {
          allowed: false,
          reason: "Critical memory usage detected",
          recommendation:
            "Remove existing charts to free up memory before creating new ones",
        };
      }

      // Warning conditions
      let warning: string | undefined;
      let recommendation: string | undefined;

      if (memoryPressure === "warning") {
        warning =
          "High memory usage - consider removing charts after creating this one";
      } else if (chartCount >= fullConfig.warningThreshold) {
        warning = `Approaching chart limit (${chartCount}/${effectiveMaxCharts})`;
        recommendation =
          "Consider removing older charts to maintain performance";
      }

      // Estimate memory impact of new chart
      const estimatedMemory = estimateChartMemory(chartType, dataPoints);
      const memoryStats = getMemoryStats();

      if (memoryStats && estimatedMemory > 0) {
        const currentUsageBytes =
          parseInt(memoryStats.limit) * (memoryStats.usagePercent / 100);
        const projectedUsage =
          ((currentUsageBytes + estimatedMemory) /
            parseInt(memoryStats.limit)) *
          100;

        if (projectedUsage > 85) {
          warning = `Chart may cause high memory usage (projected: ${Math.round(projectedUsage)}%)`;
          recommendation =
            "Consider using a simpler chart type or fewer data points";
        }
      }

      return {
        allowed: true,
        warning,
        recommendation,
      };
    },
    [
      chartCount,
      effectiveMaxCharts,
      memoryPressure,
      fullConfig.warningThreshold,
      estimateChartMemory,
      getMemoryStats,
    ],
  );

  // Add a new chart
  const addChart = useCallback(
    (
      id: string,
      type: string,
      title?: string,
      dataPoints?: number,
    ): ChartLimitResult => {
      const canAdd = canAddChart(type, dataPoints);

      if (!canAdd.allowed) {
        return canAdd;
      }

      const chartInfo: ChartInfo = {
        id,
        type,
        title,
        dataPoints,
        createdAt: Date.now(),
        memoryEstimate: estimateChartMemory(type, dataPoints),
      };

      setCharts((prev) => new Map(prev.set(id, chartInfo)));

      // Update memory monitor with new chart count
      updateMemoryChartCount(chartCount + 1);

      if (fullConfig.enableLogging) {
        console.log(`${fullConfig.logPrefix} Chart added:`, {
          id,
          type,
          title,
          dataPoints,
          totalCharts: chartCount + 1,
          memoryEstimateMB: Math.round(chartInfo.memoryEstimate! / 1024 / 1024),
        });
      }

      // Update dynamic limits after adding
      updateDynamicLimits();

      return canAdd;
    },
    [
      canAddChart,
      estimateChartMemory,
      updateMemoryChartCount,
      chartCount,
      fullConfig.enableLogging,
      fullConfig.logPrefix,
      updateDynamicLimits,
    ],
  );

  // Remove a chart
  const removeChart = useCallback(
    (id: string): boolean => {
      const chart = charts.get(id);
      if (!chart) return false;

      setCharts((prev) => {
        const newCharts = new Map(prev);
        newCharts.delete(id);
        return newCharts;
      });

      // Update memory monitor with new chart count
      updateMemoryChartCount(chartCount - 1);

      if (fullConfig.enableLogging) {
        console.log(`${fullConfig.logPrefix} Chart removed:`, {
          id,
          type: chart.type,
          title: chart.title,
          totalCharts: chartCount - 1,
        });
      }

      // Update dynamic limits after removing
      updateDynamicLimits();

      return true;
    },
    [
      charts,
      updateMemoryChartCount,
      chartCount,
      fullConfig.enableLogging,
      fullConfig.logPrefix,
      updateDynamicLimits,
    ],
  );

  // Remove oldest charts to make room
  const removeOldestCharts = useCallback(
    (count: number): ChartInfo[] => {
      const sortedCharts = Array.from(charts.entries())
        .sort(([, a], [, b]) => a.createdAt - b.createdAt)
        .slice(0, count);

      const removedCharts = sortedCharts.map(([id, chart]) => {
        removeChart(id);
        return chart;
      });

      if (fullConfig.enableLogging && removedCharts.length > 0) {
        console.log(
          `${fullConfig.logPrefix} Removed ${removedCharts.length} oldest charts for cleanup`,
        );
      }

      return removedCharts;
    },
    [charts, removeChart, fullConfig.enableLogging, fullConfig.logPrefix],
  );

  // Clear all charts
  const clearAllCharts = useCallback(() => {
    const chartCount = charts.size;
    setCharts(new Map());
    updateMemoryChartCount(0);
    warningShownRef.current.clear();

    if (fullConfig.enableLogging) {
      console.log(`${fullConfig.logPrefix} Cleared all ${chartCount} charts`);
    }

    updateDynamicLimits();
  }, [
    charts,
    updateMemoryChartCount,
    fullConfig.enableLogging,
    fullConfig.logPrefix,
    updateDynamicLimits,
  ]);

  // Get chart statistics
  const getChartStats = useCallback(() => {
    const chartTypes = new Map<string, number>();
    let totalDataPoints = 0;
    let totalMemoryEstimate = 0;

    for (const chart of charts.values()) {
      chartTypes.set(chart.type, (chartTypes.get(chart.type) || 0) + 1);
      totalDataPoints += chart.dataPoints || 0;
      totalMemoryEstimate += chart.memoryEstimate || 0;
    }

    return {
      totalCharts: charts.size,
      chartTypes: Object.fromEntries(chartTypes),
      totalDataPoints,
      estimatedMemoryMB: Math.round(totalMemoryEstimate / 1024 / 1024),
      oldestChart:
        charts.size > 0
          ? Math.min(...Array.from(charts.values()).map((c) => c.createdAt))
          : null,
      newestChart:
        charts.size > 0
          ? Math.max(...Array.from(charts.values()).map((c) => c.createdAt))
          : null,
    };
  }, [charts]);

  // Update dynamic limits when memory pressure changes
  useEffect(() => {
    updateDynamicLimits();
  }, [memoryPressure, updateDynamicLimits]);

  // Initial dynamic limits calculation
  useEffect(() => {
    updateDynamicLimits();
  }, [updateDynamicLimits]);

  return {
    // State (from getChartLimitsState which includes chartCount, maxChartsAllowed)
    memoryPressure,
    charts: Array.from(charts.values()),

    // Derived state (includes chartCount, maxChartsAllowed)
    ...getChartLimitsState(),

    // Actions
    canAddChart,
    addChart,
    removeChart,
    removeOldestCharts,
    clearAllCharts,

    // Utilities
    getChartStats,
    updateDynamicLimits,
    estimateChartMemory,

    // Configuration
    config: fullConfig,
  };
}
