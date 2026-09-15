import { describe, expect, it } from "vitest";
import {
  INSTANCE_DEFAULT_MAX_CONCURRENT_HOST_RUNS,
  isHostProcessAdapterType,
  resolveMaxConcurrentHostRuns,
} from "./constants.js";

describe("host-process run cap", () => {
  it("treats local CLIs and process adapters as host-backed", () => {
    expect(isHostProcessAdapterType("process")).toBe(true);
    expect(isHostProcessAdapterType("opencode_local")).toBe(true);
    expect(isHostProcessAdapterType("claude_local")).toBe(true);
    expect(isHostProcessAdapterType("paperclip_runner")).toBe(true);
    expect(isHostProcessAdapterType("external_cli")).toBe(true);
  });

  it("excludes remote and cloud adapters", () => {
    expect(isHostProcessAdapterType("http")).toBe(false);
    expect(isHostProcessAdapterType("cursor_cloud")).toBe(false);
    expect(isHostProcessAdapterType("hermes_gateway")).toBe(false);
    expect(isHostProcessAdapterType("openclaw_gateway")).toBe(false);
  });

  it("defaults to 12 concurrent host runs and treats 0 as unlimited", () => {
    expect(resolveMaxConcurrentHostRuns({})).toBe(INSTANCE_DEFAULT_MAX_CONCURRENT_HOST_RUNS);
    expect(resolveMaxConcurrentHostRuns({ PAPERCLIP_MAX_CONCURRENT_HOST_RUNS: "" })).toBe(
      INSTANCE_DEFAULT_MAX_CONCURRENT_HOST_RUNS,
    );
    expect(resolveMaxConcurrentHostRuns({ PAPERCLIP_MAX_CONCURRENT_HOST_RUNS: "nope" })).toBe(
      INSTANCE_DEFAULT_MAX_CONCURRENT_HOST_RUNS,
    );
    expect(resolveMaxConcurrentHostRuns({ PAPERCLIP_MAX_CONCURRENT_HOST_RUNS: "0" })).toBe(0);
    expect(resolveMaxConcurrentHostRuns({ PAPERCLIP_MAX_CONCURRENT_HOST_RUNS: "3" })).toBe(3);
  });
});
