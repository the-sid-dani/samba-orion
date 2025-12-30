"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { JsonViewPopup } from "../json-view-popup";

// BANChart component props interface
export interface BANChartProps {
  // Chart title (required)
  title: string;
  // Main metric value (required)
  value: number | string;
  // Unit of measurement (optional)
  unit?: string;
  // Trend indicator (optional)
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  // Comparison value (optional)
  comparison?: {
    value: number | string;
    label: string;
  };
  // Chart description (optional)
  description?: string;
}

export function BANChart(props: BANChartProps) {
  const { title, value, unit, trend, comparison, description } = props;

  // Format the main value for display
  const formattedValue = React.useMemo(() => {
    if (typeof value === "number") {
      // Format large numbers with commas
      return value.toLocaleString();
    }
    return value;
  }, [value]);

  // Determine trend color and icon
  const trendConfig = React.useMemo(() => {
    if (!trend) return null;

    const isPositive = trend.direction === "up";
    const isNegative = trend.direction === "down";

    return {
      icon: isPositive ? TrendingUp : isNegative ? TrendingDown : Minus,
      color: isPositive
        ? "text-green-600 dark:text-green-400"
        : isNegative
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground",
      bgColor: isPositive
        ? "bg-green-50 dark:bg-green-950/20"
        : isNegative
          ? "bg-red-50 dark:bg-red-950/20"
          : "bg-muted/50",
      sign: isPositive ? "+" : "",
    };
  }, [trend]);

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex flex-col gap-1 relative pb-1 flex-shrink-0">
        <CardTitle className="flex items-center text-sm font-medium text-muted-foreground">
          {title}
          <JsonViewPopup data={props} />
        </CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-0 pt-2 min-h-0 flex flex-col items-center justify-center">
        {/* Main Value Display */}
        <div className="flex items-baseline justify-center gap-1.5 mb-4">
          <span className="text-3xl font-bold tracking-tight">
            {formattedValue}
          </span>
          {unit && (
            <span className="text-lg font-semibold text-muted-foreground">
              {unit}
            </span>
          )}
        </div>

        {/* Trend and Comparison Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Trend Indicator */}
          {trend && trendConfig && (
            <Badge
              variant="secondary"
              className={`${trendConfig.bgColor} ${trendConfig.color} border-0 px-2 py-1`}
            >
              <trendConfig.icon className="h-3 w-3 mr-1" />
              <span className="text-sm font-semibold">
                {trendConfig.sign}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-xs ml-1 opacity-80">{trend.label}</span>
              )}
            </Badge>
          )}

          {/* Comparison Value */}
          {comparison && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              <span className="font-medium">{comparison.value}</span>
              {comparison.label && (
                <span className="text-xs">{comparison.label}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
