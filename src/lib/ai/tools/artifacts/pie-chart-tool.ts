import { tool as createTool } from "ai";
import { z } from "zod";
import { generateUUID } from "../../../utils";
import logger from "../../../logger";
import { DefaultToolName } from "../index";
import { withTimeout } from "./tool-execution-wrapper";

/**
 * Enhanced Pie Chart Tool - Creates Canvas Artifacts
 *
 * This tool creates individual pie chart artifacts that appear in the Canvas workspace.
 * Each chart is a fully functional artifact with the beautiful aesthetics of the existing
 * PieChart component, optimized for Canvas display with proper sizing.
 */
export const pieChartArtifactTool = createTool({
  // Explicit tool name for debugging and registry validation
  name: DefaultToolName.CreatePieChart,
  description: `Create a beautiful pie chart artifact that opens in the Canvas workspace.

  This tool creates individual pie charts with the same beautiful aesthetics as the existing
  chart components, but optimized for Canvas display. Use this when the user specifically
  wants to create a pie chart or visualize proportions and percentages.

  Examples of when to use this tool:
  - "Create a pie chart showing market share distribution"
  - "Make a pie chart of budget allocation by department"
  - "Show me a pie chart of survey responses by category"
  - "Visualize website traffic sources as a pie chart"
  - "Display product sales percentages in a pie chart"

  The chart will open in the Canvas workspace alongside the chat, with proper sizing,
  a center total display, and the same beautiful design as existing components.`,

  inputSchema: z.object({
    title: z.string().describe("Title for the pie chart"),
    canvasName: z
      .string()
      .optional()
      .describe(
        "Name for the canvas/dashboard this chart belongs to (e.g., 'Market Analytics', 'Budget Dashboard')",
      ),
    data: z
      .array(
        z.object({
          label: z.string().describe("Label for this slice of the pie"),
          value: z.number().describe("Numeric value for this slice"),
        }),
      )
      .describe("Pie chart data with labels and values for each slice"),
    description: z
      .string()
      .optional()
      .describe("Brief description of what the chart shows"),
    unit: z
      .string()
      .optional()
      .describe("Unit for the values (e.g., 'users', 'dollars', 'percent')"),
  }),

  execute: async function* (input) {
    // Wrap with timeout protection (30s limit)
    const generator = createPieChartGenerator(input);
    yield* withTimeout(generator, 30000);
  },
});

// Extract original logic to separate generator function
async function* createPieChartGenerator({
  title,
  data,
  description = "",
  unit = "",
  canvasName = "",
}: {
  title: string;
  data: { label: string; value: number }[];
  description?: string;
  unit?: string;
  canvasName?: string;
}) {
  try {
    logger.info(`Creating pie chart artifact: ${title}`);

    // Stream loading state
    yield {
      status: "loading" as const,
      message: `Preparing pie chart: ${title}`,
      progress: 0,
    };

    // Validate chart data
    if (!data || data.length === 0) {
      throw new Error("Pie chart data cannot be empty");
    }

    // Validate data structure
    for (const slice of data) {
      if (!slice.label || typeof slice.value !== "number") {
        throw new Error(
          "Invalid pie chart data structure - each slice needs label and numeric value",
        );
      }
      if (slice.value < 0) {
        throw new Error("Pie chart values cannot be negative");
      }
    }

    // Calculate total and validate
    const total = data.reduce((sum, slice) => sum + slice.value, 0);
    if (total === 0) {
      throw new Error("Pie chart total cannot be zero");
    }

    // Data validated - use length for metadata tracking

    // Create the chart artifact content that matches PieChart component props
    const chartContent = {
      type: "pie-chart",
      title,
      data,
      description,
      unit,
      chartType: "pie", // Top-level chartType for canvas-panel.tsx routing
      // Add metadata for Canvas rendering
      metadata: {
        chartType: "pie" as const,
        description,
        unit,
        theme: "light",
        animated: true,
        sliceCount: data.length,
        total,
        // Optimize sizing for Canvas cards
        sizing: {
          width: "100%",
          height: "350px", // Slightly smaller for pie charts to maintain aspect ratio
          containerClass: "bg-card flex flex-col",
          responsive: true,
          aspectRatio: "square",
          maxHeight: "300px",
        },
        // Pie-specific styling
        pieStyle: {
          innerRadius: 60,
          strokeWidth: 5,
          showTotal: true,
          showTooltip: true,
          colorScheme: "chart-colors", // Uses the same color scheme as other charts
        },
      },
    };

    // Generate unique artifact ID
    const artifactId = generateUUID();

    // Stream processing state
    yield {
      status: "processing" as const,
      message: `Creating pie chart...`,
      progress: 50,
    };

    // Add small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Stream success state with direct chartData format (matches create_chart pattern)
    yield {
      status: "success" as const,
      message: `Created pie chart "${title}" with ${data.length} slices. Total: ${total.toLocaleString()}${unit ? ` ${unit}` : ""}`,
      chartId: artifactId,
      title,
      chartType: "pie",
      canvasName: canvasName || "Data Visualization",
      chartData: chartContent,
      dataPoints: data.length,
      shouldCreateArtifact: true, // Flag for Canvas processing
      progress: 100,
    };

    // Return simple success message for chat
    logger.info(`Pie chart artifact created successfully: ${artifactId}`);
    return `Created pie chart "${title}" with ${data.length} slices${unit ? ` measured in ${unit}` : ""}. Total value: ${total.toLocaleString()}${unit ? ` ${unit}` : ""}. The chart is now available in the Canvas workspace.`;
  } catch (error) {
    logger.error("Failed to create pie chart artifact:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to create pie chart: ${errorMessage}` },
      ],
      structuredContent: {
        result: [
          {
            success: false,
            error: errorMessage,
            message: `Failed to create pie chart: ${errorMessage}`,
            chartType: "pie",
          },
        ],
      },
      isError: true,
    };
  }
}
