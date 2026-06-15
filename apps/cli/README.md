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
