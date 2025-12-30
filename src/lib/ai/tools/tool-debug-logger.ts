/**
 * Development-Mode Tool Registry Inspection Utilities
 *
 * This module provides debugging tools for easier troubleshooting of tool-related issues
 * and clear developer feedback during development. Only active in development mode.
 */

import { Tool } from "ai";
import { AppDefaultToolkit } from "./index";
import logger from "../../logger";
import {
  validateToolRegistry,
  validateChartTools,
  generateToolRegistryReport,
} from "./tool-registry-validator";

export interface ToolDebugInfo {
  toolName: string;
  toolkit: AppDefaultToolkit;
  hasExecute: boolean;
  hasDescription: boolean;
  hasInputSchema: boolean;
  hasExplicitName: boolean;
  explicitName?: string;
  isChartTool: boolean;
}

export interface ToolRegistryDebugSummary {
  totalTools: number;
  totalChartTools: number;
  toolsByToolkit: Record<AppDefaultToolkit, number>;
  chartToolsByType: {
    core: string[];
    recharts: string[];
    external: string[];
  };
  potentialIssues: string[];
  recommendations: string[];
}

/**
 * Generate comprehensive debug information for all tools
 */
export const generateToolDebugInfo = (
  toolkit: Record<AppDefaultToolkit, Record<string, Tool>>,
): ToolDebugInfo[] => {
  const debugInfo: ToolDebugInfo[] = [];

  Object.entries(toolkit).forEach(([toolkitName, tools]) => {
    Object.entries(tools).forEach(([toolName, tool]) => {
      debugInfo.push({
        toolName,
        toolkit: toolkitName as AppDefaultToolkit,
        hasExecute: typeof tool.execute === "function",
        hasDescription: !!tool.description,
        hasInputSchema: !!tool.inputSchema,
        hasExplicitName: "name" in tool && !!tool.name,
        explicitName: (tool as any)?.name,
        isChartTool: toolName.includes("chart") || toolName.includes("table"),
      });
    });
  });

  return debugInfo;
};

/**
 * Generate summary report for tool registry debugging
 */
export const generateDebugSummary = (
  toolkit: Record<AppDefaultToolkit, Record<string, Tool>>,
): ToolRegistryDebugSummary => {
  const debugInfo = generateToolDebugInfo(toolkit);
  const chartTools = debugInfo.filter((tool) => tool.isChartTool);

  // Categorize chart tools
  const coreChartTools = chartTools
    .filter((tool) =>
      ["bar", "line", "pie"].some((type) => tool.toolName.includes(type)),
    )
    .map((tool) => tool.toolName);

  const rechartsChartTools = chartTools
    .filter((tool) =>
      [
        "area",
        "scatter",
        "radar",
        "funnel",
        "treemap",
        "sankey",
        "radial",
        "composed",
      ].some((type) => tool.toolName.includes(type)),
    )
    .map((tool) => tool.toolName);

  const externalChartTools = chartTools
    .filter((tool) =>
      ["geographic", "gauge", "calendar", "heatmap"].some((type) =>
        tool.toolName.includes(type),
      ),
    )
    .map((tool) => tool.toolName);

  // Count tools by toolkit
  const toolsByToolkit: Record<AppDefaultToolkit, number> = {} as any;
  Object.values(AppDefaultToolkit).forEach((toolkit) => {
    toolsByToolkit[toolkit] = debugInfo.filter(
      (tool) => tool.toolkit === toolkit,
    ).length;
  });

  // Identify potential issues
  const potentialIssues: string[] = [];
  const recommendations: string[] = [];

  const toolsWithoutExecute = debugInfo.filter((tool) => !tool.hasExecute);
  if (toolsWithoutExecute.length > 0) {
    potentialIssues.push(
      `${toolsWithoutExecute.length} tools missing execute function`,
    );
    recommendations.push("Add execute functions to all tools");
  }

  const toolsWithoutDescription = debugInfo.filter(
    (tool) => !tool.hasDescription,
  );
  if (toolsWithoutDescription.length > 0) {
    potentialIssues.push(
      `${toolsWithoutDescription.length} tools missing description`,
    );
    recommendations.push("Add descriptions to improve AI model tool selection");
  }

  const chartToolsWithoutExplicitName = chartTools.filter(
    (tool) => !tool.hasExplicitName,
  );
  if (chartToolsWithoutExplicitName.length > 0) {
    potentialIssues.push(
      `${chartToolsWithoutExplicitName.length} chart tools missing explicit name property`,
    );
    recommendations.push(
      "Add explicit name property to chart tools for better debugging",
    );
  }

  return {
    totalTools: debugInfo.length,
    totalChartTools: chartTools.length,
    toolsByToolkit,
    chartToolsByType: {
      core: coreChartTools,
      recharts: rechartsChartTools,
      external: externalChartTools,
    },
    potentialIssues,
    recommendations,
  };
};

/**
 * Log comprehensive tool registry debug information (development only)
 */
export const logToolRegistryDebugInfo = (
  toolkit: Record<AppDefaultToolkit, Record<string, Tool>>,
): void => {
  if (process.env.NODE_ENV !== "development") {
    return; // Only run in development
  }

  logger.info("🔍 === TOOL REGISTRY DEBUG REPORT ===");

  try {
    // Generate validation report
    const validation = validateToolRegistry(toolkit);
    const chartValidation = validateChartTools(toolkit);
    const debugSummary = generateDebugSummary(toolkit);

    // Log summary
    logger.info("📊 Tool Registry Summary:", {
      totalTools: debugSummary.totalTools,
      totalChartTools: debugSummary.totalChartTools,
      toolsByToolkit: debugSummary.toolsByToolkit,
      validationStatus: validation.isValid ? "✅ VALID" : "❌ INVALID",
      chartValidationStatus: chartValidation.isValid
        ? "✅ VALID"
        : "❌ INVALID",
    });

    // Log chart tools by category
    logger.info("📈 Chart Tools by Category:", debugSummary.chartToolsByType);

    // Log potential issues
    if (debugSummary.potentialIssues.length > 0) {
      logger.warn("⚠️ Potential Issues Detected:", debugSummary.potentialIssues);
      logger.info("💡 Recommendations:", debugSummary.recommendations);
    }

    // Log validation details if there are issues
    if (!validation.isValid) {
      logger.error("🚨 Tool Registry Validation Issues:", {
        missing: validation.missing,
        extra: validation.extra,
        errors: validation.errors,
      });
    }

    if (!chartValidation.isValid) {
      logger.error("🚨 Chart Tool Validation Issues:", {
        missing: chartValidation.missingChartTools,
        extra: chartValidation.extraChartTools,
      });
    }

    // Success case
    if (
      validation.isValid &&
      chartValidation.isValid &&
      debugSummary.potentialIssues.length === 0
    ) {
      logger.info("🎉 Tool Registry Debug: All systems optimal!");
    }
  } catch (error) {
    logger.error("💥 Tool Registry Debug Error:", error);
  }

  logger.info("🔍 === END TOOL REGISTRY DEBUG REPORT ===");
};

/**
 * Quick health check for tool registry (development only)
 */
export const quickToolHealthCheck = (
  toolkit: Record<AppDefaultToolkit, Record<string, Tool>>,
): boolean => {
  if (process.env.NODE_ENV !== "development") {
    return true; // Always pass in production
  }

  try {
    const validation = validateToolRegistry(toolkit);
    const chartValidation = validateChartTools(toolkit);

    const isHealthy = validation.isValid && chartValidation.isValid;

    if (!isHealthy) {
      console.warn("⚠️ Tool Registry Health Check Failed");
      console.warn("⚠️ Run logToolRegistryDebugInfo() for detailed analysis");
    } else {
      console.log("✅ Tool Registry Health Check Passed");
    }

    return isHealthy;
  } catch (error) {
    console.error("💥 Tool Health Check Error:", error);
    return false;
  }
};

/**
 * Interactive tool debugging for development console
 */
export const debugToolsByName = (
  toolkit: Record<AppDefaultToolkit, Record<string, Tool>>,
  searchTerm: string,
): ToolDebugInfo[] => {
  if (process.env.NODE_ENV !== "development") {
    console.warn("🚫 Debug tools only available in development mode");
    return [];
  }

  const allTools = generateToolDebugInfo(toolkit);
  const matchingTools = allTools.filter((tool) =>
    tool.toolName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  console.log(
    `🔍 Found ${matchingTools.length} tools matching "${searchTerm}":`,
    matchingTools,
  );
  return matchingTools;
};

/**
 * Validate that a specific tool is properly registered
 */
export const validateSpecificTool = (
  toolkit: Record<AppDefaultToolkit, Record<string, Tool>>,
  toolName: string,
): boolean => {
  if (process.env.NODE_ENV !== "development") {
    return true; // Skip validation in production
  }

  // Search across all toolkits
  for (const [toolkitName, tools] of Object.entries(toolkit)) {
    if (toolName in tools) {
      const tool = tools[toolName];
      const isValid = !!(
        tool &&
        tool.execute &&
        tool.description &&
        tool.inputSchema
      );

      console.log(`🔍 Tool "${toolName}" found in toolkit "${toolkitName}":`, {
        isValid,
        hasExecute: !!tool.execute,
        hasDescription: !!tool.description,
        hasInputSchema: !!tool.inputSchema,
        hasExplicitName: "name" in tool && !!tool.name,
      });

      return isValid;
    }
  }

  console.error(`❌ Tool "${toolName}" not found in any toolkit`);
  return false;
};

/**
 * Export all debugging utilities for development console access
 */
export const DevToolDebugger = {
  generateToolDebugInfo,
  generateDebugSummary,
  logToolRegistryDebugInfo,
  quickToolHealthCheck,
  debugToolsByName,
  validateSpecificTool,
  generateToolRegistryReport,
} as const;

// Make debugging utilities available on global object in development
if (
  process.env.NODE_ENV === "development" &&
  typeof globalThis !== "undefined"
) {
  (globalThis as any).DevToolDebugger = DevToolDebugger;
  console.log(
    "🔧 DevToolDebugger utilities available globally in development mode",
  );
}
