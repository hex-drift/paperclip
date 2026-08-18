export type RunSessionMessage = {
  text: string;
  source: string | null;
  pluginKey: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readAgentMessage(value: unknown): RunSessionMessage | null {
  const record = asRecord(value);
  if (!record) return null;
  const text = asNonEmptyString(record.text);
  if (!text) return null;
  return {
    text,
    source: asNonEmptyString(record.source),
    pluginKey: asNonEmptyString(record.pluginKey),
  };
}

/**
 * Read the inbound plugin/session wake text from a heartbeat run snapshot.
 * Returns null when the run was not woken by a session message (typical issue runs).
 */
export function readRunSessionMessage(contextSnapshot: unknown): RunSessionMessage | null {
  const context = asRecord(contextSnapshot);
  if (!context) return null;
  return (
    readAgentMessage(context.paperclipAgentMessage) ??
    readAgentMessage(asRecord(context.paperclipWake)?.agentMessage)
  );
}
