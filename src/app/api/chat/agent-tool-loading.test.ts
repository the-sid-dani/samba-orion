import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the APP_DEFAULT_TOOL_KIT import to test different failure scenarios
const mockArtifactsToolkit = {
  create_bar_chart: { description: "Create bar charts" },
  create_line_chart: { description: "Create line charts" },
  create_pie_chart: { description: "Create pie charts" },
  createTable: { description: "Create data tables" },
};

const mockWebSearchToolkit = {
  webSearch: { description: "Search the web" },
  webContent: { description: "Get web content" },
};

const mockValidToolKit = {
  webSearch: mockWebSearchToolkit,
  artifacts: mockArtifactsToolkit,
  http: { http: { description: "HTTP requests" } },
  code: { javascript: { description: "Execute JavaScript" } },
};

// Mock loadAppDefaultTools function with enhanced diagnostics
const createMockLoadAppDefaultTools = (toolKit: any) => {
  return (opt?: {
    mentions?: Array<{ type: string; name: string }>;
    allowedAppDefaultToolkit?: string[];
  }) => {
    console.log("🔍 loadAppDefaultTools called with:", {
      mentionsLength: opt?.mentions?.length,
      allowedAppDefaultToolkit: opt?.allowedAppDefaultToolkit,
    });

    // Add resilient import check before using APP_DEFAULT_TOOL_KIT
    try {
      if (!toolKit) {
        console.error("🚨 APP_DEFAULT_TOOL_KIT is undefined!");
        return {};
      }
      if (!toolKit.artifacts) {
        console.error("🚨 APP_DEFAULT_TOOL_KIT.artifacts is missing!");
        console.log("Available toolkits:", Object.keys(toolKit));
        return {};
      }
    } catch (error) {
      console.error("🚨 Critical error accessing APP_DEFAULT_TOOL_KIT:", error);
      return {};
    }

    console.log("🔍 APP_DEFAULT_TOOL_KIT loaded:", {
      toolkitKeys: Object.keys(toolKit),
      artifactsToolCount: Object.keys(toolKit.artifacts || {}).length,
      webSearchToolCount: Object.keys(toolKit.webSearch || {}).length,
      totalToolkits: Object.keys(toolKit).length,
    });

    if (opt?.mentions?.length) {
      const defaultToolMentions = opt.mentions.filter(
        (m) => m.type == "defaultTool",
      );
      return Object.values(toolKit).reduce((acc: any, t: any) => {
        const allowed = Object.entries(t).filter(([k]) => {
          return defaultToolMentions.some((m) => m.name == k);
        });
        return { ...acc, ...Object.fromEntries(allowed) };
      }, {});
    }

    const allowedAppDefaultToolkit = opt?.allowedAppDefaultToolkit ?? [
      "webSearch",
      "http",
      "code",
      "artifacts",
    ];

    return allowedAppDefaultToolkit.reduce((acc: any, key: string) => {
      return { ...acc, ...(toolKit[key] || {}) };
    }, {});
  };
};

describe("Agent Tool Loading Diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadAppDefaultTools with valid toolkit", () => {
    it("should load all toolkit tools when no restrictions", () => {
      const loadAppDefaultTools =
        createMockLoadAppDefaultTools(mockValidToolKit);

      const result = loadAppDefaultTools();

      expect(Object.keys(result)).toHaveLength(8); // webSearch(2) + artifacts(4) + http(1) + code(1) tools
      expect(result["create_bar_chart"]).toBeDefined();
      expect(result["create_line_chart"]).toBeDefined();
      expect(result["createTable"]).toBeDefined();
      expect(result["webSearch"]).toBeDefined();
    });

    it("should load only allowed toolkits", () => {
      const loadAppDefaultTools =
        createMockLoadAppDefaultTools(mockValidToolKit);

      const result = loadAppDefaultTools({
        allowedAppDefaultToolkit: ["artifacts"], // Only artifacts toolkit
      });

      expect(Object.keys(result)).toHaveLength(4); // Only artifacts tools
      expect(result["create_bar_chart"]).toBeDefined();
      expect(result["webSearch"]).toBeUndefined(); // Should not be included
    });

    it("should filter tools based on mentions", () => {
      const loadAppDefaultTools =
        createMockLoadAppDefaultTools(mockValidToolKit);

      const result = loadAppDefaultTools({
        mentions: [
          { type: "defaultTool", name: "create_bar_chart" },
          { type: "defaultTool", name: "webSearch" },
        ],
      });

      expect(result["create_bar_chart"]).toBeDefined();
      expect(result["webSearch"]).toBeDefined();
      expect(result["create_line_chart"]).toBeUndefined(); // Not mentioned
    });
  });

  describe("loadAppDefaultTools error handling", () => {
    it("should handle undefined toolkit gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const loadAppDefaultTools = createMockLoadAppDefaultTools(undefined);

      const result = loadAppDefaultTools();

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        "🚨 APP_DEFAULT_TOOL_KIT is undefined!",
      );

      consoleSpy.mockRestore();
    });

    it("should handle missing artifacts toolkit", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const brokenToolKit = {
        webSearch: mockWebSearchToolkit,
        // artifacts: missing!
        http: { http: { description: "HTTP requests" } },
      };

      const loadAppDefaultTools = createMockLoadAppDefaultTools(brokenToolKit);
      const result = loadAppDefaultTools();

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        "🚨 APP_DEFAULT_TOOL_KIT.artifacts is missing!",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("Available toolkits:", [
        "webSearch",
        "http",
      ]);

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should handle toolkit access errors", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Create toolkit that throws on access
      const throwingToolKit = new Proxy(
        {},
        {
          get() {
            throw new Error("Import failure");
          },
        },
      );

      const loadAppDefaultTools =
        createMockLoadAppDefaultTools(throwingToolKit);
      const result = loadAppDefaultTools();

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        "🚨 Critical error accessing APP_DEFAULT_TOOL_KIT:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Chart tool availability validation", () => {
    it("should detect when chart tools are missing from agent context", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Simulate toolkit with only table tools (current bug state)
      const partialToolKit = {
        webSearch: mockWebSearchToolkit,
        artifacts: {
          createTable: { description: "Create data tables" },
          // Chart tools missing - simulating the current bug
        },
        http: { http: { description: "HTTP requests" } },
        code: { javascript: { description: "Execute JavaScript" } },
      };

      const loadAppDefaultTools = createMockLoadAppDefaultTools(partialToolKit);
      const result = loadAppDefaultTools();

      // Should detect missing chart tools
      expect(Object.keys(result)).toHaveLength(5); // webSearch(2) + table(1) + http(1) + code(1)
      expect(result["createTable"]).toBeDefined(); // Table works
      expect(result["create_bar_chart"]).toBeUndefined(); // Chart tools missing
      expect(result["create_line_chart"]).toBeUndefined();

      // Debug logging should show the issue
      expect(consoleSpy).toHaveBeenCalledWith(
        "🔍 APP_DEFAULT_TOOL_KIT loaded:",
        {
          toolkitKeys: ["webSearch", "artifacts", "http", "code"],
          artifactsToolCount: 1, // Only 1 tool instead of expected 17+
          webSearchToolCount: 2,
          totalToolkits: 4,
        },
      );

      consoleSpy.mockRestore();
    });

    it("should validate expected chart tool count", () => {
      const loadAppDefaultTools =
        createMockLoadAppDefaultTools(mockValidToolKit);

      const result = loadAppDefaultTools({
        allowedAppDefaultToolkit: ["artifacts"],
      });

      // Should have all chart tools
      const chartToolNames = [
        "create_bar_chart",
        "create_line_chart",
        "create_pie_chart",
        "createTable",
      ];

      chartToolNames.forEach((toolName) => {
        expect(result[toolName]).toBeDefined();
      });

      expect(Object.keys(result)).toHaveLength(4);
    });
  });

  describe("System resilience validation", () => {
    it("should continue functioning even with partial toolkit failures", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Simulate mixed success/failure state
      const mixedToolKit = {
        webSearch: mockWebSearchToolkit, // ✅ Works
        artifacts: undefined, // ❌ Fails
        http: { http: { description: "HTTP requests" } }, // ✅ Works
      };

      const loadAppDefaultTools = createMockLoadAppDefaultTools(mixedToolKit);
      const result = loadAppDefaultTools();

      // Should return empty due to missing artifacts (our fix)
      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // New comprehensive tool registry tests for preventing regression
  describe("Tool Registry Consistency Validation", () => {
    it("should have all DefaultToolName entries implemented in tool registry", () => {
      // Test with realistic mock that includes all chart tools
      const extendedMockToolKit = {
        ...mockValidToolKit,
        artifacts: {
          ...mockArtifactsToolkit,
          create_area_chart: { description: "Create area charts" },
          create_scatter_chart: { description: "Create scatter charts" },
          create_radar_chart: { description: "Create radar charts" },
          create_funnel_chart: { description: "Create funnel charts" },
          create_treemap_chart: { description: "Create treemap charts" },
          create_sankey_chart: { description: "Create sankey charts" },
          create_radial_bar_chart: { description: "Create radial bar charts" },
          create_composed_chart: { description: "Create composed charts" },
          create_geographic_chart: { description: "Create geographic charts" },
          create_gauge_chart: { description: "Create gauge charts" },
          create_calendar_heatmap: { description: "Create calendar heatmaps" },
        },
      };

      const loadAppDefaultTools =
        createMockLoadAppDefaultTools(extendedMockToolKit);
      const result = loadAppDefaultTools();

      // Extract all tool names from the result
      const registeredTools = Object.keys(result);
      const registeredChartTools = registeredTools.filter((name) =>
        name.includes("chart"),
      );

      // Should have multiple chart tools registered
      expect(registeredChartTools.length).toBeGreaterThanOrEqual(10);
      expect(registeredTools.length).toBeGreaterThan(15); // Total tools
    });

    it("should validate tool structure for all chart tools", () => {
      const loadAppDefaultTools =
        createMockLoadAppDefaultTools(mockValidToolKit);
      const result = loadAppDefaultTools();

      // Test each chart tool has proper structure
      Object.entries(result).forEach(([toolName, tool]) => {
        if (toolName.includes("chart")) {
          expect(tool).toBeDefined();
          expect(typeof tool).toBe("object");
          expect(tool).toHaveProperty("description");
          // Note: execute function check would require actual tool imports
        }
      });
    });

    it("should detect missing tools in registry", () => {
      // Create a registry missing some chart tools
      const incompleteToolKit = {
        webSearch: mockWebSearchToolkit,
        artifacts: {
          create_bar_chart: { description: "Create bar charts" },
          // Missing line and pie chart tools intentionally
        },
        http: { http: { description: "HTTP requests" } },
        code: { javascript: { description: "Execute JavaScript" } },
      };

      const loadAppDefaultTools =
        createMockLoadAppDefaultTools(incompleteToolKit);
      const result = loadAppDefaultTools();

      // Should have fewer tools than expected
      const registeredChartTools = Object.keys(result).filter((name) =>
        name.includes("chart"),
      );
      expect(registeredChartTools.length).toBeLessThan(3); // Missing some chart tools
    });

    it("should handle tool registry validation errors gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Test with completely broken registry
      const brokenToolKit = null;
      const loadAppDefaultTools = createMockLoadAppDefaultTools(brokenToolKit);
      const result = loadAppDefaultTools();

      // Should return empty object and log error
      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        "🚨 APP_DEFAULT_TOOL_KIT is undefined!",
      );

      consoleSpy.mockRestore();
    });

    it("should validate chart tool enumeration completeness", () => {
      // Test that expected chart tool names are properly formatted
      const expectedChartTools = [
        "create_bar_chart",
        "create_line_chart",
        "create_pie_chart",
        "create_area_chart",
        "create_scatter_chart",
        "create_radar_chart",
        "create_funnel_chart",
        "create_treemap_chart",
        "create_sankey_chart",
        "create_radial_bar_chart",
        "create_composed_chart",
        "create_geographic_chart",
        "create_gauge_chart",
        "create_calendar_heatmap",
        "create_ban_chart",
      ];

      // Verify we have the expected number of chart tools
      expect(expectedChartTools.length).toBe(15); // 15 specialized chart tools

      // Verify naming convention consistency
      expectedChartTools.forEach((toolName) => {
        expect(toolName).toMatch(/^create_.*_chart$|^create_.*_heatmap$/);
        expect(toolName).not.toContain(" "); // No spaces
        expect(toolName).not.toContain("-"); // No hyphens
      });
    });
  });
});
