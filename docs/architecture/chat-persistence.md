# Chat Persistence Contract & Debugging Checklist

## Contract Highlights

- **Assistant messages must never persist with `parts = []`**. The API synthesizes a textual placeholder when the model yields no tool or text output.
- **Tool-only turns persist normalized tool parts**. Tool messages retain `toolCallId`, use `state: "output-available"`, and mark `providerExecuted: true` so Canvas replay and Langfuse telemetry remain intact after reload.
- **Error turns are durable**. When generation fails we upsert the triggering user message plus an assistant stub that carries `metadata.errorInfo` and a short textual banner for the UI.
- **Thread identifiers stay stable**. The client only rewrites the URL after the first successful persistence and logs any path/request mismatch to aid diagnosis.
- **Operational counters**: look for `assistant_empty_parts_prevented`, `tool_parts_normalized_from_empty_input`, and `onerror_persisted_stub` in structured logs to confirm the protections are firing.

## Debugging Checklist

1. **Check counters**: filter application logs by the counter names above with `threadId`/`messageId` to locate drops.
2. **Inspect stored messages**: verify `chat_message.parts` contains either text parts or normalized tool parts with `providerExecuted = true`.
3. **Replay locally**: `pnpm test tests/unit/chat/persistence.spec.ts` exercises text-only, tool-only, and error paths using mocked repositories.
4. **Backfill history**: run `pnpm db:migrate` to execute `0020_chat_assistant_empty_parts_patch.sql` in environments that predate this fix.
5. **Manual QA**: follow the three scenarios in the Execute Prompt (text, tool, invalid args) and confirm history survives a hard refresh.
