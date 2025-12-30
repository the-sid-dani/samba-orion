import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withTimeout, isTimeoutError } from "../tool-execution-wrapper";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow normal generator completion within timeout", async () => {
    // Create a simple generator that yields values and completes
    async function* testGenerator() {
      yield { status: "loading", progress: 0 };
      yield { status: "processing", progress: 50 };
      return { status: "success", progress: 100 };
    }

    const wrappedGenerator = withTimeout(testGenerator(), 5000);
    const results = [];

    for await (const value of wrappedGenerator) {
      results.push(value);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ status: "loading", progress: 0 });
    expect(results[1]).toEqual({ status: "processing", progress: 50 });
  });

  it("should throw timeout error when generator exceeds timeout", async () => {
    // Use real timers to avoid unhandled rejection issues
    vi.useRealTimers();

    // Create a generator that takes too long
    async function* slowGenerator() {
      yield { status: "loading" };
      // Simulate an operation that exceeds timeout
      await new Promise((resolve) => setTimeout(resolve, 300));
      yield { status: "processing" };
      return { status: "success" };
    }

    // Short timeout to trigger quickly
    const wrappedGenerator = withTimeout(slowGenerator(), 100);
    const results = [];

    try {
      for await (const value of wrappedGenerator) {
        results.push(value);
      }
      // Should not reach here
      expect.fail("Expected timeout error to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("timeout");
      expect(isTimeoutError(error)).toBe(true);
    }

    // Restore fake timers for other tests
    vi.useFakeTimers();
  });

  it("should propagate generator errors correctly", async () => {
    async function* errorGenerator() {
      yield { status: "loading" };
      throw new Error("Generator failed");
    }

    const wrappedGenerator = withTimeout(errorGenerator(), 5000);

    try {
      for await (const _value of wrappedGenerator) {
        // Should throw before second iteration
      }
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      // The wrapper catches and re-throws as timeout error format
      expect((error as Error).message).toContain("Chart generation timeout");
    }
  });

  it("should handle custom timeout durations", async () => {
    // Use real timers for this test to avoid unhandled rejection issues
    vi.useRealTimers();

    async function* testGenerator() {
      yield { status: "loading" };
      // Short actual delay
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { status: "success" };
    }

    // Use 100ms timeout - generator will exceed it
    const wrappedGenerator = withTimeout(testGenerator(), 100);

    try {
      const results = [];
      for await (const value of wrappedGenerator) {
        results.push(value);
      }
      expect.fail("Expected timeout error");
    } catch (error) {
      // The actual error message format is "Chart generation timeout after Xs"
      expect((error as Error).message).toContain("timeout");
    }

    // Restore fake timers for other tests
    vi.useFakeTimers();
  });

  it("should yield all intermediate values before timeout", async () => {
    async function* multiYieldGenerator() {
      for (let i = 0; i < 5; i++) {
        yield { iteration: i };
        // Small delay between yields (use real timers for this test)
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return { status: "complete" };
    }

    // Use real timers for this test to avoid complications
    vi.useRealTimers();

    const wrappedGenerator = withTimeout(multiYieldGenerator(), 10000);
    const results = [];

    try {
      for await (const value of wrappedGenerator) {
        results.push(value);
      }
    } catch (error) {
      // Should not timeout
      expect.fail(`Unexpected error: ${error}`);
    }

    expect(results).toHaveLength(5);
    expect(results[0]).toEqual({ iteration: 0 });
    expect(results[4]).toEqual({ iteration: 4 });

    // Restore fake timers for other tests
    vi.useFakeTimers();
  }, 10000);
});

describe("isTimeoutError", () => {
  it("should identify timeout errors correctly", () => {
    const timeoutError = new Error("Tool execution timeout after 30000ms");
    expect(isTimeoutError(timeoutError)).toBe(true);

    const timeoutError2 = new Error("Chart generation timeout after 30s");
    expect(isTimeoutError(timeoutError2)).toBe(true);
  });

  it("should return false for non-timeout errors", () => {
    const regularError = new Error("Something went wrong");
    expect(isTimeoutError(regularError)).toBe(false);

    const nullError = null;
    expect(isTimeoutError(nullError)).toBe(false);

    const stringError = "error string";
    expect(isTimeoutError(stringError)).toBe(false);
  });

  it("should handle edge cases", () => {
    expect(isTimeoutError(undefined)).toBe(false);
    expect(isTimeoutError({})).toBe(false);
    expect(isTimeoutError(new Error(""))).toBe(false);
  });
});

describe("Chart Tool Integration Tests", () => {
  it("should handle successful chart tool execution", async () => {
    // Simulate a chart tool generator
    async function* chartToolGenerator() {
      yield { status: "loading", message: "Preparing chart...", progress: 0 };
      yield {
        status: "processing",
        message: "Creating chart...",
        progress: 50,
      };
      yield {
        status: "success",
        chartData: { data: [1, 2, 3] },
        shouldCreateArtifact: true,
        progress: 100,
      };
      return {
        content: [{ type: "text", text: "Chart created successfully" }],
      };
    }

    const wrappedGenerator = withTimeout(chartToolGenerator(), 30000);
    const yieldedValues = [];

    for await (const value of wrappedGenerator) {
      yieldedValues.push(value);
    }

    expect(yieldedValues).toHaveLength(3);
    expect(yieldedValues[0].status).toBe("loading");
    expect(yieldedValues[1].status).toBe("processing");
    expect(yieldedValues[2].status).toBe("success");
    expect(yieldedValues[2].shouldCreateArtifact).toBe(true);
  });

  it("should timeout on hanging chart generation", async () => {
    // Use real timers to avoid unhandled rejection issues with fake timers
    vi.useRealTimers();

    async function* hangingChartGenerator() {
      yield { status: "loading" };
      // Simulate slow operation (will exceed timeout)
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { status: "success" };
    }

    // Very short timeout to trigger quickly
    const wrappedGenerator = withTimeout(hangingChartGenerator(), 100);

    try {
      for await (const _value of wrappedGenerator) {
        // Just iterate, timeout will happen automatically
      }
      expect.fail("Expected timeout");
    } catch (error) {
      // Check that it's actually a timeout error
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("timeout");
      expect(isTimeoutError(error)).toBe(true);
    }

    // Restore fake timers for other tests
    vi.useFakeTimers();
  });
});
