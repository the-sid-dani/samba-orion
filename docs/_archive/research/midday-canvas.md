Directory structure:
└── canvas/
    ├── balance-sheet-canvas.tsx
    ├── burn-rate-canvas.tsx
    ├── canvas.tsx
    ├── cash-flow-canvas.tsx
    ├── category-expenses-canvas.tsx
    ├── health-report-canvas.tsx
    ├── profit-analysis-canvas.tsx
    ├── profit-canvas.tsx
    ├── revenue-canvas.tsx
    ├── runway-canvas.tsx
    ├── spending-canvas.tsx
    └── base/
        ├── base-canvas.tsx
        ├── canvas-chart.tsx
        ├── canvas-content.tsx
        ├── canvas-grid.tsx
        ├── canvas-header.tsx
        ├── canvas-section.tsx
        ├── index.ts
        ├── progress-toast.tsx
        └── skeleton.tsx

================================================
FILE: apps/dashboard/src/components/canvas/balance-sheet-canvas.tsx
================================================
"use client";

import {
  BaseCanvas,
  CanvasGrid,
  CanvasHeader,
  CanvasSection,
} from "@/components/canvas/base";
import { useEffect, useState } from "react";

export function BalanceSheetCanvas() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const balanceSheetItems = [
    {
      id: "total-assets",
      title: "Total Assets",
      value: "$2,450,000",
      subtitle: "Current + Fixed Assets",
      trend: { value: "+12.5% vs last quarter", isPositive: true },
    },
    {
      id: "total-liabilities",
      title: "Total Liabilities",
      value: "$1,200,000",
      subtitle: "Debts and obligations",
      trend: { value: "+8.2% vs last quarter", isPositive: false },
    },
    {
      id: "equity",
      title: "Shareholder Equity",
      value: "$1,250,000",
      subtitle: "Assets - Liabilities",
      trend: { value: "+15.3% vs last quarter", isPositive: true },
    },
    {
      id: "debt-ratio",
      title: "Debt-to-Equity Ratio",
      value: "0.96",
      subtitle: "Healthy range: 0.5-1.0",
      trend: { value: "Within target range", isPositive: true },
    },
  ];

  return (
    <BaseCanvas>
      <div className="space-y-4">
        <CanvasHeader
          title="Balance Sheet"
          description="Assets, liabilities, and equity overview"
          isLoading={isLoading}
        />

        <CanvasGrid
          items={balanceSheetItems}
          layout="2/2"
          isLoading={isLoading}
        />

        <CanvasSection title="Summary" isLoading={isLoading}>
          <p>
            The company maintains a healthy balance sheet with strong asset
            growth of 12.5% and controlled liability expansion. The
            debt-to-equity ratio of 0.96 indicates a balanced capital structure
            within the recommended range.
          </p>
        </CanvasSection>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/burn-rate-canvas.tsx
================================================
"use client";

import {
  BaseCanvas,
  CanvasChart,
  CanvasGrid,
  CanvasHeader,
  CanvasSection,
} from "@/components/canvas/base";
import { CanvasContent } from "@/components/canvas/base/canvas-content";
import { useUserQuery } from "@/hooks/use-user";
import { formatAmount } from "@/utils/format";
import { useArtifact } from "@ai-sdk-tools/artifacts/client";
import { burnRateArtifact } from "@api/ai/artifacts/burn-rate";
import { BurnRateChart } from "../charts";

export function BurnRateCanvas() {
  const { data, status } = useArtifact(burnRateArtifact);
  const { data: user } = useUserQuery();

  const isLoading = status === "loading";
  const stage = data?.stage;

  // Use artifact data or fallback to empty/default values
  const burnRateData =
    data?.chart?.monthlyData?.map((item) => ({
      month: item.month,
      amount: item.currentBurn,
      average: item.averageBurn,
      currentBurn: item.currentBurn,
      averageBurn: item.averageBurn,
    })) || [];

  const burnRateMetrics = data?.metrics
    ? [
        {
          id: "current-burn",
          title: "Current Monthly Burn",
          value:
            formatAmount({
              currency: data.currency,
              amount: data.metrics.currentMonthlyBurn || 0,
              locale: user?.locale,
            }) || (data.metrics.currentMonthlyBurn || 0).toLocaleString(),
          subtitle: data.analysis?.burnRateChange
            ? `${data.analysis.burnRateChange.percentage}% vs ${data.analysis.burnRateChange.period}`
            : stage === "loading"
              ? "Loading..."
              : "No change data",
        },
        {
          id: "runway-remaining",
          title: "Runway Remaining",
          value: `${data.metrics.runway || 0} months`,
          subtitle:
            data.metrics.runwayStatus ||
            (stage === "loading" ? "Loading..." : "No data"),
        },
        {
          id: "average-burn",
          title: "Average Burn Rate",
          value:
            formatAmount({
              currency: data.currency,
              amount: data.metrics.averageBurnRate || 0,
              locale: user?.locale,
            }) || (data.metrics.averageBurnRate || 0).toLocaleString(),
          subtitle: `Over last ${data.chart?.monthlyData?.length || 0} months`,
        },
        {
          id: "highest-category",
          title: data.metrics.topCategory?.name || "Top Category",
          value: `${data.metrics.topCategory?.percentage || 0}%`,
          subtitle: `${
            formatAmount({
              currency: data.currency,
              amount: data.metrics.topCategory?.amount || 0,
              locale: user?.locale,
            }) || (data.metrics.topCategory?.amount || 0).toLocaleString()
          } of monthly burn`,
        },
      ]
    : [];

  const showChart =
    stage &&
    ["loading", "chart_ready", "metrics_ready", "analysis_ready"].includes(
      stage,
    );

  const showSummarySkeleton = !stage || stage !== "analysis_ready";

  return (
    <BaseCanvas>
      <CanvasHeader title="Analysis" isLoading={isLoading} />

      <CanvasContent>
        <div className="space-y-8">
          {/* Show chart as soon as we have burn rate data */}
          {showChart && (
            <CanvasChart
              title="Monthly Burn Rate"
              legend={{
                items: [
                  { label: "Current", type: "solid" },
                  { label: "Average", type: "pattern" },
                ],
              }}
              isLoading={stage === "loading"}
              height="20rem"
            >
              <BurnRateChart
                data={burnRateData}
                height={320}
                showLegend={false}
                currency={data?.currency || "USD"}
                locale={user?.locale ?? undefined}
              />
            </CanvasChart>
          )}

          {/* Always show metrics section */}
          <CanvasGrid
            items={burnRateMetrics}
            layout="2/2"
            isLoading={stage === "loading" || stage === "chart_ready"}
          />

          {/* Always show summary section */}
          <CanvasSection title="Summary" isLoading={showSummarySkeleton}>
            {data?.analysis?.summary}
          </CanvasSection>
        </div>
      </CanvasContent>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/canvas.tsx
================================================
import { useArtifacts } from "@ai-sdk-tools/artifacts/client";
import { BalanceSheetCanvas } from "./balance-sheet-canvas";
import { BurnRateCanvas } from "./burn-rate-canvas";
import { CashFlowCanvas } from "./cash-flow-canvas";
import { CategoryExpensesCanvas } from "./category-expenses-canvas";
import { HealthReportCanvas } from "./health-report-canvas";
import { ProfitAnalysisCanvas } from "./profit-analysis-canvas";
import { ProfitCanvas } from "./profit-canvas";
import { RevenueCanvas } from "./revenue-canvas";
import { RunwayCanvas } from "./runway-canvas";
import { SpendingCanvas } from "./spending-canvas";

export function Canvas() {
  const { current } = useArtifacts({
    exclude: ["chat-title", "followup-questions"],
  });

  switch (current?.type) {
    case "burn-rate":
      return <BurnRateCanvas />;
    case "revenue-canvas":
      return <RevenueCanvas />;
    case "profit-canvas":
      return <ProfitCanvas />;
    case "runway-canvas":
      return <RunwayCanvas />;
    case "cash-flow-canvas":
      return <CashFlowCanvas />;
    case "balance-sheet-canvas":
      return <BalanceSheetCanvas />;
    case "category-expenses-canvas":
      return <CategoryExpensesCanvas />;
    case "health-report-canvas":
      return <HealthReportCanvas />;
    case "profit-analysis-canvas":
      return <ProfitAnalysisCanvas />;
    case "spending-canvas":
      return <SpendingCanvas />;
    default:
      return null;
  }
}



================================================
FILE: apps/dashboard/src/components/canvas/cash-flow-canvas.tsx
================================================
"use client";

import { BaseCanvas } from "@/components/canvas/base";
import { CashFlowChart } from "../charts";

export function CashFlowCanvas() {
  // Generate sample cash flow data
  const cashFlowData = Array.from({ length: 12 }, (_, i) => {
    const inflow = Math.floor(Math.random() * 20000) + 15000;
    const outflow = Math.floor(Math.random() * 15000) + 10000;
    const netFlow = inflow - outflow;
    const cumulativeFlow = i === 0 ? netFlow : netFlow + i * 2000;

    return {
      month: new Date(2024, i).toLocaleDateString("en-US", { month: "short" }),
      inflow,
      outflow,
      netFlow,
      cumulativeFlow,
    };
  });

  return (
    <BaseCanvas>
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cash Flow Analysis
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monthly cash inflow vs outflow with cumulative trends
          </p>
        </div>
        <div className="h-96">
          <CashFlowChart
            data={cashFlowData}
            showAnimation={true}
            showCumulative={true}
          />
        </div>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/category-expenses-canvas.tsx
================================================
"use client";

import { BaseCanvas } from "@/components/canvas/base";

export function CategoryExpensesCanvas() {
  return (
    <BaseCanvas>
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Category Expenses
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Detailed breakdown by expense categories
              </p>
            </div>
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-600 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Category expenses data will appear here
            </p>
          </div>
        </div>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/health-report-canvas.tsx
================================================
"use client";

import {
  BaseCanvas,
  CanvasChart,
  CanvasGrid,
  CanvasHeader,
  CanvasSection,
} from "@/components/canvas/base";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function HealthReportCanvas() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const healthMetrics = [
    {
      id: "cash-flow-score",
      title: "Cash Flow Score",
      value: "8.5/10",
      subtitle: "Excellent",
      trend: { value: "+0.3 vs last month", isPositive: true },
    },
    {
      id: "profitability-score",
      title: "Profitability Score",
      value: "7.2/10",
      subtitle: "Good",
      trend: { value: "+0.8 vs last month", isPositive: true },
    },
    {
      id: "efficiency-score",
      title: "Efficiency Score",
      value: "6.8/10",
      subtitle: "Fair",
      trend: { value: "-0.2 vs last month", isPositive: false },
    },
    {
      id: "growth-score",
      title: "Growth Score",
      value: "9.1/10",
      subtitle: "Outstanding",
      trend: { value: "+1.2 vs last month", isPositive: true },
    },
  ];

  const healthTrendData = [
    { month: "Jan", score: 7.2 },
    { month: "Feb", score: 7.5 },
    { month: "Mar", score: 7.8 },
    { month: "Apr", score: 8.1 },
    { month: "May", score: 8.3 },
    { month: "Jun", score: 8.5 },
  ];

  return (
    <BaseCanvas>
      <div className="space-y-4">
        <CanvasHeader
          title="Health Report"
          description="Financial health metrics and KPIs"
          isLoading={isLoading}
        />

        <CanvasGrid items={healthMetrics} layout="2/2" isLoading={isLoading} />

        <CanvasChart
          title="Health Score Trend"
          legend={{
            items: [
              { label: "Overall Score", type: "solid", color: "#3b82f6" },
            ],
          }}
          isLoading={isLoading}
          height="16rem"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={healthTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                domain={[6, 9]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0px",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CanvasChart>

        <CanvasSection title="Analysis" isLoading={isLoading}>
          <p>
            Overall financial health is strong with a composite score of 8.5/10.
            Growth metrics are particularly impressive at 9.1/10, while
            efficiency could be improved. Cash flow management is excellent,
            indicating good liquidity management.
          </p>
        </CanvasSection>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/profit-analysis-canvas.tsx
================================================
"use client";

import { BaseCanvas } from "@/components/canvas/base";

export function ProfitAnalysisCanvas() {
  return (
    <BaseCanvas>
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Profit Analysis
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Detailed profit margin and profitability analysis
              </p>
            </div>
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-600 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Profit analysis data will appear here
            </p>
          </div>
        </div>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/profit-canvas.tsx
================================================
"use client";

import { BaseCanvas } from "@/components/canvas/base";
import { ProfitChart, generateSampleData } from "../charts";

export function ProfitCanvas() {
  const profitData = generateSampleData.profit();

  return (
    <BaseCanvas>
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Profit & Loss Analysis
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monthly profit trends with expense comparison
          </p>
        </div>
        <div className="h-96">
          <ProfitChart data={profitData} showAnimation={true} />
        </div>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/revenue-canvas.tsx
================================================
"use client";

import { BaseCanvas } from "@/components/canvas/base";
import { RevenueChart, generateSampleData } from "../charts";

export function RevenueCanvas() {
  const revenueData = generateSampleData.revenue();

  return (
    <BaseCanvas>
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Revenue Analysis
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monthly revenue trends with target comparison
          </p>
        </div>
        <div className="h-96">
          <RevenueChart
            data={revenueData}
            showAnimation={true}
            showTarget={true}
          />
        </div>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/runway-canvas.tsx
================================================
"use client";

import { BaseCanvas } from "@/components/canvas/base";
import { RunwayChart } from "../charts";

export function RunwayCanvas() {
  // Generate sample runway data
  const runwayData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2024, i).toLocaleDateString("en-US", { month: "short" }),
    cashRemaining: Math.max(0, 200000 - i * 15000 + Math.random() * 10000),
    burnRate: Math.floor(Math.random() * 5000) + 12000,
    projectedCash: Math.max(0, 180000 - i * 18000),
  }));

  return (
    <BaseCanvas>
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cash Runway Analysis
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cash remaining over time with projections and critical thresholds
          </p>
        </div>
        <div className="h-96">
          <RunwayChart
            data={runwayData}
            showAnimation={true}
            showProjection={true}
          />
        </div>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/spending-canvas.tsx
================================================
"use client";

import { BaseCanvas } from "@/components/canvas/base";

export function SpendingCanvas() {
  return (
    <BaseCanvas>
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Spending Overview
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Comprehensive spending patterns and trends
              </p>
            </div>
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-600 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Spending data will appear here
            </p>
          </div>
        </div>
      </div>
    </BaseCanvas>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/base/base-canvas.tsx
================================================
"use client";

import { useArtifacts } from "@ai-sdk-tools/artifacts/client";
import { cn } from "@midday/ui/cn";
import { ProgressToast } from "./progress-toast";

export function BaseCanvas({ children }: { children: React.ReactNode }) {
  const { current } = useArtifacts({
    exclude: ["chat-title", "followup-questions"],
  });
  const isCanvasVisible = !!current;

  // @ts-ignore TODO: fix this
  const toastData = current?.payload?.toast;

  return (
    <>
      <div
        className={cn(
          "fixed top-[88px] right-4 w-[579px] z-30",
          "bg-white dark:bg-[#0c0c0c] border border-[#e6e6e6] dark:border-[#1d1d1d]",
          "overflow-x-hidden overflow-y-auto transition-transform duration-300 ease-in-out",
          isCanvasVisible ? "translate-x-0" : "translate-x-[calc(100%+24px)]",
        )}
        style={{ height: "calc(100vh - 104px)" }}
      >
        <div className="h-full flex flex-col relative px-6 py-4">
          {children}

          {toastData && (
            <ProgressToast
              isVisible={toastData.visible}
              currentStep={toastData.currentStep}
              totalSteps={toastData.totalSteps}
              currentLabel={toastData.currentLabel}
              stepDescription={toastData.stepDescription}
              completed={toastData.completed}
              completedMessage={toastData.completedMessage}
            />
          )}
        </div>
      </div>
    </>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/base/canvas-chart.tsx
================================================
"use client";

import { SkeletonChart } from "@/components/canvas/base/skeleton";
import { cn } from "@midday/ui/cn";
import type { ReactNode } from "react";

interface CanvasChartProps {
  title: string;
  children: ReactNode;
  legend?: {
    items: Array<{
      label: string;
      type: "solid" | "dashed" | "pattern";
      color?: string;
    }>;
  };
  isLoading?: boolean;
  height?: string | number;
  className?: string;
}

export function CanvasChart({
  title,
  children,
  legend,
  isLoading = false,
  height = "20rem",
  className,
}: CanvasChartProps) {
  if (isLoading) {
    return (
      <div className={cn("mb-6", className)}>
        <SkeletonChart height={height} />
      </div>
    );
  }

  return (
    <div className={cn("mb-6", className)}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[18px] font-normal font-serif text-black dark:text-white">
          {title}
        </h4>
        {legend && (
          <div className="flex gap-4 items-center" data-hide-in-pdf="true">
            {legend.items.map((item, index) => {
              const getSquareClasses = (type: string, color?: string) => {
                const baseColor = color || "#707070";

                switch (type) {
                  case "solid":
                    return "w-2 h-2 flex-shrink-0 bg-primary";
                  case "dashed":
                    return `w-2 h-2 flex-shrink-0 bg-transparent border border-dashed border-[${baseColor}]`;
                  case "pattern":
                    return "w-2 h-2 flex-shrink-0 bg-transparent";
                  default:
                    return `w-2 h-2 flex-shrink-0 bg-[${baseColor}]`;
                }
              };

              const getSquareStyle = (type: string, color?: string) => {
                const baseColor = color || "#707070";

                switch (type) {
                  case "pattern":
                    return {
                      backgroundImage: `repeating-linear-gradient(45deg, ${baseColor}, ${baseColor} 1px, transparent 1px, transparent 2px)`,
                    };
                  default:
                    return {};
                }
              };

              return (
                <div
                  key={`legend-${item.label}-${index}`}
                  className="flex gap-2 items-center"
                >
                  <div
                    className={getSquareClasses(item.type, item.color)}
                    style={getSquareStyle(item.type, item.color)}
                  />
                  <span className="text-[12px] text-[#707070] dark:text-[#666666] leading-none">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div style={{ height }}>{children}</div>
    </div>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/base/canvas-content.tsx
================================================
"use client";

export function CanvasContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto" data-canvas-content>
      {children}
    </div>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/base/canvas-grid.tsx
================================================
"use client";

import { SkeletonGrid } from "@/components/canvas/base/skeleton";
import { cn } from "@midday/ui/cn";

export type GridLayout = "1/1" | "2/2" | "2/3" | "4/4";

export interface GridItem {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

interface CanvasGridProps {
  items: GridItem[];
  layout?: GridLayout;
  isLoading?: boolean;
  className?: string;
}

const layoutConfig = {
  "1/1": { columns: 1, maxItems: 1 },
  "2/2": { columns: 2, maxItems: 4 },
  "2/3": { columns: 2, maxItems: 3 },
  "4/4": { columns: 4, maxItems: 4 },
};

export function CanvasGrid({
  items,
  layout = "2/2",
  isLoading = false,
  className,
}: CanvasGridProps) {
  const config = layoutConfig[layout];
  const displayItems = items.slice(0, config.maxItems);

  if (isLoading) {
    return (
      <div className={cn("mb-6", className)}>
        <SkeletonGrid columns={config.columns as 1 | 2 | 3 | 4} />
      </div>
    );
  }

  return (
    <div className={cn("mb-6", className)}>
      <div
        className={cn("grid gap-3", {
          "grid-cols-1": config.columns === 1,
          "grid-cols-2": config.columns === 2,
          "grid-cols-4": config.columns === 4,
        })}
      >
        {displayItems.map((item, index) => (
          <div
            key={item.id}
            className="border p-3 bg-white dark:bg-[#0c0c0c] border-[#e6e6e6] dark:border-[#1d1d1d]"
          >
            <div className="text-[12px] text-[#707070] dark:text-[#666666] mb-1">
              {item.title}
            </div>
            <div className="text-[18px] font-normal font-hedvig-sans-slashed-zero text-black dark:text-white mb-1">
              {item.value}
            </div>
            {item.subtitle && (
              <div className="text-[10px] text-[#707070] dark:text-[#666666]">
                {item.subtitle}
              </div>
            )}
            {item.trend && (
              <div
                className={cn(
                  "text-[10px] mt-1",
                  item.trend.isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {item.trend.value}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/base/canvas-header.tsx
================================================
"use client";

import { Skeleton } from "@/components/canvas/base/skeleton";
import { generateCanvasPdf } from "@/utils/canvas-to-pdf";
import { cn } from "@midday/ui/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midday/ui/dropdown-menu";
import { Icons } from "@midday/ui/icons";
import { useTheme } from "next-themes";

interface CanvasHeaderProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function CanvasHeader({
  title,
  description,
  isLoading = false,
  actions,
  className,
}: CanvasHeaderProps) {
  const { theme } = useTheme();

  const handleDownloadReport = async () => {
    try {
      await generateCanvasPdf({
        filename: `${title.toLowerCase().replace(/\s+/g, "-")}-report.pdf`,
        theme,
      });
    } catch {}
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-between", className)}>
        <div className="space-y-2">
          <Skeleton width="8rem" height="1.125rem" />
          {description && <Skeleton width="12rem" height="0.875rem" />}
        </div>
        {actions && (
          <div className="flex gap-2">
            <Skeleton width="3rem" height="2rem" />
            <Skeleton width="3rem" height="2rem" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div>
        <h2 className="text-[12px] leading-[23px] text-[#707070] dark:text-[#666666]">
          {title}
        </h2>
        {description && (
          <p className="text-[12px] text-[#707070] dark:text-[#666666] mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="flex justify-end mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <Icons.MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadReport}>
              Download Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/base/canvas-section.tsx
================================================
"use client";

import { Skeleton } from "@/components/canvas/base/skeleton";
import { cn } from "@midday/ui/cn";

interface CanvasSectionProps {
  title?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function CanvasSection({
  title,
  children,
  isLoading = false,
  className,
}: CanvasSectionProps) {
  if (isLoading) {
    return (
      <div className={cn("mb-6", className)}>
        {title && <Skeleton width="6rem" height="1rem" className="mb-3" />}
        <div className="space-y-2">
          <Skeleton width="100%" height="0.875rem" />
          <Skeleton width="85%" height="0.875rem" />
          <Skeleton width="90%" height="0.875rem" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mt-8 mb-4", className)}>
      {title && (
        <h3 className="text-[12px] leading-normal mb-3 text-[#707070] dark:text-[#666666]">
          {title}
        </h3>
      )}
      <div className="text-[12px] leading-[17px] font-hedvig-sans-slashed-zero text-black dark:text-white">
        {children}
      </div>
    </div>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/base/index.ts
================================================
export { BaseCanvas } from "./base-canvas";
export { CanvasHeader } from "./canvas-header";
export { CanvasGrid } from "./canvas-grid";
export { CanvasChart } from "./canvas-chart";
export { CanvasSection } from "./canvas-section";
export { Skeleton } from "./skeleton";
export { SkeletonLine } from "./skeleton";
export { SkeletonCard } from "./skeleton";
export { SkeletonChart } from "./skeleton";
export { SkeletonGrid } from "./skeleton";



================================================
FILE: apps/dashboard/src/components/canvas/base/progress-toast.tsx
================================================
"use client";

import { cn } from "@midday/ui/cn";
import { Icons } from "@midday/ui/icons";
import { Spinner } from "@midday/ui/spinner";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

interface ProgressToastProps {
  isVisible: boolean;
  currentStep?: number;
  totalSteps?: number;
  currentLabel?: string;
  stepDescription?: string;
  completed?: boolean;
  completedMessage?: string;
  onComplete?: () => void;
}

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
  },
};

export function ProgressToast({
  isVisible,
  currentStep = 0,
  totalSteps = 6,
  currentLabel,
  stepDescription,
  completed = false,
  completedMessage,
  onComplete,
}: ProgressToastProps) {
  const [showComplete, setShowComplete] = useState(false);
  const [shouldStayVisible, setShouldStayVisible] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [displayedStep, setDisplayedStep] = useState(currentStep);
  const [displayedLabel, setDisplayedLabel] = useState(currentLabel);
  const [displayedDescription, setDisplayedDescription] =
    useState(stepDescription);
  const hasHandledCompletion = useRef(false);
  const prevVisible = useRef(isVisible);
  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepQueueRef = useRef<
    Array<{ step: number; label?: string; description?: string }>
  >([]);
  const isProcessingQueueRef = useRef(false);

  // Process the step queue sequentially
  const processStepQueue = useCallback(() => {
    if (isProcessingQueueRef.current || stepQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    const nextStep = stepQueueRef.current.shift();

    if (nextStep) {
      setDisplayedStep(nextStep.step);
      setDisplayedLabel(nextStep.label);
      setDisplayedDescription(nextStep.description);

      // Schedule next step after minimum duration
      stepTimeoutRef.current = setTimeout(() => {
        isProcessingQueueRef.current = false;
        processStepQueue(); // Process next step in queue
      }, 800); // 800ms minimum per step
    } else {
      isProcessingQueueRef.current = false;
    }
  }, []);

  // Add step to queue when props change
  useEffect(() => {
    if (isVisible && !completed) {
      // Add to queue if it's a new step
      const lastQueuedStep =
        stepQueueRef.current[stepQueueRef.current.length - 1];
      if (!lastQueuedStep || lastQueuedStep.step !== currentStep) {
        stepQueueRef.current.push({
          step: currentStep,
          label: currentLabel,
          description: stepDescription,
        });

        // Start processing if not already processing
        if (!isProcessingQueueRef.current) {
          processStepQueue();
        }
      }
    }
  }, [
    currentStep,
    currentLabel,
    stepDescription,
    isVisible,
    completed,
    processStepQueue,
  ]);

  // Initialize displayed values
  useEffect(() => {
    if (isVisible) {
      setDisplayedStep(currentStep);
      setDisplayedLabel(currentLabel);
      setDisplayedDescription(stepDescription);
      stepQueueRef.current = []; // Clear queue on visibility change
      isProcessingQueueRef.current = false;
    }
  }, [isVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Show completion when completed is true and not already handled
    if (completed && !hasHandledCompletion.current) {
      hasHandledCompletion.current = true;
      setIsCompleting(true);
      setShouldStayVisible(true);
      setShowComplete(true);

      // Auto-hide after showing completion for 3 seconds
      setTimeout(() => {
        setShouldStayVisible(false);
        setShowComplete(false);
        setIsCompleting(false);
        // Don't reset hasHandledCompletion - keep it true to prevent re-showing
        onComplete?.();
      }, 3000);

      // Don't clear the timer on subsequent effect runs
      return;
    }

    // Reset when not visible and not completing
    if (!isVisible && !shouldStayVisible && !isCompleting) {
      setShowComplete(false);
      hasHandledCompletion.current = false;
      setIsCompleting(false);
    }

    // Update previous visible state
    prevVisible.current = isVisible;
  }, [isVisible, completed, onComplete, shouldStayVisible, isCompleting]);

  return (
    <AnimatePresence>
      {(isVisible || shouldStayVisible) && (
        <motion.div
          className="absolute bottom-4 left-4 right-4 z-50"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{
            duration: 0.2,
            ease: "easeOut",
          }}
        >
          <motion.div
            className={cn(
              "bg-white dark:bg-[#0c0c0c] border border-[#e6e6e6] dark:border-[#1d1d1d] p-3",
              "backdrop-blur-sm",
            )}
            variants={contentVariants}
            transition={{
              duration: 0.2,
              delay: 0.1,
            }}
          >
            {showComplete ? (
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                >
                  <Icons.Check
                    size={16}
                    className="text-black dark:text-white"
                  />
                </motion.div>
                <div>
                  <p className="text-[12px] leading-[17px] text-black dark:text-white">
                    {completedMessage || "Analysis complete"}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Loading Spinner */}
                    <Spinner size={16} className="text-[#878787]" />
                    <span className="text-[12px] leading-[17px] text-black dark:text-white">
                      {displayedLabel || "Processing..."}
                    </span>
                  </div>
                  <span className="text-[12px] leading-[17px] text-[#707070] dark:text-[#666666]">
                    {displayedStep + 1}/{totalSteps}
                  </span>
                </div>
                <div className="pl-6">
                  <span className="text-[12px] leading-[17px] text-[#707070] dark:text-[#666666]">
                    {displayedDescription || "Computing"}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



================================================
FILE: apps/dashboard/src/components/canvas/base/skeleton.tsx
================================================
"use client";

import { cn } from "@midday/ui/cn";
import { Skeleton as UISkeleton } from "@midday/ui/skeleton";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export function Skeleton({
  className,
  width = "100%",
  height = "1rem",
  rounded = false,
}: SkeletonProps) {
  return (
    <UISkeleton
      className={cn("w-full", rounded ? "rounded" : "rounded-none", className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonLine({
  width = "100%",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return (
    <UISkeleton
      className={cn("mb-2 h-3 w-full rounded-none", className)}
      style={{ width }}
    />
  );
}

export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border p-3 bg-white dark:bg-[#0c0c0c] border-[#e6e6e6] dark:border-[#1d1d1d] rounded-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SkeletonChart({
  height = "20rem",
  className,
}: {
  height?: string | number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Chart Header Skeleton */}
      <div className="flex items-center justify-between">
        <UISkeleton className="w-32 h-[1.125rem] rounded-none" />
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <UISkeleton className="w-2 h-2 rounded-none" />
            <UISkeleton className="w-12 h-3 rounded-none" />
          </div>
          <div className="flex gap-2 items-center">
            <UISkeleton className="w-2 h-2 rounded-none" />
            <UISkeleton className="w-12 h-3 rounded-none" />
          </div>
        </div>
      </div>

      {/* Chart Area Skeleton */}
      <UISkeleton
        className="opacity-20 w-full rounded-none"
        style={{ height }}
      />
    </div>
  );
}

export function SkeletonGrid({
  columns = 2,
  className,
}: {
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  const skeletonItems = Array.from({ length: columns * 2 }, (_, i) => {
    const uniqueId = `skeleton-card-${columns}-${i}`;
    return (
      <SkeletonCard key={uniqueId}>
        <SkeletonLine width="5rem" />
        <UISkeleton className="mb-1 w-16 h-5 rounded-none" />
        <SkeletonLine width="6rem" />
      </SkeletonCard>
    );
  });

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {skeletonItems}
    </div>
  );
}


