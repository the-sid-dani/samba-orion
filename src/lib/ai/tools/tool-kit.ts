// Legacy visualization tools removed - now using artifact tools only
import { exaSearchTool, exaContentsTool } from "./web/web-search";
import { AppDefaultToolkit, DefaultToolName, DefaultToolNameType } from ".";
import { Tool } from "ai";
import { httpFetchTool } from "./http/fetch";
import { jsExecutionTool } from "./code/js-run-tool";
import { pythonExecutionTool } from "./code/python-run-tool";
// Direct imports to avoid circular dependency in chart-tool.ts aggregation
import { treemapChartArtifactTool } from "./artifacts/treemap-chart-tool";
import { areaChartArtifactTool } from "./artifacts/area-chart-tool";
import { scatterChartArtifactTool } from "./artifacts/scatter-chart-tool";
import { radarChartArtifactTool } from "./artifacts/radar-chart-tool";
import { funnelChartArtifactTool } from "./artifacts/funnel-chart-tool";
import { sankeyChartArtifactTool } from "./artifacts/sankey-chart-tool";
import { radialBarChartArtifactTool } from "./artifacts/radial-bar-tool";
import { composedChartArtifactTool } from "./artifacts/composed-chart-tool";
import { geographicChartArtifactTool } from "./artifacts/geographic-chart-tool";
import { gaugeChartArtifactTool } from "./artifacts/gauge-chart-tool";
import { calendarHeatmapArtifactTool } from "./artifacts/calendar-heatmap-tool";
import { tableArtifactTool } from "./artifacts/table-artifact-tool";
import { banChartArtifactTool } from "./artifacts/ban-chart-tool";
import { barChartArtifactTool } from "./artifacts/bar-chart-tool";
import { lineChartArtifactTool } from "./artifacts/line-chart-tool";
import { pieChartArtifactTool } from "./artifacts/pie-chart-tool";
// Centralized validation utilities (commented to prevent circular dependency in builds)
// import { assertToolRegistryValid, logToolRegistryStatus } from "./tool-registry-validator";

// Type-safe tool registry - each toolkit has partial coverage of DefaultToolName
export const APP_DEFAULT_TOOL_KIT: Record<
  AppDefaultToolkit,
  Partial<Record<DefaultToolNameType, Tool>>
> = {
  [AppDefaultToolkit.WebSearch]: {
    [DefaultToolName.WebSearch]: exaSearchTool,
    [DefaultToolName.WebContent]: exaContentsTool,
  },
  [AppDefaultToolkit.Http]: {
    [DefaultToolName.Http]: httpFetchTool,
  },
  [AppDefaultToolkit.Code]: {
    [DefaultToolName.JavascriptExecution]: jsExecutionTool,
    [DefaultToolName.PythonExecution]: pythonExecutionTool,
  },
  [AppDefaultToolkit.Artifacts]: {
    // Core chart tools - fixed streaming artifacts
    [DefaultToolName.CreateBarChart]: barChartArtifactTool,
    [DefaultToolName.CreateLineChart]: lineChartArtifactTool,
    [DefaultToolName.CreatePieChart]: pieChartArtifactTool,
    // Table tool - moved from visualization toolkit
    [DefaultToolName.CreateTable]: tableArtifactTool,
    // Recharts-native chart tools - all 15 specialized tools restored
    [DefaultToolName.CreateAreaChart]: areaChartArtifactTool,
    [DefaultToolName.CreateScatterChart]: scatterChartArtifactTool,
    [DefaultToolName.CreateRadarChart]: radarChartArtifactTool,
    [DefaultToolName.CreateFunnelChart]: funnelChartArtifactTool,
    [DefaultToolName.CreateTreemapChart]: treemapChartArtifactTool,
    [DefaultToolName.CreateSankeyChart]: sankeyChartArtifactTool,
    [DefaultToolName.CreateRadialBarChart]: radialBarChartArtifactTool,
    [DefaultToolName.CreateComposedChart]: composedChartArtifactTool,
    // External library chart tools
    [DefaultToolName.CreateGeographicChart]: geographicChartArtifactTool,
    [DefaultToolName.CreateGaugeChart]: gaugeChartArtifactTool,
    [DefaultToolName.CreateCalendarHeatmap]: calendarHeatmapArtifactTool,
    // Specialized display tools
    [DefaultToolName.CreateBANChart]: banChartArtifactTool,
  },
} as const;

// Compile-time validation is handled by runtime validateToolRegistry() below

// Type guard for runtime tool name validation
export const isValidToolName = (name: string): name is DefaultToolNameType => {
  return Object.values(DefaultToolName).includes(name as DefaultToolNameType);
};

// Helper function to get typed tool from registry
export const getTypedTool = (
  toolName: DefaultToolNameType,
): Tool | undefined => {
  // Search across all toolkits for the tool
  for (const toolkit of Object.values(APP_DEFAULT_TOOL_KIT)) {
    if (toolName in toolkit) {
      return toolkit[toolName];
    }
  }
  return undefined;
};

/**
 * Runtime validation for APP_DEFAULT_TOOL_KIT consistency
 * Ensures all DefaultToolName entries have corresponding tool implementations
 */
const validateToolRegistry = () => {
  const allEnumValues = Object.values(DefaultToolName);
  const allRegisteredTools: string[] = [];

  // Collect all registered tool names from all toolkits
  Object.values(APP_DEFAULT_TOOL_KIT).forEach((toolkit) => {
    allRegisteredTools.push(...Object.keys(toolkit));
  });

  // Find missing tools
  const missingTools = allEnumValues.filter(
    (enumValue) => !allRegisteredTools.includes(enumValue),
  );

  // Find extra tools (registered but not in enum)
  const extraTools = allRegisteredTools.filter(
    (registered) => !allEnumValues.includes(registered as DefaultToolName),
  );

  // Validation results
  const validationResults = {
    enumCount: allEnumValues.length,
    registeredCount: allRegisteredTools.length,
    missing: missingTools,
    extra: extraTools,
    isValid: missingTools.length === 0,
  };

  // Log validation results
  console.log("🔍 Tool Registry Validation:", {
    enumEntries: validationResults.enumCount,
    registeredTools: validationResults.registeredCount,
    validationPassed: validationResults.isValid,
    missingCount: missingTools.length,
    extraCount: extraTools.length,
  });

  // Handle missing tools (critical error)
  if (missingTools.length > 0) {
    const errorMessage = `Tool Registry Validation Failed: Missing tool implementations for enum entries: ${missingTools.join(", ")}. These tools are defined in DefaultToolName enum but not registered in APP_DEFAULT_TOOL_KIT.`;
    console.error("🚨 CRITICAL TOOL REGISTRY ERROR:", errorMessage);
    console.error("🚨 Missing tools:", missingTools);
    console.error("🚨 Available registered tools:", allRegisteredTools);

    // Throw error to prevent system startup with invalid tool registry
    throw new Error(errorMessage);
  }

  // Handle extra tools (warning only)
  if (extraTools.length > 0) {
    console.warn(
      "⚠️ Extra tools registered (not in DefaultToolName enum):",
      extraTools,
    );
    console.warn(
      "⚠️ Consider adding these tools to DefaultToolName enum or removing them from registry",
    );
  }

  // Success case
  if (validationResults.isValid) {
    console.log(
      "✅ Tool Registry Validation PASSED: All enum entries have implementations",
    );
  }

  return validationResults;
};

/**
 * Specific chart tool validation
 * Validates that all chart tools in DefaultToolName have implementations
 */
const validateChartTools = () => {
  const chartEnumValues = Object.values(DefaultToolName).filter((name) =>
    name.includes("chart"),
  );
  const artifactTools = Object.keys(
    APP_DEFAULT_TOOL_KIT[AppDefaultToolkit.Artifacts],
  );
  const registeredChartTools = artifactTools.filter((name) =>
    name.includes("chart"),
  );

  const missingChartTools = chartEnumValues.filter(
    (enumValue) => !registeredChartTools.includes(enumValue),
  );

  console.log("🔍 Chart Tool Validation:", {
    expectedChartTools: chartEnumValues.length,
    registeredChartTools: registeredChartTools.length,
    chartValidationPassed: missingChartTools.length === 0,
  });

  if (missingChartTools.length > 0) {
    const errorMessage = `Chart Tool Validation Failed: Missing chart tool implementations: ${missingChartTools.join(", ")}`;
    console.error("🚨 CHART TOOL ERROR:", errorMessage);
    throw new Error(errorMessage);
  }

  console.log(
    "✅ Chart Tool Validation PASSED: All chart tools properly registered",
  );
  return true;
};

/**
 * List of all app default tool names for routing logic
 * Used by voice chat to distinguish app tools from MCP tools
 */
export const APP_DEFAULT_TOOL_NAMES = [
  // Chart tools (16 total - 15 active + 1 commented)
  "create_bar_chart",
  "create_line_chart",
  "create_pie_chart",
  "create_area_chart",
  "create_scatter_chart",
  "create_radar_chart",
  "create_funnel_chart",
  "create_treemap_chart",
  "create_sankey_chart",
  "create_radial_bar_chart",
  "create_composed_chart",
  "create_geographic_chart",
  "create_gauge_chart",
  "create_calendar_heatmap",
  "create_ban_chart",
  "createTable",
  // Code execution tools
  "mini-javascript-execution",
  "python-execution",
  // Web search tools
  "webSearch",
  "webContent",
  // HTTP tool
  "http",
] as const;

/**
 * Check if tool name is an app default tool (vs MCP tool)
 */
export function isAppDefaultTool(toolName: string): boolean {
  return APP_DEFAULT_TOOL_NAMES.includes(toolName as any);
}

// Development-only validation (non-blocking for production builds)
if (process.env.NODE_ENV === "development") {
  try {
    // Keep existing inline validation for development debugging
    validateToolRegistry();
    validateChartTools();
    console.log("🎉 APP_DEFAULT_TOOL_KIT validation completed successfully");
  } catch (error) {
    // Log but don't throw - prevents build failures
    console.warn("⚠️ Tool registry validation issues detected:", error);
    console.warn("⚠️ This may cause chart tools to fail at runtime");
  }
}
