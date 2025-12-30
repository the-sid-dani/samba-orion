import { tool as createTool } from "ai";
import { z } from "zod";
import { generateUUID } from "../../../utils";
import logger from "../../../logger";
import { DefaultToolName } from "../index";

/**
 * Enhanced Line Chart Tool - Creates Canvas Artifacts
 *
 * This tool creates individual line chart artifacts that appear in the Canvas workspace.
 * Each chart is a fully functional artifact with the beautiful aesthetics of the existing
 * LineChart component, optimized for Canvas display with proper sizing.
 */
export const lineChartArtifactTool = createTool({
  // Explicit tool name for debugging and registry validation
  name: DefaultToolName.CreateLineChart,
  description: `Create a beautiful line chart artifact that opens in the Canvas workspace.

  This tool creates individual line charts with the same beautiful aesthetics as the existing
  chart components, but optimized for Canvas display. Use this when the user specifically
  wants to create a line chart or visualize trends and time-series data.

  Examples of when to use this tool:
  - "Create a line chart showing revenue trends over time"
  - "Make a line chart of temperature changes throughout the day"
  - "Show me a line chart of user growth month over month"
  - "Visualize stock price movements as a line chart"
  - "Plot website traffic trends over the past quarter"

  The chart will open in the Canvas workspace alongside the chat, with proper sizing,
  smooth curves, and the same beautiful design as existing components.`,

  inputSchema: z.object({
    title: z.string().describe("Title for the line chart"),
    data: z
      .array(
        z.object({
          xAxisLabel: z
            .string()
            .describe("Label for this point on the x-axis (often time/date)"),
          series: z
            .array(
              z.object({
                seriesName: z
                  .string()
                  .describe("Name of this data series/line"),
                value: z
                  .number()
                  .describe("Numeric value for this series at this point"),
              }),
            )
            .describe("Data series for this point"),
        }),
      )
      .describe("Line chart data with x-axis points and series values"),
    description: z
      .string()
      .optional()
      .describe("Brief description of what the chart shows"),
    yAxisLabel: z
      .string()
      .optional()
      .describe("Label for the y-axis (values axis)"),
  }),

  execute: async function* ({ title, data, description, yAxisLabel }) {
    try {
      logger.info(
        `🔧 [${DefaultToolName.CreateLineChart}] Tool execution started:`,
        {
          toolName: DefaultToolName.CreateLineChart,
          title,
          dataPointsCount: data?.length || 0,
          hasDescription: !!description,
          hasYAxisLabel: !!yAxisLabel,
        },
      );
      logger.info(`Creating line chart artifact: ${title}`);

      // Stream loading state
      yield {
        status: "loading",
        message: `Preparing line chart: ${title}`,
        progress: 0,
      };

      // Validate chart data
      if (!data || data.length === 0) {
        throw new Error("Line chart data cannot be empty");
      }

      // Validate data structure
      for (const point of data) {
        if (!point.xAxisLabel || !point.series || point.series.length === 0) {
          throw new Error(
            "Invalid line chart data structure - each point needs xAxisLabel and series",
          );
        }

        for (const series of point.series) {
          if (!series.seriesName || typeof series.value !== "number") {
            throw new Error(
              "Invalid series data - each series needs seriesName and numeric value",
            );
          }
        }
      }

      // Get unique series names for metadata
      const seriesNames = Array.from(
        new Set(data.flatMap((d) => d.series.map((s) => s.seriesName))),
      );

      // Stream processing state
      yield {
        status: "processing",
        message: `Creating line chart...`,
        progress: 50,
      };

      // Add a small delay to make loading visible for testing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Create the chart artifact content that matches LineChart component props
      const chartContent = {
        type: "line-chart",
        title,
        data,
        description,
        yAxisLabel,
        chartType: "line", // Top-level chartType for canvas-panel.tsx routing
        // Add metadata for Canvas rendering
        metadata: {
          chartType: "line" as const,
          xAxisLabel: "Time/Categories",
          yAxisLabel,
          description,
          theme: "light",
          animated: true,
          seriesCount: seriesNames.length,
          dataPoints: data.length,
          // Optimize sizing for Canvas cards
          sizing: {
            width: "100%",
            height: "400px",
            containerClass: "bg-card",
            responsive: true,
          },
          // Line-specific styling
          lineStyle: {
            strokeWidth: 2,
            curve: "monotone",
            showDots: false,
            showLegend: true,
            showGrid: true,
          },
        },
      };

      // Generate unique artifact ID
      const artifactId = generateUUID();

      // Stream success state with direct chartData format (matches create_chart pattern)
      yield {
        status: "success" as const,
        message: `Created line chart "${title}" with ${data.length} data points and ${seriesNames.length} trend lines`,
        chartId: artifactId,
        title,
        chartType: "line",
        canvasName: "Data Visualization",
        chartData: chartContent,
        dataPoints: data.length,
        shouldCreateArtifact: true, // Flag for Canvas processing
        progress: 100,
      };

      // Return simple success message for chat
      logger.info(
        `✅ [${DefaultToolName.CreateLineChart}] Tool execution completed successfully:`,
        {
          toolName: DefaultToolName.CreateLineChart,
          artifactId,
          title,
          chartType: "line",
          dataPoints: data.length,
        },
      );

      return `Created line chart "${title}" with ${data.length} data points and ${seriesNames.length} trend lines. The chart is now available in the Canvas workspace.`;
    } catch (error) {
      logger.error(
        `❌ [${DefaultToolName.CreateLineChart}] Tool execution failed:`,
        {
          toolName: DefaultToolName.CreateLineChart,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      logger.error("Failed to create line chart artifact:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Failed to create line chart: ${errorMessage}`,
          },
        ],
        structuredContent: {
          result: [
            {
              success: false,
              error: errorMessage,
              message: `Failed to create line chart: ${errorMessage}`,
              chartType: "line",
            },
          ],
        },
        isError: true,
      };
    }
  },
});
