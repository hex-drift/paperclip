import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

function runScript(scriptPath, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`script exited with code ${code}`));
    });
  });
}

test("removes stale LinkedIn MCP entries from shared client configs", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "shared-mcp-config-"));
  const geminiDir = path.join(home, ".gemini");
  const claudeDir = path.join(home, ".config", "Claude");
  const opencodeDir = path.join(home, ".config", "opencode");
  await Promise.all([
    mkdir(geminiDir, { recursive: true }),
    mkdir(claudeDir, { recursive: true }),
    mkdir(opencodeDir, { recursive: true }),
  ]);
  await writeFile(path.join(geminiDir, "settings.json"), JSON.stringify({
    mcpServers: { linkedin: { command: "stale" }, keep: { command: "keep" } },
  }));
  await writeFile(path.join(claudeDir, "claude_desktop_config.json"), JSON.stringify({
    mcpServers: { linkedin: { command: "stale" }, keep: { command: "keep" } },
  }));
  await writeFile(path.join(opencodeDir, "opencode.json"), JSON.stringify({
    mcp: { linkedin: { type: "local", command: ["stale"] }, keep: { type: "local", command: ["keep"] } },
  }));

  const scriptPath = new URL("./write-gcp-mcp-config.mjs", import.meta.url).pathname;
  await runScript(scriptPath, { MCP_CONFIG_HOME: home });

  const gemini = JSON.parse(await readFile(path.join(geminiDir, "settings.json"), "utf8"));
  const claude = JSON.parse(await readFile(path.join(claudeDir, "claude_desktop_config.json"), "utf8"));
  const opencode = JSON.parse(await readFile(path.join(opencodeDir, "opencode.json"), "utf8"));

  assert.equal(gemini.mcpServers.linkedin, undefined);
  assert.equal(claude.mcpServers.linkedin, undefined);
  assert.equal(opencode.mcp.linkedin, undefined);
  assert.ok(gemini.mcpServers.keep);
  assert.ok(claude.mcpServers.keep);
  assert.ok(opencode.mcp.keep);
});

test("configures the remote code-review graph and AI Gate provider", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "code-review-mcp-config-"));
  const scriptPath = new URL("./write-gcp-mcp-config.mjs", import.meta.url).pathname;

  await runScript(scriptPath, {
    MCP_CONFIG_HOME: home,
    CODE_REVIEW_GRAPH_MCP_ENABLED: "true",
    AI_GATE_BASE_URL: "https://ai-gate.example/v1",
    AI_GATE_API_KEY: "test-key",
  });

  const opencode = JSON.parse(
    await readFile(path.join(home, ".config", "opencode", "opencode.json"), "utf8"),
  );

  assert.deepEqual(opencode.mcp["code-review-graph"], {
    type: "local",
    command: ["uvx", "code-review-graph@2.3.7", "serve"],
  });
  assert.equal(opencode.provider["ai-gate"].options.baseURL, "https://ai-gate.example/v1");
  assert.equal(opencode.provider["ai-gate"].options.apiKey, "{env:AI_GATE_API_KEY}");
  assert.equal(Object.keys(opencode.provider["ai-gate"].models).length, 60);
  assert.deepEqual(opencode.provider["ai-gate"].models["claude-opus-5"], {
    provider: { npm: "@ai-sdk/anthropic" },
    name: "Claude Opus 5",
  });
  assert.deepEqual(opencode.provider["ai-gate"].models["gpt-5.6-sol"], {
    name: "GPT 5 6 Sol",
  });
  assert.deepEqual(opencode.provider["ai-gate"].models["kimi-k3-256k"], {
    name: "Kimi K3 256K",
  });
  assert.equal(JSON.stringify(opencode).includes("test-key"), false);
});
