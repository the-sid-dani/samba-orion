import { test, expect } from "../support/fixtures";

test.describe("Agent Access Spec", () => {
  test.use({ storageState: "tests/.auth/user1.json" });

  test("should access agents page when authenticated", async ({
    page,
    network,
  }) => {
    // Deterministic: wait for agents API instead of networkidle
    await network.gotoAndWait("/agents", { url: "/api/agents" });

    // Should stay on agents page
    expect(page.url()).toContain("/agents");

    // Should see agents page content
    await expect(page.getByTestId("agents-title")).toBeVisible();
  });

  test("should navigate to new agent page", async ({ page }) => {
    await page.goto("/agent/new");

    // Wait for form to be interactive (no API call needed for new page)
    await expect(page.getByTestId("agent-name-input")).toBeVisible();

    // Should be on the new agent page
    expect(page.url()).toContain("/agent/new");
  });

  test("should have sidebar with agent list", async ({ page, network }) => {
    // Home page loads user data and agents for sidebar
    await network.gotoAndWait("/", { url: "/api/agents" });

    // Should have sidebar with agents section
    const agentsLink = page.locator('a[href="/agents"]');
    await expect(agentsLink).toBeVisible();
  });
});
