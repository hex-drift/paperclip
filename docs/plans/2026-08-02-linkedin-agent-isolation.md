# LinkedIn Agent Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Run Konstantin Nosov and Olha Nosova in two dedicated Paperclip execution containers with separate persistent LinkedIn browser profiles and no LinkedIn MCP exposure in other runtimes.

**Architecture:** Add a LinkedIn-only image derived from the existing SSH agent image. Run two services with unique workspace, home, and LinkedIn profile volumes, register two SSH environments in the `linkedin` company, and assign one environment to each LIN agent. Keep `agent-1..5`, their volumes, and all non-LIN agent assignments unchanged.

**Tech Stack:** Docker Compose, Paperclip SSH environments, OpenCode, `mcp-server-linkedin`, agent-browser, Node.js tests.

---

### Task 1: Isolated LinkedIn MCP bootstrap

**Files:**
- Create: `scripts/write-linkedin-mcp-config.test.mjs`
- Create: `scripts/write-linkedin-mcp-config.mjs`
- Modify: `scripts/write-gcp-mcp-config.mjs`

1. Write a failing test requiring `USER_DATA_DIR` to point at the container-specific profile volume.
2. Run `node --test scripts/write-linkedin-mcp-config.test.mjs` and confirm it fails because the writer is absent.
3. Implement the dedicated writer and remove LinkedIn from the shared MCP writer.
4. Re-run the test and confirm it passes.

### Task 2: Dedicated container image and services

**Files:**
- Create: `docker/Dockerfile.linkedin-agent`
- Create: `scripts/docker-linkedin-agent-entrypoint.sh`
- Create: `scripts/docker-agent-entrypoint-setup.sh`
- Modify: `scripts/docker-agent-entrypoint.sh`
- Modify: `docker/Dockerfile.agent-ssh`
- Modify: `docker/docker-compose.prod.yml`
- Modify: `Dockerfile`

1. Extract shared SSH bootstrap without changing generic agent behavior.
2. Add the LinkedIn-only image with `uvx`, agent-browser, and a dedicated MCP config.
3. Add `linkedin-konstantin` and `linkedin-olha` with unique workspace, home, and browser-profile volumes.
4. Remove LinkedIn packages/configuration from shared server and generic agent paths.
5. Run `docker compose -f docker/docker-compose.prod.yml config --quiet`.

### Task 3: Deploy without disturbing other organizations

1. Snapshot all companies' agent states and live runs.
2. Build only the base agent image and the two LinkedIn services.
3. Start only `linkedin-konstantin` and `linkedin-olha`.
4. Confirm `agent-1..5`, server, database, and Caddy container IDs and status remain unchanged.

### Task 4: Paperclip environment assignment

1. Generate a dedicated SSH key pair for each LIN agent.
2. Add each public key only to its corresponding LinkedIn container.
3. Store each private key in its corresponding LIN environment.
4. Create two LIN SSH environments targeting the dedicated hostnames.
5. Assign Konstantin and Olha to their respective environment IDs.

### Task 5: End-to-end verification

1. Probe both SSH environments.
2. Verify each OpenCode config contains LinkedIn MCP with a distinct `USER_DATA_DIR`.
3. Verify generic server and `agent-1..5` OpenCode configs do not contain LinkedIn MCP.
4. Run self-profile checks: Konstantin `/in/me/` must resolve to `/in/nosovk/`; Olha `/in/me/` must resolve to `/in/olga-nosova-a0613b23/`.
5. Re-audit all non-LIN agents and restart only agents whose state regressed during deployment.
