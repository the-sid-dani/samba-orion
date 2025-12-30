"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { createPortal } from "react-dom";
import type {
  ComposableMapProps,
  GeographiesProps,
  GeographyProps,
} from "react-simple-maps";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

import { generateUniqueKey } from "lib/utils";
import { JsonViewPopup } from "../json-view-popup";
import { sanitizeCssVariableName } from "./shared.tool-invocation";

// Dynamic import for react-simple-maps with proper typing to avoid SSR issues
const ComposableMap = dynamic<ComposableMapProps>(
  () => import("react-simple-maps").then((mod) => mod.ComposableMap),
  { ssr: false },
);

const Geographies = dynamic<GeographiesProps>(
  () => import("react-simple-maps").then((mod) => mod.Geographies),
  { ssr: false },
);

const Geography = dynamic<GeographyProps>(
  () => import("react-simple-maps").then((mod) => mod.Geography),
  { ssr: false },
);

// GeographicChart component props interface
export interface GeographicChartProps {
  // Chart title (required)
  title: string;
  // Chart data array (required)
  data: Array<{
    regionCode: string; // Region identifier
    regionName: string; // Region name
    value: number; // Numeric value
  }>;
  // Geography type (required)
  geoType: "world" | "usa-states" | "usa-dma" | "usa-counties";
  // Color scale (optional)
  colorScale?: "blues" | "reds" | "greens" | "viridis";
  // Chart description (optional)
  description?: string;
}

// State code mappings: FIPS to postal codes for US states
const fipsToPostalCode: { [key: string]: string } = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
};

// Color variables for geographic data visualization using ChartConfig system like other charts
const chartColors = [
  "var(--chart-1)", // Darkest blue
  "var(--chart-2)", // Dark blue
  "var(--chart-3)", // Medium blue
  "var(--chart-4)", // Light blue
  "var(--chart-5)", // Lightest blue
];

// GeoJSON URLs for different geography types - now using local files
const geoDataUrls = {
  world: "/geo/world-countries-110m.json",
  "usa-states": "/geo/us-states-10m.json",
  "usa-counties": "/geo/us-counties-10m.json",
  "usa-dma": "/geo/nielsentopo.json",
};

/**
 * Extract meaningful value label from chart title and description (UX-optimized)
 * Examples: "Sales by Region" → "Sales", "Population Growth" → "Population"
 */
const extractValueLabel = (title: string, description?: string): string => {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Common data type patterns with intelligent recognition
  // IMPORTANT: Order matters! Most specific patterns first to avoid generic matches
  const patterns = [
    { keywords: ["audience", "viewers", "users", "visits"], label: "Audience" },
    {
      keywords: ["market", "share", "percentage", "percent"],
      label: "Market Share",
    },
    {
      keywords: ["growth", "increase", "rate", "change"],
      label: "Growth Rate",
    },
    { keywords: ["sales", "revenue", "income", "earnings"], label: "Sales" },
    {
      keywords: ["population", "people", "residents", "inhabitants"],
      label: "Population",
    },
    { keywords: ["budget", "spending", "cost", "expense"], label: "Budget" },
    { keywords: ["score", "rating", "index", "rank"], label: "Score" },
    { keywords: ["gdp", "economic", "economy"], label: "GDP" },
    { keywords: ["temperature", "weather", "climate"], label: "Temperature" },
    // Generic patterns last (fallback only)
    { keywords: ["count", "number", "total", "quantity"], label: "Count" },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some((keyword) => text.includes(keyword))) {
      return pattern.label;
    }
  }

  // Fallback: try to extract first meaningful word from title
  const titleWords = title
    .split(" ")
    .filter(
      (word) =>
        word.length > 2 &&
        !["by", "in", "of", "the", "and", "for"].includes(word.toLowerCase()),
    );

  return titleWords.length > 0 ? titleWords[0] : "Value";
};

/**
 * Get appropriate region label based on geographic type (UX-optimized)
 */
const getRegionLabel = (geoType: GeographicChartProps["geoType"]): string => {
  const labelMap = {
    world: "Country",
    "usa-states": "State",
    "usa-counties": "County",
    "usa-dma": "Market Area",
  };

  return labelMap[geoType] || "Region";
};

export function GeographicChart(props: GeographicChartProps) {
  const { title, data, geoType, description } = props;

  const [geoData, setGeoData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tooltip, setTooltip] = React.useState<{
    name: string;
    value: number | undefined;
    x: number;
    y: number;
  } | null>(null);

  const deduplicateData = React.useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const names = acc.map((item) => item.regionName);
        const newRegionName = generateUniqueKey(item.regionName, names);
        return [
          ...acc,
          {
            ...item,
            regionName: newRegionName,
          },
        ];
      },
      [] as GeographicChartProps["data"],
    );
  }, [data]);

  // Value ranges for proper blue gradient mapping
  const valueRanges = React.useMemo(() => {
    const values = deduplicateData.map((d) => d.value);
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    };
  }, [deduplicateData]);

  // Create region code to value mapping with flexible code matching
  const regionValues = React.useMemo(() => {
    const mapping: { [key: string]: number } = {};

    deduplicateData.forEach((item) => {
      const code = item.regionCode.toUpperCase();
      // Store by original code
      mapping[code] = item.value;

      // For US states, also store by FIPS code if we have a postal code
      if (geoType === "usa-states") {
        // If it's a 2-letter postal code, find corresponding FIPS
        if (code.length === 2) {
          const fipsCode = Object.entries(fipsToPostalCode).find(
            ([_, postal]) => postal === code,
          )?.[0];
          if (fipsCode) {
            mapping[fipsCode] = item.value;
          }
        }
        // If it's a FIPS code, also store by postal code
        else if (fipsToPostalCode[code]) {
          mapping[fipsToPostalCode[code]] = item.value;
        }
      }
    });

    return mapping;
  }, [deduplicateData, geoType]);

  // Fetch geographic data
  React.useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = geoDataUrls[geoType];
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch geographic data: ${response.statusText}`,
          );
        }

        const data = await response.json();

        // Log debugging info for development
        if (process.env.NODE_ENV === "development") {
          console.log(`Geographic data loaded for ${geoType}:`, {
            type: geoType,
            hasArcs: !!data.arcs,
            hasObjects: !!data.objects,
            objectKeys: data.objects ? Object.keys(data.objects) : [],
            dataLength: Array.isArray(data) ? data.length : "not array",
          });

          // Log sample region codes from the data
          if (data.objects?.states?.geometries) {
            const sampleRegions = data.objects.states.geometries
              .slice(0, 3)
              .map((geo: any) => ({
                id: geo.id,
                name: geo.properties?.name,
                fipsCode: geo.id,
                postalCode: fipsToPostalCode[geo.id],
              }));
            console.log("Sample regions from geographic data:", sampleRegions);
          }

          // Log our region values mapping
          console.log("Region values mapping:", regionValues);
        }

        setGeoData(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load geographic data";
        setError(message);
        console.error("Geographic chart error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, [geoType]);

  // Generate chart configuration following bar chart pattern with gradient mapping
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    const { minValue, maxValue } = valueRanges;

    // Configure regions with values, mapping them to the blue gradient based on value
    deduplicateData.forEach((item) => {
      // Map value to color index (0 = darkest blue, 4 = lightest blue)
      let colorIndex;
      if (minValue === maxValue) {
        colorIndex = 2; // Use middle blue for single value
      } else {
        const normalized = (item.value - minValue) / (maxValue - minValue);
        colorIndex = Math.min(
          Math.floor(normalized * chartColors.length),
          chartColors.length - 1,
        );
        colorIndex = chartColors.length - 1 - colorIndex; // Reverse: high values = dark blue (index 0)
      }

      config[sanitizeCssVariableName(item.regionCode)] = {
        label: item.regionName,
        color: chartColors[colorIndex],
      };
    });

    return config;
  }, [deduplicateData, valueRanges]);

  const renderMap = () => {
    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Loading geographic data...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-destructive text-sm text-center">
            <div>Failed to load geographic data</div>
            <div className="text-xs text-muted-foreground mt-1">{error}</div>
          </div>
        </div>
      );
    }

    if (!geoData) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-muted-foreground">
            No geographic data available
          </div>
        </div>
      );
    }

    // Determine projection based on geography type
    const getProjection = () => {
      switch (geoType) {
        case "world":
          return "geoNaturalEarth1";
        case "usa-states":
        case "usa-counties":
        case "usa-dma":
          return "geoAlbersUsa";
        default:
          return "geoNaturalEarth1";
      }
    };

    return (
      <ComposableMap
        projection={getProjection()}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoData}>
          {({ geographies }: any) =>
            geographies.map((geo: any) => {
              // Enhanced region code mapping for different geography types
              let regionCode = "";
              let value: number | undefined;

              switch (geoType) {
                case "usa-states":
                  // For US states, use FIPS code (geo.id) as primary
                  regionCode = geo.id;
                  value = regionValues[regionCode];

                  // If no value found, try postal code lookup
                  if (value === undefined && regionCode) {
                    const postalCode = fipsToPostalCode[regionCode];
                    if (postalCode) {
                      value = regionValues[postalCode];
                    }
                  }

                  // Fallback to property-based matching
                  if (value === undefined) {
                    const fallbackCode =
                      geo.properties?.STUSPS || geo.properties?.NAME;
                    if (fallbackCode) {
                      value = regionValues[fallbackCode.toUpperCase()];
                    }
                  }
                  break;

                case "usa-counties":
                  regionCode = geo.properties?.NAME || geo.id;
                  value = regionValues[regionCode];
                  break;

                case "usa-dma":
                  regionCode =
                    geo.properties?.NAME || geo.properties?.name || geo.id;
                  value = regionValues[regionCode];
                  break;

                case "world":
                  // For world map, try ISO codes and names
                  regionCode =
                    geo.properties?.ISO_A2 ||
                    geo.properties?.NAME ||
                    geo.properties?.name ||
                    geo.id;
                  value = regionValues[regionCode];
                  break;

                default:
                  regionCode =
                    geo.id || geo.properties?.NAME || geo.properties?.name;
                  value = regionValues[regionCode];
              }

              // Debug and use direct color mapping for now
              let fillColor;
              if (value !== undefined) {
                // Calculate color directly using value-based gradient
                const { minValue, maxValue } = valueRanges;
                let colorIndex;
                if (minValue === maxValue) {
                  colorIndex = 2; // Use middle blue for single value
                } else {
                  const normalized = (value - minValue) / (maxValue - minValue);
                  colorIndex = Math.min(
                    Math.floor(normalized * chartColors.length),
                    chartColors.length - 1,
                  );
                  colorIndex = chartColors.length - 1 - colorIndex; // Reverse: high values = dark blue
                }
                fillColor = chartColors[colorIndex];
              } else {
                fillColor = "rgba(255, 255, 255, 0.5)"; // Much lighter grey for no data
              }

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fillColor}
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth={1}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      fill: fillColor, // Keep same color, no hover effect
                      outline: "none",
                      cursor: value !== undefined ? "pointer" : "default",
                      stroke: "rgba(255, 255, 255, 0.6)",
                      strokeWidth: value !== undefined ? 1.5 : 1,
                    },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(event) => {
                    const stateName =
                      geo.properties?.name ||
                      geo.properties?.NAME ||
                      regionCode;

                    // Enhanced coordinate calculation with fallback
                    let x = event.clientX;
                    let y = event.clientY;

                    // Fallback if clientX/clientY are not available
                    if (x === undefined || y === undefined) {
                      const rect = event.currentTarget.getBoundingClientRect();
                      x = rect.left + rect.width / 2;
                      y = rect.top + rect.height / 2;
                    }

                    setTooltip({
                      name: stateName,
                      value: value,
                      x: x,
                      y: y,
                    });
                  }}
                  onMouseMove={(event) => {
                    // Enhanced coordinate calculation with fallback
                    let x = event.clientX;
                    let y = event.clientY;

                    // Fallback if clientX/clientY are not available
                    if (x === undefined || y === undefined) {
                      const rect = event.currentTarget.getBoundingClientRect();
                      x = rect.left + rect.width / 2;
                      y = rect.top + rect.height / 2;
                    }

                    if (tooltip) {
                      setTooltip((prev) =>
                        prev
                          ? {
                              ...prev,
                              x: x,
                              y: y,
                            }
                          : null,
                      );
                    }
                  }}
                  onMouseLeave={() => {
                    setTooltip(null);
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    );
  };

  return (
    <Card className="bg-card h-full flex flex-col relative">
      <CardHeader className="flex flex-col gap-1 relative pb-1 flex-shrink-0">
        <CardTitle className="flex items-center text-sm">
          Geographic Chart - {title}
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
          <div className="w-full h-full">{renderMap()}</div>
        </ChartContainer>
      </CardContent>

      {/* Custom Tooltip - Portal-based rendering with clean design */}
      {tooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-50 rounded-lg border bg-background p-2 shadow-sm pointer-events-none text-xs"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 10,
              transform: "translate(-50%, -100%)",
            }}
            data-testid="geographic-tooltip"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="text-[0.60rem] uppercase text-muted-foreground">
                  {getRegionLabel(geoType)}
                </span>
                <span className="font-bold text-muted-foreground text-xs">
                  {tooltip.name}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.60rem] uppercase text-muted-foreground">
                  {extractValueLabel(title, description)}
                </span>
                <span className="font-bold text-xs">
                  {tooltip.value !== undefined
                    ? tooltip.value.toLocaleString()
                    : "No data"}
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Card>
  );
}
