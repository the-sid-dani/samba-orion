import { tool as createTool } from "ai";
import { z } from "zod";
import logger from "../../../logger";
import { generateUUID } from "../../../utils";

// Dashboard orchestration schema - describes the dashboard plan
const dashboardPlanSchema = z.object({
  title: z.string().describe("Dashboard title"),
  description: z.string().optional().describe("Dashboard description"),
  charts: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.enum(["bar", "line", "pie"]).describe("Chart type to create"),
        title: z.string().describe("Chart title"),
        data: z
          .array(
            z.object({
              xAxisLabel: z.string(),
              series: z.array(
                z.object({
                  seriesName: z.string(),
                  value: z.number(),
                }),
              ),
            }),
          )
          .describe("Chart data"),
        description: z.string().optional().describe("Chart description"),
        xAxisLabel: z.string().optional().describe("X-axis label"),
        yAxisLabel: z.string().optional().describe("Y-axis label"),
        size: z
          .enum(["small", "medium", "large", "full"])
          .default("medium")
          .describe("Chart size"),
      }),
    )
    .describe("Charts to include in dashboard"),
  metrics: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string(),
        value: z.union([z.string(), z.number()]),
        subtitle: z.string().optional(),
        trend: z
          .object({
            value: z.string(),
            isPositive: z.boolean().optional(),
            isNeutral: z.boolean().optional(),
          })
          .optional(),
        badge: z
          .object({
            text: z.string(),
            variant: z
              .enum(["default", "secondary", "destructive", "outline"])
              .optional(),
          })
          .optional(),
      }),
    )
    .optional()
    .describe("Key metrics to display"),
  analysis: z.string().optional().describe("Written analysis of the data"),
  layout: z
    .object({
      metricsLayout: z.enum(["1/1", "2/2", "2/3", "3/3", "4/4"]).default("2/2"),
      chartsLayout: z.enum(["grid", "stacked", "mixed"]).default("grid"),
    })
    .optional()
    .describe("Layout configuration"),
});

// Progressive dashboard orchestrator tool
export const dashboardOrchestratorTool = createTool({
  description: `Create a comprehensive dashboard with progressive feedback using individual chart tools.

  This orchestrator tool creates dashboards by:
  1. Planning the dashboard structure with metrics and charts
  2. Progressively calling individual chart tools for each chart
  3. Providing live feedback as each chart is created
  4. Building the final dashboard layout with streaming updates

  Use this tool when users want to:
  - Create multiple related charts in one comprehensive view
  - Build analytical dashboards with metrics and charts
  - Display comprehensive data analysis with live feedback
  - Create business intelligence dashboards with streaming progress

  Examples:
  - "Create a sales dashboard with revenue charts and KPIs"
  - "Build a marketing dashboard showing multiple metrics"
  - "Make a financial dashboard with charts and key metrics"

  The tool provides progressive feedback including:
  - Dashboard planning stage
  - Individual chart creation progress
  - Layout building stage
  - Final completion status`,

  inputSchema: dashboardPlanSchema,

  execute: async function* (dashboardPlan) {
    try {
      const {
        title,
        description,
        charts,
        metrics = [],
        analysis,
        layout = { metricsLayout: "2/2", chartsLayout: "grid" },
      } = dashboardPlan;

      logger.info(`Starting dashboard orchestration: ${title}`);

      // Validate input
      if (!charts || charts.length === 0) {
        throw new Error("Dashboard must contain at least one chart");
      }

      // Generate dashboard ID
      const dashboardId = generateUUID();

      // Stage 1: Planning - Yield planning status
      yield {
        status: "loading",
        message: "Planning dashboard structure...",
        progress: 10,
      };

      logger.info(
        "Dashboard orchestration - Stage 1: Planning dashboard structure",
      );

      // Add IDs to metrics if not provided
      const metricsWithIds = metrics.map((metric) => ({
        ...metric,
        id: metric.id || generateUUID(),
      }));

      yield {
        status: "processing",
        message: `Dashboard planned with ${charts.length} charts and ${metricsWithIds.length} metrics`,
        progress: 25,
      };

      // Stage 2: Progressive Chart Creation
      logger.info(
        "Dashboard orchestration - Stage 2: Creating charts progressively",
      );

      const createdCharts: typeof charts = [];
      const totalCharts = charts.length;

      for (let i = 0; i < charts.length; i++) {
        const chart = charts[i];
        logger.info(
          `Creating chart ${i + 1}/${totalCharts}: ${chart.title} (${chart.type})`,
        );

        // Yield progress for each chart
        yield {
          status: "processing",
          message: `Creating chart ${i + 1}/${totalCharts}: ${chart.title}`,
          progress: 25 + Math.round((i / totalCharts) * 50),
        };

        // Simulate chart creation (in real implementation, this would call individual chart tools)
        // For now, we'll prepare the chart data with proper IDs
        const chartWithId = {
          ...chart,
          id: chart.id || generateUUID(),
        };

        createdCharts.push(chartWithId);

        // Progress feedback
        const progress = Math.round(((i + 1) / totalCharts) * 100);
        logger.info(
          `Chart creation progress: ${progress}% (${i + 1}/${totalCharts} complete)`,
        );
      }

      // Stage 3: Layout Building
      yield {
        status: "processing",
        message: "Building dashboard layout...",
        progress: 80,
      };

      logger.info(
        "Dashboard orchestration - Stage 3: Building dashboard layout",
      );

      // Create the dashboard artifact content
      const dashboardContent = {
        title,
        description,
        charts: createdCharts,
        metrics: metricsWithIds,
        analysis,
        layout,
        metadata: {
          chartCount: createdCharts.length,
          metricCount: metricsWithIds.length,
          chartTypes: Array.from(new Set(createdCharts.map((c) => c.type))),
          totalDataPoints: createdCharts.reduce(
            (sum, chart) => sum + chart.data.length,
            0,
          ),
          created: new Date().toISOString(),
          orchestrationStages: [
            "Planning",
            "Progressive Chart Creation",
            "Layout Building",
            "Complete",
          ],
        },
      };

      // Stage 4: Complete - Final yield with Canvas-compatible format
      logger.info(
        "Dashboard orchestration - Stage 4: Dashboard creation complete",
      );

      // Final success yield with Canvas-compatible format
      yield {
        status: "success",
        message: `Created dashboard "${title}" with ${createdCharts.length} charts and ${metricsWithIds.length} metrics`,
        chartId: dashboardId,
        title,
        chartType: "dashboard", // Top-level chartType for Canvas routing
        canvasName: "Data Visualization",
        chartData: dashboardContent, // chartData instead of artifact wrapper
        shouldCreateArtifact: true, // Required flag for Canvas processing
        progress: 100,
      };

      logger.info(`Dashboard artifact created successfully: ${dashboardId}`);

      return {
        content: [
          {
            type: "text",
            text: `Created dashboard "${title}" with ${createdCharts.length} charts and ${metricsWithIds.length} metrics`,
          },
        ],
      };
    } catch (error) {
      logger.error("Dashboard orchestration failed:", error);

      yield {
        status: "error",
        message: `Failed to create dashboard: ${error instanceof Error ? error.message : "Unknown error"}`,
        chartType: "dashboard",
      };

      return {
        content: [
          {
            type: "text",
            text: `Error creating dashboard: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  },
});

// Export the orchestrator tool
export const dashboardOrchestratorTools = {
  create_dashboard_progressive: dashboardOrchestratorTool,
};
