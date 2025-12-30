"use client";

import * as React from "react";
import {
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
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
} from "@/components/ui/chart";

import { JsonViewPopup } from "../json-view-popup";
import { sanitizeCssVariableName } from "./shared.tool-invocation";
import { generateIntelligentTooltipLabels } from "./shared-tooltip-intelligence";
import { generateUniqueKey } from "lib/utils";

// RadialBarChart component props interface
export interface RadialBarChartProps {
  // Chart title (required)
  title: string;
  // Chart data array (required)
  data: Array<{
    name: string; // Metric name
    value: number; // Current value
    maxValue?: number; // Maximum value
  }>;
  // Chart description (optional)
  description?: string;
  // Inner radius (optional)
  innerRadius?: number;
  // Outer radius (optional)
  outerRadius?: number;
}

// Color scheme for radial bars
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function RadialBarChart(props: RadialBarChartProps) {
  const {
    title,
    data,
    description,
    innerRadius = 30,
    outerRadius = 80,
  } = props;

  const deduplicateData = React.useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const names = acc.map((item) => item.name);
        const newName = generateUniqueKey(item.name, names);
        return [
          ...acc,
          {
            ...item,
            name: newName,
          },
        ];
      },
      [] as RadialBarChartProps["data"],
    );
  }, [data]);

  // Process data for Recharts RadialBarChart
  const chartData = React.useMemo(() => {
    return deduplicateData.map((item, _index) => {
      const maxVal =
        item.maxValue || Math.max(...deduplicateData.map((d) => d.value)) * 1.2;
      const percentage = (item.value / maxVal) * 100;

      return {
        name: item.name,
        value: item.value,
        maxValue: maxVal,
        percentage: Math.round(percentage),
        fill: `var(--color-${sanitizeCssVariableName(item.name)})`,
      };
    });
  }, [deduplicateData]);

  // Generate chart configuration
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    // Add default config for the radial bar itself
    config.default = {
      label: "Performance",
      color: chartColors[0], // Primary blue
    };

    deduplicateData.forEach((item, index) => {
      config[sanitizeCssVariableName(item.name)] = {
        label: item.name,
        color: chartColors[index % chartColors.length],
      };
    });

    return config;
  }, [deduplicateData]);

  // Custom tooltip content with intelligent labeling
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];

      // Generate intelligent tooltip labels based on chart context
      const intelligentLabels = generateIntelligentTooltipLabels({
        title,
        description,
        chartType: "radial",
      });

      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {intelligentLabels.metricLabel}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.payload.name}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {intelligentLabels.valueLabel}
              </span>
              <span className="font-bold" style={{ color: data.payload.fill }}>
                {data.payload.value?.toLocaleString()}
                {intelligentLabels.unitSuffix}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Percentage
              </span>
              <span className="font-bold" style={{ color: data.payload.fill }}>
                {data.payload.percentage}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Maximum
              </span>
              <span className="font-bold text-muted-foreground">
                {data.payload.maxValue?.toLocaleString()}
                {intelligentLabels.unitSuffix}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex flex-col gap-1 relative pb-1 flex-shrink-0">
        <CardTitle className="flex items-center text-sm">
          Radial Bar Chart - {title}
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
            <RechartsRadialBarChart
              cx="50%"
              cy="50%"
              innerRadius={`${innerRadius}%`}
              outerRadius={`${outerRadius}%`}
              barSize={15}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey="percentage"
                cornerRadius={10}
                background={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
              />
              <ChartTooltip content={<CustomTooltip />} />
              {/* Center text showing average */}
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-lg font-bold"
              >
                {Math.round(
                  chartData.reduce((sum, item) => sum + item.percentage, 0) /
                    chartData.length,
                )}
                %
              </text>
              <text
                x="50%"
                y="50%"
                dy="20"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                Average
              </text>
            </RechartsRadialBarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
