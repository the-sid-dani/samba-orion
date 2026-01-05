/**
 * Merged Test Fixtures
 *
 * Central export for all test fixtures. Import this instead of @playwright/test.
 *
 * Usage:
 *   import { test, expect } from '../support/fixtures';
 *
 * Available fixtures:
 *   - auth: Login helpers, user factory
 *   - api: Typed API request helpers
 *   - network: Deterministic wait helpers (replaces networkidle)
 */

import { mergeTests } from "@playwright/test";
import { test as authFixture } from "./auth.fixture";
import { test as apiFixture } from "./api.fixture";
import { test as networkFixture } from "./network.fixture";

// Merge all fixtures into single test export
export const test = mergeTests(authFixture, apiFixture, networkFixture);

// Re-export expect and types
export { expect } from "@playwright/test";
export type { Page, BrowserContext, APIRequestContext } from "@playwright/test";
