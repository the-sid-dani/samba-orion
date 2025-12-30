"use client";

import * as React from "react";
import {
  Bar,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  ComposedChart as RechartsComposedChart,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { JsonViewPopup } from "../json-view-popup";
import { sanitizeCssVariableName } from "./shared.tool-invocation";
import { generateUniqueKey, formatChartNumber } from "lib/utils";

// ComposedChart component props interface
export interface ComposedChartProps {
  // Chart title (required)
  title: string;
  // Chart data array (required)
  data: Array<{
    xAxisLabel: string; // X-axis label name
    series: Array<{
      seriesName: string; // Series name
      value: number; // Value for this series
      chartType: "bar" | "line" | "area"; // Chart type for this series
    }>;
  }>;
  // Chart description (optional)
  description?: string;
  // X-axis label (optional)
  xAxisLabel?: string;
  // Y-axis label (optional)
  yAxisLabel?: string;
}

// Color variable names (chart-1 ~ chart-5)
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ComposedChart(props: ComposedChartProps) {
  const { title, data, description, yAxisLabel } = props;

  const deduplicateData = React.useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const names = acc.map((item) => item.xAxisLabel);
        const newXAxisLabel = generateUniqueKey(item.xAxisLabel, names);
        return [
          ...acc,
          {
            xAxisLabel: newXAxisLabel,
            series: item.series.reduce(
              (acc, item) => {
                const names = acc.map((item) => item.seriesName);
                const newSeriesName = generateUniqueKey(item.seriesName, names);
                return [
                  ...acc,
                  {
                    ...item,
                    seriesName: newSeriesName,
                  },
                ];
              },
              [] as ComposedChartProps["data"][number]["series"],
            ),
          },
        ];
      },
      [] as ComposedChartProps["data"],
    );
  }, [data]);

  // Organize series by chart type for rendering
  const seriesByType = React.useMemo(() => {
    const grouped = {
      bar: new Set<string>(),
      line: new Set<string>(),
      area: new Set<string>(),
    };

    deduplicateData.forEach((point) => {
      point.series.forEach((series) => {
        grouped[series.chartType].add(series.seriesName);
      });
    });

    return {
      bar: Array.from(grouped.bar),
      line: Array.from(grouped.line),
      area: Array.from(grouped.area),
    };
  }, [deduplicateData]);

  // Get all unique series names for configuration
  const allSeriesNames = React.useMemo(() => {
    return Array.from(
      new Set(
        deduplicateData.flatMap((point) =>
          point.series.map((s) => s.seriesName),
        ),
      ),
    );
  }, [deduplicateData]);

  // Generate chart configuration dynamically
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    // Configure each series
    allSeriesNames.forEach((seriesName, index) => {
      // Colors cycle through chart-1 ~ chart-5
      const colorIndex = index % chartColors.length;

      config[sanitizeCssVariableName(seriesName)] = {
        label: seriesName,
        color: chartColors[colorIndex],
      };
    });

    return config;
  }, [allSeriesNames]);

  // Generate chart data for Recharts
  const chartData = React.useMemo(() => {
    return deduplicateData.map((item) => {
      const result: any = {
        name: item.xAxisLabel,
      };

      // Add each series value to the result
      item.series.forEach(({ seriesName, value }) => {
        result[sanitizeCssVariableName(seriesName)] = value;
      });

      return result;
    });
  }, [deduplicateData]);

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex flex-col gap-1 relative pb-1 flex-shrink-0">
        <CardTitle className="flex items-center text-sm">
          Composed Chart - {title}
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
            <RechartsComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                fontSize={12}
                tickFormatter={formatChartNumber}
                label={
                  yAxisLabel
                    ? {
                        value: yAxisLabel,
                        angle: -90,
                        position: "insideLeft",
                      }
                    : undefined
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />

              {/* Render Area components first (background layers) */}
              {seriesByType.area.map((seriesName, _index) => {
                const seriesKey = sanitizeCssVariableName(String(seriesName));

                return (
                  <Area
                    key={`area-${seriesName}`}
                    type="monotone"
                    dataKey={seriesKey}
                    stroke={`var(--color-${sanitizeCssVariableName(String(seriesName))})`}
                    fill={`var(--color-${sanitizeCssVariableName(String(seriesName))})`}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                );
              })}

              {/* Render Bar components */}
              {seriesByType.bar.map((seriesName, _index) => {
                const seriesKey = sanitizeCssVariableName(String(seriesName));

                return (
                  <Bar
                    key={`bar-${seriesName}`}
                    dataKey={seriesKey}
                    fill={`var(--color-${sanitizeCssVariableName(String(seriesName))})`}
                    radius={[2, 2, 0, 0]}
                  />
                );
              })}

              {/* Render Line components last (foreground layers) */}
              {seriesByType.line.map((seriesName, _index) => {
                const seriesKey = sanitizeCssVariableName(seriesName);

                return (
                  <Line
                    key={`line-${seriesName}`}
                    type="monotone"
                    dataKey={seriesKey}
                    stroke={`var(--color-${sanitizeCssVariableName(seriesName)})`}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: `var(--color-${sanitizeCssVariableName(seriesName)})`,
                    }}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </RechartsComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
