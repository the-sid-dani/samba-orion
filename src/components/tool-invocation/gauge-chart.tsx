"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

import { JsonViewPopup } from "../json-view-popup";
import { generateUUID } from "lib/utils";
import { generateIntelligentTooltipLabels } from "./shared-tooltip-intelligence";

// Dynamic import for react-gauge-component to avoid SSR issues
const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

// GaugeChart component props interface
export interface GaugeChartProps {
  // Chart title (required)
  title: string;
  // Current value (required)
  value: number;
  // Minimum value (optional)
  minValue?: number;
  // Maximum value (optional)
  maxValue?: number;
  // Gauge type (required)
  gaugeType: "speedometer" | "semi-circle" | "radial";
  // Unit of measurement (optional)
  unit?: string;
  // Thresholds for color zones (optional)
  thresholds?: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
  // Chart description (optional)
  description?: string;
}

// Color variable names (chart-1 ~ chart-5) - consistent with other charts
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Actual color values for react-gauge-component (which can't resolve CSS variables)
const chartColorValues = [
  "hsl(221.2 83.2% 53.3%)", // --chart-1 (blue)
  "hsl(212 95% 68%)", // --chart-2 (lighter blue)
  "hsl(216 92% 60%)", // --chart-3 (medium blue)
  "hsl(210 98% 78%)", // --chart-4 (light blue)
  "hsl(212 97% 87%)", // --chart-5 (very light blue)
];

export function GaugeChart(props: GaugeChartProps) {
  const {
    title,
    value,
    minValue = 0,
    maxValue = 100,
    gaugeType,
    unit,
    description,
  } = props;

  // Tooltip state for gauge hover
  const [showTooltip, setShowTooltip] = React.useState(false);

  const deduplicatedProps = React.useMemo(() => {
    // For gauge charts, we mainly need to ensure value is properly clamped
    const clampedValue = Math.max(minValue, Math.min(maxValue, value));

    // Validate range to prevent subArc validation errors
    if (minValue >= maxValue) {
      console.warn(
        "GaugeChart: minValue must be less than maxValue. Adjusting to safe defaults.",
      );
      return {
        ...props,
        value: Math.max(0, Math.min(100, clampedValue)),
        minValue: 0,
        maxValue: 100,
      };
    }

    return {
      ...props,
      value: clampedValue,
      minValue,
      maxValue,
    };
  }, [props, minValue, maxValue, value]);

  // Calculate percentage for display
  const percentage = React.useMemo(() => {
    const {
      value: normalizedValue,
      minValue: normalizedMin,
      maxValue: normalizedMax,
    } = deduplicatedProps;
    const range = normalizedMax - normalizedMin;

    // Prevent division by zero and ensure valid range
    if (range <= 0) {
      return 0;
    }

    return Math.round(((normalizedValue - normalizedMin) / range) * 100);
  }, [deduplicatedProps]);

  // Generate gauge type based on the gaugeType prop
  const resolvedGaugeType = React.useMemo(() => {
    switch (gaugeType) {
      case "speedometer":
        return "semicircle";
      case "semi-circle":
        return "semicircle";
      case "radial":
        return "radial";
      default:
        return "semicircle";
    }
  }, [gaugeType]);

  // Generate chart configuration for consistency
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    // Always use the default chart colors for simplicity and reliability
    chartColors.forEach((color, index) => {
      config[`chart-${index + 1}`] = {
        label: `Chart Color ${index + 1}`,
        color: color,
      };
    });

    return config;
  }, []);

  // Get resolved colors for the gauge component
  // react-gauge-component can't resolve CSS variables, so we use actual values
  const resolvedColors = React.useMemo(() => {
    // Always use the design system colors for consistency
    // Ignore custom thresholds to prevent validation errors
    return chartColorValues;
  }, []);

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex flex-col gap-1 relative pb-1 flex-shrink-0">
        <CardTitle className="flex items-center text-sm">
          Gauge Chart - {title}
          <div className="absolute right-4 top-0">
            <JsonViewPopup
              data={{
                ...props,
                data: deduplicatedProps,
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
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-full h-full max-w-md max-h-md relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <GaugeComponent
                id={`gauge-${generateUUID()}`}
                type={resolvedGaugeType}
                arc={{
                  width: 0.3,
                  padding: 0.02,
                  gradient: true,
                  colorArray: [resolvedColors[0], resolvedColors[2]], // Blue gradient
                  // Ensure subArcs are not automatically generated
                  subArcs: [],
                }}
                pointer={{
                  elastic: true,
                  animationDelay: 0,
                  color: "hsl(var(--foreground))",
                }}
                labels={{
                  valueLabel: {
                    style: {
                      fill: "hsl(var(--foreground))",
                      fontSize: "2rem",
                      fontWeight: "bold",
                    },
                  },
                  tickLabels: {
                    defaultTickValueConfig: {
                      style: {
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: "0.8rem",
                      },
                    },
                  },
                }}
                value={Math.max(0, Math.min(1, percentage / 100))} // Ensure value is within 0-1 range
                minValue={0}
                maxValue={1}
              />

              {/* Intelligent tooltip overlay */}
              {showTooltip &&
                (() => {
                  const intelligentLabels = generateIntelligentTooltipLabels({
                    title,
                    description,
                    unit,
                    chartType: "gauge",
                  });

                  return (
                    <div className="absolute top-2 left-2 rounded-lg border bg-background p-2 shadow-sm z-10">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Current {intelligentLabels.valueLabel}
                          </span>
                          <span className="font-bold">
                            {deduplicatedProps.value.toLocaleString()}
                            {intelligentLabels.unitSuffix}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Percentage
                          </span>
                          <span className="font-bold">{percentage}%</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Range
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {deduplicatedProps.minValue} -{" "}
                            {deduplicatedProps.maxValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
