/**
 * Network Fixture
 *
 * Deterministic network waiting patterns. Use these instead of networkidle.
 *
 * Key principle: Register interception BEFORE navigation, then await response.
 */

import {
  test as base,
  expect,
  type Page,
  type Response,
} from "@playwright/test";

// Types
type WaitForApiOptions = {
  /** URL pattern to match (string or regex) */
  url: string | RegExp;
  /** Expected HTTP status (default: 200) */
  status?: number;
  /** Timeout in ms (default: 15000) */
  timeout?: number;
};

type NetworkFixture = {
  network: {
    /**
     * Wait for a specific API response after navigation/action.
     * Replaces waitForLoadState('networkidle').
     *
     * @example
     * // Register BEFORE navigation
     * const waitForUsers = network.waitForApi({ url: '/api/users' });
     * await page.goto('/dashboard');
     * const response = await waitForUsers;
     */
    waitForApi: (options: WaitForApiOptions) => Promise<Response>;

    /**
     * Navigate and wait for specific API response in one call.
     * Handles intercept-before-navigate pattern automatically.
     *
     * @example
     * const response = await network.gotoAndWait('/dashboard', { url: '/api/users' });
     */
    gotoAndWait: (
      path: string,
      options: WaitForApiOptions,
    ) => Promise<Response>;

    /**
     * Wait for loading indicator to disappear.
     * Use when page has spinner/skeleton UI.
     *
     * @example
     * await page.goto('/dashboard');
     * await network.waitForLoaded();
     */
    waitForLoaded: (selector?: string) => Promise<void>;

    /**
     * Wait for multiple API responses in parallel.
     *
     * @example
     * const [users, agents] = await network.waitForAll([
     *   { url: '/api/users' },
     *   { url: '/api/agents' }
     * ]);
     */
    waitForAll: (options: WaitForApiOptions[]) => Promise<Response[]>;

    /**
     * Mock an API response before navigation.
     *
     * @example
     * await network.mock('/api/users', { users: [] });
     * await page.goto('/dashboard');
     */
    mock: (url: string, response: unknown, status?: number) => Promise<void>;
  };
};

// Pure function: Create response waiter
function createResponseWaiter(
  page: Page,
  options: WaitForApiOptions,
): Promise<Response> {
  const { url, status = 200, timeout = 15000 } = options;

  return page.waitForResponse(
    (resp) => {
      const urlMatch =
        typeof url === "string"
          ? resp.url().includes(url)
          : url.test(resp.url());
      return urlMatch && resp.status() === status;
    },
    { timeout },
  );
}

// Fixture definition
export const test = base.extend<NetworkFixture>({
  network: async ({ page }, use) => {
    const mockedRoutes: string[] = [];

    const networkHelper = {
      waitForApi: (options: WaitForApiOptions) => {
        return createResponseWaiter(page, options);
      },

      gotoAndWait: async (path: string, options: WaitForApiOptions) => {
        // Register BEFORE navigation (critical!)
        const responsePromise = createResponseWaiter(page, options);

        // Navigate
        await page.goto(path);

        // Await response
        return responsePromise;
      },

      waitForLoaded: async (selector = '[data-testid="loading"]') => {
        // Wait for loading indicator to disappear
        const loading = page.locator(selector);

        // First check if it exists, then wait for it to disappear
        const isVisible = await loading.isVisible().catch(() => false);
        if (isVisible) {
          await expect(loading).not.toBeVisible({ timeout: 15000 });
        }
      },

      waitForAll: async (options: WaitForApiOptions[]) => {
        const promises = options.map((opt) => createResponseWaiter(page, opt));
        return Promise.all(promises);
      },

      mock: async (url: string, response: unknown, status = 200) => {
        await page.route(`**${url}`, (route) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(response),
          }),
        );
        mockedRoutes.push(url);
      },
    };

    await use(networkHelper);

    // Cleanup mocked routes
    for (const url of mockedRoutes) {
      await page.unroute(`**${url}`).catch(() => {});
    }
  },
});
