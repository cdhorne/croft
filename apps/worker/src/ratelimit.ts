// Per-(workspace, op) rate limiting (worker-spec §3.2). Keys are always
// (workspace_hash, op) — never workspace alone — so a noisy read can't starve a
// write. The binding is absent in local dev (limiting is a no-op there).

import { RateLimitedError } from '@zonot/core/errors';
import type { Env } from './env.ts';

/** v1.0 fixed retry hint (the binding's window is 60s; worker-spec §3.2). */
const RETRY_AFTER_SECONDS = 60;

export async function enforceRateLimit(
  env: Env,
  workspace_hash: string,
  op: string,
): Promise<void> {
  if (!env.RATE_LIMITER) return; // dev / unbound — no limiting
  const decision = await env.RATE_LIMITER.limit({ key: `${workspace_hash}:${op}` });
  if (!decision.success) throw new RateLimitedError(RETRY_AFTER_SECONDS);
}
