# @zonot/core

The isomorphic convention core. Web-standard APIs only; runs in Bun (CLI), workerd (Worker),
and Hermes/JSC (mobile RN).

Surface (per [`docs/specs/core-spec.md`](../../docs/specs/core-spec.md)):

- Zod schema → JSON Schema for MCP I/O, HTTP validation, frontmatter validation, conformance.
- Convention envelope: frontmatter, slug, ULID id, layout.
- Body splitter (compiled-truth / timeline).
- Tag normalization.
- Write-client interface (one interface, two backends).
- SQLite FTS5 schema + `SearchEngine` + `IndexWriter` over a driver-injected `SqliteAdapter`.
- Conformance test harness (byte-identical envelope across runtimes).

Anchored by [ADR-0011](../../docs/adr/0011-components-and-core.md) and
[ADR-0022](../../docs/adr/0022-reuse-and-idioms.md). Built first per
[ADR-0024](../../docs/adr/0024-project-scaffold.md).
