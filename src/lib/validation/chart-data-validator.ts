/**
 * Chart Data Validator with XSS Prevention
 *
 * Combines Zod validation with comprehensive XSS prevention for all chart types.
 * This is the main validation entry point for chart tools to ensure
 * both data integrity and security.
 *
 * SECURITY: All chart data must pass through this validator before rendering.
 */

import { z } from "zod";
import {
  barChartDataSchema,
  lineChartDataSchema,
  pieChartDataSchema,
  areaChartDataSchema,
  scatterChartDataSchema,
  geographicChartDataSchema,
  calendarHeatmapDataSchema,
  radarChartDataSchema,
  funnelChartDataSchema,
  tableDataSchema,
  gaugeChartDataSchema,
  banChartDataSchema,
  validateChartData as validateWithSchema,
} from "./validation-schemas";
import {
  sanitizeChartTitle,
  sanitizeChartLabel,
  sanitizeChartDescription,
  sanitizeRegionCode,
  sanitizeDate,
  sanitizeStringArray,
  sanitizeChartData,
  auditChartSecurity,
  containsXSSPattern,
} from "./xss-prevention";

// Chart type enumeration
export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "area"
  | "scatter"
  | "geographic"
  | "calendar-heatmap"
  | "radar"
  | "funnel"
  | "table"
  | "gauge"
  | "ban"
  | "composed"
  | "sankey"
  | "treemap"
  | "radial-bar";

// Validation result with security audit
export interface SecureValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  securityAudit: {
    safe: boolean;
    issues: string[];
    warnings: string[];
  };
  validationDetails?: string[];
}

/**
 * Main chart data validation function
 * Combines structural validation with XSS prevention
 */
export function validateChartDataSecure<T>(
  chartType: ChartType,
  inputData: unknown,
): SecureValidationResult<T> {
  // First, perform security audit
  const securityAudit = auditChartSecurity(inputData);

  // If security audit fails, reject immediately
  if (!securityAudit.safe) {
    return {
      success: false,
      error: "Security validation failed",
      securityAudit,
      validationDetails: securityAudit.issues,
    };
  }

  // Get the appropriate schema for chart type
  const schema = getChartSchema(chartType);
  if (!schema) {
    return {
      success: false,
      error: `Unknown chart type: ${chartType}`,
      securityAudit,
    };
  }

  // Perform Zod validation using existing pattern from node-validate.ts
  let validationResult;
  try {
    validationResult = validateWithSchema(schema, inputData);
  } catch (err) {
    validationResult = {
      success: false as const,
      error: err instanceof Error ? err.message : "Validation failed",
      details: [],
    };
  }

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error,
      securityAudit,
      validationDetails: validationResult.details,
    };
  }

  // Perform deep sanitization of all string content
  let sanitizedData: T;
  try {
    sanitizedData = sanitizeDataByChartType(chartType, validationResult.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sanitization failed",
      securityAudit,
    };
  }

  return {
    success: true,
    data: sanitizedData,
    securityAudit,
  };
}

/**
 * Get the appropriate Zod schema for chart type
 */
function getChartSchema(chartType: ChartType): z.ZodSchema<any> | null {
  const schemas: Record<ChartType, z.ZodSchema<any> | null> = {
    bar: barChartDataSchema,
    line: lineChartDataSchema,
    pie: pieChartDataSchema,
    area: areaChartDataSchema,
    scatter: scatterChartDataSchema,
    geographic: geographicChartDataSchema,
    "calendar-heatmap": calendarHeatmapDataSchema,
    radar: radarChartDataSchema,
    funnel: funnelChartDataSchema,
    table: tableDataSchema,
    gauge: gaugeChartDataSchema,
    ban: banChartDataSchema,
    // For chart types without specific schemas, use a generic one
    composed: null,
    sankey: null,
    treemap: null,
    "radial-bar": null,
  };

  return schemas[chartType];
}

/**
 * Sanitize data based on chart type with specific handling
 */
function sanitizeDataByChartType<T>(chartType: ChartType, data: T): T {
  // Type-safe sanitization using the generic sanitizeChartData function
  const sanitized = sanitizeChartData(data);

  // Additional chart-type-specific sanitization
  switch (chartType) {
    case "geographic":
      return sanitizeGeographicData(sanitized as any) as T;

    case "calendar-heatmap":
      return sanitizeCalendarData(sanitized as any) as T;

    case "table":
      return sanitizeTableData(sanitized as any) as T;

    default:
      return sanitized as T;
  }
}

/**
 * Geographic chart specific sanitization
 */
function sanitizeGeographicData(data: any): any {
  if (!data || typeof data !== "object") return data;

  const sanitized = { ...data };

  // Sanitize title
  if (sanitized.title) {
    sanitized.title = sanitizeChartTitle(sanitized.title);
  }

  // Sanitize description
  if (sanitized.description) {
    sanitized.description = sanitizeChartDescription(sanitized.description);
  }

  // Sanitize geographic data
  if (Array.isArray(sanitized.data)) {
    sanitized.data = sanitized.data.map((item: any) => ({
      ...item,
      regionCode: sanitizeRegionCode(item.regionCode),
      regionName: sanitizeChartLabel(item.regionName),
    }));
  }

  return sanitized;
}

/**
 * Calendar heatmap specific sanitization
 */
function sanitizeCalendarData(data: any): any {
  if (!data || typeof data !== "object") return data;

  const sanitized = { ...data };

  // Sanitize title
  if (sanitized.title) {
    sanitized.title = sanitizeChartTitle(sanitized.title);
  }

  // Sanitize description
  if (sanitized.description) {
    sanitized.description = sanitizeChartDescription(sanitized.description);
  }

  // Sanitize calendar data
  if (Array.isArray(sanitized.data)) {
    sanitized.data = sanitized.data.map((item: any) => ({
      ...item,
      date: sanitizeDate(item.date),
    }));
  }

  return sanitized;
}

/**
 * Table specific sanitization
 */
function sanitizeTableData(data: any): any {
  if (!data || typeof data !== "object") return data;

  const sanitized = { ...data };

  // Sanitize title
  if (sanitized.title) {
    sanitized.title = sanitizeChartTitle(sanitized.title);
  }

  // Sanitize description
  if (sanitized.description) {
    sanitized.description = sanitizeChartDescription(sanitized.description);
  }

  // Sanitize headers
  if (Array.isArray(sanitized.headers)) {
    sanitized.headers = sanitizeStringArray(sanitized.headers, 20);
  }

  // Sanitize table rows
  if (Array.isArray(sanitized.rows)) {
    sanitized.rows = sanitized.rows.map((row: any) => {
      if (!Array.isArray(row)) return row;

      return row.map((cell: any) => {
        if (typeof cell === "string") {
          return sanitizeChartLabel(cell);
        }
        return cell;
      });
    });
  }

  return sanitized;
}

/**
 * Validation middleware for chart tools
 * Use this function in chart tool implementations
 */
export function createChartValidator<T>(chartType: ChartType) {
  return function validate(inputData: unknown): SecureValidationResult<T> {
    return validateChartDataSecure<T>(chartType, inputData);
  };
}

/**
 * Quick validation for basic chart data (title + data structure)
 */
export function validateBasicChartData(data: {
  title: unknown;
  data: unknown;
  description?: unknown;
}): { title: string; description?: string } {
  const title = sanitizeChartTitle(data.title);
  const description = data.description
    ? sanitizeChartDescription(data.description)
    : undefined;

  // Basic data structure validation
  if (!Array.isArray(data.data)) {
    throw new Error("Chart data must be an array");
  }

  if (data.data.length === 0) {
    throw new Error("Chart data cannot be empty");
  }

  if (data.data.length > 1000) {
    throw new Error("Too many data points (max 1000)");
  }

  return { title, description };
}

/**
 * Validate and sanitize chart metadata
 */
export function validateChartMetadata(metadata: unknown): any {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const sanitized: any = {};
  const meta = metadata as Record<string, unknown>;

  // Sanitize common metadata fields
  if (meta.chartType && typeof meta.chartType === "string") {
    sanitized.chartType = sanitizeChartLabel(meta.chartType);
  }

  if (meta.theme && typeof meta.theme === "string") {
    sanitized.theme = sanitizeChartLabel(meta.theme);
  }

  if (meta.animated && typeof meta.animated === "boolean") {
    sanitized.animated = meta.animated;
  }

  if (meta.responsive && typeof meta.responsive === "boolean") {
    sanitized.responsive = meta.responsive;
  }

  // Sanitize numeric fields
  const numericFields = ["dataPoints", "seriesCount", "width", "height"];
  for (const field of numericFields) {
    if (
      meta[field] &&
      typeof meta[field] === "number" &&
      Number.isFinite(meta[field])
    ) {
      sanitized[field] = meta[field];
    }
  }

  // Sanitize string fields
  const stringFields = ["xAxisLabel", "yAxisLabel", "containerClass"];
  for (const field of stringFields) {
    if (meta[field] && typeof meta[field] === "string") {
      sanitized[field] = sanitizeChartLabel(meta[field]);
    }
  }

  return sanitized;
}

/**
 * Security test utilities for development/testing
 */
export const SECURITY_TEST_UTILS = {
  /**
   * Test if validator properly rejects XSS attempts
   */
  testXSSPrevention(chartType: ChartType, xssVector: string): boolean {
    const testData = {
      title: xssVector,
      data: [{ label: "test", value: 100 }],
    };

    const result = validateChartDataSecure(chartType, testData);
    return !result.success;
  },

  /**
   * Test if validator handles malformed data gracefully
   */
  testMalformedData(chartType: ChartType): boolean {
    const malformedInputs = [
      null,
      undefined,
      "",
      {},
      [],
      { title: null },
      { title: "", data: null },
      { title: "Test", data: "not-an-array" },
    ];

    return malformedInputs.every((input) => {
      const result = validateChartDataSecure(chartType, input);
      return !result.success;
    });
  },

  /**
   * Generate security audit report for data
   */
  auditData: auditChartSecurity,

  /**
   * Check if string contains XSS patterns
   */
  checkXSSPatterns: containsXSSPattern,
};

// Export individual validators for specific use cases
export const CHART_VALIDATORS = {
  bar: createChartValidator<z.infer<typeof barChartDataSchema>>("bar"),
  line: createChartValidator<z.infer<typeof lineChartDataSchema>>("line"),
  pie: createChartValidator<z.infer<typeof pieChartDataSchema>>("pie"),
  area: createChartValidator<z.infer<typeof areaChartDataSchema>>("area"),
  scatter:
    createChartValidator<z.infer<typeof scatterChartDataSchema>>("scatter"),
  geographic:
    createChartValidator<z.infer<typeof geographicChartDataSchema>>(
      "geographic",
    ),
  "calendar-heatmap":
    createChartValidator<z.infer<typeof calendarHeatmapDataSchema>>(
      "calendar-heatmap",
    ),
  radar: createChartValidator<z.infer<typeof radarChartDataSchema>>("radar"),
  funnel: createChartValidator<z.infer<typeof funnelChartDataSchema>>("funnel"),
  table: createChartValidator<z.infer<typeof tableDataSchema>>("table"),
  gauge: createChartValidator<z.infer<typeof gaugeChartDataSchema>>("gauge"),
  ban: createChartValidator<z.infer<typeof banChartDataSchema>>("ban"),
};
