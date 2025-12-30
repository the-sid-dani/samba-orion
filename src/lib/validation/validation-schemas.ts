/**
 * Chart Data Validation Schemas
 *
 * Comprehensive Zod validation schemas for all chart types to ensure
 * data integrity and security. Follows existing codebase patterns
 * from src/lib/ai/workflow/node-validate.ts
 */

import { z } from "zod";

// Common validation utilities
export const sanitizedString = z
  .string()
  .min(1, "String cannot be empty")
  .max(255, "String too long (max 255 characters)")
  .transform((str) => str.trim());

export const chartTitle = z
  .string()
  .min(1, "Chart title is required")
  .max(100, "Chart title too long (max 100 characters)")
  .transform((str) => str.trim());

export const chartDescription = z
  .string()
  .max(500, "Description too long (max 500 characters)")
  .optional();

export const numericValue = z.number().finite("Value must be a finite number");

// Base chart data structures
export const chartDataPointSchema = z.object({
  label: sanitizedString.describe("Data point label"),
  value: numericValue.describe("Numeric value for this data point"),
});

export const seriesDataSchema = z.object({
  seriesName: sanitizedString.describe("Name of this data series"),
  value: numericValue.describe("Numeric value for this series"),
});

// Bar Chart Validation Schema
export const barChartDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(
      z.object({
        xAxisLabel: sanitizedString.describe("Category label for x-axis"),
        series: z
          .array(seriesDataSchema)
          .min(1, "Each category must have at least one series")
          .max(20, "Too many series (max 20 per category)"),
      }),
    )
    .min(1, "Chart must have at least one data point")
    .max(100, "Too many data points (max 100)"),
  description: chartDescription,
  yAxisLabel: sanitizedString.optional(),
});

// Line Chart Validation Schema
export const lineChartDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(
      z.object({
        xAxisLabel: sanitizedString.describe("X-axis point label"),
        series: z
          .array(seriesDataSchema)
          .min(1, "Each point must have at least one series")
          .max(10, "Too many series (max 10 per point)"),
      }),
    )
    .min(2, "Line chart must have at least 2 data points")
    .max(200, "Too many data points (max 200)"),
  description: chartDescription,
  yAxisLabel: sanitizedString.optional(),
});

// Pie Chart Validation Schema
export const pieChartDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(chartDataPointSchema)
    .min(2, "Pie chart must have at least 2 segments")
    .max(20, "Too many segments (max 20)")
    .refine(
      (data) => data.every((point) => point.value >= 0),
      "Pie chart values must be non-negative",
    ),
  description: chartDescription,
});

// Area Chart Validation Schema
export const areaChartDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(
      z.object({
        xAxisLabel: sanitizedString.describe("X-axis point label"),
        series: z
          .array(seriesDataSchema)
          .min(1, "Each point must have at least one series")
          .max(5, "Too many series for area chart (max 5)"),
      }),
    )
    .min(3, "Area chart must have at least 3 data points")
    .max(150, "Too many data points (max 150)"),
  description: chartDescription,
  yAxisLabel: sanitizedString.optional(),
});

// Scatter Chart Validation Schema
export const scatterChartDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(
      z.object({
        x: numericValue.describe("X-coordinate value"),
        y: numericValue.describe("Y-coordinate value"),
        label: sanitizedString.optional().describe("Optional point label"),
        series: sanitizedString.optional().describe("Series name for grouping"),
      }),
    )
    .min(3, "Scatter chart must have at least 3 points")
    .max(500, "Too many points (max 500)"),
  description: chartDescription,
  xAxisLabel: sanitizedString.optional(),
  yAxisLabel: sanitizedString.optional(),
});

// Geographic Chart Validation Schema
export const geographicChartDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(
      z.object({
        regionCode: z
          .string()
          .min(2, "Region code too short")
          .max(10, "Region code too long")
          .regex(/^[A-Z0-9-]+$/, "Invalid region code format"),
        regionName: sanitizedString.describe("Human-readable region name"),
        value: numericValue.describe("Numeric value for this region"),
      }),
    )
    .min(1, "Geographic chart must have at least one region")
    .max(300, "Too many regions (max 300)"),
  geoType: z.enum(["world", "usa-states", "usa-counties", "usa-dma"]),
  colorScale: z.enum(["blues", "reds", "greens", "viridis", "orange"]),
  description: chartDescription,
});

// Calendar Heatmap Validation Schema
export const calendarHeatmapDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(
      z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
          .refine((date) => !isNaN(Date.parse(date)), "Invalid date"),
        value: numericValue.describe("Activity value for this date"),
      }),
    )
    .min(1, "Calendar heatmap must have at least one data point")
    .max(400, "Too many data points (max 400 days)"),
  description: chartDescription,
});

// Radar Chart Validation Schema
export const radarChartDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(
      z.object({
        metric: sanitizedString.describe("Metric name"),
        value: z
          .number()
          .min(0, "Radar chart values must be non-negative")
          .max(100, "Radar chart values must be <= 100"),
        maxValue: z.number().min(1).optional(),
      }),
    )
    .min(3, "Radar chart must have at least 3 metrics")
    .max(12, "Too many metrics (max 12)"),
  description: chartDescription,
});

// Funnel Chart Validation Schema
export const funnelChartDataSchema = z.object({
  title: chartTitle,
  data: z
    .array(
      z.object({
        stage: sanitizedString.describe("Funnel stage name"),
        value: z.number().min(0, "Funnel values must be non-negative"),
        label: sanitizedString.optional(),
      }),
    )
    .min(2, "Funnel chart must have at least 2 stages")
    .max(10, "Too many funnel stages (max 10)")
    .refine((data) => {
      // Validate funnel order (values should generally decrease)
      for (let i = 1; i < data.length; i++) {
        if (data[i].value > data[i - 1].value * 1.1) {
          return false; // Allow 10% tolerance for funnel ordering
        }
      }
      return true;
    }, "Funnel values should generally decrease through stages"),
  description: chartDescription,
});

// Table Data Validation Schema
export const tableDataSchema = z.object({
  title: chartTitle,
  headers: z
    .array(sanitizedString)
    .min(1, "Table must have at least one header")
    .max(20, "Too many columns (max 20)"),
  rows: z
    .array(
      z
        .array(z.union([z.string(), z.number(), z.boolean()]))
        .min(1, "Each row must have at least one cell"),
    )
    .min(1, "Table must have at least one row")
    .max(1000, "Too many rows (max 1000)"),
  description: chartDescription,
});

// Gauge Chart Validation Schema
export const gaugeChartDataSchema = z.object({
  title: chartTitle,
  value: z
    .number()
    .min(0, "Gauge value must be non-negative")
    .max(100, "Gauge value must be <= 100"),
  min: z.number().default(0),
  max: z.number().default(100),
  unit: sanitizedString.optional().describe("Unit of measurement"),
  ranges: z
    .array(
      z.object({
        from: numericValue,
        to: numericValue,
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
        label: sanitizedString.optional(),
      }),
    )
    .max(5, "Too many gauge ranges (max 5)")
    .optional(),
  description: chartDescription,
});

// BAN (Big Ass Number) Chart Schema
export const banChartDataSchema = z.object({
  title: chartTitle,
  value: z
    .union([z.number(), z.string()])
    .describe("Main metric value to display"),
  unit: sanitizedString
    .optional()
    .describe("Unit of measurement (e.g., '%', '$', 'users')"),
  trend: z
    .object({
      value: z.number().describe("Trend percentage (positive or negative)"),
      direction: z.enum(["up", "down", "neutral"]).describe("Trend direction"),
      label: sanitizedString.optional().describe("Trend context label"),
    })
    .optional()
    .describe("Optional trend indicator"),
  comparison: z
    .object({
      value: z.union([z.number(), z.string()]).describe("Comparison value"),
      label: sanitizedString.describe(
        "Comparison label (e.g., 'vs last month')",
      ),
    })
    .optional()
    .describe("Optional comparison value"),
  description: chartDescription,
});

// Common validation result types
export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      details?: string[];
    };

// Validation utilities following existing patterns
export function validateChartData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  try {
    const parsed = schema.parse(data);
    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation failed",
        details: error.issues.map(
          (err) => `${err.path.join(".")}: ${err.message}`,
        ),
      };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}
