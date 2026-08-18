import { afterEach, describe, expect, it } from "vitest";
import {
  SEQUENTIAL_THINKING_MCP_NAME,
  sequentialThinkingAcpServer,
  sequentialThinkingClaudeServer,
  sequentialThinkingMcpEnabled,
  sequentialThinkingOpenCodeServer,
} from "./sequential-thinking-mcp.js";

describe("sequentialThinkingMcpEnabled", () => {
  const previous = process.env.PAPERCLIP_SEQUENTIAL_THINKING_MCP;

  afterEach(() => {
    if (previous === undefined) delete process.env.PAPERCLIP_SEQUENTIAL_THINKING_MCP;
    else process.env.PAPERCLIP_SEQUENTIAL_THINKING_MCP = previous;
  });

  it("defaults off under Vitest unless explicitly enabled", () => {
    delete process.env.PAPERCLIP_SEQUENTIAL_THINKING_MCP;
    expect(sequentialThinkingMcpEnabled({})).toBe(false);
  });

  it("honours an explicit enable flag on the passed env", () => {
    expect(sequentialThinkingMcpEnabled({ PAPERCLIP_SEQUENTIAL_THINKING_MCP: "1" })).toBe(true);
    expect(sequentialThinkingMcpEnabled({ PAPERCLIP_SEQUENTIAL_THINKING_MCP: "false" })).toBe(false);
  });
});

describe("sequential thinking MCP descriptors", () => {
  it("uses npx to launch the official Sequential Thinking package", () => {
    expect(sequentialThinkingOpenCodeServer()).toEqual({
      type: "local",
      command: ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
    });
    expect(sequentialThinkingClaudeServer()).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    });
    expect(sequentialThinkingAcpServer()).toMatchObject({
      type: "stdio",
      name: SEQUENTIAL_THINKING_MCP_NAME,
      command: "npx",
    });
  });
});
