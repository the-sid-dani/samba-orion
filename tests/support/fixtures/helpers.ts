/**
 * Pure Helper Functions
 *
 * Framework-agnostic utilities. Used by fixtures and can be imported directly.
 * These functions are testable without Playwright running.
 */

import type { Page } from "@playwright/test";

/**
 * Generate a unique test name with timestamp and random string.
 * Use for creating unique test data that won't collide.
 */
export function uniqueTestName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique email for test users.
 */
export function uniqueEmail(prefix = "test"): string {
  const suffix =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `playwright.${prefix}.${suffix}@example.com`;
}

/**
 * Click an element and wait for navigation.
 * Use Promise.all pattern to prevent race conditions.
 */
export async function clickAndWaitForNavigation(
  page: Page,
  selector: string,
  urlPattern: string | RegExp,
  options = { timeout: 10000 },
): Promise<void> {
  await Promise.all([
    page.waitForURL(urlPattern, options),
    page.getByTestId(selector).click(),
  ]);
}

/**
 * Open a dropdown and return the menu element.
 * Handles shadcn/radix dropdown timing.
 */
export async function openDropdown(
  page: Page,
  buttonSelector: string,
  menuSelector = '[role="menu"]',
  timeout = 5000,
): Promise<ReturnType<Page["locator"]>> {
  const button = page.getByTestId(buttonSelector);
  await button.click();

  const menu = page.locator(menuSelector);
  await menu.waitFor({ state: "visible", timeout });
  return menu;
}

/**
 * Select an option from an open dropdown menu.
 */
export async function selectDropdownOption(
  page: Page,
  optionSelector: string,
  timeout = 5000,
): Promise<void> {
  const option = page.getByTestId(optionSelector);
  await option.waitFor({ state: "visible", timeout });
  await option.click();
  await option.waitFor({ state: "hidden", timeout });
}

/**
 * Retry an async operation with exponential backoff.
 * Use for flaky operations that may need retries.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {},
): Promise<T> {
  const { retries = 3, delay = 1000 } = options;

  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}
