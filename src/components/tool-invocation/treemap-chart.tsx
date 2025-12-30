"use client";

import * as React from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

import { JsonViewPopup } from "../json-view-popup";
import { sanitizeCssVariableName } from "./shared.tool-invocation";
import { generateUniqueKey } from "lib/utils";
import { generateIntelligentTooltipLabels } from "./shared-tooltip-intelligence";

// TreemapChart component props interface
export interface TreemapChartProps {
  // Chart title (required)
  title: string;
  // Chart data array (required)
  data: Array<{
    name: string; // Item name
    value: number; // Item value
    children?: Array<{
      name: string; // Child name
      value: number; // Child value
    }>;
  }>;
  // Chart description (optional)
  description?: string;
}

// Color variable names (chart-1 ~ chart-5)
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Calculate responsive font size based on cell dimensions and text length
 * Ensures text stays within cell boundaries while maintaining readability
 */
const calculateResponsiveFontSize = (
  width: number,
  height: number,
  text: string,
  isLabel: boolean = true,
): number => {
  const maxFontSize = isLabel ? 12 : 11; // Original max sizes
  const minFontSize = 8; // Minimum readable size

  // Calculate font size based on cell dimensions
  const maxTextWidth = width - 8; // Leave 4px padding on each side
  const maxTextHeight = height / (isLabel ? 3 : 4); // Account for line spacing

  // Estimate text width (approximate: char width = fontSize * 0.6)
  const estimatedCharWidth = 0.6;
  const maxFontFromWidth = Math.floor(
    maxTextWidth / (text.length * estimatedCharWidth),
  );
  const maxFontFromHeight = Math.floor(maxTextHeight);

  // Use the most restrictive constraint
  const calculatedSize = Math.min(
    maxFontFromWidth,
    maxFontFromHeight,
    maxFontSize,
  );

  // Ensure minimum readability
  return Math.max(calculatedSize, minFontSize);
};

/**
 * Determine text display strategy based on cell hierarchy (UX-optimized)
 * Large cells: Show title + value | Medium cells: Title only | Small cells: No text (visual only)
 */
const getTextDisplayStrategy = (
  width: number,
  height: number,
  size: number,
  allData: any[],
): {
  showTitle: boolean;
  showValue: boolean;
  priority: "high" | "medium" | "low";
} => {
  const cellArea = width * height;
  const maxSize = Math.max(...allData.map((item) => item.size || 0));
  const sizeRatio = size / maxSize;

  // Define size thresholds for hierarchy
  const largeCell = cellArea > 8000 && sizeRatio > 0.1; // Top-tier data points
  const mediumCell = cellArea > 4000 && sizeRatio > 0.05; // Secondary data points
  const minDisplayArea = 2000; // Minimum area to show any text

  if (largeCell) {
    return { showTitle: true, showValue: true, priority: "high" };
  } else if (mediumCell && cellArea > minDisplayArea) {
    return { showTitle: true, showValue: false, priority: "medium" };
  } else {
    return { showTitle: false, showValue: false, priority: "low" };
  }
};

/**
 * Split text into two lines if it's too long for the cell width
 * (Currently unused - kept for potential future use)
 */
const _splitTextForCell = (
  text: string,
  width: number,
  fontSize: number,
): { line1: string; line2: string } => {
  const maxCharsPerLine = Math.floor(width / (fontSize * 0.6)) - 1; // Conservative estimate
  void _splitTextForCell; // Prevent unused warning

  if (text.length <= maxCharsPerLine) {
    return { line1: text, line2: "" };
  }

  // Find a good break point (prefer spaces)
  const midPoint = Math.floor(maxCharsPerLine);
  let breakPoint = midPoint;

  // Look for a space near the midpoint
  for (let i = midPoint; i > midPoint - 5 && i > 0; i--) {
    if (text[i] === " ") {
      breakPoint = i;
      break;
    }
  }

  const line1 = text.substring(0, breakPoint).trim();
  const line2 = text.substring(breakPoint).trim();

  return { line1, line2 };
};

export function TreemapChart(props: TreemapChartProps) {
  const { title, data, description } = props;

  const deduplicateData = React.useMemo(() => {
    // Handle undefined or empty data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.reduce(
      (acc, item) => {
        const names = acc.map((item) => item.name);
        const newName = generateUniqueKey(item.name, names);
        return [
          ...acc,
          {
            ...item,
            name: newName,
            children: item.children
              ? item.children.reduce(
                  (acc, child) => {
                    const childNames = acc.map((c) => c.name);
                    const newChildName = generateUniqueKey(
                      child.name,
                      childNames,
                    );
                    return [
                      ...acc,
                      {
                        ...child,
                        name: newChildName,
                      },
                    ];
                  },
                  [] as NonNullable<
                    TreemapChartProps["data"][number]["children"]
                  >,
                )
              : undefined,
          },
        ];
      },
      [] as TreemapChartProps["data"],
    );
  }, [data]);

  // Transform data for Recharts Treemap - proper format for flat data
  const chartData = React.useMemo(() => {
    // For flat data, wrap in a root object with children array (required by Recharts Treemap)
    const hasChildren = deduplicateData.some(
      (item) => item.children && item.children.length > 0,
    );

    if (hasChildren) {
      // Already hierarchical data - add colors to children
      // Only include items that actually have children
      return deduplicateData
        .filter((item) => item.children && item.children.length > 0)
        .map((item, _index) => ({
          name: item.name,
          children: item.children!.map((child, _childIndex) => ({
            name: child.name,
            size: child.value,
            fill: `var(--color-${sanitizeCssVariableName(child.name)})`,
          })),
        }));
    } else {
      // Flat data - wrap all items as children under a root
      return [
        {
          name: "root",
          children: deduplicateData.map((item, _index) => ({
            name: item.name,
            size: item.value,
            fill: `var(--color-${sanitizeCssVariableName(item.name)})`,
          })),
        },
      ];
    }
  }, [deduplicateData]);

  // Generate chart configuration dynamically
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    // Configure each item and their children
    deduplicateData.forEach((item, index) => {
      // Colors cycle through chart-1 ~ chart-5
      const colorIndex = index % chartColors.length;

      // Configure parent item
      config[sanitizeCssVariableName(item.name)] = {
        label: item.name,
        color: chartColors[colorIndex],
      };

      // Configure children if they exist
      if (item.children) {
        item.children.forEach((child, childIndex) => {
          const childColorIndex = (index + childIndex) % chartColors.length;
          config[sanitizeCssVariableName(child.name)] = {
            label: child.name,
            color: chartColors[childColorIndex],
          };
        });
      }
    });

    return config;
  }, [deduplicateData]);

  // Handle empty data case
  if (!data || data.length === 0) {
    return (
      <Card className="bg-card h-full flex flex-col">
        <CardHeader className="flex flex-col gap-1 relative pb-1 flex-shrink-0">
          <CardTitle className="flex items-center text-sm">
            Treemap Chart - {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-1 pb-0 pt-2 min-h-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>No data available</p>
            <p className="text-xs mt-1">
              Provide data to render the treemap chart
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex flex-col gap-1 relative pb-1 flex-shrink-0">
        <CardTitle className="flex items-center text-sm">
          Treemap Chart - {title}
          <div className="absolute right-4 top-0">
            <JsonViewPopup
              data={{
                ...props,
                data: deduplicateData,
              }}
            />
          </div>
        </CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-0 pt-2 min-h-0">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={chartData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="hsl(var(--border))"
              animationBegin={0}
              animationDuration={0}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={
                ((props: any) => {
                  const { x, y, width, height, name, size } = props;
                  // UX-optimized text display strategy based on cell hierarchy
                  const textStrategy = getTextDisplayStrategy(
                    width,
                    height,
                    size || 0,
                    deduplicateData,
                  );

                  // Calculate font sizes only for cells that will show text
                  const nameFontSize = textStrategy.showTitle
                    ? calculateResponsiveFontSize(
                        width,
                        height,
                        name || "",
                        true,
                      )
                    : 0;
                  const sizeFontSize = textStrategy.showValue
                    ? calculateResponsiveFontSize(
                        width,
                        height,
                        size?.toLocaleString() || "",
                        false,
                      )
                    : 0;

                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={`var(--color-${sanitizeCssVariableName(name || "")})`}
                        stroke="white"
                        strokeWidth={1}
                      />
                      {/* UX-optimized text rendering based on hierarchy */}
                      {textStrategy.showTitle && (
                        <text
                          x={x + width / 2}
                          y={
                            textStrategy.showValue
                              ? y + height / 2 - 4
                              : y + height / 2
                          }
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          className="font-bold"
                          style={{
                            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                            fontSize: `${nameFontSize}px`,
                          }}
                        >
                          {name}
                        </text>
                      )}
                      {textStrategy.showValue && (
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 12}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="rgba(255,255,255,0.9)"
                          style={{
                            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                            fontSize: `${sizeFontSize}px`,
                          }}
                        >
                          {size?.toLocaleString()}
                        </text>
                      )}
                    </g>
                  );
                }) as unknown as React.ReactElement
              }
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (
                    active &&
                    payload &&
                    payload.length &&
                    payload[0]?.payload
                  ) {
                    const data = payload[0].payload;

                    // Generate intelligent tooltip labels based on chart context
                    const intelligentLabels = generateIntelligentTooltipLabels({
                      title,
                      description,
                      chartType: "treemap",
                    });

                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {intelligentLabels.categoryLabel}
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {data.name}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {intelligentLabels.valueLabel}
                            </span>
                            <span className="font-bold">
                              {data.size?.toLocaleString()}
                              {intelligentLabels.unitSuffix}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
