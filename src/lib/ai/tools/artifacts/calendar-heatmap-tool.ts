import { tool as createTool } from "ai";
import { z } from "zod";
import logger from "../../../logger";
import { generateUUID } from "../../../utils";
import { DefaultToolName } from "../index";

/**
 * Calendar Heatmap Tool - Creates Canvas Artifacts
 *
 * This tool creates individual calendar heatmap artifacts that appear in the Canvas workspace.
 * Calendar heatmaps are ideal for displaying activity tracking, daily metrics, contribution patterns,
 * and seasonal analysis with the beautiful aesthetics of the existing chart components,
 * optimized for Canvas display with proper sizing.
 */
export const calendarHeatmapArtifactTool = createTool({
  // Explicit tool name for debugging and registry validation
  name: DefaultToolName.CreateCalendarHeatmap,
  description: `Create a beautiful calendar heatmap artifact that opens in the Canvas workspace.

  This tool creates individual calendar heatmaps with the same beautiful aesthetics as the existing
  chart components, but optimized for Canvas display. Calendar heatmaps are perfect for showing
  activity tracking, daily metrics, contribution patterns, and seasonal analysis.

  Examples of when to use this tool:
  - "Create a calendar heatmap showing daily website visits"
  - "Make a GitHub-style contribution calendar of code commits"
  - "Show me a calendar heatmap of sales activity by day"
  - "Visualize user engagement patterns as a calendar heatmap"

  The chart will open in the Canvas workspace alongside the chat, with proper sizing
  and the same beautiful design as existing components.`,

  inputSchema: z.object({
    title: z.string().describe("Title for the calendar heatmap"),
    data: z
      .array(
        z.object({
          date: z
            .string()
            .describe("Date in YYYY-MM-DD format (e.g., '2024-01-15')"),
          value: z.number().describe("Numeric value for this date"),
        }),
      )
      .describe("Calendar heatmap data with dates and values"),
    startDate: z
      .string()
      .optional()
      .describe("Start date for the calendar in YYYY-MM-DD format (optional)"),
    endDate: z
      .string()
      .optional()
      .describe("End date for the calendar in YYYY-MM-DD format (optional)"),
    colorScale: z
      .enum(["github", "blues", "greens", "reds"])
      .optional()
      .describe("Color scale for the heatmap (default: github)"),
    description: z
      .string()
      .optional()
      .describe("Brief description of what the chart shows"),
  }),

  execute: async function* ({
    title,
    data,
    startDate,
    endDate,
    colorScale = "github",
    description,
  }) {
    try {
      logger.info(`Creating calendar heatmap artifact: ${title}`);

      // Validate chart data
      if (!data || data.length === 0) {
        throw new Error("Calendar heatmap data cannot be empty");
      }

      // Validate date formats strictly (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      for (const entry of data) {
        if (!entry.date || typeof entry.value !== "number") {
          throw new Error(
            "Invalid calendar heatmap data structure - each entry needs date and numeric value",
          );
        }

        if (!dateRegex.test(entry.date)) {
          throw new Error(
            `Invalid date format "${entry.date}" - must be YYYY-MM-DD format`,
          );
        }

        // Validate that date is actually valid
        const dateObj = new Date(entry.date);
        if (
          isNaN(dateObj.getTime()) ||
          dateObj.toISOString().slice(0, 10) !== entry.date
        ) {
          throw new Error(`Invalid date "${entry.date}" - date does not exist`);
        }
      }

      // Validate start and end dates if provided
      if (startDate && !dateRegex.test(startDate)) {
        throw new Error(
          `Invalid startDate format "${startDate}" - must be YYYY-MM-DD format`,
        );
      }

      if (endDate && !dateRegex.test(endDate)) {
        throw new Error(
          `Invalid endDate format "${endDate}" - must be YYYY-MM-DD format`,
        );
      }

      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        throw new Error("startDate must be before endDate");
      }

      // Calculate date range for metadata
      const dates = data.map((d) => new Date(d.date));
      const actualStartDate =
        startDate ||
        new Date(Math.min(...dates.map((d) => d.getTime())))
          .toISOString()
          .slice(0, 10);
      const actualEndDate =
        endDate ||
        new Date(Math.max(...dates.map((d) => d.getTime())))
          .toISOString()
          .slice(0, 10);

      // Get data range for color scaling
      const values = data.map((d) => d.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

      // Calculate total days covered
      const daysCovered =
        Math.ceil(
          (new Date(actualEndDate).getTime() -
            new Date(actualStartDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1;

      // Check for large datasets that might need pagination
      if (daysCovered > 365) {
        logger.warn(
          `Calendar heatmap covers ${daysCovered} days (>365) - consider date range limits for performance`,
        );
      }

      // Create the chart artifact content that matches CalendarHeatmap component props
      const chartContent = {
        type: "calendar-heatmap",
        title,
        data,
        startDate: actualStartDate,
        endDate: actualEndDate,
        colorScale,
        description,
        chartType: "calendar-heatmap", // Top-level chartType for canvas-panel.tsx routing
        // Add metadata for Canvas rendering
        metadata: {
          chartType: "calendar-heatmap" as const,
          colorScale,
          description,
          theme: "light",
          animated: false, // Calendar heatmaps typically don't need animations
          dataPoints: data.length,
          dateRange: { start: actualStartDate, end: actualEndDate },
          valueRange: { min: minValue, max: maxValue },
          daysCovered,
          aspectRatio: "wide", // Calendar heatmaps need wide aspect ratio for calendar layout
          // Optimize sizing for Canvas cards
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

      // Progressive yield pattern for streaming
      yield {
        status: "loading",
        message: "Preparing calendar heatmap...",
        progress: 30,
      };

      yield {
        status: "processing",
        message: `Processing ${data.length} data points across ${daysCovered} days...`,
        progress: 60,
      };

      // Final success yield with Canvas-compatible format
      yield {
        status: "success",
        message: `Created calendar heatmap "${title}" with ${data.length} data points spanning ${daysCovered} days`,
        chartId: artifactId,
        title,
        chartType: "calendar-heatmap", // Top-level chartType for Canvas routing
        canvasName: "Data Visualization",
        chartData: chartContent, // chartData instead of artifact wrapper
        shouldCreateArtifact: true, // Required flag for Canvas processing
        progress: 100,
      };

      logger.info(
        `Calendar heatmap artifact created successfully: ${artifactId}`,
      );

      return {
        content: [
          {
            type: "text",
            text: `Created calendar heatmap "${title}" with ${data.length} data points spanning ${daysCovered} days`,
          },
        ],
      };
    } catch (error) {
      logger.error("Failed to create calendar heatmap artifact:", error);

      yield {
        status: "error",
        message: `Failed to create calendar heatmap: ${error instanceof Error ? error.message : "Unknown error"}`,
        chartType: "calendar-heatmap",
      };

      return {
        content: [
          {
            type: "text",
            text: `Error creating calendar heatmap: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  },
});
