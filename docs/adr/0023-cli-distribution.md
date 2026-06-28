---
adr: 0023
title: CLI packaging & distribution
status: Accepted (rev 10)
slug: cli-distribution
tags: [distribution, cli, packaging, supply-chain]
---

# ADR-0023. CLI packaging & distribution

## Context

ADR-0011 specifies a single-binary CLI but not how it reaches developers. The audience already lives in the Node / npm / Cloudflare ecosystem, so distribution should meet them there.

## Decision

- **npm is the primary discovery + install channel:** `npx zonot` and `npm i -g zonot` — where JS/TS developers look first (the pattern esbuild / turbo / biome use even as compiled tools).
- **The CLI is runtime-portable — it runs on Node *or* Bun, so `npx zonot` works on the runtime developers already have, not only Bun (rev 10).** The single Bun-coupling was the local FTS search driver; SQLite+FTS5 ships in both `node:sqlite` and `bun:sqlite`, so the driver is selected at runtime behind the core `SqliteAdapter` seam (ADR-0008) and both are kept external in the bundle. The npm artifact is therefore one small Node-target bundle with **zero native dependencies** (core + deps inlined; `@zonot/core` is never published). `node:sqlite` is flag-gated on Node 22, so a search-family command transparently re-execs with `--experimental-sqlite` — invisible to the user, a no-op on Node 24+ / Bun.
- **Also ship a compiled single binary** via Homebrew + a `curl | sh` installer + GitHub Releases, honoring the near-zero-deps promise (ADR-0011) for non-npm users; the binary embeds the Bun runtime so it needs nothing installed. The `curl | sh` installer verifies the published SHA-256 checksum (supply-chain trust, ADR-0001).
- **Publish with npm provenance attestations** so the supply chain is observable — on-ethos for a tool that writes to the user's GitHub repo (ADR-0001).
- **`init` is a CLI subcommand** (`zonot init`, ADR-0021), not a separate `create-*` package.

**Per-artifact channels.** App → App Store / Play Store via Expo EAS; edge Worker → deployed via wrangler (managed) or a self-host template (C0); remote MCP server → the Worker URL added to the client's MCP config (not a package); shared core → internal monorepo workspace until/unless an SDK is wanted.

## Consequences

The npm package name is worth securing but is plumbing under the CLI, not the brand's center of gravity. Provenance publishing adds a CI step; acceptable. The runtime-portability seam keeps the npm package native-dependency-free and meets developers on either runtime; the `node:sqlite` experimental-flag re-exec is a transient that drops out once Node 24 is the floor. Licensing is open-core / source-available non-compete (ADR-0027 §Mechanism).
