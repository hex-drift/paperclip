#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const home = process.env.MCP_CONFIG_HOME || "/home/agent";
const saKeyPath = process.env.GCP_SA_KEY_PATH || path.join(home, "gcp-sa-key.json");
const hasSaKey = fs.existsSync(saKeyPath);
const bqProject = process.env.BIGQUERY_PROJECT || "visiongrid-analytics-compute";
const mcpServers = {};

if (process.env.BQ_SA_KEY && hasSaKey) {
  mcpServers.bigquery = {
    command: "npx",
    args: ["-y", "@toolbox-sdk/server", "--prebuilt", "bigquery", "--stdio"],
    env: {
      BIGQUERY_PROJECT: bqProject,
      GOOGLE_APPLICATION_CREDENTIALS: saKeyPath,
    },
  };
}

if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN && hasSaKey) {
  const googleAdsEnv = {
    GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    GOOGLE_ADS_AUTH_TYPE: process.env.GOOGLE_ADS_AUTH_TYPE || "service_account",
    GOOGLE_ADS_CREDENTIALS_PATH: saKeyPath,
    GOOGLE_ADS_CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID || "3261198731",
  };
  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    googleAdsEnv.GOOGLE_ADS_LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  }
  if (process.env.GOOGLE_ADS_IMPERSONATION_EMAIL) {
    googleAdsEnv.GOOGLE_ADS_IMPERSONATION_EMAIL = process.env.GOOGLE_ADS_IMPERSONATION_EMAIL;
  }
  mcpServers["google-ads"] = {
    command: "npx",
    args: ["-y", "mcp-gads@latest"],
    env: googleAdsEnv,
  };
}

const gaPropertyId = process.env.GA_PROPERTY_ID?.trim();
if (gaPropertyId && hasSaKey) {
  const serviceAccount = JSON.parse(fs.readFileSync(saKeyPath, "utf8"));
  if (serviceAccount.client_email && serviceAccount.private_key) {
    mcpServers["google-analytics"] = {
      command: "npx",
      args: ["-y", "mcp-server-google-analytics"],
      env: {
        GOOGLE_CLIENT_EMAIL: serviceAccount.client_email,
        GOOGLE_PRIVATE_KEY: serviceAccount.private_key,
        GA_PROPERTY_ID: gaPropertyId,
      },
    };
  }
}

function parseClickHouseServers(spec) {
  if (!spec?.trim()) return [];
  return spec.split(",").flatMap((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return [];
    const at = trimmed.indexOf("@");
    const name = (at >= 0 ? trimmed.slice(0, at) : "clickhouse").trim();
    const rest = at >= 0 ? trimmed.slice(at + 1) : trimmed;
    const slash = rest.indexOf("/");
    const database = slash >= 0 ? rest.slice(slash + 1).trim() || "default" : "default";
    const hostPort = slash >= 0 ? rest.slice(0, slash) : rest;
    const colon = hostPort.lastIndexOf(":");
    const host = (colon >= 0 ? hostPort.slice(0, colon) : hostPort).trim();
    const port = (colon >= 0 ? hostPort.slice(colon + 1) : "8123").trim();
    if (!host) return [];
    return [{ name, host, port, database }];
  });
}

const clickhouseUser = process.env.CLICKHOUSE_USER?.trim();
const clickhousePassword = process.env.CLICKHOUSE_PASSWORD;
const clickhouseServers = parseClickHouseServers(process.env.CLICKHOUSE_MCP_SERVERS);
if (clickhouseUser && clickhousePassword && clickhouseServers.length > 0) {
  const clickhouseSecure = process.env.CLICKHOUSE_SECURE || "false";
  const clickhouseVerify = process.env.CLICKHOUSE_VERIFY || "false";
  for (const server of clickhouseServers) {
    const protocol = clickhouseSecure === "true" ? "https" : "http";
    mcpServers[`clickhouse-${server.name}`] = {
      command: "npx",
      args: ["-y", "@infoinlet/mcp-clickhouse"],
      env: {
        CLICKHOUSE_URL: `${protocol}://${server.host}:${server.port}`,
        CLICKHOUSE_USER: clickhouseUser,
        CLICKHOUSE_PASSWORD: clickhousePassword,
        CLICKHOUSE_DATABASE: server.database,
        CLICKHOUSE_READONLY: "true",
      },
    };
  }
}

if (process.env.CODE_REVIEW_GRAPH_MCP_ENABLED === "true") {
  mcpServers["code-review-graph"] = {
    command: "uvx",
    args: ["code-review-graph@2.3.7", "serve"],
  };
}

const aiGateBaseUrl = process.env.AI_GATE_BASE_URL?.trim();
const aiGateApiKey = process.env.AI_GATE_API_KEY?.trim();
const aiGateProvider = aiGateBaseUrl && aiGateApiKey
  ? {
      npm: "@ai-sdk/openai-compatible",
      name: "AI Gate (Paperclip)",
      options: {
        baseURL: aiGateBaseUrl,
        apiKey: "{env:AI_GATE_API_KEY}",
      },
      models: {
        "gpt-5.6-sol": { name: "GPT-5.6 Sol" },
      },
    }
  : null;

function readJsonObject(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch {
    return {};
  }
}

const geminiDir = path.join(home, ".gemini");
const opencodeDir = path.join(home, ".config", "opencode");
const claudeDir = path.join(home, ".config", "Claude");

fs.mkdirSync(geminiDir, { recursive: true });
fs.mkdirSync(opencodeDir, { recursive: true });
fs.mkdirSync(claudeDir, { recursive: true });

const geminiSettings = readJsonObject(path.join(geminiDir, "settings.json"));
const { linkedin: _geminiLinkedIn, ...geminiMcpServers } = geminiSettings.mcpServers || {};
geminiSettings.mcpServers = {
  ...geminiMcpServers,
  ...mcpServers,
};
fs.writeFileSync(path.join(geminiDir, "settings.json"), `${JSON.stringify(geminiSettings, null, 2)}\n`);

const claudeSettings = readJsonObject(path.join(claudeDir, "claude_desktop_config.json"));
const { linkedin: _claudeLinkedIn, ...claudeMcpServers } = claudeSettings.mcpServers || {};
claudeSettings.mcpServers = {
  ...claudeMcpServers,
  ...mcpServers,
};
fs.writeFileSync(
  path.join(claudeDir, "claude_desktop_config.json"),
  `${JSON.stringify(claudeSettings, null, 2)}\n`,
);

const opencodeMcp = Object.fromEntries(
  Object.entries(mcpServers).map(([name, server]) => [
    name,
    {
      type: "local",
      command: [server.command, ...server.args],
      environment: server.env,
    },
  ]),
);

let opencodeSettings = readJsonObject(path.join(opencodeDir, "opencode.json"));
if (Object.keys(opencodeSettings).length === 0) {
  opencodeSettings = readJsonObject(path.join(opencodeDir, "opencode.jsonc"));
}
opencodeSettings.$schema = opencodeSettings.$schema || "https://opencode.ai/config.json";
const { linkedin: _opencodeLinkedIn, ...opencodeMcpServers } = opencodeSettings.mcp || {};
opencodeSettings.mcp = {
  ...opencodeMcpServers,
  ...opencodeMcp,
};
if (aiGateProvider) {
  opencodeSettings.provider = {
    ...(opencodeSettings.provider || {}),
    "ai-gate": aiGateProvider,
  };
}

const opencodeJson = `${JSON.stringify(opencodeSettings, null, 2)}\n`;
fs.writeFileSync(path.join(opencodeDir, "opencode.json"), opencodeJson);
fs.writeFileSync(path.join(opencodeDir, "opencode.jsonc"), opencodeJson);
