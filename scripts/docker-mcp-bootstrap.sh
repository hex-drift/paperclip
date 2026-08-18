#!/bin/sh
set -e

MCP_CONFIG_HOME="${MCP_CONFIG_HOME:-/home/agent}"
GCP_SA_KEY_PATH="${GCP_SA_KEY_PATH:-$MCP_CONFIG_HOME/gcp-sa-key.json}"
MCP_RUNTIME_USER="${MCP_RUNTIME_USER:-agent}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if [ -n "$BQ_SA_KEY" ]; then
  echo "[mcp-bootstrap] Writing GCP service account key for $MCP_CONFIG_HOME..."
  GCP_SA_KEY_PATH="$GCP_SA_KEY_PATH" node -e '
const raw = process.env.BQ_SA_KEY;
const target = process.env.GCP_SA_KEY_PATH;
if (!raw || !target) process.exit(0);
let sanitized = "";
let quoteCount = 0;
for (let i = 0; i < raw.length; i++) {
  const char = raw[i];
  if (char === "\"" && (i === 0 || raw[i-1] !== "\\")) {
    quoteCount++;
  }
  if (char === "\n") {
    if (quoteCount % 2 === 1) {
      sanitized += "\\n";
    } else {
      sanitized += char;
    }
  } else {
    sanitized += char;
  }
}
try {
  JSON.parse(sanitized);
  require("fs").mkdirSync(require("path").dirname(target), { recursive: true });
  require("fs").writeFileSync(target, sanitized);
} catch (e) {
  console.error("Failed to sanitize BQ_SA_KEY:", e.message);
  process.exit(1);
}
'
  chown "$MCP_RUNTIME_USER:$MCP_RUNTIME_USER" "$GCP_SA_KEY_PATH"
  chmod 600 "$GCP_SA_KEY_PATH"
  cp "$GCP_SA_KEY_PATH" "$MCP_CONFIG_HOME/bq-sa-key.json"
  chown "$MCP_RUNTIME_USER:$MCP_RUNTIME_USER" "$MCP_CONFIG_HOME/bq-sa-key.json"
  chmod 600 "$MCP_CONFIG_HOME/bq-sa-key.json"
fi

if [ -n "$BQ_SA_KEY" ] || [ -n "$GOOGLE_ADS_DEVELOPER_TOKEN" ] || [ -n "$GA_PROPERTY_ID" ] || [ -n "$CLICKHOUSE_MCP_SERVERS" ] || [ "$CODE_REVIEW_GRAPH_MCP_ENABLED" = "true" ] || { [ -n "$AI_GATE_BASE_URL" ] && [ -n "$AI_GATE_API_KEY" ]; }; then
  echo "[mcp-bootstrap] Writing MCP settings under $MCP_CONFIG_HOME..."
  MCP_CONFIG_HOME="$MCP_CONFIG_HOME" GCP_SA_KEY_PATH="$GCP_SA_KEY_PATH" node "$SCRIPT_DIR/write-gcp-mcp-config.mjs"
  chown -R "$MCP_RUNTIME_USER:$MCP_RUNTIME_USER" \
    "$MCP_CONFIG_HOME/.gemini" \
    "$MCP_CONFIG_HOME/.config"
  chmod 700 "$MCP_CONFIG_HOME/.gemini" "$MCP_CONFIG_HOME/.config" \
    "$MCP_CONFIG_HOME/.config/opencode" "$MCP_CONFIG_HOME/.config/Claude" 2>/dev/null || true
  chmod 600 \
    "$MCP_CONFIG_HOME/.gemini/settings.json" \
    "$MCP_CONFIG_HOME/.config/Claude/claude_desktop_config.json" \
    "$MCP_CONFIG_HOME/.config/opencode/opencode.json" \
    "$MCP_CONFIG_HOME/.config/opencode/opencode.jsonc" 2>/dev/null || true
fi
