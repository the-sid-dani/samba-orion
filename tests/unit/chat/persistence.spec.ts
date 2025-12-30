import { describe, it, expect } from "vitest";
import { buildResponseMessageFromStreamResult } from "../../../src/app/api/chat/shared.chat";

describe("buildResponseMessageFromStreamResult", () => {
  const mockOriginalMessage = {
    id: "original-msg-id",
    role: "user" as const,
    parts: [{ type: "text" as const, text: "Hello" }],
  };

  it("should build message from result with text only", () => {
    const result = {
      id: "response-id",
      text: "Hello, how can I help?",
      steps: [{ text: "Hello, how can I help?" }],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    expect(message.role).toBe("assistant");
    expect(message.id).toBe("response-id");
    expect(message.parts).toHaveLength(1);
    expect(message.parts[0]).toEqual({
      type: "text",
      text: "Hello, how can I help?",
    });
  });

  it("should preserve tool call → result → text order from steps", () => {
    const result = {
      id: "response-id",
      steps: [
        {
          toolCalls: [
            {
              toolName: "web_search",
              toolCallId: "call-1",
              input: { query: "test" },
            },
          ],
          toolResults: [
            {
              toolName: "web_search",
              toolCallId: "call-1",
              input: { query: "test" },
              output: { results: ["result1"] },
            },
          ],
          text: "Based on my search...",
        },
      ],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    expect(message.parts).toHaveLength(2);

    // First part: tool with output
    expect(message.parts[0]).toMatchObject({
      type: "tool-web_search",
      toolCallId: "call-1",
      state: "output-available",
      input: { query: "test" },
      output: { results: ["result1"] },
    });

    // Second part: text
    expect(message.parts[1]).toEqual({
      type: "text",
      text: "Based on my search...",
    });
  });

  it("should handle multiple steps in sequence", () => {
    const result = {
      steps: [
        {
          toolCalls: [{ toolName: "tool1", toolCallId: "call-1", input: {} }],
          toolResults: [
            { toolName: "tool1", toolCallId: "call-1", output: "result1" },
          ],
          text: "Step 1 done.",
        },
        {
          toolCalls: [{ toolName: "tool2", toolCallId: "call-2", input: {} }],
          toolResults: [
            { toolName: "tool2", toolCallId: "call-2", output: "result2" },
          ],
          text: "Step 2 done.",
        },
      ],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    // Should have 4 parts: tool1, text1, tool2, text2
    expect(message.parts).toHaveLength(4);
    expect(message.parts[0]).toMatchObject({ type: "tool-tool1" });
    expect(message.parts[1]).toMatchObject({
      type: "text",
      text: "Step 1 done.",
    });
    expect(message.parts[2]).toMatchObject({ type: "tool-tool2" });
    expect(message.parts[3]).toMatchObject({
      type: "text",
      text: "Step 2 done.",
    });
  });

  it("should handle orphaned tool results (no matching call)", () => {
    const result = {
      steps: [
        {
          toolResults: [
            {
              toolName: "orphan_tool",
              toolCallId: "orphan-call",
              input: { key: "value" },
              output: "orphan result",
            },
          ],
        },
      ],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    expect(message.parts).toHaveLength(1);
    expect(message.parts[0]).toMatchObject({
      type: "tool-orphan_tool",
      toolCallId: "orphan-call",
      state: "output-available",
      input: { key: "value" },
      output: "orphan result",
    });
  });

  it("should fallback to result.text if no step text found", () => {
    const result = {
      text: "Cumulative fallback text",
      steps: [
        {
          toolCalls: [{ toolName: "test", toolCallId: "call-1", input: {} }],
          // No text in step
        },
      ],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    // Tool part + fallback text
    expect(message.parts).toHaveLength(2);
    expect(message.parts[1]).toEqual({
      type: "text",
      text: "Cumulative fallback text",
    });
  });

  it("should use originalMessage.id if result.id is missing", () => {
    const result = {
      text: "Response",
      steps: [{ text: "Response" }],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    expect(message.id).toBe("original-msg-id");
  });

  it("should handle empty steps array", () => {
    const result = {
      id: "response-id",
      text: "Just text, no steps",
      steps: [],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    expect(message.parts).toHaveLength(1);
    expect(message.parts[0]).toEqual({
      type: "text",
      text: "Just text, no steps",
    });
  });

  it("should handle MCP tools with no required params (empty input)", () => {
    const result = {
      steps: [
        {
          toolCalls: [
            { toolName: "mcp_server_status", toolCallId: "call-1", input: {} },
          ],
          toolResults: [
            {
              toolName: "mcp_server_status",
              toolCallId: "call-1",
              output: { status: "healthy" },
            },
          ],
        },
      ],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    // Should NOT filter out tools with empty input
    expect(message.parts).toHaveLength(1);
    expect(message.parts[0]).toMatchObject({
      type: "tool-mcp_server_status",
      state: "output-available",
      input: {},
    });
  });

  // Edge cases added for robustness
  it("should handle undefined steps gracefully", () => {
    const result = {
      id: "response-id",
      text: "Fallback text when no steps",
      // steps is undefined
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    expect(message.parts).toHaveLength(1);
    expect(message.parts[0]).toEqual({
      type: "text",
      text: "Fallback text when no steps",
    });
  });

  it("should handle malformed step objects without crashing", () => {
    const result = {
      id: "response-id",
      steps: [
        { text: "Valid step" },
        { toolCalls: null }, // null instead of array
        { toolResults: undefined }, // undefined
        {}, // empty step
      ],
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    // Should only have the valid text part
    expect(message.parts).toHaveLength(1);
    expect(message.parts[0]).toEqual({
      type: "text",
      text: "Valid step",
    });
  });

  it("should handle result with no text anywhere", () => {
    const result = {
      id: "response-id",
      steps: [
        {
          toolCalls: [{ toolName: "test", toolCallId: "call-1", input: {} }],
        },
      ],
      // no text property, no step.text
    };

    const message = buildResponseMessageFromStreamResult(
      result,
      mockOriginalMessage,
    );

    // Should have just the tool part, no text
    expect(message.parts).toHaveLength(1);
    expect(message.parts[0]).toMatchObject({
      type: "tool-test",
      state: "call",
    });
  });
});
