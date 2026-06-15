# @zonot/worker

The Cloudflare Worker — MCP tool surface + HTTP endpoints; the live-dogfood harness and the
path v1 mobile writes ride.

Surface (per [`docs/specs/worker-spec.md`](../../docs/specs/worker-spec.md)):

- One handler set, two transports (MCP via `createMcpHandler`; HTTP for the app).
- GitHub REST write backend (Contents / Git Data tree).
- RFC 9457 error discipline + `zonot-trace-id` header.
- Workspace dispatch + per-tenant rate limiter.
- Structured logs (Logpush) + Workers Analytics Engine metrics + Sentry from v1.0.

Anchored by [ADR-0013](../../docs/adr/0013-phase-1-deployment.md) and
[ADR-0035](../../docs/adr/0035-worker-runtime-discipline.md). Phase 1 in the build order.
