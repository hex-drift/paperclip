#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const home = process.env.MCP_CONFIG_HOME || "/home/agent";
const userDataDir = process.env.LINKEDIN_USER_DATA_DIR || path.join(home, ".linkedin-mcp");
const userAgent = process.env.LINKEDIN_USER_AGENT;
const traceDir = process.env.LINKEDIN_DEBUG_TRACE_DIR || path.join(userDataDir, "trace-runs");
const browserDir = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(home, ".cache", "patchright-browsers");
const opencodeDir = path.join(home, ".config", "opencode");

function readJsonObject(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

fs.mkdirSync(opencodeDir, { recursive: true });
fs.mkdirSync(userDataDir, { recursive: true });
fs.mkdirSync(traceDir, { recursive: true });
fs.mkdirSync(browserDir, { recursive: true });

let settings = readJsonObject(path.join(opencodeDir, "opencode.json"));
if (Object.keys(settings).length === 0) {
  settings = readJsonObject(path.join(opencodeDir, "opencode.jsonc"));
}

settings.$schema = settings.$schema || "https://opencode.ai/config.json";
settings.mcp = {
  ...(settings.mcp || {}),
  linkedin: {
    type: "local",
    command: ["uvx", "mcp-server-linkedin@latest"],
    environment: {
      USER_DATA_DIR: userDataDir,
      LINKEDIN_DEBUG_TRACE_DIR: traceDir,
      PLAYWRIGHT_BROWSERS_PATH: browserDir,
      ...(userAgent ? { USER_AGENT: userAgent } : {}),
    },
  },
};

const contents = `${JSON.stringify(settings, null, 2)}\n`;
fs.writeFileSync(path.join(opencodeDir, "opencode.json"), contents);
fs.writeFileSync(path.join(opencodeDir, "opencode.jsonc"), contents);
