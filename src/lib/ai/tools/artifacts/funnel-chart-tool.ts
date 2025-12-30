import { tool as createTool } from "ai";
import { z } from "zod";
import { generateUUID } from "../../../utils";
import logger from "../../../logger";
import { DefaultToolName } from "../index";

/**
 * Funnel Chart Tool - Creates Canvas Artifacts
 *
 * This tool creates individual funnel chart artifacts that appear in the Canvas workspace.
 * Funnel charts are ideal for displaying sales funnels, conversion rates, process flows,
 * and user journeys with the beautiful aesthetics of the existing chart components,
 * optimized for Canvas display with proper sizing.
 */
export const funnelChartArtifactTool = createTool({
  // Explicit tool name for debugging and registry validation
  name: DefaultToolName.CreateFunnelChart,
  description: `Create a beautiful funnel chart artifact that opens in the Canvas workspace.

  This tool creates individual funnel charts with the same beautiful aesthetics as the existing
  chart components, but optimized for Canvas display. Funnel charts are perfect for showing
  sales funnels, conversion rates, process flows, and user journeys.

  Examples of when to use this tool:
  - "Create a funnel chart showing our sales conversion process"
  - "Make a funnel chart of user journey from signup to purchase"
  - "Show me a funnel chart of website conversion rates"
  - "Visualize lead qualification process as a funnel chart"

  The chart will open in the Canvas workspace alongside the chat, with proper sizing
  and the same beautiful design as existing components.`,

  inputSchema: z.object({
    title: z.string().describe("Title for the funnel chart"),
    data: z
      .array(
        z.object({
          stage: z
            .string()
            .describe(
              "Name of the funnel stage (e.g., 'Leads', 'Qualified', 'Customers')",
            ),
          value: z.number().describe("Numeric value for this funnel stage"),
          fill: z
            .string()
            .optional()
            .describe("Optional custom color for this stage (hex color code)"),
        }),
      )
      .describe("Funnel chart data with stages and values"),
    description: z
      .string()
      .optional()
      .describe("Brief description of what the chart shows"),
    unit: z
      .string()
      .optional()
      .describe("Unit of measurement (e.g., 'leads', 'customers', '$')"),
  }),

  execute: async function* ({ title, data, description, unit }) {
    try {
      logger.info(`Creating funnel chart artifact: ${title}`);

      // Validate chart data
      if (!data || data.length === 0) {
        throw new Error("Funnel chart data cannot be empty");
      }

      // Validate data structure
      for (const stage of data) {
        if (!stage.stage || typeof stage.value !== "number") {
          throw new Error(
            "Invalid funnel chart data structure - each stage needs name and numeric value",
          );
        }

        if (stage.fill && !stage.fill.match(/^#[0-9A-Fa-f]{6}$/)) {
          throw new Error(
            "Invalid color format - custom colors must be hex format (e.g., #FF0000)",
          );
        }
      }

      // Sort data by value descending for proper funnel display
      const sortedData = [...data].sort((a, b) => b.value - a.value);

      // Create the chart artifact content that matches FunnelChart component props
      const chartContent = {
        type: "funnel-chart",
        title,
        data: sortedData,
        description,
        unit,
        chartType: "funnel", // Top-level chartType for canvas-panel.tsx routing
        // Add metadata for Canvas rendering
        metadata: {
          chartType: "funnel" as const,
          description,
          unit,
          theme: "light",
          animated: true,
          stages: sortedData.length,
          totalValue: sortedData.reduce((sum, stage) => sum + stage.value, 0),
          // Optimize sizing for Canvas cards - vertical layout
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
        message: `Created funnel chart "${title}"`,
        chartId: artifactId,
        title,
        chartType: "funnel",
        canvasName: "Data Visualization",
        chartData: chartContent,
        shouldCreateArtifact: true, // Flag for Canvas processing
        progress: 100,
      };

      // Return simple success message for chat
      logger.info(`Funnel chart artifact created successfully: ${artifactId}`);
      return `Created funnel chart "${title}". The chart is now available in the Canvas workspace.`;
    } catch (error) {
      logger.error("Failed to create funnel chart artifact:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Failed to create funnel chart: ${errorMessage}`,
          },
        ],
        structuredContent: {
          result: [
            {
              success: false,
              error: errorMessage,
              message: `Failed to create funnel chart: ${errorMessage}`,
              chartType: "funnel",
            },
          ],
        },
        isError: true,
      };
    }
  },
});
