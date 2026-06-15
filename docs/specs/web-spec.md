# Web spec — marketing, docs, and trust front

> **Companion to [ADR-0038](../adr/0038-web-presence.md).** This document is the implementation
> contract for `apps/web` — the public site at `zonot.app`. It is hand-authored. When an ADR and
> this spec disagree, the ADR wins. ADR-0038's "Decision" bullets summarize; this doc carries the
> route map, content inventory, and the operational `/problems/` contract an agent or reviewer needs.

## 0. Scope

What this spec pins:

1. The **site map** — the route table across the three jobs (marketing, docs, trust/legal),
   tiered to the v1.0 → v1.1 → v1.2 release train.
2. The **stack & repo layout** — Astro, static output, Cloudflare Pages, `apps/web` placement,
   and why it sits outside the core-runtime triad.
3. The **domain & routing** — apex/`www` vs. `api.`, and the `/problems/<name>` ownership split.
4. The **`/problems/<name>` contract** — the static pages that resolve the [ADR-0035](../adr/0035-worker-runtime-discipline.md)
   RFC 9457 type-URI taxonomy. This is the one operationally-required surface.
5. The **content discipline** — brand application, the trust-copy source-of-truth rule, SEO/perf
   budgets, and the content-free analytics rule.

What this spec deliberately does NOT cover:

- **Visual design / final copy.** The brand brief (`docs/brand/brief.md`) governs voice, palette,
  and taglines; this spec pins structure and constraints, not the finished pixels.
- **Billing/checkout internals** (the web rail is [ADR-0033](../adr/0033-billing-and-entitlement.md);
  its instrument — Helcim vs. MoR — is still open).
- **OAuth / GitHub App flow detail** ([ADR-0017](../adr/0017-custody-tiers-auth-distribution.md));
  the site only links into it.
- **App-store listing assets** (screenshots, icons) — shared with mobile, owner TBD.

## 1. Site map

Routes tiered to the release train ([ADR-0020](../adr/0020-mvp-scope.md)). A route's tier is the
release it first ships in.

| Route | Job | Tier | Notes |
|-------|-----|------|-------|
| `/` | marketing | v1.0 | Positioning, tagline, hero, self-host/CLI install CTA |
| `/problems/<name>` | docs | v1.0 | The RFC 9457 pages — see §4 (operationally required) |
| `/docs` | docs | v1.0 | Getting started, self-host, CLI quickstart |
| `/docs/self-host` | docs | v1.0 | C0 / `zonot serve` path ([ADR-0036](../adr/0036-cli-surface.md)) |
| `/privacy` | trust | v1.0 | Data-handling; honest about C0 (self-host holds nothing). Becomes the GitHub App URL at v1.1 |
| `/trust` | trust | v1.0 | Observability + ownership pitch; threat-model summary ([ADR-0037](../adr/0037-threat-model.md)) |
| `/license` | trust | v1.0 | Open-core, source-available, non-compete ([ADR-0027 §Mechanism](../adr/0027-longevity-and-revenue.md#mechanism-source-available-non-compete-licensing)) |
| `/longevity` | trust | v1.0 | Graceful obsolescence / "you keep your data" |
| `/about` | marketing | v1.0 | Quiet cenote provenance footnote lives here (or footer) |
| `/pricing` | trust | **v1.1** | C1 managed tier ([ADR-0033](../adr/0033-billing-and-entitlement.md)) |
| `/terms` | trust | **v1.1** | Terms of service |
| `/support` | trust | **v1.1** | Contact / account / billing help |
| `/signin` (entry) | marketing | **v1.1** | "Sign in with GitHub" managed-C1 entry → OAuth ([ADR-0017](../adr/0017-custody-tiers-auth-distribution.md)) |
| `/hosted-inference` | docs | **v1.2** | Opt-in, no-train, output-observable explainer ([ADR-0002](../adr/0002-three-tier-capture.md)/[ADR-0037](../adr/0037-threat-model.md)) |

Footer (all tiers): the cenote provenance footnote (one understated line per the brand brief),
license, privacy, trust. No origin story on the homepage.

## 2. Stack & repo layout

- **Framework: Astro**, static output (`output: 'static'`) — follows the Fathom precedent
  (`getfathom.ca`). Islands only where interactivity is genuinely needed (e.g. a copy-to-clipboard
  install snippet); the site is content-first.
- **Docs section:** in-repo MDX (lean against a CMS). Astro Starlight vs. hand-rolled is the one
  open tooling call (ADR-0038 Open) — default to plain MDX until the docs volume justifies Starlight.
- **Repo layout:** `apps/web` in the pnpm monorepo, alongside `apps/worker`, `apps/cli`,
  `apps/mobile`. **Not a core runtime:** it does **not** import `packages/core`, runs no
  isomorphic-git, and is **excluded from the conformance test** ([ADR-0011](../adr/0011-components-and-core.md)).
  The "one core, three runtimes" identity is unchanged — `apps/web` is a distribution front, not a
  fourth runtime.
- **Toolchain:** Biome + TypeScript strict like the rest of the monorepo ([ADR-0024](../adr/0024-project-scaffold.md)).
- **Build:** `astro build` → static assets; no Bun-single-binary step (that is CLI-only,
  [ADR-0023](../adr/0023-cli-distribution.md)).

## 3. Domain & routing

| Host | Target | Notes |
|------|--------|-------|
| `zonot.app`, `www.zonot.app` | Cloudflare Pages (`apps/web`) | The site. `www` 301s to apex |
| `api.zonot.app` | the Worker ([ADR-0035](../adr/0035-worker-runtime-discipline.md)) | All MCP + HTTP API traffic |
| `zonot.app/problems/*` | static pages in `apps/web` | Resolves the Worker's RFC 9457 type URIs — §4 |

The Worker keeps emitting absolute `https://zonot.app/problems/<name>` URIs; the site is
responsible for those paths resolving. A change to either side is a coordinated change — the URI
string is a contract between [ADR-0035](../adr/0035-worker-runtime-discipline.md) and this spec.

## 4. The `/problems/<name>` contract

Each entry in the [ADR-0035](../adr/0035-worker-runtime-discipline.md) taxonomy has a static page
at the matching path. A page explains, for a human (developer or support-reading user): what the
problem means, the HTTP status, whether it is retryable, and what to do next. **The set of pages
must stay in lockstep with the Worker taxonomy** — adding a `type` URI in the Worker without a
page here is a broken link in a live API response.

| Path | HTTP | Retryable | One-line gist |
|------|------|-----------|---------------|
| `/problems/sha-conflict` | 412 | no | Concurrent edit; refetch + reapply ([ADR-0026](../adr/0026-operation-vocabulary.md)) |
| `/problems/idempotency-replay` | 422 | no | Same Idempotency-Key, different body, within 24h |
| `/problems/uninitialized` | 409 | no | Workspace not initialized yet |
| `/problems/not-found` | 404 | no | Note id / workspace not resolvable |
| `/problems/unauthorized` | 401 | no | Bad path-secret (v1.0) / expired OAuth token (v1.1) |
| `/problems/rate-limited` | 429 | yes | Per-tenant limit; honor `Retry-After` |
| `/problems/upstream-rate-limited` | 429 | yes | GitHub quota echoed; honor `Retry-After` |
| `/problems/upstream-down` | 502 | yes | GitHub 5xx; retry later |
| `/problems/validation` | 400 | no | Schema/parse failure; see `errors[]` in the body |
| `/problems/internal` | 500 | no | Unexpected; quote the `trace_id` to support |

Pages are content-free of any user data (they are generic per type). The `trace_id` belongs to the
API response, not the page.

## 5. Content discipline

### 5.1 Brand application

- Voice/visual per `docs/brand/brief.md`: calm, clear, deep; deep blues/teals; a single shaft of
  light, the threshold, clarity to the bottom.
- **No theming** ([ADR-0014](../adr/0014-docs-discipline-and-naming.md)): water-feel in palette and
  voice only — no Maya glyphs, no "sacred well" mysticism, no fantasy/gaming cues, no nautical/archive
  metaphors in copy. Reuse the neutral two-tier swappable design tokens from
  [ADR-0034](../adr/0034-mobile-app-spec.md) so palette literals carry the flavor and semantic tokens
  stay generic.
- **Provenance handled quietly:** at most one understated footer/About line; never a homepage
  headline; frame as "adapted from" and credit Yucatec Maya if stated at all (brand brief).

### 5.2 Trust copy is governed, not improvised

Any claim about data handling, training, retention, or custody on `/trust`, `/privacy`,
`/license`, `/longevity`, or `/hosted-inference` must match its ADR verbatim in substance:

- No-train / retention: **"no-train (contractually verified), retention bounded by the upstream
  provider's DPA"** — the softened wording from [ADR-0037](../adr/0037-threat-model.md); do **not**
  reinstate the retired "no-retention" overclaim.
- Behavioral privacy → C0 is the floor; say so honestly ([ADR-0037](../adr/0037-threat-model.md)).
- Open-core / self-host-permitted / converts-to-open framing per
  [ADR-0027 §Mechanism](../adr/0027-longevity-and-revenue.md#mechanism-source-available-non-compete-licensing).

Treat these pages like a spec: changes are reviewed against the ADR, not the marketing calendar.

### 5.3 Budgets

- **Perf:** static-first; Lighthouse performance ≥ 95 on the landing and docs pages; no
  render-blocking third-party scripts; images responsive + lazy.
- **SEO:** per-page `<title>`/meta/OG; sitemap + `robots.txt`; the `/problems/` pages indexable
  (they are real documentation).
- **Accessibility:** WCAG 2.1 AA — semantic headings, focus states, contrast (the deep-blue palette
  must clear AA against its text).

### 5.4 Analytics

Cookieless, content-free (e.g. Cloudflare Web Analytics). **No** GA/PostHog/Mixpanel or any
third-party content/behavior tracker — the public site holds to the same behavioral line as the
operator stack ([ADR-0037](../adr/0037-threat-model.md)). No cookie banner needed because no
tracking cookies are set.

## 6. Deploy

- **Cloudflare Pages**, same account as the Worker. Production = apex/`www`; preview deployments
  per branch for review.
- DNS: apex/`www` → Pages; `api` → Worker. The `/problems/*` paths must be live before (or with)
  any Worker deploy that emits them.
- CI: build + `biome check` + link-check (catch a missing `/problems/<name>` page). Per the
  workflow rule, automated/bug-fix tasks do not modify CI workflow files; this is a human-authored
  pipeline.

## 7. Open items (for build to close)

- **Starlight vs. plain MDX** for `/docs` (ADR-0038 Open).
- **`/docs` path vs. `docs.zonot.app`** subdomain (lean path at v1.0).
- **Web payment-rail storefront** wiring on `/pricing` — gated on
  [ADR-0033](../adr/0033-billing-and-entitlement.md)'s Helcim-vs-MoR open call.
- **App-store asset pipeline** shared with mobile (screenshots/icons) — owner TBD.
- **Launch-gate copy** — trademark (ZONOS clearance) and the brand-brief "open items before launch"
  gate the public marketing language ([ADR-0014](../adr/0014-docs-discipline-and-naming.md)/brand brief).
