// Structured, content-free request logging (worker-spec §2.1). One JSON line per
// request on completion. NEVER logs note bodies/titles/tags, tokens, secrets,
// user identifiers beyond the hashed workspace, or full file paths.

import type { AnalyticsEngine } from './env.ts';

export interface RequestLog {
  trace_id: string;
  workspace_hash: string | null;
  op: string | null;
  method: string;
  path_shape: string; // route template, NOT the concrete path (no slug leakage)
  status: number;
  latency_ms: number;
  upstream_ms?: number;
  error_type: string | null;
}

export function logRequest(entry: RequestLog): void {
  // Dev: `wrangler tail` surfaces these. Prod (v1.1): Logpush.
  console.log(JSON.stringify({ ts: isoNow(), ...entry }));
}

/** Status-class buckets for Analytics Engine (worker-spec §2.2). */
export function statusClass(status: number): string {
  if (status < 300) return '2xx';
  if (status === 412 || status === 422) return '4xx-conflict';
  if (status === 400) return '4xx-validation';
  if (status < 500) return '4xx-client';
  return '5xx';
}

export function writeMetric(
  metrics: AnalyticsEngine | undefined,
  entry: {
    op: string;
    status: number;
    workspace_hash: string;
    latency_ms: number;
    upstream_ms?: number;
  },
): void {
  metrics?.writeDataPoint({
    blobs: [entry.op, statusClass(entry.status)],
    doubles: [entry.latency_ms, entry.upstream_ms ?? 0],
    indexes: [entry.workspace_hash],
  });
}

function isoNow(): string {
  return new Date().toISOString();
}
