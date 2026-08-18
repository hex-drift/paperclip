#!/bin/sh
set -e

CUSTOMERIO_HOME="${CUSTOMERIO_HOME:-/home/node}"
CUSTOMERIO_RUNTIME_USER="${CUSTOMERIO_RUNTIME_USER:-node}"

if [ -z "$CIO_TOKEN" ]; then
  echo "[customerio-bootstrap] CIO_TOKEN not set, skipping Customer.io CLI setup."
  exit 0
fi

if ! command -v cio >/dev/null 2>&1; then
  echo "[customerio-bootstrap] WARNING: cio CLI not installed, skipping."
  exit 0
fi

echo "[customerio-bootstrap] Configuring Customer.io CLI for $CUSTOMERIO_HOME..."

mkdir -p "$CUSTOMERIO_HOME/.cio"
chown "$CUSTOMERIO_RUNTIME_USER:$CUSTOMERIO_RUNTIME_USER" "$CUSTOMERIO_HOME/.cio"

run_as_runtime_user() {
  if [ "$(id -un)" = "root" ]; then
    su -s /bin/sh "$CUSTOMERIO_RUNTIME_USER" -c "HOME='$CUSTOMERIO_HOME' $*"
  else
    HOME="$CUSTOMERIO_HOME" sh -c "$*"
  fi
}

if [ "$(id -un)" = "root" ]; then
  printf '%s' "$CIO_TOKEN" | su -s /bin/sh "$CUSTOMERIO_RUNTIME_USER" -c "HOME='$CUSTOMERIO_HOME' cio auth login --with-token"
else
  printf '%s' "$CIO_TOKEN" | HOME="$CUSTOMERIO_HOME" cio auth login --with-token
fi

run_as_runtime_user "cio skills install --global --force"

chown -R "$CUSTOMERIO_RUNTIME_USER:$CUSTOMERIO_RUNTIME_USER" \
  "$CUSTOMERIO_HOME/.cio" \
  "$CUSTOMERIO_HOME/.claude" \
  "$CUSTOMERIO_HOME/.agents" 2>/dev/null || true

echo "[customerio-bootstrap] Customer.io CLI ready."
