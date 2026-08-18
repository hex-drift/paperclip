import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
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

test("writes an isolated LinkedIn MCP profile into the requested config home", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "linkedin-mcp-config-"));
  const userDataDir = path.join(home, "linkedin-profile");
  const traceDir = path.join(userDataDir, "trace-runs");
  const browserDir = path.join(home, ".cache", "patchright-browsers");
  const scriptPath = new URL("./write-linkedin-mcp-config.mjs", import.meta.url).pathname;

  await runScript(scriptPath, {
    MCP_CONFIG_HOME: home,
    LINKEDIN_USER_DATA_DIR: userDataDir,
    LINKEDIN_USER_AGENT: "Mozilla/5.0 Test Chrome/150.0.0.0",
  });

  const config = JSON.parse(
    await readFile(path.join(home, ".config", "opencode", "opencode.json"), "utf8"),
  );

  assert.deepEqual(config.mcp.linkedin, {
    type: "local",
    command: ["uvx", "mcp-server-linkedin@latest"],
    environment: {
      USER_DATA_DIR: userDataDir,
      LINKEDIN_DEBUG_TRACE_DIR: traceDir,
      PLAYWRIGHT_BROWSERS_PATH: browserDir,
      USER_AGENT: "Mozilla/5.0 Test Chrome/150.0.0.0",
    },
  });
});
