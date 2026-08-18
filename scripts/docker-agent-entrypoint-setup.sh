#!/bin/sh
set -e

if [ -n "$AGENT_AUTHORIZED_KEY" ]; then
  echo "$AGENT_AUTHORIZED_KEY" > /home/agent/.ssh/authorized_keys
  chown agent:agent /home/agent/.ssh/authorized_keys
  chmod 600 /home/agent/.ssh/authorized_keys
else
  echo "[agent-entrypoint] WARNING: AGENT_AUTHORIZED_KEY is not set. SSH login will fail without an authorized key."
fi

export MCP_CONFIG_HOME=/home/agent
export GCP_SA_KEY_PATH=/home/agent/gcp-sa-key.json
export MCP_RUNTIME_USER=agent
/usr/local/bin/docker-mcp-bootstrap.sh

export CUSTOMERIO_HOME=/home/agent
export CUSTOMERIO_RUNTIME_USER=agent
/usr/local/bin/docker-customerio-bootstrap.sh

mkdir -p /run/sshd
