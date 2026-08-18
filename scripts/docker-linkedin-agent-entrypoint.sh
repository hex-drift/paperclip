#!/bin/sh
set -e

if [ -z "$AGENT_AUTHORIZED_KEY" ]; then
  echo "[linkedin-agent-entrypoint] LINKEDIN_AGENT_AUTHORIZED_KEY is required." >&2
  exit 1
fi

LINKEDIN_PROFILE_ROOT=/linkedin-profile
LINKEDIN_PROFILE_DIR=$LINKEDIN_PROFILE_ROOT/profile

echo "$AGENT_AUTHORIZED_KEY" > /home/agent/.ssh/authorized_keys
# SSH sessions do not inherit the entrypoint environment, so the LinkedIn
# runtime variables must be written here too — agents run over ssh and need
# the same profile/user-agent the MCP server is configured with.
cat > /home/agent/.ssh/environment <<EOF
OPENROUTER_API_KEY=$OPENROUTER_API_KEY
OPENROUTER_BASE_URL=$OPENROUTER_BASE_URL
OPENCODE_ALLOW_ALL_MODELS=true
AGENT_BROWSER_USER_AGENT=$LINKEDIN_USER_AGENT
LINKEDIN_USER_DATA_DIR=$LINKEDIN_PROFILE_DIR
LINKEDIN_USER_AGENT=$LINKEDIN_USER_AGENT
EOF
chown agent:agent /home/agent/.ssh/authorized_keys
chown agent:agent /home/agent/.ssh/environment
chmod 600 /home/agent/.ssh/authorized_keys /home/agent/.ssh/environment
mkdir -p /run/sshd

export MCP_CONFIG_HOME=/home/agent
# The MCP server derives its auth root from the PARENT of the profile dir, so
# the profile must live one level below a writable root — otherwise it resolves
# to / and dies on startup trying to create /trace-runs.
export LINKEDIN_USER_DATA_DIR=$LINKEDIN_PROFILE_DIR
export LINKEDIN_DEBUG_TRACE_DIR=$LINKEDIN_PROFILE_ROOT/trace-runs
export PLAYWRIGHT_BROWSERS_PATH=$LINKEDIN_PROFILE_ROOT/patchright-browsers
mkdir -p "$LINKEDIN_PROFILE_DIR"
node /usr/local/bin/write-linkedin-mcp-config.mjs
chown -R agent:agent /home/agent/.config/opencode /linkedin-profile
chmod 700 /linkedin-profile

exec /usr/sbin/sshd -D -e
