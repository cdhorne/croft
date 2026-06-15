# @zonot/web

Astro static site on Cloudflare Pages — `zonot.app` (marketing + docs + trust front).

**Not a core runtime.** No `packages/core` import; excluded from conformance.

Scaffolding. Full Astro init (routes + content collections + the `/problems/<name>` directory)
lands as the web track progresses. Owns the `/problems/<name>` URI namespace emitted by the
Worker (ADR-0035 §1.1).

See:

- [`../../docs/specs/web-spec.md`](../../docs/specs/web-spec.md) — the implementation contract.
- [ADR-0038](../../docs/adr/0038-web-presence.md) — three braided jobs, one site.
