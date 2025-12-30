import { tool as createTool } from "ai";
import { z } from "zod";
import { generateUUID } from "../../../utils";
import logger from "../../../logger";
import { DefaultToolName } from "../index";

/**
 * Composed Chart Tool - Creates Canvas Artifacts
 *
 * This tool creates individual composed chart artifacts that appear in the Canvas workspace.
 * Composed charts are ideal for displaying multiple data types on one chart, combining bars,
 * lines, and areas for comprehensive data visualization with the beautiful aesthetics of
 * the existing chart components, optimized for Canvas display with proper sizing.
 */
export const composedChartArtifactTool = createTool({
  // Explicit tool name for debugging and registry validation
  name: DefaultToolName.CreateComposedChart,
  description: `Create a beautiful composed chart artifact that opens in the Canvas workspace.

  This tool creates individual composed charts with the same beautiful aesthetics as the existing
  chart components, but optimized for Canvas display. Composed charts are perfect for showing
  multiple data types on one chart, such as revenue with growth rate, sales with targets, etc.

  Examples of when to use this tool:
  - "Create a composed chart showing revenue (bars) and growth rate (line)"
  - "Make a composed chart of sales data (bars) with targets (line)"
  - "Show me a composed chart combining actual vs forecast data"
  - "Visualize website traffic (area) with conversion rate (line)"

  The chart will open in the Canvas workspace alongside the chat, with proper sizing
  and the same beautiful design as existing components.`,

  inputSchema: z.object({
    title: z.string().describe("Title for the composed chart"),
    data: z
      .array(
        z.object({
          xAxisLabel: z
            .string()
            .describe("Label for this data point on the x-axis"),
          series: z
            .array(
              z.object({
                seriesName: z.string().describe("Name of this data series"),
                value: z.number().describe("Numeric value for this series"),
                chartType: z
                  .enum(["bar", "line", "area"])
                  .describe(
                    "Type of chart for this series (bar, line, or area)",
                  ),
              }),
            )
            .describe("Data series for this data point"),
        }),
      )
      .describe("Composed chart data with x-axis points and mixed chart types"),
    xAxisLabel: z.string().optional().describe("Label for the x-axis"),
    yAxisLabel: z.string().optional().describe("Label for the y-axis"),
    description: z
      .string()
      .optional()
      .describe("Brief description of what the chart shows"),
  }),

  execute: async function* ({
    title,
    data,
    xAxisLabel,
    yAxisLabel,
    description,
  }) {
    try {
      logger.info(`Creating composed chart artifact: ${title}`);

      // Validate chart data
      if (!data || data.length === 0) {
        throw new Error("Composed chart data cannot be empty");
      }

      // Validate data structure
      for (const point of data) {
        if (!point.xAxisLabel || !point.series || point.series.length === 0) {
          throw new Error(
            "Invalid composed chart data structure - each point needs xAxisLabel and series",
          );
        }

        for (const series of point.series) {
          if (
            !series.seriesName ||
            typeof series.value !== "number" ||
            !series.chartType
          ) {
            throw new Error(
              "Invalid series data - each series needs seriesName, numeric value, and chartType",
            );
          }

          if (!["bar", "line", "area"].includes(series.chartType)) {
            throw new Error(
              `Invalid chartType "${series.chartType}" - must be bar, line, or area`,
            );
          }
        }
      }

      // Get unique series names and their types for metadata
      const seriesInfo = new Map();
      data.forEach((point) => {
        point.series.forEach((series) => {
          if (!seriesInfo.has(series.seriesName)) {
            seriesInfo.set(series.seriesName, series.chartType);
          } else if (seriesInfo.get(series.seriesName) !== series.chartType) {
            logger.warn(
              `Inconsistent chart type for series "${series.seriesName}"`,
            );
          }
        });
      });

      const seriesNames = Array.from(seriesInfo.keys());
      const chartTypes = Array.from(new Set(seriesInfo.values()));

      // Create the chart artifact content that matches ComposedChart component props
      const chartContent = {
        type: "composed-chart",
        title,
        data,
        xAxisLabel,
        yAxisLabel,
        description,
        chartType: "composed", // Top-level chartType for canvas-panel.tsx routing
        // Add metadata for Canvas rendering
        metadata: {
          chartType: "composed" as const,
          xAxisLabel,
          yAxisLabel,
          description,
          theme: "light",
          animated: true,
          seriesCount: seriesNames.length,
          dataPoints: data.length,
          chartTypes,
          seriesInfo: Object.fromEntries(seriesInfo),
          // Optimize sizing for Canvas cards - enhanced responsive handling
          sizing: {
            width: "100%",
            height: "400px",
            containerClass: "bg-card",
            responsive: true,
          },
        },
      };

      // Generate unique artifact ID
      const artifactId = generateUUID();

      // Stream success state with direct chartData format (matches create_chart pattern)
      yield {
        status: "success" as const,
        message: `Created composed chart "${title}"`,
        chartId: artifactId,
        title,
        chartType: "composed",
        canvasName: "Data Visualization",
        chartData: chartContent,
        shouldCreateArtifact: true, // Flag for Canvas processing
        progress: 100,
      };

      // Return simple success message for chat
      logger.info(
        `Composed chart artifact created successfully: ${artifactId}`,
      );
      return `Created composed chart "${title}". The chart is now available in the Canvas workspace.`;
    } catch (error) {
      logger.error("Failed to create composed chart artifact:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Failed to create composed chart: ${errorMessage}`,
          },
        ],
        structuredContent: {
          result: [
            {
              success: false,
              error: errorMessage,
              message: `Failed to create composed chart: ${errorMessage}`,
              chartType: "composed",
            },
          ],
        },
        isError: true,
      };
    }
  },
});
