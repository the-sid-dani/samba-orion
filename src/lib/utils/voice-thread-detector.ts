import { ChatMessage } from "app-types/chat";

/**
 * Detect if a thread contains voice messages
 * Checks first message for voice source metadata
 * Works with any message array type
 */
export function isVoiceThread(messages: unknown[]): boolean {
  if (!messages || messages.length === 0) return false;

  // Check if first message has voice source
  const firstMessage = messages[0] as { metadata?: { source?: string } };
  return firstMessage?.metadata?.source === "voice";
}

/**
 * Get voice-specific metadata from thread
 * Provides detailed voice thread information
 */
export function getVoiceThreadMetadata(messages: ChatMessage[]) {
  const voiceMessages = messages.filter((m) => m.metadata?.source === "voice");

  return {
    isVoiceThread: voiceMessages.length > 0,
    voiceMessageCount: voiceMessages.length,
    totalMessageCount: messages.length,
    firstVoiceAt: voiceMessages[0]?.createdAt,
    hasCharts: messages.some((m) =>
      m.parts.some(
        (p) =>
          typeof p.type === "string" &&
          (p.type.includes("chart") || p.type.includes("table")),
      ),
    ),
    hasTools: messages.some((m) =>
      m.parts.some(
        (p) => typeof p.type === "string" && p.type.startsWith("tool-"),
      ),
    ),
  };
}

/**
 * Check if thread has mixed voice and text messages
 * Useful for hybrid conversation handling
 */
export function isHybridThread(messages: ChatMessage[]): boolean {
  const voiceCount = messages.filter(
    (m) => m.metadata?.source === "voice",
  ).length;
  const totalCount = messages.length;

  return voiceCount > 0 && voiceCount < totalCount;
}
