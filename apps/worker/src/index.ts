import type { ExecutionContext } from '@cloudflare/workers-types';

// @zonot/worker — Cloudflare Worker entry point.
// Phase 1 surface (per ROADMAP):
//   - createMcpHandler over the shared core handlers (ADR-0022)
//   - GitHub REST write backend (ADR-0022 / docs/specs/core-spec.md §3)
//   - RFC 9457 error discipline + zonot-trace-id (ADR-0035)
//   - Workspace dispatch + per-tenant rate limiter (ADR-0035 §3)
//   - Sentry from v1.0 (ADR-0035 §2.3)

export default {
  async fetch(_request: Request, _env: unknown, _ctx: ExecutionContext): Promise<Response> {
    // Phase 1 scaffolding: implementation lands as the spec drives.
    // See: docs/specs/worker-spec.md
    return new Response('zonot-worker: scaffold', {
      status: 503,
      headers: { 'content-type': 'text/plain' },
    });
  },
};
