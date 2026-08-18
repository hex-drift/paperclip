#!/bin/sh
set -e

/usr/local/bin/docker-agent-entrypoint-setup.sh

exec /usr/sbin/sshd -D -e
