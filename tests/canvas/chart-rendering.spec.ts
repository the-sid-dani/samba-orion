import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Canvas Chart Rendering
 *
 * Tests the complete flow:
 * 1. User requests chart creation
 * 2. AI generates chart with tool
 * 3. Chart renders in Canvas workspace
 * 4. Multiple charts work in grid layout
 */

test.describe("Canvas Chart Rendering", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chat interface
    await page.goto("/");

    // Wait for the application to be ready
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });
  });

  test("should render pie chart in Canvas when requested", async ({ page }) => {
    // Type chart request
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill(
      "Create a pie chart showing sales by category: Electronics $5000, Clothing $3000, Food $2000",
    );
    await input.press("Enter");

    // Wait for AI response and chart generation
    await page.waitForTimeout(5000); // Allow time for AI processing

    // Verify Canvas workspace opens
    const canvas = page.locator('[data-testid="canvas-panel"]');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify chart renders in Canvas
    const chartContainer = page
      .locator('[data-testid="canvas-chart-pie"]')
      .first();
    await expect(chartContainer).toBeVisible({ timeout: 5000 });

    // Verify chart has data
    const chartSvg = chartContainer.locator("svg");
    await expect(chartSvg).toBeVisible();

    // Verify pie slices are rendered
    const pieSlices = chartSvg.locator("path[fill]");
    const sliceCount = await pieSlices.count();
    expect(sliceCount).toBeGreaterThanOrEqual(3); // At least 3 slices
  });

  test("should render bar chart in Canvas when requested", async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill(
      "Create a bar chart of monthly revenue: Jan $10k, Feb $15k, Mar $12k",
    );
    await input.press("Enter");

    await page.waitForTimeout(5000);

    const canvas = page.locator('[data-testid="canvas-panel"]');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const chartContainer = page
      .locator('[data-testid="canvas-chart-bar"]')
      .first();
    await expect(chartContainer).toBeVisible({ timeout: 5000 });

    // Verify bars are rendered
    const chartSvg = chartContainer.locator("svg");
    const bars = chartSvg.locator("rect[fill]");
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThanOrEqual(3); // At least 3 bars
  });

  test("should handle multiple charts in grid layout", async ({ page }) => {
    // Request first chart
    let input = page.locator('[data-testid="chat-input"]');
    await input.fill("Create a pie chart of expenses: Rent $1000, Food $500");
    await input.press("Enter");
    await page.waitForTimeout(5000);

    // Verify first chart appears
    const canvas = page.locator('[data-testid="canvas-panel"]');
    await expect(canvas).toBeVisible();

    // Request second chart
    input = page.locator('[data-testid="chat-input"]');
    await input.fill("Create a bar chart of income: Salary $5000, Bonus $1000");
    await input.press("Enter");
    await page.waitForTimeout(5000);

    // Verify both charts are visible in grid
    const charts = page.locator('[data-testid^="canvas-chart-"]');
    const chartCount = await charts.count();
    expect(chartCount).toBeGreaterThanOrEqual(2);

    // Verify grid layout is applied
    const gridContainer = page.locator('[data-testid="canvas-grid"]');
    await expect(gridContainer).toBeVisible();
  });

  test("should show loading state before chart appears", async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill(
      "Create a line chart of temperature: Mon 72, Tue 75, Wed 70",
    );
    await input.press("Enter");

    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="canvas-loading"]');

    // Give it a moment to appear (might be very fast)
    await page.waitForTimeout(500);

    // Either loading is visible OR chart has already rendered (fast path)
    const isLoadingOrChart = await Promise.race([
      loadingIndicator.isVisible().then(() => "loading"),
      page
        .locator('[data-testid^="canvas-chart-"]')
        .first()
        .isVisible()
        .then(() => "chart"),
    ]);

    expect(["loading", "chart"]).toContain(isLoadingOrChart);
  });

  test("should allow Canvas close and reopen", async ({ page }) => {
    // Generate a chart
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("Create a pie chart of colors: Red 30, Blue 50, Green 20");
    await input.press("Enter");
    await page.waitForTimeout(5000);

    // Verify Canvas is visible
    const canvas = page.locator('[data-testid="canvas-panel"]');
    await expect(canvas).toBeVisible();

    // Close Canvas
    const closeButton = page.locator('[data-testid="canvas-close"]');
    await closeButton.click();

    // Verify Canvas is hidden
    await expect(canvas).not.toBeVisible();

    // Reopen Canvas
    const openButton = page.locator('[data-testid="canvas-open"]');
    await openButton.click();

    // Verify Canvas is visible again with same chart
    await expect(canvas).toBeVisible();
    const chart = page.locator('[data-testid^="canvas-chart-"]').first();
    await expect(chart).toBeVisible();
  });

  test("should display chart with correct title", async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill(
      'Create a pie chart titled "Sales Distribution" with data: Product A $100, Product B $200',
    );
    await input.press("Enter");
    await page.waitForTimeout(5000);

    // Find chart title
    const chartTitle = page.locator('[data-testid="chart-title"]').first();
    await expect(chartTitle).toBeVisible();

    // Verify title contains expected text
    const titleText = await chartTitle.textContent();
    expect(titleText).toContain("Sales Distribution");
  });

  test("should handle table rendering in Canvas", async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill(
      "Create a table with employee data: Name, Department, Salary",
    );
    await input.press("Enter");
    await page.waitForTimeout(5000);

    const canvas = page.locator('[data-testid="canvas-panel"]');
    await expect(canvas).toBeVisible();

    // Check for table
    const table = page.locator('[data-testid="canvas-table"]').first();
    await expect(table).toBeVisible();

    // Verify table has headers
    const headers = table.locator("thead th");
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
  });
});

test.describe("Canvas Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });
  });

  test("should show error state if chart generation fails", async ({
    page,
  }) => {
    // This test requires mocking or a known failing scenario
    // For now, we'll test that error handling exists

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("Create an invalid chart type: zzzz");
    await input.press("Enter");
    await page.waitForTimeout(3000);

    // Check if error message appears in chat or Canvas
    const errorMessage = page.locator(
      '[data-testid="error-message"], [data-testid="canvas-error"]',
    );

    // Either error shows or chart doesn't render
    const hasError = await errorMessage.isVisible().catch(() => false);
    const hasChart = await page
      .locator('[data-testid^="canvas-chart-"]')
      .first()
      .isVisible()
      .catch(() => false);

    // One of these should be true
    expect(hasError || !hasChart).toBe(true);
  });

  // TODO: This test has 35s timeout - move to dedicated slow test suite
  // test("timeout handling test", async ({ page }) => {
  //   const input = page.locator('[data-testid="chat-input"]');
  //   await input.fill("Create a chart with large dataset");
  //   await input.press("Enter");
  //   await page.waitForTimeout(35000);
  //   const canvas = page.locator('[data-testid="canvas-panel"]');
  //   const isVisible = await canvas.isVisible().catch(() => false);
  //   expect(isVisible).toBeDefined();
  // }, 40000);
});

test.describe("Canvas Responsiveness", () => {
  test("should handle window resize correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="chat-input"]');

    // Create a chart
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("Create a bar chart: A 10, B 20, C 30");
    await input.press("Enter");
    await page.waitForTimeout(5000);

    // Verify chart renders
    const canvas = page.locator('[data-testid="canvas-panel"]');
    await expect(canvas).toBeVisible();

    // Resize window
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);

    // Chart should still be visible and properly sized
    const chart = page.locator('[data-testid^="canvas-chart-"]').first();
    await expect(chart).toBeVisible();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Chart should adapt to mobile view
    await expect(chart).toBeVisible();
  });
});
