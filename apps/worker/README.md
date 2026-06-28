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

## HTTP surface (v1.0)

Path-secret auth (ADR-0013) — `{secret}` is the workspace's `path_secret` from the workspace map:

| Method | Path | Op |
|--------|------|----|
| `POST` | `/v1/{workspace}/{secret}/capture` | capture (body: `{ output, raw?, thread? }`) |
| `POST` | `/v1/{workspace}/{secret}/init` | scaffold the workspace |
| `GET`  | `/v1/{workspace}/{secret}/notes?since=&limit=` | list_recent |
| `GET`  | `/v1/{workspace}/{secret}/tags?prefix=` | list_tags |
| `GET`  | `/v1/{workspace}/{secret}/notes/{id}?include_source=1` | read_note |
| `DELETE` | `/v1/{workspace}/{secret}/notes/{id}` | delete |
| `POST` | `/v1/{workspace}/{secret}/notes/{id}/append` | append (body: `{ block, base_sha }`) |
| `POST` | `/v1/{workspace}/{secret}/notes/{id}/correct` | correct (body: `{ output, base_sha }`) |
| `POST` | `/v1/{workspace}/{secret}/notes/{id}/undo` | undo |

Writes accept an `Idempotency-Key` header (core-spec §3.4). Errors are RFC 9457
`application/problem+json`; every response carries `zonot-trace-id`.

The **MCP transport** (Claude-as-agent capture) is not yet wired — see the Phase 1(e)-ii TODO.

## Local dev + deploy

```bash
bun test                        # unit + end-to-end (against an in-memory Git Data fake)
wrangler dev                    # local Worker; needs the secrets below

# one-time setup against your Cloudflare account:
wrangler kv namespace create IDEMPOTENCY    # paste the id into wrangler.toml
wrangler secret put WORKSPACE_MAP_JSON      # {"personal":{"owner":"you","repo":"notes","token":"ghp_…","path_secret":"…"}}
#   token = a fine-grained PAT scoped to the notes repo (Contents: read/write)

wrangler deploy --var RELEASE_SHA:$(git rev-parse HEAD)
```

After deploy, smoke-test:

```bash
curl -s https://<your-worker>/v1/personal/<secret>/init -X POST
curl -s https://<your-worker>/v1/personal/<secret>/capture \
  -X POST -H 'content-type: application/json' \
  -d '{"output":{"title":"hello","tags":["zonot"],"body":"first capture"}}'
```
