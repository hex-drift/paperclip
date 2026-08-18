import { describe, expect, it } from "vitest";

import { readRunSessionMessage } from "./run-session-message";

describe("readRunSessionMessage", () => {
  it("returns null for missing or unusable snapshots", () => {
    expect(readRunSessionMessage(null)).toBeNull();
    expect(readRunSessionMessage(undefined)).toBeNull();
    expect(readRunSessionMessage("wake")).toBeNull();
    expect(readRunSessionMessage({ wakeReason: "timer", issueId: "issue-1" })).toBeNull();
  });

  it("reads the canonical paperclipAgentMessage payload", () => {
    expect(
      readRunSessionMessage({
        wakeReason: "gateway_chat_message",
        paperclipAgentMessage: {
          text: "  а який агент у тебе саме більше навантажений ?  ",
          source: "plugin_session",
          pluginKey: "paperclip-plugin-telegram",
          sessionId: "session-1",
        },
      }),
    ).toEqual({
      text: "а який агент у тебе саме більше навантажений ?",
      source: "plugin_session",
      pluginKey: "paperclip-plugin-telegram",
    });
  });

  it("falls back to paperclipWake.agentMessage when the canonical field is absent", () => {
    expect(
      readRunSessionMessage({
        paperclipWake: {
          agentMessage: {
            text: "hello from slack",
            source: "plugin_session",
            pluginKey: "paperclip-plugin-slack",
          },
        },
      }),
    ).toEqual({
      text: "hello from slack",
      source: "plugin_session",
      pluginKey: "paperclip-plugin-slack",
    });
  });

  it("prefers paperclipAgentMessage over the nested wake copy", () => {
    expect(
      readRunSessionMessage({
        paperclipAgentMessage: {
          text: "canonical",
          pluginKey: "paperclip-plugin-telegram",
        },
        paperclipWake: {
          agentMessage: {
            text: "nested",
            pluginKey: "other",
          },
        },
      }),
    ).toEqual({
      text: "canonical",
      source: null,
      pluginKey: "paperclip-plugin-telegram",
    });
  });

  it("ignores payloads without a non-empty text field", () => {
    expect(
      readRunSessionMessage({
        paperclipAgentMessage: { source: "plugin_session", pluginKey: "paperclip-plugin-telegram" },
      }),
    ).toBeNull();
    expect(
      readRunSessionMessage({
        paperclipAgentMessage: { text: "   " },
      }),
    ).toBeNull();
    expect(
      readRunSessionMessage({
        paperclipWake: { agentMessage: { text: "" } },
      }),
    ).toBeNull();
  });
});
