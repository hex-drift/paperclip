/**
 * Built-in Sequential Thinking MCP for Paperclip-launched agent runs.
 *
 * Sequential Thinking is a local stdio MCP (`npx -y @modelcontextprotocol/server-sequential-thinking`).
 * It has no credentials and no side effects; it only gives the model a structured scratchpad.
 * Paperclip injects it into every local adapter that supports MCP so operators do not have to
 * install it per company via Apps / MCP governance.
 *
 * Disable with PAPERCLIP_SEQUENTIAL_THINKING_MCP=0 (or false/off/no).
 * Vitest defaults to off so existing adapter MCP assertions stay byte-stable unless a test opts in.
 */

export const SEQUENTIAL_THINKING_MCP_NAME = "sequential-thinking";
export const SEQUENTIAL_THINKING_MCP_PACKAGE = "@modelcontextprotocol/server-sequential-thinking";
export const SEQUENTIAL_THINKING_MCP_COMMAND = "npx";
export const SEQUENTIAL_THINKING_MCP_ARGS = ["-y", SEQUENTIAL_THINKING_MCP_PACKAGE] as const;

function readEnvFlag(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> | undefined,
  key: string,
): string | undefined {
  const value = env?.[key] ?? process.env[key];
  return typeof value === "string" ? value.trim() : undefined;
}

export function sequentialThinkingMcpEnabled(
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
): boolean {
  const raw = readEnvFlag(env, "PAPERCLIP_SEQUENTIAL_THINKING_MCP")?.toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") return true;
  // Keep unit tests from picking up the production default unless they opt in.
  if (process.env.VITEST) return false;
  return true;
}

export function sequentialThinkingOpenCodeServer(): {
  type: "local";
  command: string[];
} {
  return {
    type: "local",
    command: [SEQUENTIAL_THINKING_MCP_COMMAND, ...SEQUENTIAL_THINKING_MCP_ARGS],
  };
}

export function sequentialThinkingClaudeServer(): {
  command: string;
  args: string[];
} {
  return {
    command: SEQUENTIAL_THINKING_MCP_COMMAND,
    args: [...SEQUENTIAL_THINKING_MCP_ARGS],
  };
}

export function sequentialThinkingAcpServer(): {
  type: "stdio";
  name: string;
  command: string;
  args: string[];
  env: Array<{ name: string; value: string }>;
} {
  return {
    type: "stdio",
    name: SEQUENTIAL_THINKING_MCP_NAME,
    command: SEQUENTIAL_THINKING_MCP_COMMAND,
    args: [...SEQUENTIAL_THINKING_MCP_ARGS],
    env: [],
  };
}
