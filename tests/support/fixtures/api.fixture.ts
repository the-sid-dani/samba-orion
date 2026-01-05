/**
 * API Fixture
 *
 * Typed API request helpers for test setup and assertions.
 * Use for API-first test data creation (faster than UI).
 */

import { test as base, type APIRequestContext } from "@playwright/test";

// Types
type ApiRequestParams = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  data?: unknown;
  headers?: Record<string, string>;
  expectedStatus?: number;
};

type ApiResponse<T = unknown> = {
  status: number;
  data: T;
  ok: boolean;
};

type ApiFixture = {
  /**
   * Make an API request with automatic base URL and error handling.
   *
   * @example
   * const { data } = await api.request({
   *   method: 'POST',
   *   endpoint: '/api/agents',
   *   data: { name: 'Test Agent' },
   *   expectedStatus: 201
   * });
   */
  api: {
    request: <T = unknown>(params: ApiRequestParams) => Promise<ApiResponse<T>>;
    get: <T = unknown>(endpoint: string) => Promise<ApiResponse<T>>;
    post: <T = unknown>(
      endpoint: string,
      data: unknown,
    ) => Promise<ApiResponse<T>>;
    put: <T = unknown>(
      endpoint: string,
      data: unknown,
    ) => Promise<ApiResponse<T>>;
    delete: <T = unknown>(endpoint: string) => Promise<ApiResponse<T>>;
  };
};

// Pure function: Make API request
async function makeApiRequest<T>(
  request: APIRequestContext,
  baseUrl: string,
  params: ApiRequestParams,
): Promise<ApiResponse<T>> {
  const { method, endpoint, data, headers = {}, expectedStatus } = params;
  const url = `${baseUrl}${endpoint}`;

  const response = await request.fetch(url, {
    method,
    data,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  const status = response.status();
  let responseData: T;

  try {
    responseData = await response.json();
  } catch {
    responseData = (await response.text()) as unknown as T;
  }

  // Validate expected status if provided
  if (expectedStatus !== undefined && status !== expectedStatus) {
    throw new Error(
      `API ${method} ${endpoint} returned ${status}, expected ${expectedStatus}. Response: ${JSON.stringify(responseData)}`,
    );
  }

  return {
    status,
    data: responseData,
    ok: response.ok(),
  };
}

// Fixture definition
export const test = base.extend<ApiFixture>({
  api: async ({ request }, use) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const apiHelper = {
      request: <T>(params: ApiRequestParams) =>
        makeApiRequest<T>(request, baseUrl, params),

      get: <T>(endpoint: string) =>
        makeApiRequest<T>(request, baseUrl, { method: "GET", endpoint }),

      post: <T>(endpoint: string, data: unknown) =>
        makeApiRequest<T>(request, baseUrl, { method: "POST", endpoint, data }),

      put: <T>(endpoint: string, data: unknown) =>
        makeApiRequest<T>(request, baseUrl, { method: "PUT", endpoint, data }),

      delete: <T>(endpoint: string) =>
        makeApiRequest<T>(request, baseUrl, { method: "DELETE", endpoint }),
    };

    await use(apiHelper);
  },
});
