"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as React from "react";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Card } from "ui/card";
import {
  X,
  Minimize2,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Clock,
  Hash,
  AlertTriangle,
} from "lucide-react";
import { cn } from "lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart } from "./tool-invocation/bar-chart";
import { LineChart } from "./tool-invocation/line-chart";
import { PieChart } from "./tool-invocation/pie-chart";
import { AreaChart } from "./tool-invocation/area-chart";
import { ScatterChart } from "./tool-invocation/scatter-chart";
import { RadarChart } from "./tool-invocation/radar-chart";
import { FunnelChart } from "./tool-invocation/funnel-chart";
import { TreemapChart } from "./tool-invocation/treemap-chart";
import { SankeyChart } from "./tool-invocation/sankey-chart";
import { RadialBarChart } from "./tool-invocation/radial-bar-chart";
import { ComposedChart } from "./tool-invocation/composed-chart";
import { GeographicChart } from "./tool-invocation/geographic-chart";
import { GaugeChart } from "./tool-invocation/gauge-chart";
import { CalendarHeatmap } from "./tool-invocation/calendar-heatmap";
import { InteractiveTable } from "./tool-invocation/interactive-table";
import { BANChart } from "./tool-invocation/ban-chart";

interface CanvasArtifact {
  id: string;
  type: "chart" | "table" | "dashboard" | "code" | "text" | "image" | "data";
  title: string;
  canvasName?: string;
  data?: any;
  content?: string;
  status?: "loading" | "completed" | "error";
  metadata?: {
    chartType?: string;
    dataPoints?: number;
    charts?: number;
    lastUpdated?: string;
    toolName?: string;
  };
}

interface CanvasPanelProps {
  isVisible: boolean;
  onClose: () => void;
  artifacts: CanvasArtifact[];
  activeArtifactId?: string;
  onArtifactSelect?: (id: string) => void;
  canvasName?: string;
  isIntegrated?: boolean;
  isLoadingCharts?: boolean;
  chartToolNames?: string[];
}

// Enhanced Loading placeholder component with timeout detection
function LoadingPlaceholder({ artifact }: { artifact: CanvasArtifact }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      // Show warning after 15s
      if (elapsed > 15000 && !showWarning) {
        console.warn("⚠️ Chart generation taking longer than expected:", {
          artifactId: artifact.id,
          elapsedSeconds: Math.floor(elapsed / 1000),
        });
        setShowWarning(true);
      }

      // Auto-fail after 30s
      if (elapsed > 30000) {
        console.error("❌ Chart generation timeout:", {
          artifactId: artifact.id,
          elapsedSeconds: Math.floor(elapsed / 1000),
        });
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [artifact.id, showWarning]);

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const getChartIcon = () => {
    const chartType = artifact.metadata?.chartType;
    switch (chartType) {
      case "bar":
        return <BarChart3 className="h-5 w-5 text-primary" />;
      case "line":
        return <LineChartIcon className="h-5 w-5 text-primary" />;
      case "pie":
        return <PieChartIcon className="h-5 w-5 text-primary" />;
      case "area":
        return <AreaChartIcon className="h-5 w-5 text-primary" />;
      case "ban":
        return <Hash className="h-5 w-5 text-primary" />;
      default:
        return <BarChart3 className="h-5 w-5 text-primary" />;
    }
  };

  // Show warning state after 15s
  if (showWarning) {
    return (
      <Card className="h-full flex items-center justify-center p-6 border-warning">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative">
            <AlertTriangle className="w-12 h-12 text-warning animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-warning">
              Taking longer than expected
            </h3>
            <p className="text-sm text-muted-foreground">
              Chart generation in progress ({formatElapsedTime(elapsedTime)})
            </p>
            <p className="text-xs text-muted-foreground">
              Will timeout after 30 seconds if not completed
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Normal loading state
  return (
    <Card className="h-full flex items-center justify-center p-6">
      <div className="flex items-center space-x-4">
        {/* Circular Loading Animation */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full border-3 border-muted animate-pulse" />
          <div className="absolute inset-0 w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            {getChartIcon()}
          </div>
        </div>

        {/* Chart Information */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            Creating {artifact.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {artifact.metadata?.chartType
              ? `Generating ${artifact.metadata.chartType} chart...`
              : `Generating ${artifact.type}...`}
          </p>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{formatElapsedTime(elapsedTime)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Simple loading state component for when Canvas opens for chart tools
function LoadingChartsState({ chartToolNames }: { chartToolNames: string[] }) {
  const [dots, setDots] = useState(".");

  // Animate the loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Convert tool names to user-friendly chart types
  const getChartTypeDisplay = (toolName: string) => {
    if (toolName.includes("bar")) return "Bar Chart";
    if (toolName.includes("line")) return "Line Chart";
    if (toolName.includes("pie")) return "Pie Chart";
    if (toolName.includes("area")) return "Area Chart";
    if (toolName.includes("scatter")) return "Scatter Plot";
    if (toolName.includes("radar")) return "Radar Chart";
    if (toolName.includes("funnel")) return "Funnel Chart";
    if (toolName.includes("treemap")) return "Treemap";
    if (toolName.includes("sankey")) return "Sankey Diagram";
    if (toolName.includes("radial")) return "Radial Bar Chart";
    if (toolName.includes("composed")) return "Composed Chart";
    if (toolName.includes("geographic")) return "Geographic Map";
    if (toolName.includes("gauge")) return "Gauge Chart";
    if (toolName.includes("calendar") || toolName.includes("heatmap"))
      return "Calendar Heatmap";
    if (toolName.includes("table")) return "Data Table";
    return "Chart";
  };

  const uniqueChartTypes = [
    ...new Set(chartToolNames.map(getChartTypeDisplay)),
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-card/30 border border-border/20 rounded-2xl p-8 max-w-md">
        {/* Large Loading Animation */}
        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <BarChart3 className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Loading Message */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Charts are loading{dots}
          </h3>
          <p className="text-sm text-muted-foreground">
            Creating your data visualizations
          </p>

          {/* Show chart types being created */}
          {uniqueChartTypes.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">Generating:</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {uniqueChartTypes.map((chartType, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {chartType}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Chart renderer component
function ChartRenderer({ artifact }: { artifact: CanvasArtifact }) {
  if (artifact.status === "loading") {
    return <LoadingPlaceholder artifact={artifact} />;
  }

  if (!artifact.data) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No chart data available</p>
        </div>
      </div>
    );
  }

  const {
    chartType,
    title,
    data,
    description,
    yAxisLabel,
    xAxisLabel,
    areaType,
    showBubbles,
    geoType,
    colorScale,
    value,
    minValue,
    maxValue,
    gaugeType,
    unit,
    thresholds,
    nodes,
    links,
    innerRadius,
    outerRadius,
    startDate,
    endDate,
  } = artifact.data;

  const chartProps = {
    title: title || artifact.title,
    data: data || [],
    description,
    yAxisLabel,
    xAxisLabel,
    areaType,
    showBubbles,
    geoType,
    colorScale,
    value,
    minValue,
    maxValue,
    gaugeType,
    unit,
    thresholds,
    nodes,
    links,
    innerRadius,
    outerRadius,
    startDate,
    endDate,
  };

  // Add sizing wrapper for all charts
  const chartContent = (() => {
    switch (chartType) {
      case "bar":
        return <BarChart {...chartProps} />;
      case "line":
        return <LineChart {...chartProps} />;
      case "pie":
        // Pie chart data is already in correct format {label, value}
        return (
          <PieChart
            title={chartProps.title}
            data={data || []}
            description={description}
          />
        );
      case "area":
        return <AreaChart {...chartProps} />;
      case "scatter":
        return <ScatterChart {...chartProps} />;
      case "radar":
        return <RadarChart {...chartProps} />;
      case "funnel":
        return <FunnelChart {...chartProps} />;
      case "treemap":
        return <TreemapChart {...chartProps} />;
      case "sankey":
        return <SankeyChart {...chartProps} />;
      case "radial-bar":
      case "radialbar":
        return <RadialBarChart {...chartProps} />;
      case "composed":
        return <ComposedChart {...chartProps} />;
      case "geographic":
      case "geo":
        return <GeographicChart {...chartProps} />;
      case "gauge":
        return <GaugeChart {...chartProps} />;
      case "calendar-heatmap":
      case "heatmap":
        return <CalendarHeatmap {...chartProps} />;
      case "ban":
      case "ban-chart":
        return <BANChart {...chartProps} />;
      default:
        // Fallback to bar chart for unknown types
        console.warn(
          `Unknown chart type: ${chartType}, falling back to bar chart`,
        );
        return <BarChart {...chartProps} />;
    }
  })();

  return <div className="h-full w-full flex flex-col">{chartContent}</div>;
}

// Empty state component
function CanvasEmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Canvas Ready</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Artifacts like charts, documents, and visualizations will appear
            here when generated by AI.
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Try asking for:</p>
          <div className="space-y-1">
            <p>• &ldquo;Create a chart showing...&rdquo;</p>
            <p>• &ldquo;Generate a document about...&rdquo;</p>
            <p>• &ldquo;Visualize the data...&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Table renderer component
function TableRenderer({ artifact }: { artifact: CanvasArtifact }) {
  if (artifact.status === "loading") {
    return <LoadingPlaceholder artifact={artifact} />;
  }

  if (!artifact.data) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No table data available</p>
        </div>
      </div>
    );
  }

  const tableProps = {
    title: artifact.title,
    ...artifact.data,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border/20">
        <h3 className="font-semibold text-sm truncate">{artifact.title}</h3>
      </div>
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full max-h-[350px] overflow-y-auto">
          <InteractiveTable {...tableProps} />
        </div>
      </div>
    </div>
  );
}

// Error Boundary for Canvas Panel
class CanvasPanelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "💥 Canvas Error Boundary: Canvas crashed:",
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="text-destructive">
              <BarChart3 className="w-12 h-12 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Canvas Error</h3>
              <p className="text-sm text-muted-foreground">
                The Canvas workspace encountered an error and needs to be
                reloaded.
              </p>
            </div>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              size="sm"
            >
              Reload Canvas
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main Canvas Panel Component
export function CanvasPanel({
  isVisible,
  onClose,
  artifacts,
  activeArtifactId,
  onArtifactSelect: _onArtifactSelect,
  canvasName = "Canvas",
  isIntegrated = false,
  isLoadingCharts = false,
  chartToolNames = [],
}: CanvasPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const renderCountRef = useRef(0);

  // Track render count for debugging
  renderCountRef.current += 1;
  const debugPrefix = "🎭 CanvasPanel Debug:";

  console.log(
    `${debugPrefix} Render #${renderCountRef.current} - isVisible:`,
    isVisible,
    "artifacts:",
    artifacts.length,
    "activeArtifactId:",
    activeArtifactId,
  );

  if (!isVisible) {
    console.log("❌ CanvasPanel Debug: Not rendering - isVisible is false");
    return null;
  }

  console.log("✅ CanvasPanel Debug: Rendering canvas panel");

  // Use different styling for integrated vs floating - FIXED with proper max-height for scrolling
  const containerClasses = isIntegrated
    ? "max-h-screen bg-background border-l border-border overflow-y-auto"
    : "fixed right-0 top-0 max-h-screen w-[45vw] min-w-[500px] max-w-[700px] z-50 bg-background border-l border-border shadow-2xl overflow-y-auto";

  const content = (
    <div className={containerClasses}>
      <div className="h-full flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2">
            <h2 className="font-semibold text-lg">{canvasName}</h2>
            {artifacts.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {artifacts.length}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {!isIntegrated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log("🚪 Canvas Debug: Close button clicked");
                onClose();
              }}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Clean minimal separator */}
        {artifacts.length > 0 && !isMinimized && (
          <div className="border-b border-border/10"></div>
        )}

        {/* Content Area - Canvas Panel Scrolling with Quality Charts */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isMinimized ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">Canvas minimized</p>
            </div>
          ) : isLoadingCharts ? (
            <LoadingChartsState chartToolNames={chartToolNames || []} />
          ) : artifacts.length > 0 ? (
            <div
              className="p-4 pb-8"
              style={{
                minHeight: `${Math.ceil(artifacts.length / 2) * 450 + 200}px`,
              }}
            >
              {/* Canvas Grid - Balanced approach for scrolling + chart quality */}
              <div
                className={cn(
                  "grid gap-6 grid-cols-2",
                  // Fixed 2-column horizontal layout
                  artifacts.length === 1 && "grid-cols-1",
                  artifacts.length === 2 && "grid-cols-2",
                  artifacts.length === 3 && "grid-cols-2",
                  artifacts.length >= 4 && "grid-cols-2",
                )}
              >
                {artifacts.map((artifact, _index) => {
                  console.log("🔍 Canvas Rendering Artifact:", {
                    id: artifact.id,
                    type: artifact.type,
                    title: artifact.title,
                    chartType: artifact.metadata?.chartType,
                    toolName: artifact.metadata?.toolName,
                    isTable: artifact.type === "table",
                  });

                  return (
                    <div
                      key={`chart-${artifact.id}`}
                      className="bg-card/30 border border-border/20 rounded-2xl overflow-hidden min-h-[400px] flex flex-col"
                    >
                      {artifact.status === "loading" ? (
                        <LoadingPlaceholder artifact={artifact} />
                      ) : artifact.type === "table" ? (
                        <TableRenderer artifact={artifact} />
                      ) : artifact.type === "chart" ? (
                        <ChartRenderer artifact={artifact} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <CanvasEmptyState />
          )}
        </div>
      </div>
    </div>
  );

  // Return with smooth animation for Canvas opening - wrapped in error boundary
  if (isIntegrated) {
    return (
      <CanvasPanelErrorBoundary>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 25,
            duration: 0.3,
          }}
        >
          {content}
        </motion.div>
      </CanvasPanelErrorBoundary>
    );
  }

  return (
    <CanvasPanelErrorBoundary>
      <AnimatePresence>
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </CanvasPanelErrorBoundary>
  );
}

// Simple Canvas naming - uses AI-provided canvas names

// Export simple canvas hook for managing canvas state
export function useCanvas() {
  const [isVisible, setIsVisible] = useState(false);
  const [artifacts, setArtifacts] = useState<CanvasArtifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string>();
  const [canvasName, setCanvasName] = useState<string>("Canvas");
  const [userManuallyClosed, setUserManuallyClosed] = useState(false);

  // Debug state management with detailed logging
  const debugPrefix = "🎭 useCanvas Debug:";
  const isMountedRef = useRef(true);
  const stateVersionRef = useRef(0);

  // Debug function for state changes
  const debugLog = useCallback(
    (action: string, data?: any) => {
      const version = ++stateVersionRef.current;
      console.log(`${debugPrefix} [v${version}] ${action}`, {
        isVisible,
        artifactCount: artifacts.length,
        activeArtifactId,
        userManuallyClosed,
        isMounted: isMountedRef.current,
        ...data,
      });
    },
    [isVisible, artifacts.length, activeArtifactId, userManuallyClosed],
  );

  // Lightweight memory tracking for debugging (simplified to prevent freezing)
  const memoryTracker = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `${debugPrefix} Charts: ${artifacts.length}/25 (simplified tracking)`,
      );
    }
  }, [artifacts.length, debugPrefix]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    debugLog("Canvas hook mounted");

    return () => {
      isMountedRef.current = false;
      debugLog("Canvas hook unmounting - cleanup initiated");
    };
  }, []);

  // Update canvas name when artifacts change - with safety checks
  useEffect(() => {
    if (!isMountedRef.current) {
      debugLog("Skipping canvas name update - component unmounted");
      return;
    }

    debugLog("Updating canvas name", { artifactCount: artifacts.length });

    if (artifacts.length > 0) {
      // Use canvas name from first artifact (all charts in same canvas should have same name)
      const firstArtifactCanvasName = (artifacts[0] as any)?.canvasName;
      if (firstArtifactCanvasName && firstArtifactCanvasName !== canvasName) {
        debugLog("Canvas name changed", {
          from: canvasName,
          to: firstArtifactCanvasName,
        });
        setCanvasName(firstArtifactCanvasName);
      }
    } else if (canvasName !== "Canvas") {
      debugLog("Resetting canvas name to default");
      setCanvasName("Canvas");
    }
  }, [artifacts, canvasName, debugLog]);

  const addArtifact = useCallback(
    (artifact: CanvasArtifact) => {
      if (!isMountedRef.current) {
        debugLog("Attempted to add artifact after unmount - ignoring", {
          artifactId: artifact.id,
        });
        return;
      }

      // Simple chart count check to prevent excessive memory usage
      if (artifacts.length >= 25) {
        console.warn(
          `${debugPrefix} Chart limit reached: Maximum 25 charts allowed`,
        );
        return;
      }

      if (artifacts.length >= 20) {
        console.warn(
          `${debugPrefix} Chart warning: Approaching limit (${artifacts.length}/25)`,
        );
      }

      debugLog("Adding artifact", {
        artifactId: artifact.id,
        title: artifact.title,
        type: artifact.type,
      });

      // Track memory usage
      memoryTracker();

      setArtifacts((prev) => {
        const existing = prev.find((a) => a.id === artifact.id);
        if (existing) {
          debugLog("Updating existing artifact", { artifactId: artifact.id });
          // Update existing artifact
          return prev.map((a) =>
            a.id === artifact.id ? { ...a, ...artifact } : a,
          );
        } else {
          debugLog("Adding new artifact", {
            artifactId: artifact.id,
            newTotal: prev.length + 1,
          });

          // Simple memory tracking without complex hooks
          if (process.env.NODE_ENV === "development") {
            console.log(
              `${debugPrefix} Chart added - total: ${prev.length + 1}`,
            );
          }

          // Add new artifact
          return [...prev, artifact];
        }
      });

      setActiveArtifactId(artifact.id);

      // Prevent Canvas flickering by ensuring it stays visible
      if (!isVisible) {
        debugLog("Auto-opening Canvas for new artifact", {
          artifactId: artifact.id,
        });
        setIsVisible(true);
      }
    },
    [isVisible, debugLog, memoryTracker],
  );

  const addLoadingArtifact = useCallback(
    (artifact: Omit<CanvasArtifact, "status">) => {
      if (!isMountedRef.current) {
        debugLog("Attempted to add loading artifact after unmount - ignoring", {
          artifactId: artifact.id,
        });
        return;
      }

      debugLog("Adding loading artifact", {
        artifactId: artifact.id,
        title: artifact.title,
      });
      const loadingArtifact = { ...artifact, status: "loading" as const };
      addArtifact(loadingArtifact);
    },
    [addArtifact, debugLog],
  );

  const updateArtifact = useCallback(
    (id: string, updates: Partial<CanvasArtifact>) => {
      if (!isMountedRef.current) {
        debugLog("Attempted to update artifact after unmount - ignoring", {
          artifactId: id,
        });
        return;
      }

      debugLog("Updating artifact", {
        artifactId: id,
        updates: Object.keys(updates),
      });
      setArtifacts((prev) => {
        const artifactExists = prev.find((a) => a.id === id);
        if (!artifactExists) {
          debugLog("Warning: Attempted to update non-existent artifact", {
            artifactId: id,
          });
          return prev;
        }
        return prev.map((artifact) =>
          artifact.id === id ? { ...artifact, ...updates } : artifact,
        );
      });
    },
    [debugLog],
  );

  const removeArtifact = useCallback(
    (id: string) => {
      if (!isMountedRef.current) {
        debugLog("Attempted to remove artifact after unmount - ignoring", {
          artifactId: id,
        });
        return;
      }

      debugLog("Removing artifact", { artifactId: id });
      setArtifacts((prev) => {
        const artifactExists = prev.find((a) => a.id === id);
        if (!artifactExists) {
          debugLog("Warning: Attempted to remove non-existent artifact", {
            artifactId: id,
          });
          return prev;
        }

        // Simple memory tracking for chart removal
        if (process.env.NODE_ENV === "development") {
          console.log(
            `${debugPrefix} Chart removed - total: ${prev.length - 1}`,
          );
        }

        const filtered = prev.filter((a) => a.id !== id);
        debugLog("Artifacts after removal", {
          remainingCount: filtered.length,
        });

        return filtered;
      });
    },
    [debugLog],
  );

  const closeCanvas = useCallback(() => {
    if (!isMountedRef.current) {
      debugLog("Attempted to close canvas after unmount - ignoring");
      return;
    }

    debugLog("User manually closed Canvas");
    setIsVisible(false);
    setUserManuallyClosed(true);
  }, [debugLog]);

  const showCanvas = useCallback(() => {
    if (!isMountedRef.current) {
      debugLog("Attempted to show canvas after unmount - ignoring");
      return;
    }

    debugLog("Opening Canvas", {
      previouslyVisible: isVisible,
      userHadClosed: userManuallyClosed,
    });
    setIsVisible(true);
    setUserManuallyClosed(false); // Reset manual close flag when programmatically opened
  }, [isVisible, userManuallyClosed, debugLog]);

  // Listen for show canvas events - with proper cleanup and error handling
  useEffect(() => {
    const handleShow = (event: Event) => {
      try {
        if (!isMountedRef.current) {
          debugLog("Canvas show event received after unmount - ignoring");
          return;
        }

        debugLog("User clicked 'Open Canvas' button", {
          eventType: event.type,
        });

        // Check if we have artifacts to show
        setArtifacts((prev) => {
          if (prev.length > 0) {
            debugLog("Opening Canvas - artifacts available", {
              count: prev.length,
            });
            setIsVisible(true);
            setUserManuallyClosed(false);
          } else {
            debugLog(
              "Warning: Open Canvas button clicked but no artifacts available",
            );
          }
          return prev; // Don't change artifacts
        });
      } catch (error) {
        debugLog("Error handling canvas show event", { error });
        console.error(`${debugPrefix} Error in canvas show handler:`, error);
      }
    };

    // Add error boundary for event listener
    const safeHandleShow = (event: Event) => {
      try {
        handleShow(event);
      } catch (error) {
        console.error(
          `${debugPrefix} Critical error in canvas show handler:`,
          error,
        );
      }
    };

    debugLog("Registering canvas:show event listener");
    window.addEventListener("canvas:show", safeHandleShow);

    return () => {
      debugLog("Removing canvas:show event listener");
      window.removeEventListener("canvas:show", safeHandleShow);
    };
  }, [debugLog]); // Safe dependency

  // Debug state changes with comprehensive tracking
  useEffect(() => {
    if (!isMountedRef.current) return;

    debugLog("Canvas state changed", {
      isVisible,
      artifactCount: artifacts.length,
      activeArtifactId,
      userManuallyClosed,
      canvasName,
    });

    // Track potential memory leaks
    memoryTracker();
  }, [
    isVisible,
    artifacts.length,
    activeArtifactId,
    userManuallyClosed,
    canvasName,
    debugLog,
    memoryTracker,
  ]);

  return {
    isVisible,
    artifacts,
    activeArtifactId,
    canvasName,
    userManuallyClosed,
    addArtifact,
    addLoadingArtifact,
    updateArtifact,
    removeArtifact,
    closeCanvas,
    showCanvas,
    setActiveArtifactId,
  };
}
