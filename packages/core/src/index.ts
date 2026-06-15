// @zonot/core — the isomorphic convention core.
// Phase 0 surface (per ROADMAP):
//   - schema (Zod → JSON Schema, ADR-0022)
//   - convention envelope (frontmatter / slug / id / layout — ADR-0003/0005)
//   - body splitter (ADR-0005 compiled/timeline shape)
//   - tag normalization (ADR-0005 / phase-0-spec §1.5)
//   - write-client interface (ADR-0022 / docs/specs/core-spec.md §3)
//   - FTS schema + SearchEngine (ADR-0008 / docs/specs/core-spec.md §2)
//   - conformance test harness (ADR-0011 / docs/specs/core-spec.md §4)
// Phase 0 build-out lands incrementally. This file exports the surface as it stabilizes.

export const CONVENTION_VERSION = 1 as const;
