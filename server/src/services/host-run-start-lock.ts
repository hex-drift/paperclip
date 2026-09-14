import { logger } from "../middleware/logger.js";

const HOST_RUN_START_LOCK_STALE_MS = 30_000;
let hostRunStartLock: { promise: Promise<void>; startedAtMs: number } | null = null;

async function waitForHostRunStartLock(lock: { promise: Promise<void>; startedAtMs: number }) {
  const elapsedMs = Date.now() - lock.startedAtMs;
  const remainingMs = HOST_RUN_START_LOCK_STALE_MS - elapsedMs;
  if (remainingMs <= 0) {
    logger.warn({ staleMs: elapsedMs }, "host run start lock stale; continuing queued-run start");
    return;
  }

  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  await Promise.race([
    lock.promise,
    new Promise<void>((resolve) => {
      timeout = setTimeout(() => {
        timedOut = true;
        resolve();
      }, remainingMs);
    }),
  ]);
  if (timeout) clearTimeout(timeout);

  if (timedOut) {
    logger.warn(
      { staleMs: HOST_RUN_START_LOCK_STALE_MS },
      "host run start lock timed out; continuing queued-run start",
    );
  }
}

export async function withHostRunStartLock<T>(fn: () => Promise<T>) {
  const previous = hostRunStartLock;
  const waitForPrevious = previous ? waitForHostRunStartLock(previous) : Promise.resolve();
  const run = waitForPrevious.then(fn);
  const marker = run.then(
    () => undefined,
    () => undefined,
  );
  hostRunStartLock = { promise: marker, startedAtMs: Date.now() };
  try {
    return await run;
  } finally {
    if (hostRunStartLock?.promise === marker) {
      hostRunStartLock = null;
    }
  }
}
