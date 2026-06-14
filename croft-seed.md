# Croft — Seed Decision Record

> Single-document handoff. Name **Croft** — a small plot you own and tend (here, your repo). See
> ADR-0014 for naming status: npm `croft` is free; the GitHub org and domain take a qualifier
> (e.g. `croft-dev`, `croft.app`), and the Lara Croft echo is an accepted brand shadow.
> A capture -> enrichment -> ingestion -> light-read layer over a plain-Markdown corpus the
> user owns. Reading surfaces: a local-first mobile app (in the MVP), Obsidian, GitHub web, grep,
> the CLI. Ethos: **power, convenience, trust** – trust via observability and ownership.

> **Revision 11 (2026-06-07).** Added **ADR-0024: project scaffold** – Bun runtime (core/CLI/Worker
> dev + single-binary build), one pnpm monorepo with the app in-tree, Biome, and build order
> core -> Worker -> CLI -> app. Hand-authored `CLAUDE.md` produced alongside (the one non-generated
> seed file). Prior: rev 10 rename to Croft + seeding model; rev 9 CLI distribution (0023); rev 8
> isomorphic-git verdict; rev 7 reuse pass + precedents; rev 6 app-in-MVP; rev 5 prune.

-----

## How to use this document (seeding model)

This doc is the **single source of truth** for Croft’s decisions and the **input to repo seeding**.
The seeding philosophy: keep one source of truth and **generate** the rest rather than hand-ship a
static file tree that drifts. Concretely:

1. **`CLAUDE.md` is hand-authored and reviewed** (not generated). It is the operating contract
   Claude Code reads every session, so its quality compounds – it states the non-negotiables, the
   reuse idioms, tier discipline, and what is out of scope, and it points to this doc. Author it
   deliberately; do not auto-draft it.
1. **Claude Code generates the rest at `croft init` / first run**, from this doc:
- **Explode each `ADR-NNNN` section into `docs/adr/NNNN-<slug>.md`** (`# NNNN. <Title>` /
  `- Status` / `- Tags` / `## Context ## Decision ## Consequences`/`## Open`) – a deterministic
  transform, not worth pre-generating.
- **Generate `docs/adr/README.md`** as the index.
- **Draft `docs/philosophy.md` and `docs/architecture.md`** from this doc for human review.
1. **Honor statuses:** Accepted -> locked; Proposed -> resolve before first implementation; Open
   -> tracked in 0018; Withdrawn -> placeholder.
1. **One canonical name per concept:** `capture - source - note - thread - tier - register - reader - agent`. No theming.

Rationale: the mechanical and derivable artifacts (ADR tree, index, orientation prose) are exactly
what Claude Code does reliably from a clear spec, and generating them in-repo keeps them downstream
of one source instead of a second hand-maintained copy. Only `CLAUDE.md` – small, load-bearing,
and read by the agent itself – earns a deliberate human pass up front.

-----

## Decisions

### ADR-0001. Observable plain files are the trust mechanism

**Status:** Accepted (rev 5) - **Slug:** `trust-model-observability` - **Tags:** north-star, custody

- **Decision.** Trust comes from **observability, not encryption**. Every byte the agent writes
  lands as plain Markdown in a repo the user owns; raw input is preserved (verbatim at capture, in
  git history thereafter). The operator is a **processor, not a store**.
- **Custody is a disclosed, bounded, opt-in tier** (C0/C1, ADR-0017).
- **Consequences.** A derived index is a durable copy – needs to be ephemeral (ADR-0009). The audit
  guarantee lives in git history; force-push protection is a sensible default (ADR-0007), not a hard
  gate. Irreducible floor (managed): the GitHub App private key (ADR-0017); self-host (C0) is the
  only zero-custody option.

### ADR-0002. Three-tier capture; push every interaction to the lowest tier

**Status:** Accepted (rev 3) - **Slug:** `three-tier-capture` - **Tags:** architecture, custody

- **Decision.** **Tier 0** – CLI -> GitHub directly. **Tier 1** – enriched API: client (Claude)
  enriched; edge validates + commits. **Tier 2** – auto-classify: edge runs a model (deferred,
  ADR-0020).
- **Consequences.** The ladder is the privacy gradient / trust budget: in-transit operator reads
  only at Tier 2 (ADR-0019). The reader’s on-device LLM (post-MVP) decouples enrichment locus from
  custody locus. Reused on read (ADR-0008).

### ADR-0003. Substrate: Markdown in the user’s GitHub repo, one repo per workspace

**Status:** Accepted - **Slug:** `substrate-and-layout` - **Tags:** storage, layout

- **Decision.** Plain Markdown, **one repo per workspace**. Layout: `notes/YYYY/MM/<id>-<slug>.md`;
  `sources/YYYY/MM/<id>.md`. git over new-file-per-note already *is* the append-only log.
- **Consequences.** Date-partitioning bounds directory size. Provenance defaults to same-repo
  `sources/`; separate-repo is the privacy/bulk option (ADR-0018).

### ADR-0004. One file per note; editable in place via a version-aware path

**Status:** Accepted (rev 4) - **Slug:** `file-per-note` - **Tags:** storage, concurrency

- **Decision.** **New file per note.** **Captures are creates** (conflict-free). **Edits are
  conditional updates** (ADR-0015); notes and raw sources editable.
- **Consequences.** Conflict-freedom absolute for captures; edits use optimistic concurrency.
  **Rejected – daily-file consolidation.** Narrative docs stay single-file.

### ADR-0005. Data model: note (record) + conditional source (provenance); both editable

**Status:** Accepted (rev 7) - **Slug:** `data-model-note-and-source` - **Tags:** data-model

- **Decision.**
  - **Note** (`notes/...`): system of record; body may be model-phrased. Frontmatter:
    `id, created, tags[], workspace, source, context, thread, updated, v`.
  - **Source** (`sources/...`): the raw as captured (verbatim original in git); excluded from
    browse. Frontmatter: `id, type: context, of, created, source, model, updated`.
  - Verbatim raw lives only in the source node; the source node is **conditional**.
- **Provenance on edit:** origin fields immutable; current-enrichment fields replaced
  (`model, updated`); the append-only history is git (ADR-0007). No in-file provenance array.
- **Precedents & alignment.**
  - **Obsidian Properties** for the frontmatter container – use `tags` (its reserved key),
    ISO-8601 for `created`/`updated`, avoid reserved-key clashes, so it renders natively in the
    reader.
  - **Dublin Core** for field semantics – `id`->identifier, `created`->date, `type`->type,
    `source`->source, `tags`->subject, `context`/`of`->relation.
  - **W3C PROV** for the provenance graph – note `wasDerivedFrom` source; both `wasAttributedTo`
    a model/agent; the capture `wasGeneratedBy` an activity (the thread). Echo the relation names;
    no need to emit full PROV-O. Conceptual kin: C2PA/Content Credentials; Denote for the id/filename.
- **Consequences.** Browse/read excludes `type: context` by default. **(Confirm the field set
  before it calcifies.)**

### ADR-0006. Lineage: authored note<->source and thread; related is computed; history in git

**Status:** Accepted (rev 4) - **Slug:** `lineage` - **Tags:** data-model, lineage

- **Decision.** Two authored edges: **note<->source** and **`thread`**. **Related is computed**
  (`search(seed=note)`). **No supersession field** – evolution is an edit; git is the append-only
  record.
- **Consequences.** Append-only lives at the git layer. Tag-cohort/time-window are ranking inputs
  only.

### ADR-0007. Git history is the immutability guarantee; provenance in commit trailers

**Status:** Accepted (rev 5) - **Slug:** `git-as-ledger` - **Tags:** git, provenance

- **Decision.** The **git commit history is the append-only, immutable record**. **Force-push
  protection is a sensible default, not a hard gate.** **Provenance in a commit trailer on every
  write** (`Source`, `Capture-Id`/`Edit-Of`, `Model`).
- **Consequences.** Per-note history meaningful. Read the file for current state, git for history.

### ADR-0008. Search: lexical/FTS plus the agent; edge-semantic deferred

**Status:** Accepted (rev 5) - **Slug:** `search` - **Tags:** retrieval

- **Decision.** **Lexical/tag/FTS, model-free**, and **the agent does the smart part**.
  **Edge-semantic deferred.** In v1 the app runs lexical FTS on-device over its mirror, and Claude
  does agent-augmented search over the read tools – so the edge needs no search engine in v1.
- **Consequences.** v1 retrieval: app FTS + read tools + Obsidian/grep. Server-side indexing
  (ADR-0009) is post-MVP.

### ADR-0009. No durable content index: ephemeral per-tenant materialization (post-MVP)

**Status:** Accepted (rev 5) - **Slug:** `ephemeral-materialization` - **Tags:** retrieval, indexing, custody

- **Decision.** **No persistent fleet-wide content index.** When edge search is needed, materialize
  per-tenant on demand: a **per-tenant Durable Object (SQLite), scale-to-zero, rebuild-on-wake**.
  SQLite-everywhere via the shared core (ADR-0011/0022). Tag vocabulary in KV. All
  derived/rebuildable.
- **Consequences.** Partitioning friction dissolves; cold tenants expose nothing; rebuild-on-wake
  means no freshness problem. Persisted/vector stores are deferred – vectors + ids only, never raw
  bodies.

### ADR-0010. Reader: a local-first mobile app (in the MVP, small surface)

**Status:** Accepted (rev 8) - **Slug:** `reader-app` - **Tags:** app, offline, retrieval

- **MVP surface (mindful).**
  - **Three core screens:** capture, browse/search, read. Feature-minimal – a reader + capture
    point, never an editor or knowledge graph.
  - **Offline-first:** a **local mirror (clone)** + a **local capture queue**.
  - **Lexical/FTS search on-device** (op-sqlite, model-free) over the mirror (ADR-0008/0009).
  - **App captures are Tier-0-style (raw / format-only)**; enriched capture comes from Claude/MCP.
  - **Stack:** native Expo React Native, reusing Fathom’s local-first (op-sqlite) patterns.
- **Sync via git itself (idiomatic; ADR-0022).** The app holds a clone and uses **isomorphic-git**
  (pure-JS, no native deps) to fetch/pull/push – reusing git’s delta protocol and gaining local
  history, which **removes any bespoke changes-feed/cursor** (git fetch *is* the delta).
  - **Viable in pure-JS at our scale; no native eject for the MVP.** The repo is tens of thousands
    of *tiny*, mostly-additive Markdown files and the device needs no history, so the cost structure
    is benign: **shallow clone (`depth: 1`)** is the only heavy op (seed from an edge-served tarball
    if even that drags on a low-end device); pulls/pushes move small deltas. The documented
    packfile-reparse perf trap is avoided by the app’s narrow git surface (clone once, then
    add/commit/push) and by using `statusMatrix` + the `cache` object if status is ever needed.
  - **RN is not browser-CORS-bound**, so the app talks to GitHub directly (use the `http/web`
    client); the edge Worker is only a fallback proxy. The LightningFS “flush or corrupt” warning is
    browser-only – RN uses a real-fs adapter (expo-file-system / react-native-fs) – but still
    ensure durable write ordering and treat the capture queue as source of truth until push confirms.
  - **Native fallback:** libgit2 via a Nitro/Turbo module (native modules already ship under Expo
    CNG, e.g. op-sqlite) – **gated on a benchmark (ADR-0018 #3), not the default**; it would cost
    platform-specific builds and break the core’s pure-isomorphic-TS property.
  - **MVP (C1, app via edge):** may sync HTTP-over-edge to keep v1 simple; the **git path is the
    C0 / post-MVP sync** (app pushes directly with the user’s credential).
- **Deferred to post-MVP.** On-device embedding + enrichment models (the operator-free node);
  C0 direct git sync; (the delta/cursor protocol is moot under git – ADR-0022).
- **Consequences.** Mobile capture + browse/find without bundling models – small surface. The
  model-powered, operator-free, git-syncing app is the post-MVP differentiator.

### ADR-0011. One isomorphic core enforces the convention and owns the engine

**Status:** Accepted (rev 7) - **Slug:** `components-and-core` - **Tags:** architecture, code

- **Decision.** All TypeScript, one codebase. **Shared core** (isomorphic, web-standard APIs only)
  runs in the Worker, the CLI, and the app. Owns convention/normalization, frontmatter, slug/id,
  the **write client** (one *interface*, two backends – ADR-0022), and the FTS search engine over a
  SQLite-driver interface. **CLI** – single binary, no model. **Edge** – Worker: the tool surface
  (ADR-0021) + (post-MVP) the per-tenant DO. **App** – core + op-sqlite, no models in v1.
  - **Conformance test scope:** byte-identical convention envelope (frontmatter, slug, id, file
    structure) across CLI and edge. Not enriched bodies; not cross-surface search results.
- **Consequences.** Watch Worker weight vs size limits; the core stays kilobytes.

### ADR-0012. Version the note convention from day one

**Status:** Accepted - **Slug:** `convention-versioning` - **Tags:** data-model, migration

- **Decision.** Every note carries `v: 1` from the first capture; convention changes ship with a
  forward migration (in the core); readers tolerate known prior versions.
- **Consequences.** Absorbs the live-dogfood churn risk; migrations are observable, reversible.

### ADR-0013. Phase 1: single-user, remote Worker as the live test harness

**Status:** Accepted - **Slug:** `phase-1-deployment` - **Tags:** phasing, auth, hosting, testing

- **Decision.** A **deployed remote Worker** over HTTPS (Streamable HTTP). Connector auth:
  **path-secret URL**. GitHub auth: one fine-grained PAT in a Worker secret. Static workspace map.
  **Testing = live dogfood.** The app talks to this same Worker.
- **Consequences.** The Worker is Phase 1. Keep the data model operator-agnostic to keep self-host
  open.

### ADR-0014. Documentation discipline and naming

**Status:** Accepted (rev 10) - **Slug:** `docs-discipline-and-naming` - **Tags:** docs, naming

- **Decision.** Small fixed doc set; ADRs one-idea-per-file, numbered, append-only once sealed.
  Repo-specific ADRs in-repo; general knowledge graduates to a skill (nuance parked). One canonical
  name per concept; no theming. **Name: Croft** – a small plot you own and tend (the metaphor for
  a repo you own and cultivate).
- **Name due diligence (rev 10).** Chosen after rejecting goat notes (taken in AI-notes; GoodNotes
  phonetic clash), Cairn (an adjacent agent-on-your-GitHub-repos project, try-cairn.com), and Trig
  (the W3C `.trig` RDF format, an in-domain clash). Croft: **npm `croft` is free**; the bare GitHub
  org and `croft.com` are taken, so use a **qualifier** (`croft-dev` / `croftlabs` org; `croft.app`
  or `getcroft.com`); main brand shadow is **Lara Croft**, accepted as out-of-class. The npm name
  is plumbing under the CLI (ADR-0023); the load-bearing surfaces are the GitHub org, domain,
  app-store name, and the `croft` CLI verb.
- **Open.** Confirm a free GitHub org qualifier; register a domain (ADR-0018 #7).

### ADR-0015. Write path: version-aware; atomicity and idempotency

**Status:** Accepted (rev 6) - **Slug:** `write-path-atomicity-idempotency` - **Tags:** write-path

- **Decision.** **Idempotency:** a generated **ULID** id (+ optional client idempotency key).
  **Edits:** SHA-conditional updates; the write client is version-aware from day one; v1 exposes
  **creates only**. **Atomicity:** note + source in one commit (Git Data API tree, or two Contents
  calls for v1 simplicity).
- **Open.** Tree vs two Contents calls; edit conflict-resolution policy (ADR-0018).

### ADR-0016. Index freshness and reader sync

**Status:** Withdrawn (rev 5) - **Slug:** `index-freshness-sync` - **Tags:** withdrawn

- Folded into ADR-0009 (rebuild-on-wake => no freshness problem) and ADR-0010/0022 (git-as-sync).
  Placeholder; do not seed as a concern.

### ADR-0017. Custody tiers, auth, and distribution

**Status:** Proposed (Phase 2) - **Slug:** `custody-tiers-auth-distribution` - **Tags:** auth, custody, distribution, self-host

- **Decision (proposed) – two tiers; user picks; app-store default C1.**
  - **C0 – zero custody (self-host / BYO).** User supplies their own GitHub App / PAT; operator
    holds nothing. (The git-syncing app, ADR-0010, is the natural C0 client.)
  - **C1 – managed custody.** Repo in the user’s own GitHub account. GitHub App scoped to
    **Contents: read-write + Metadata: read only**, installed on **only the one notes repo**; holds
    durably **only the App private key**; mints short-lived tokens per request; persists none.
  - **MCP auth:** OAuth 2.1 + CIMD (DCR deprecated fallback); RFC 9728 PRM; RFC 8707; Streamable
    HTTP; no token passthrough.
  - **Onboarding wrapper (C1):** OAuth in + one App-install click on an auto-created repo; set
    sensible repo defaults (incl. force-push protection); write per-user config.
- **Consequences.** Per-token capability bounded to one repo for <=1h. Population breadth: the App
  key spans all C1 installs – the irreducible C1 floor; minimize, don’t pretend to erase. No-GitHub
  mass-consumer not served. App-store: fine fit.
- **Open.** App-sync default (lean C0); onboarding partial-failure recovery; directory submission.

### ADR-0018. Open questions register

**Status:** Open - **Slug:** `open-questions-register` - **Tags:** tracking

1. Tag normalization thresholds / policy.
1. Edge operational observability – logging/tracing, or is data-observability enough?
1. **RN isomorphic-git validation (go/no-go for pure-JS vs native).** Confirm the fs-adapter
   surface (expo-file-system / react-native-fs: `readFile/writeFile/readdir/stat/lstat/symlink`…)
   is complete, then benchmark a **`depth:1` clone + pull + push** against a ~20-50k-file corpus on
   a **mid-range Android** device (not a simulator). Pure-JS is the default; native libgit2 only if
   the benchmark fails (ADR-0010/0022). Run this as an early spike – it is load-bearing.
1. Provenance placement – same-repo `sources/` vs separate repo.
1. Auto-classify edge model (Tier 2) – Workers AI vs LLM API.
1. Skill vs in-repo split nuance (ADR-0014).
1. **Name follow-through (Croft chosen, ADR-0014).** Confirm a free GitHub org qualifier
   (`croft-dev` / `croftlabs` / `getcroft`) and register a domain (`croft.app` / `getcroft.com`);
   npm `croft` already free. Lara Croft is an accepted out-of-class shadow.
1. App-sync default – C0 vs C1 (ADR-0010/0017). Lean C0.
1. On-device enrichment model – which model/size/quantization (post-MVP).
1. Edit conflict-resolution policy (ADR-0015).

### ADR-0019. Cost and trust budget

**Status:** Accepted (rev 5) - **Slug:** `cost-and-compute-budget` - **Tags:** cost, performance, custody

- **It’s text; it’s cheap.** No egress charges; FTS avoids full scans; the real floor is the
  $5/mo Workers Paid base.
- **Two rules:** (1) never build/rebuild the index on the read path; (2) rebuild in bulk (Git Trees
  API + tarball) – the constraint is GitHub’s rate limit, not dollars.
- **Trust budget:** in-transit operator reads only at Tier 2; the operator-free C0 reader touches
  the operator at no point.

### ADR-0020. MVP scope (Phase 1, v1)

**Status:** Accepted (rev 6) - **Slug:** `mvp-scope` - **Tags:** scope, phasing

- **In v1.** Shared core (creates exposed); **CLI** (Tier 0); **Edge Worker** with the tool surface
  (ADR-0021); **mobile app** (ADR-0010) small surface, no on-device models; GitHub creates; basic
  tag normalization; one-time repo init (ADR-0021); read/search via app + Obsidian/grep.
- **Deferred.** On-device models; edits as an exposed op; edge search index / per-tenant DO /
  semantic; Tier-2 auto-classify; C0 git sync; all of Phase 2.
- **Consequences.** Proves the wedge (capture + your-own-repo, desktop + phone) without the heaviest
  components.

### ADR-0021. Tool & sync contract (MVP)

**Status:** Proposed (shapes ready to confirm) - **Slug:** `tool-and-sync-contract` - **Tags:** api, mcp, app

- **Transports over one core (ADR-0022).** The **MCP tools (Claude)** and the **app’s HTTP
  endpoints** are thin transports over the **same core handlers** – capture/read logic is written
  once.
- **Tool conventions (MCP).** Each tool = name + description + JSON Schema `inputSchema` +
  `outputSchema`; return `structuredContent` plus a text fallback; use `isError`.
- **Write.**
  - `capture_enriched(workspace, output{title?, tags[], type, body}, raw?, thread?, idempotency_key?)`
    -> `{id, path, url, applied_tags[]}`. Client pre-enriched (Tier 1); edge normalizes tags
    (core) and commits the note (+ source when `raw` present and distinct).
  - **App/CLI quick-capture** uses the same endpoint with a minimal output (format-only, Tier 0).
- **Read.** `list_recent(workspace, since?, limit=20)`; `read_note(workspace, id, include_source=false)`; `list_tags(workspace)`; `list_workspaces()`.
- **Conventions.** Errors -> **RFC 9457 Problem Details** (`type/title/status/detail` +
  `retryable`). Idempotency -> **Idempotency-Key** (Stripe/IETF). Pagination -> opaque **cursor**.
- **App sync.** Via **git** (ADR-0010/0022), not a bespoke API; MVP may use a simple HTTP pull
  through the edge.
- **Init.** One-time scaffold (CLI `init` or edge bootstrap): create `notes/` + `sources/`, write
  the convention version, seed an empty KV vocab, store the PAT + path-secret (Phase 1).
- **Open.** Final field names/shapes.

### ADR-0022. Maximal code & protocol reuse; idiomatic boundaries

**Status:** Accepted (rev 7) - **Slug:** `reuse-and-idioms` - **Tags:** architecture, code, protocol

- **Context.** Maximize reuse of code and protocols across the stack; speak the ecosystem’s idioms
  at every boundary rather than inventing.
- **Decision.**
1. **One core, three runtimes** (ADR-0011): convention/normalization, frontmatter, slug/id, **tag
   normalization**, migrations, the write client, and the FTS search engine all live in the
   shared core and run in the Worker, the CLI, and the app.
1. **One handler set, two transports:** capture/read logic is written once as core functions;
   the **MCP tools** (Claude) and the **app’s HTTP endpoints** are thin adapters over them
   (resolves the ADR-0021 open).
1. **One schema, many uses:** define the convention and tool I/O once (e.g. a TS schema that
   emits JSON Schema); reuse it for MCP `inputSchema`/`outputSchema`, HTTP request validation,
   frontmatter validation, and the conformance test.
1. **One write-client *interface*, two backends:** **GitHub REST** (Contents / Git Data API) for
   the **stateless edge** (no clone), and **isomorphic-git** for **clone-holders** (CLI, app).
   Same interface in the core; the runtime picks the backend. (Mirrors the SQLite-driver pattern.)
1. **Git as the device sync protocol:** the app uses isomorphic-git to fetch/pull/push, reusing
   git’s delta protocol and gaining local history – so there is **no bespoke changes-feed/cursor**
   to build (ADR-0010). Pure-JS is viable at our scale (shallow clone; tiny additive files);
   native libgit2 is a benchmark-gated fallback (ADR-0018 #3), not the default.
1. **Idiomatic standard protocols at each boundary:** **MCP** (agent), **HTTP + RFC 9457 +
   Idempotency-Key + cursor** (app/integrators), **git** (storage + device sync), **OAuth 2.1 /
   CIMD** (auth, Phase 2). No bespoke protocols anywhere.
1. **Distributed-but-identical vocab:** tag normalization (core) runs over a vocab that is in KV
   on the edge and a synced copy on the device, so every capture path normalizes the same way.
- **Consequences.** Less code, fewer drift surfaces, and every boundary is something readers
  (Obsidian), clients (MCP hosts), and integrators (HTTP/git) already speak – alignment is both
  cheaper and more observable. The conformance test (ADR-0011) guards the one place reuse must be
  exact: the convention envelope.

### ADR-0023. CLI packaging & distribution

**Status:** Accepted (rev 9) - **Slug:** `cli-distribution` - **Tags:** distribution, cli, packaging, supply-chain

- **Context.** ADR-0011 specifies a single-binary CLI but not how it reaches developers. The
  audience already lives in the Node / npm / Cloudflare ecosystem (the edge is a Worker deployed
  via wrangler), so distribution should meet them there.
- **Decision.**
  - **npm is the primary discovery + install channel for the CLI:** `npx <cli>` and
    `npm i -g <cli>` – where JS/TS developers look first (the pattern esbuild / turbo / biome use
    even as compiled tools).
  - **Also ship a compiled single binary** via Homebrew + a `curl | sh` installer + GitHub
    Releases, honoring the near-zero-deps promise (ADR-0011) for non-npm users.
  - **Publish with npm provenance attestations** (signed, build-provenance publish) so the supply
    chain is observable – on-ethos for a tool that writes to the user’s GitHub repo (ADR-0001).
  - **`init` is a CLI subcommand** (`<cli> init`, ADR-0021), not a separate `create-*` package.
- **Per-artifact channels (for the record).** App -> App Store / Play Store via Expo EAS; edge
  Worker -> deployed via wrangler (managed) or a self-host template (C0); remote MCP server -> the
  Worker URL added to the client’s MCP config (not a package); shared core -> internal monorepo
  workspace until/unless an SDK is wanted (then a scoped npm package).
- **Consequences.** The npm package name is worth securing but is plumbing under the CLI, not the
  brand’s center of gravity (that is the GitHub org, the domain, the app-store name, and the CLI
  invocation word). Provenance publishing adds a CI step; acceptable.

### ADR-0024. Project scaffold: runtime, repo layout, build order

**Status:** Accepted (rev 11) - **Slug:** `project-scaffold` - **Tags:** scaffold, toolchain, phasing

- **Context.** ADRs 0011 / 0023 imply a toolchain but do not pin the runtime, the repo shape, or
  the build order. Decided with the maker’s house standards (Fathom) in mind.
- **Decision.**
  - **Runtime: Bun** for the core, CLI, and Worker dev loop – native single-binary compile
    (ADR-0023) and web-standard APIs (ADR-0011). Workers run on workerd in production; Bun is the
    dev runtime, bundler, test runner, and binary builder.
  - **Repo: one pnpm monorepo, app included** (e.g. `packages/core`, `apps/worker`, `apps/cli`,
    `apps/mobile`). Accept the Metro-vs-Worker build friction in exchange for one source tree and a
    shared core consumed without publishing.
  - **Lint/format: Biome** (house standard); TypeScript strict.
  - **Build order: core -> Worker -> CLI -> app.** Core first (convention, schema, write-client
    interface, FTS); the Worker next as the MCP tool surface + HTTP, which is the live-dogfood
    harness (ADR-0013); CLI and app follow.
- **Consequences.** Bun unifies runtime + bundler + test + single-binary, shrinking the toolchain.
  RN/Expo inside the monorepo is the first scaffolding risk to watch (Metro config, workspace
  hoisting). The app is in-tree but not on the critical path until after the dogfood loop works.