# Test Fixtures

Composable Playwright fixtures following TEA (Test Engineering Architecture) patterns.

## Quick Start

```typescript
// ❌ Old way
import { test, expect } from "@playwright/test";

// ✅ New way
import { test, expect } from "../support/fixtures";
```

## Available Fixtures

### `network` — Deterministic Waits

Replace `waitForLoadState('networkidle')` with explicit API waits:

```typescript
// ❌ Flaky (arbitrary 500ms idle detection)
await page.goto("/dashboard");
await page.waitForLoadState("networkidle");

// ✅ Deterministic (waits for specific response)
const response = await network.gotoAndWait("/dashboard", { url: "/api/users" });
expect(response.status()).toBe(200);
```

#### Methods

| Method | Description |
|--------|-------------|
| `waitForApi({ url, status? })` | Register wait BEFORE action |
| `gotoAndWait(path, { url })` | Navigate + wait in one call |
| `waitForLoaded(selector?)` | Wait for loading indicator to disappear |
| `waitForAll([...])` | Wait for multiple APIs in parallel |
| `mock(url, response)` | Mock API response |

### `api` — API Helpers

Make typed API requests for test setup:

```typescript
// Create test data via API (faster than UI)
const { data } = await api.post<{ id: string }>("/api/agents", {
  name: "Test Agent",
  description: "Created via API",
});

// Navigate to created resource
await page.goto(`/agent/${data.id}`);
```

### `auth` — Authentication

```typescript
// Register new user (automatically tracked for cleanup)
const user = await registerUser({ name: "Custom Name" });

// Select model
await selectModel("openai/gpt-4");
```

## Migration Guide

### Step 1: Update imports

```diff
- import { test, expect } from "@playwright/test";
+ import { test, expect } from "../support/fixtures";
```

### Step 2: Replace networkidle waits

```diff
  test("loads dashboard", async ({ page }) => {
-   await page.goto("/dashboard");
-   await page.waitForLoadState("networkidle");
+   await page.goto("/dashboard");
+   // Wait for specific API that indicates page is ready
+   await page.waitForResponse((r) => r.url().includes("/api/agents"));
  });

  // Or use the network fixture:
- test("loads dashboard", async ({ page }) => {
+ test("loads dashboard", async ({ page, network }) => {
-   await page.goto("/dashboard");
-   await page.waitForLoadState("networkidle");
+   await network.gotoAndWait("/dashboard", { url: "/api/agents" });
  });
```

### Step 3: Use fixtures for test setup

```diff
- test("creates agent", async ({ page }) => {
-   await page.goto("/agent/new");
-   await page.getByTestId("agent-name-input").fill("Test Agent");
-   // ... more UI interactions
+ test("edits existing agent", async ({ page, api }) => {
+   // Create via API (fast!)
+   const { data: agent } = await api.post("/api/agents", { name: "Test" });
+   
+   // Test the actual feature
+   await page.goto(`/agent/${agent.id}`);
  });
```

## File Structure

```
tests/support/fixtures/
├── index.ts           # Merged exports (import from here)
├── auth.fixture.ts    # Authentication helpers
├── api.fixture.ts     # API request helpers
├── network.fixture.ts # Network wait patterns
├── helpers.ts         # Pure utility functions
└── README.md          # This file
```

## Adding New Fixtures

1. Create `your-feature.fixture.ts`
2. Export `test` with your fixture
3. Add to `index.ts` mergeTests call
4. Document in this README

