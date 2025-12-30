"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

import { JsonViewPopup } from "../json-view-popup";
import { generateUniqueKey } from "lib/utils";
import { generateIntelligentTooltipLabels } from "./shared-tooltip-intelligence";

// SankeyChart component props interface
export interface SankeyChartProps {
  // Chart title (required)
  title: string;
  // Nodes data (required)
  nodes: Array<{
    id: string; // Node ID
    name: string; // Node display name
  }>;
  // Links data (required)
  links: Array<{
    source: string; // Source node ID
    target: string; // Target node ID
    value: number; // Flow value
  }>;
  // Chart description (optional)
  description?: string;
}

// Color scheme for sankey nodes and links
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function SankeyChart(props: SankeyChartProps) {
  const { title, nodes, links, description } = props;

  // Tooltip state for interactive hover
  const [tooltip, setTooltip] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    data: {
      type: "node" | "link";
      content: any;
    } | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });

  const deduplicateData = React.useMemo(() => {
    // Deduplicate nodes
    const nodeNames = new Map<string, string>();
    const deduplicatedNodes = nodes.reduce(
      (acc, node) => {
        const existingNames = acc.map((n) => n.name);
        const newName = generateUniqueKey(node.name, existingNames);
        nodeNames.set(node.id, newName);
        return [...acc, { ...node, name: newName }];
      },
      [] as SankeyChartProps["nodes"],
    );

    // Update links with deduplicated node references
    const deduplicatedLinks = links.map((link) => ({
      ...link,
      sourceName: nodeNames.get(link.source) || link.source,
      targetName: nodeNames.get(link.target) || link.target,
    }));

    return { nodes: deduplicatedNodes, links: deduplicatedLinks };
  }, [nodes, links]);

  // Generate chart configuration
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    deduplicateData.nodes.forEach((node, index) => {
      config[node.id] = {
        label: node.name,
        color: chartColors[index % chartColors.length],
      };
    });

    return config;
  }, [deduplicateData.nodes]);

  // Calculate layout for simplified sankey visualization
  const layout = React.useMemo(() => {
    const { nodes: nodeData, links: linkData } = deduplicateData;

    // Simple layout algorithm - arrange nodes in columns based on connections
    const nodePositions = new Map();
    const nodeColumns = new Map();

    // Find source nodes (nodes with no incoming links)
    const sourceNodes = nodeData.filter(
      (node) => !linkData.some((link) => link.target === node.id),
    );

    // Find sink nodes (nodes with no outgoing links)
    const sinkNodes = nodeData.filter(
      (node) => !linkData.some((link) => link.source === node.id),
    );

    // Assign columns
    sourceNodes.forEach((node) => nodeColumns.set(node.id, 0));
    sinkNodes.forEach((node) => nodeColumns.set(node.id, 2));

    // Middle nodes get column 1
    nodeData.forEach((node) => {
      if (!nodeColumns.has(node.id)) {
        nodeColumns.set(node.id, 1);
      }
    });

    // Calculate positions
    const columnWidth = 300;
    const nodeHeight = 40;
    const nodeSpacing = 60;

    const columnCounts = [0, 0, 0];
    nodeData.forEach((node) => {
      const col = nodeColumns.get(node.id);
      const row = columnCounts[col];
      nodePositions.set(node.id, {
        x: col * columnWidth + 50,
        y: row * nodeSpacing + 50,
        width: 150,
        height: nodeHeight,
        column: col,
      });
      columnCounts[col]++;
    });

    return { nodePositions, linkData };
  }, [deduplicateData]);

  // Custom SVG-based sankey visualization
  const SankeyVisualization = React.useCallback(() => {
    const { nodePositions } = layout;
    const maxX = Math.max(
      ...Array.from(nodePositions.values()).map((p) => p.x + p.width),
    );
    const maxY = Math.max(
      ...Array.from(nodePositions.values()).map((p) => p.y + p.height),
    );

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${maxX + 100} ${maxY + 100}`}
      >
        {/* Render links */}
        {deduplicateData.links.map((link, index) => {
          const sourcePos = nodePositions.get(link.source);
          const targetPos = nodePositions.get(link.target);

          if (!sourcePos || !targetPos) return null;

          const sourceX = sourcePos.x + sourcePos.width;
          const sourceY = sourcePos.y + sourcePos.height / 2;
          const targetX = targetPos.x;
          const targetY = targetPos.y + targetPos.height / 2;

          const controlX1 = sourceX + (targetX - sourceX) * 0.6;
          const controlX2 = targetX - (targetX - sourceX) * 0.6;

          const pathData = `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY} ${controlX2} ${targetY} ${targetX} ${targetY}`;

          return (
            <g key={`link-${index}`}>
              <path
                d={pathData}
                stroke={`var(--chart-${(index % 5) + 1})`}
                strokeWidth={Math.max(3, Math.min(8, link.value / 5))}
                fill="none"
                opacity={0.7}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    data: {
                      type: "link",
                      content: {
                        source: link.sourceName || link.source,
                        target: link.targetName || link.target,
                        value: link.value,
                      },
                    },
                  });
                }}
                onMouseLeave={() => {
                  setTooltip((prev) => ({ ...prev, visible: false }));
                }}
                onMouseMove={(e) => {
                  setTooltip((prev) => ({
                    ...prev,
                    x: e.clientX,
                    y: e.clientY,
                  }));
                }}
              />
              {/* Link label - Enhanced visibility */}
              <text
                x={(sourceX + targetX) / 2}
                y={(sourceY + targetY) / 2 - 10}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight="bold"
                style={{
                  pointerEvents: "none",
                  textShadow:
                    "0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)",
                }}
              >
                {link.value.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Render nodes */}
        {deduplicateData.nodes.map((node, index) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const nodeConnections = deduplicateData.links.filter(
            (link) => link.source === node.id || link.target === node.id,
          );
          const totalInflow = deduplicateData.links
            .filter((link) => link.target === node.id)
            .reduce((sum, link) => sum + link.value, 0);
          const totalOutflow = deduplicateData.links
            .filter((link) => link.source === node.id)
            .reduce((sum, link) => sum + link.value, 0);

          return (
            <g key={node.id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.width}
                height={pos.height}
                fill={`var(--chart-${(index % 5) + 1})`}
                stroke="hsl(var(--border))"
                strokeWidth="2"
                rx="6"
                opacity={0.9}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    data: {
                      type: "node",
                      content: {
                        name: node.name,
                        connections: nodeConnections.length,
                        inflow: totalInflow,
                        outflow: totalOutflow,
                      },
                    },
                  });
                }}
                onMouseLeave={() => {
                  setTooltip((prev) => ({ ...prev, visible: false }));
                }}
                onMouseMove={(e) => {
                  setTooltip((prev) => ({
                    ...prev,
                    x: e.clientX,
                    y: e.clientY,
                  }));
                }}
              />
              <text
                x={pos.x + pos.width / 2}
                y={pos.y + pos.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fill="white"
                fontWeight="bold"
                style={{ pointerEvents: "none" }}
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }, [layout, deduplicateData, setTooltip]);

  // Custom tooltip component with intelligent labeling
  const CustomTooltip = React.useMemo(() => {
    if (!tooltip.visible || !tooltip.data) return null;

    const { type, content } = tooltip.data;

    // Generate intelligent tooltip labels based on chart context
    const intelligentLabels = generateIntelligentTooltipLabels({
      title,
      description,
      chartType: "sankey",
    });

    return (
      <div
        className="rounded-lg border bg-background p-2 shadow-sm pointer-events-none z-50 fixed"
        style={{
          left: tooltip.x + 10,
          top: tooltip.y - 10,
        }}
      >
        {type === "link" ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {intelligentLabels.flowLabel}
              </span>
              <span className="font-bold text-muted-foreground">
                {content.source} → {content.target}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {intelligentLabels.valueLabel}
              </span>
              <span className="font-bold">
                {content.value.toLocaleString()}
                {intelligentLabels.unitSuffix}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {intelligentLabels.categoryLabel}
              </span>
              <span className="font-bold text-muted-foreground">
                {content.name}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Connections
              </span>
              <span className="font-bold">{content.connections}</span>
            </div>
            {content.inflow > 0 && (
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Inflow
                </span>
                <span className="font-bold">
                  {content.inflow.toLocaleString()}
                  {intelligentLabels.unitSuffix}
                </span>
              </div>
            )}
            {content.outflow > 0 && (
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Outflow
                </span>
                <span className="font-bold">
                  {content.outflow.toLocaleString()}
                  {intelligentLabels.unitSuffix}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [tooltip, title, description]);

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex flex-col gap-1 relative pb-1 flex-shrink-0">
        <CardTitle className="flex items-center text-sm">
          Sankey Chart - {title}
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
            <div className="w-full h-full flex items-center justify-center relative">
              <SankeyVisualization />
              {CustomTooltip}
            </div>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
