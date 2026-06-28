// @zonot/core — the isomorphic convention core.
// Surface per docs/specs/core-spec.md. Web-standard APIs only; runs in Bun
// (CLI), workerd (Worker), and Hermes/JSC (mobile RN).

// Public re-exports across the modular subpaths.
// Consumers may also import directly from the subpaths to keep their bundle lean:
//   import type { CaptureInput } from '@zonot/core/schema';
//   import { SHAConflictError } from '@zonot/core/errors';

export * from './convention/index.ts';
export * from './errors/index.ts';
export * from './provenance/index.ts';
export * from './schema/index.ts';
// Backends NOT re-exported here — keep import-path discipline so the
// Worker bundle never accidentally pulls in isomorphic-git, etc.
export type { WriteClient } from './write-client/interface.ts';
