// Typed errors. These map 1:1 to the RFC 9457 type URIs at the transport
// boundary (docs/specs/worker-spec.md §1.1, ADR-0035 §1.1).
// Core throws these; transports translate them.

export class SHAConflictError extends Error {
  override readonly name = 'SHAConflictError';
  constructor(
    public readonly path: string,
    public readonly shaExpected: string,
    public readonly shaActual: string | null,
  ) {
    super(`SHA conflict at ${path}: expected ${shaExpected}, got ${shaActual ?? 'deleted'}`);
  }
}

export class IdempotencyReplayError extends Error {
  override readonly name = 'IdempotencyReplayError';
  constructor(
    public readonly key: string,
    public readonly cached: unknown,
    public readonly attemptedBodyHash: string,
  ) {
    super(`Idempotency key ${key} replayed with a different body`);
  }
}

export class WorkspaceNotInitializedError extends Error {
  override readonly name = 'WorkspaceNotInitializedError';
  constructor(public readonly workspace: string) {
    super(`Workspace ${workspace} is not initialized`);
  }
}

export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';
  constructor(public readonly resource: string) {
    super(`Not found: ${resource}`);
  }
}

export class UnauthorizedError extends Error {
  override readonly name = 'UnauthorizedError';
  constructor(public readonly detail: string = 'authentication required') {
    super(detail);
  }
}

export class RateLimitedError extends Error {
  override readonly name = 'RateLimitedError';
  constructor(public readonly retryAfterSeconds: number) {
    super(`Rate limited; retry after ${retryAfterSeconds}s`);
  }
}

export class UpstreamRateLimitedError extends Error {
  override readonly name = 'UpstreamRateLimitedError';
  constructor(public readonly retryAfterSeconds: number) {
    super(`Upstream rate limited; retry after ${retryAfterSeconds}s`);
  }
}

export class UpstreamDownError extends Error {
  override readonly name = 'UpstreamDownError';
  constructor(public readonly detail: string) {
    super(detail);
  }
}

export class ValidationError extends Error {
  override readonly name = 'ValidationError';
  constructor(
    public readonly issues: Array<{ path: string; message: string }>,
    public readonly detail: string = 'request failed schema validation',
  ) {
    super(detail);
  }
}

// A stored note/source file could not be parsed back into the convention shape
// (missing frontmatter block, malformed YAML, or frontmatter that violates the
// schema). This is a data-integrity condition in the user's repo — not a caller
// error — so it maps to `internal` (500 + Sentry) at the transport, surfaced
// with a trace id rather than silently swallowed.
export class NoteFileParseError extends Error {
  override readonly name = 'NoteFileParseError';
  constructor(
    public readonly path: string,
    public readonly reason: string,
  ) {
    super(`failed to parse ${path}: ${reason}`);
  }
}
