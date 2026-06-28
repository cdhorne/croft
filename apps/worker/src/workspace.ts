// Workspace dispatch (worker-spec §3.1). Every request resolves a workspace
// before any handler runs. v1.0 reads a static JSON map from a secret; the
// resolver is the single swap point for the v1.1 entitlement-store KV lookup.

import { NotFoundError, UnauthorizedError } from '@zonot/core/errors';
import type { Env, WorkspaceContext, WorkspaceResolution } from './env.ts';

/** SHA-256 hash of the workspace name — the only workspace identifier that ever
 *  reaches logs/metrics/Sentry (worker-spec §2.1 forbidden-fields rule). */
export async function hashWorkspace(workspace: string): Promise<string> {
  const bytes = new TextEncoder().encode(workspace);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

/** v1.0 resolver — static map from the WORKSPACE_MAP_JSON secret. */
export function resolveWorkspace(workspace: string, env: Env): WorkspaceResolution | null {
  let map: Record<string, WorkspaceResolution>;
  try {
    map = JSON.parse(env.WORKSPACE_MAP_JSON) as Record<string, WorkspaceResolution>;
  } catch {
    // A malformed secret is an operator misconfiguration, not a caller error.
    throw new Error('WORKSPACE_MAP_JSON is not valid JSON');
  }
  return map[workspace] ?? null;
}

/**
 * Resolve the workspace named in the request and verify the path-secret
 * (constant-time). Throws NotFoundError for an unknown workspace, UnauthorizedError
 * for a bad/missing secret. Both are deliberately indistinguishable in timing.
 */
export async function dispatchWorkspace(
  workspace: string,
  pathSecret: string | null,
  env: Env,
  trace_id: string,
): Promise<WorkspaceContext> {
  const resolution = resolveWorkspace(workspace, env);
  if (!resolution) {
    // Burn a comparison so unknown-workspace and bad-secret cost the same.
    constantTimeEquals(pathSecret ?? '', 'x');
    throw new NotFoundError(`workspace ${workspace}`);
  }
  if (!pathSecret || !constantTimeEquals(pathSecret, resolution.path_secret)) {
    throw new UnauthorizedError('invalid workspace path-secret');
  }
  return {
    workspace,
    workspace_hash: await hashWorkspace(workspace),
    resolution,
    trace_id,
  };
}

/** Length-independent constant-time string compare. */
export function constantTimeEquals(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
