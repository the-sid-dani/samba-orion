/**
 * Auth Fixture
 *
 * Provides authentication helpers with automatic cleanup tracking.
 * Wraps common auth patterns as fixture methods.
 */

import { test as base, expect, type Page } from "@playwright/test";

// Types
type UserCredentials = {
  email: string;
  name: string;
  password: string;
};

type AuthFixture = {
  /**
   * Register a new user via UI flow.
   * Automatically tracked for cleanup.
   */
  registerUser: (
    overrides?: Partial<UserCredentials>,
  ) => Promise<UserCredentials>;

  /**
   * Select a model in the model selector.
   * Format: "provider/modelName" (e.g., "openai/gpt-4")
   */
  selectModel: (providerModel: string) => Promise<void>;

  /**
   * Login with existing storage state.
   * Use when test needs fresh login within the test.
   */
  loginWithStorage: (storagePath: string) => Promise<void>;
};

// Helper: Generate unique suffix for test data
function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Pure function: Register user via UI
async function registerViaUi(
  page: Page,
  { email, name, password }: UserCredentials,
): Promise<void> {
  await page.goto("/sign-up");

  // Step 1: Email
  await page.locator("#email").fill(email);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: Name
  await page.locator("#name").fill(name);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: Password
  await page.locator("#password").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();

  // Wait for redirect to authenticated page
  await page.waitForURL(
    (url) => {
      const urlStr = url.toString();
      return (
        !urlStr.includes("/sign-in") &&
        !urlStr.includes("/sign-up") &&
        !urlStr.includes("/auth")
      );
    },
    { timeout: 10000 },
  );

  // Verify authenticated
  const url = page.url();
  expect(url).not.toContain("/sign-in");
  expect(url).not.toContain("/sign-up");
}

// Pure function: Select model
async function selectModelInUI(
  page: Page,
  providerModel: string,
): Promise<void> {
  const [provider, modelName] = providerModel.split("/");

  if (!provider || !modelName) {
    throw new Error(
      `Invalid model format: ${providerModel}. Expected format: provider/modelName`,
    );
  }

  // Open model selector
  await page.getByTestId("model-selector-button").click();
  await expect(page.getByTestId("model-selector-popover")).toBeVisible();

  // Select model
  const modelOption = page.getByTestId(`model-option-${provider}-${modelName}`);
  await expect(modelOption).toBeVisible();
  await modelOption.click();

  // Verify closed and selected
  await expect(page.getByTestId("model-selector-popover")).not.toBeVisible();
  const selectedModel = await page
    .getByTestId("selected-model-name")
    .textContent();
  expect(selectedModel).toBe(modelName);
}

// Fixture definition
export const test = base.extend<AuthFixture>({
  registerUser: async ({ page }, use) => {
    const createdUsers: string[] = [];

    const registerUser = async (overrides: Partial<UserCredentials> = {}) => {
      const suffix = uniqueSuffix();
      const credentials: UserCredentials = {
        email: overrides.email ?? `playwright.test.${suffix}@example.com`,
        name: overrides.name ?? `Test User ${suffix}`,
        password: overrides.password ?? "TestPassword123!",
      };

      await registerViaUi(page, credentials);
      createdUsers.push(credentials.email);

      return credentials;
    };

    await use(registerUser);

    // Cleanup tracking (actual cleanup in globalTeardown)
    // Users matching playwright.* pattern are cleaned by teardown.global.ts
  },

  selectModel: async ({ page }, use) => {
    await use((providerModel: string) => selectModelInUI(page, providerModel));
  },

  loginWithStorage: async ({ context }, use) => {
    await use(async (storagePath: string) => {
      const storageState = await import(`../../../${storagePath}`);
      await context.addCookies(storageState.cookies || []);
    });
  },
});
