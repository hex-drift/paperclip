import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  activityLog,
  agents,
  agentRuntimeState,
  agentWakeupRequests,
  companies,
  companySkills,
  createDb,
  environmentLeases,
  environments,
  heartbeatRunEvents,
  heartbeatRuns,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { heartbeatService } from "../services/heartbeat.ts";
import { runningProcesses } from "../adapters/index.ts";

process.env.PAPERCLIP_MAX_CONCURRENT_HOST_RUNS = "2";

const mockAdapterExecute = vi.hoisted(() =>
  vi.fn(async () => ({
    exitCode: 0,
    signal: null,
    timedOut: false,
    errorMessage: null,
    summary: "Host-run cap heartbeat test run.",
    provider: "test",
    model: "test-model",
  })),
);

vi.mock("../adapters/index.ts", async () => {
  const actual = await vi.importActual<typeof import("../adapters/index.ts")>("../adapters/index.ts");
  return {
    ...actual,
    getServerAdapter: vi.fn(() => ({
      supportsLocalAgentJwt: false,
      execute: mockAdapterExecute,
    })),
  };
});

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres heartbeat host-run cap tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("heartbeat instance host-run cap", () => {
  let db!: ReturnType<typeof createDb>;
  let heartbeat!: ReturnType<typeof heartbeatService>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-heartbeat-host-run-cap-");
    db = createDb(tempDb.connectionString);
    heartbeat = heartbeatService(db);
  }, 20_000);

  afterEach(async () => {
    await heartbeat.drainActiveRunExecutions();
    mockAdapterExecute.mockReset();
    mockAdapterExecute.mockImplementation(async () => ({
      exitCode: 0,
      signal: null,
      timedOut: false,
      errorMessage: null,
      summary: "Host-run cap heartbeat test run.",
      provider: "test",
      model: "test-model",
    }));
    runningProcesses.clear();
    await db.delete(environmentLeases);
    await db.delete(heartbeatRunEvents);
    await db.delete(activityLog);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(agentRuntimeState);
    await db.delete(agents);
    await db.delete(companySkills);
    await db.delete(environments);
    await db.delete(environmentLeases);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await db.delete(companySkills);
        await db.delete(companies);
        break;
      } catch (error) {
        if (attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompany() {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
      defaultResponsibleUserId: "responsible-user",
    });
    return companyId;
  }

  async function seedAgent(companyId: string, name: string, adapterType: string) {
    const agentId = randomUUID();
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name,
      role: "engineer",
      status: "active",
      adapterType,
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          wakeOnDemand: true,
          maxConcurrentRuns: 5,
        },
      },
      permissions: {},
    });
    return agentId;
  }

  async function insertRunningRun(companyId: string, agentId: string) {
    const [run] = await db
      .insert(heartbeatRuns)
      .values({
        companyId,
        agentId,
        invocationSource: "on_demand",
        triggerDetail: "manual",
        status: "running",
        startedAt: new Date(),
      })
      .returning();
    return run;
  }

  async function runStatus(runId: string) {
    return db
      .select({ status: heartbeatRuns.status })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, runId))
      .then((rows) => rows[0]?.status ?? null);
  }

  it("queues a third host adapter run until a slot frees", async () => {
    const companyId = await seedCompany();
    const firstAgentId = await seedAgent(companyId, "HostOne", "codex_local");
    const secondAgentId = await seedAgent(companyId, "HostTwo", "codex_local");
    const thirdAgentId = await seedAgent(companyId, "HostThree", "codex_local");
    await insertRunningRun(companyId, firstAgentId);
    await insertRunningRun(companyId, secondAgentId);

    const thirdWake = await heartbeat.wakeup(thirdAgentId, {
      source: "on_demand",
      triggerDetail: "manual",
      requestedByActorType: "user",
      requestedByActorId: "board-user",
    });
    expect(thirdWake).not.toBeNull();
    expect(await runStatus(thirdWake!.id)).toBe("queued");
    expect(mockAdapterExecute).not.toHaveBeenCalled();

    await db
      .update(heartbeatRuns)
      .set({ status: "succeeded", finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(heartbeatRuns.agentId, firstAgentId));

    await heartbeat.resumeQueuedRuns();
    expect(await runStatus(thirdWake!.id)).not.toBe("queued");
    await heartbeat.drainActiveRunExecutions();
  });

  it("does not count remote http adapters against the host-run cap", async () => {
    const companyId = await seedCompany();
    const httpAgentId = await seedAgent(companyId, "HttpWorker", "http");
    const hostAgentId = await seedAgent(companyId, "HostWorker", "codex_local");
    await insertRunningRun(companyId, httpAgentId);

    process.env.PAPERCLIP_MAX_CONCURRENT_HOST_RUNS = "1";
    try {
      const hostWake = await heartbeat.wakeup(hostAgentId, {
        source: "on_demand",
        triggerDetail: "manual",
        requestedByActorType: "user",
        requestedByActorId: "board-user",
      });
      expect(hostWake).not.toBeNull();
      expect(await runStatus(hostWake!.id)).not.toBe("queued");
      await heartbeat.drainActiveRunExecutions();
    } finally {
      process.env.PAPERCLIP_MAX_CONCURRENT_HOST_RUNS = "2";
    }
  });
});
