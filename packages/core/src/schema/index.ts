// Public schema surface for @zonot/core/schema.
//
// Wire-side fields use snake_case (`idempotency_key`, `base_sha`, `applied_tags`,
// `created_after`) because these schemas double as the HTTP / MCP wire contract
// (one schema, many uses — ADR-0022). Pure TypeScript internals (error
// constructors, FTS adapter interfaces) use camelCase. The boundary is the
// schema layer: anything declared with Zod here is wire shape.

export * from './capture.ts';
export * from './frontmatter.ts';
export * from './json-schema.ts';
export * from './search.ts';
export * from './write.ts';
