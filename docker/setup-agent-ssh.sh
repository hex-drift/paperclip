#!/bin/bash
# setup-agent-ssh.sh — One-time setup for Paperclip SSH remote agents.
#
# Run this script ONCE on the server (in /srv/paperclip/docker or wherever
# your docker-compose.prod.yml lives) before the first `docker compose up`.
#
# What it does:
#   1. Generates an ed25519 SSH keypair for the Paperclip server to use
#   2. Appends AGENT_AUTHORIZED_KEY to your .env file
#   3. Prints the private key so you can store it in Paperclip Secrets UI
#
# Usage:
#   bash setup-agent-ssh.sh
#
# After running this script:
#   1. Run `docker compose -f docker-compose.prod.yml up -d --build`
#   2. In Paperclip UI → Environments → New Environment:
#      - Driver: SSH
#      - Host: agent-1   (Docker service name)
#      - Port: 22
#      - Username: agent
#      - Remote workspace path: /workspace
#      - Private key: paste output of this script (stored as a Secret first)
#      - Strict host key checking: false  (internal Docker network)
#   3. Repeat for agent-2, etc.
#   4. In Paperclip UI → Agents → New Agent / Edit Agent:
#      - Assign the SSH Environment to the agent

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
KEY_FILE="/tmp/paperclip-agent-ssh-key"

echo "=== Paperclip SSH Agent Setup ==="
echo ""

# Check if key already exists in .env
if [ -f "$ENV_FILE" ] && grep -q "^AGENT_AUTHORIZED_KEY=" "$ENV_FILE"; then
  echo "AGENT_AUTHORIZED_KEY already set in $ENV_FILE."
  echo "Remove it from .env if you want to regenerate the key."
  exit 0
fi

# Generate ed25519 keypair
echo "Generating ed25519 SSH keypair..."
ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "paperclip-agent" -q

PUBLIC_KEY="$(cat "${KEY_FILE}.pub")"
PRIVATE_KEY="$(cat "${KEY_FILE}")"

# Remove temp key files
rm -f "$KEY_FILE" "${KEY_FILE}.pub"

# Write public key to .env
if [ -f "$ENV_FILE" ]; then
  echo "" >> "$ENV_FILE"
fi
echo "# SSH public key for remote agent containers" >> "$ENV_FILE"
echo "AGENT_AUTHORIZED_KEY=${PUBLIC_KEY}" >> "$ENV_FILE"

echo "Public key written to: $ENV_FILE"
echo ""
echo "================================================================"
echo "PRIVATE KEY — Store this in Paperclip Secrets UI"
echo "(Board > Settings > Secrets > New Secret, name it 'agent-ssh-key')"
echo "================================================================"
echo ""
echo "$PRIVATE_KEY"
echo ""
echo "================================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Copy the private key above and create a Paperclip Secret:"
echo "   Board > Settings > Secrets > New Secret"
echo "   Name: agent-ssh-key"
echo "   Value: (paste private key)"
echo ""
echo "2. Start the agent containers:"
echo "   docker compose -f docker-compose.prod.yml up -d --build agent-1 agent-2"
echo ""
echo "3. In Paperclip UI, create an SSH Environment for each agent:"
echo "   Board > Settings > Environments > New Environment"
echo "   Driver:                 ssh"
echo "   Host:                   agent-1        (or agent-2)"
echo "   Port:                   22"
echo "   Username:               agent"
echo "   Remote workspace path:  /workspace"
echo "   Private key (secret):   agent-ssh-key  (select from secrets)"
echo "   Strict host checking:   false"
echo ""
echo "4. Create or edit agents and assign them to the SSH environments."
echo ""
