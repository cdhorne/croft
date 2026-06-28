# zonot (CLI)

The Bun-compiled CLI. Dual distribution per
[ADR-0023](../../docs/adr/0023-cli-distribution.md): npm (`npx zonot` / `npm i -g zonot`) as
primary; single-binary via Homebrew + curl + GitHub Releases.

Surface (per [`docs/specs/cli-spec.md`](../../docs/specs/cli-spec.md)):

`init / capture / append / correct / undo / delete / read / list / search / tags / workspaces /
import / mcp / serve / sync / status / doctor / logs / completion`

Two backends: clone-holder (isomorphic-git, default) and `--worker=URL` thin client. Same
`WriteClient` interface; backend resolved from config. Power surfaces: `zonot mcp --stdio` is
the BYO-agent desktop path; `zonot serve` is the local Worker mirror for C0 self-host.

Anchored by [ADR-0036](../../docs/adr/0036-cli-surface.md). Phase 2 in the build order.

## Install

```bash
# Standalone binary — no Bun/Node required (Linux/macOS):
curl -fsSL https://raw.githubusercontent.com/cdhorne/zonot/main/install.sh | sh

# Homebrew:
brew install cdhorne/tap/zonot

# npm (requires the Bun runtime, since search uses bun:sqlite):
npm i -g zonot     # or: npx zonot
```

Implemented today (local clone-holder mode): `init · capture · append · correct · undo ·
delete · read · search · list · tags · import · status · workspaces`. The `--worker` thin
client, `mcp --stdio`, `serve`, `sync`, `doctor`, `logs`, and `completion` are sequenced later.

## Build + release

```bash
bun run build:npm   # → dist/index.js (1.4 MB Bun-target bundle; the npm artifact)
bun run build:bin   # → dist/zonot   (standalone binary for this platform)
bun run build:dist  # → dist/zonot-<os>-<arch> for every target + checksums.txt
```

Distribution (ADR-0023): the published npm package is the self-contained `dist/index.js`
(core + all deps bundled, zero runtime dependencies; `@zonot/core` is never published). The
standalone binaries embed the Bun runtime (~92 MB) and need nothing installed. Tagging `v*`
triggers [`release.yml`](../../.github/workflows/release.yml): cross-compile every binary →
GitHub Release, then `pnpm publish --provenance`. Requires an `NPM_TOKEN` repo secret.

> **First-publish check (owner-run):** provenance + the `workspace:` rewrite can only be
> verified against the real registry — confirm the published tarball has no runtime deps and
> `npx zonot --version` works after the first tag.
