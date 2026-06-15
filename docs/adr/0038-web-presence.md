---
adr: 0038
title: Web presence — marketing, docs, and trust front
status: Accepted (rev 1)
slug: web-presence
tags: [web, marketing, docs, distribution, trust, scope]
---

# ADR-0038. Web presence: marketing, docs, and trust front

## Context

Every shipped surface has a spec except the public web. `zonot.app` is reserved
([ADR-0014](0014-docs-discipline-and-naming.md)) and the brand brief (`docs/brand/brief.md`)
holds the raw material — positioning line, tagline shortlist, palette, voice — but nothing
connects it to a buildable artifact, and three load-bearing dependencies already assume a site
exists:

1. **The API points at it.** The Worker emits RFC 9457 `type` URIs as
   `https://zonot.app/problems/<name>` ([ADR-0035](0035-worker-runtime-discipline.md)). Those
   are meant to resolve to human-readable pages — an *operational* dependency, not marketing.
2. **C1 needs a public privacy URL.** The GitHub App install ([ADR-0017](0017-custody-tiers-auth-distribution.md))
   requires a public-facing privacy-policy URL to ship at all.
3. **v1.1 sells something.** Managed C1 ([ADR-0033](0033-billing-and-entitlement.md)) needs a
   pricing/storefront surface; the trust pitch ([ADR-0001](0001-observable-files.md)/[ADR-0027](0027-longevity-and-revenue.md)/[ADR-0037](0037-threat-model.md))
   needs accurate, public trust pages, not slogans.

Precedent: the maker's other app, Fathom, ships its site at `getfathom.ca` on **Astro** — a
known-good, in-house toolchain to follow rather than re-evaluate. Companion implementation
contract: **[`docs/specs/web-spec.md`](../specs/web-spec.md)**.

## Decision

### Three jobs, one site

The web presence is not a landing page; it is three braided surfaces:

1. **Marketing / landing** — positioning, taglines, screenshots, install + app-store CTAs.
2. **Product & problem docs** — the `/problems/<name>` pages that resolve the
   [ADR-0035](0035-worker-runtime-discipline.md) type-URI taxonomy (operationally required),
   plus getting-started / self-host / CLI docs.
3. **Trust / legal / pricing** — privacy policy, terms, the no-train + retention claim (worded
   to [ADR-0037](0037-threat-model.md), no overclaim), the open-core license page
   ([ADR-0027 §Mechanism](0027-longevity-and-revenue.md#mechanism-source-available-non-compete-licensing)),
   a security/threat summary, a graceful-obsolescence / data-ownership page, and pricing (v1.1).

### Stack — Astro static on Cloudflare Pages (follows Fathom)

Astro with static output, deployed to **Cloudflare Pages** — same account as the Worker, one
vendor. It lives in the monorepo as **`apps/web`** but is **explicitly not a core runtime**: it
does not consume `packages/core`, runs no isomorphic-git, and is **outside the conformance test**.
Zonot stays "one core, **three runtimes**" ([ADR-0011](0011-components-and-core.md)/[ADR-0024](0024-project-scaffold.md));
`apps/web` is a distribution-front artifact, not a fourth runtime. The Pages dependency is a
**soft, content-free** one (static HTML, trivially re-hostable) — it does not deepen the
[ADR-0028](0028-dependency-and-risk-register.md) Cloudflare gravity well the way the v1.2
Durable Object does.

### Domain & routing

- `zonot.app` apex + `www` → the site (Cloudflare Pages).
- `api.zonot.app` → the Worker.
- The **site owns `/problems/<name>`**; the Worker's RFC 9457 `type` URIs resolve to those static
  pages. The brand brief's `zonot.app` reservation now has a concrete consumer.

### Content discipline

The brand brief governs voice and visual direction; **no theming**
([ADR-0014](0014-docs-discipline-and-naming.md)) — water-feel in palette and voice, never overt
naming; the cenote provenance is a quiet footer/About footnote, never a headline. Reuse the
neutral two-tier swappable-token discipline locked for mobile ([ADR-0034](0034-mobile-app-spec.md)).
**Trust-page copy must match [ADR-0037](0037-threat-model.md) exactly** — "no-train (contractually
verified), retention bounded by the upstream provider's DPA" — because the public site is the
surface where an overclaim bites hardest; trust copy is reviewed like a spec, not marketing fluff.

### Analytics

The [ADR-0037](0037-threat-model.md) behavioral line applies to the marketing surface too:
**cookieless, content-free** web analytics (e.g. Cloudflare Web Analytics). No third-party
content/behavior trackers (PostHog/Mixpanel/GA) on the public site — consistent with the trust
pitch.

### Scope tiers (sequenced with the release train, [ADR-0020](0020-mvp-scope.md))

- **v1.0** — landing (positioning + self-host/CLI install CTA), the `/problems/<name>` pages
  (operationally required by the Worker), getting-started / self-host docs, and a privacy /
  data-handling page honest about C0 (self-host holds nothing). No pricing, no accounts.
- **v1.1** — pricing page, full legal (terms + the privacy page that doubles as the GitHub App's
  public URL), the "Sign in with GitHub" managed-C1 marketing entry, account/billing support pages.
- **v1.2** — hosted-inference explainer (opt-in, no-train, output-observable;
  [ADR-0002](0002-three-tier-capture.md)/[ADR-0027](0027-longevity-and-revenue.md)/[ADR-0037](0037-threat-model.md)),
  updated pricing.

## Consequences

`zonot.app` stops being a bare reservation: the Worker's problem URIs resolve, the GitHub App
gets its required privacy URL, and the paid tier gets a storefront. `apps/web` adds a non-core
member to the monorepo (the Astro/Metro/Worker multi-build friction was already accepted,
[ADR-0024](0024-project-scaffold.md)). The site becomes a **trust-claim surface**, so its copy is
governed by [ADR-0037](0037-threat-model.md) and reviewed, not improvised.

## Open

- **Docs tooling** — Astro Starlight for the docs section vs. hand-rolled MDX (lean in-repo MDX,
  no CMS).
- **Docs location** — `/docs` path vs. `docs.zonot.app` subdomain (lean `/docs` at v1.0, reassess
  if it grows).
- **Web storefront wiring** ties to [ADR-0033](0033-billing-and-entitlement.md)'s open web rail
  (Helcim vs. Merchant-of-Record).
- **App-store asset pipeline** shared with mobile (screenshots, icons) — owner TBD.
- **Launch gates** — trademark (ZONOS clearance), `@zonot` handle sweep, and the brand-brief
  "open items before launch" gate public launch copy ([ADR-0014](0014-docs-discipline-and-naming.md)/brand brief).
