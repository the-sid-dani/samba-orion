/**
 * Cost calculation utilities for LLM usage tracking in Langfuse
 */

import type { LanguageModelUsage } from "ai";

// Model pricing per 1K tokens (approximate rates as of 2024)
const MODEL_PRICING = {
  openai: {
    "gpt-4.1": { input: 0.03, output: 0.06 },
    "gpt-4.1-mini": { input: 0.015, output: 0.03 },
    "o4-mini": { input: 0.015, output: 0.03 },
    o3: { input: 0.06, output: 0.12 },
    "gpt-5": { input: 0.06, output: 0.12 },
    "gpt-5-mini": { input: 0.015, output: 0.03 },
    "gpt-5-nano": { input: 0.001, output: 0.002 },
  },
  anthropic: {
    "claude-4.5-opus": { input: 0.015, output: 0.075 },
    "claude-4.5-sonnet": { input: 0.003, output: 0.015 },
    "claude-4-sonnet": { input: 0.003, output: 0.015 },
    "claude-4-opus": { input: 0.015, output: 0.075 },
    "claude-3-7-sonnet": { input: 0.003, output: 0.015 },
  },
  google: {
    "gemini-2.5-flash-lite": { input: 0.0001, output: 0.0002 },
    "gemini-2.5-flash": { input: 0.0005, output: 0.001 },
    "gemini-2.5-pro": { input: 0.003, output: 0.015 },
  },
  xai: {
    "grok-4": { input: 0.005, output: 0.01 },
    "grok-3": { input: 0.003, output: 0.006 },
    "grok-3-mini": { input: 0.001, output: 0.002 },
  },
  ollama: {
    // Local models have no cost
    "gemma3:1b": { input: 0, output: 0 },
    "gemma3:4b": { input: 0, output: 0 },
    "gemma3:12b": { input: 0, output: 0 },
  },
  openRouter: {
    // OpenRouter pricing varies, using approximate averages
    "qwen3-8b:free": { input: 0, output: 0 }, // Free tier
    "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  },
} as const;

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  currency: string;
  provider: string;
  model: string;
}

/**
 * Calculate cost for LLM usage based on provider and model
 */
export function calculateLLMCost(
  usage: LanguageModelUsage,
  provider: string,
  model: string,
): CostCalculation {
  // Get pricing for the provider/model
  const providerPricing = MODEL_PRICING[provider as keyof typeof MODEL_PRICING];
  const modelPricing = providerPricing?.[model as keyof typeof providerPricing];

  // If no pricing available, default to zero cost
  if (!modelPricing) {
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      inputTokens:
        (usage as any).promptTokens || (usage as any).inputTokens || 0,
      outputTokens:
        (usage as any).completionTokens || (usage as any).outputTokens || 0,
      totalTokens: usage.totalTokens || 0,
      currency: "USD",
      provider,
      model,
    };
  }

  const inputTokens =
    (usage as any).promptTokens || (usage as any).inputTokens || 0;
  const outputTokens =
    (usage as any).completionTokens || (usage as any).outputTokens || 0;
  const totalTokens = usage.totalTokens || inputTokens + outputTokens;

  // Calculate costs (pricing is per 1K tokens)
  const inputCost = (inputTokens / 1000) * (modelPricing as any).input;
  const outputCost = (outputTokens / 1000) * (modelPricing as any).output;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
    inputTokens,
    outputTokens,
    totalTokens,
    currency: "USD",
    provider,
    model,
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number, currency: string = "USD"): string {
  if (cost === 0) return "Free";
  if (cost < 0.001) return `< $0.001`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 6,
  }).format(cost);
}

/**
 * Get approximate cost per hour for a given model
 * Useful for cost monitoring and budgeting
 */
export function getModelHourlyCostEstimate(
  provider: string,
  model: string,
  tokensPerHour: number = 100000, // Default estimate
): number {
  const providerPricing = MODEL_PRICING[provider as keyof typeof MODEL_PRICING];
  const modelPricing = providerPricing?.[model as keyof typeof providerPricing];

  if (!modelPricing) return 0;

  // Assume 70/30 split between input/output tokens
  const inputTokens = tokensPerHour * 0.7;
  const outputTokens = tokensPerHour * 0.3;

  const inputCost = (inputTokens / 1000) * (modelPricing as any).input;
  const outputCost = (outputTokens / 1000) * (modelPricing as any).output;

  return Number((inputCost + outputCost).toFixed(4));
}
