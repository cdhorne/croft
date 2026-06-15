// GitHubRestBackend — Worker-side write backend.
// Phase 0 skeleton; full implementation lands in Phase 1 alongside the
// MCP + HTTP handler set (docs/specs/worker-spec.md).
//
// Imported only by the Worker (and by tests). Apps that don't ride the
// edge skip this subpath entirely so the isomorphic-git path's footprint
// is irrelevant to their bundle.

import type {
  AppendInput,
  CaptureInput,
  CorrectInput,
  DeleteInput,
  HeadInput,
  HeadResult,
  InitInput,
  InitResult,
  NoteRecord,
  ReadInput,
  UndoInput,
  WriteResult,
} from '../../schema/index.ts';
import type { WriteClient } from '../interface.ts';

export interface GitHubRestBackendConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string; // default: main
  /** Override for GitHub Enterprise. Defaults to https://api.github.com */
  baseUrl?: string;
}

const notImplemented = (op: string): Error =>
  new Error(`GitHubRestBackend.${op}: Phase 0 skeleton — implementation lands in Phase 1`);

export class GitHubRestBackend implements WriteClient {
  readonly #config: GitHubRestBackendConfig;

  constructor(config: GitHubRestBackendConfig) {
    this.#config = config;
  }

  /** Resolved configuration (test introspection; not part of the WriteClient surface). */
  getConfig(): Readonly<GitHubRestBackendConfig> {
    return this.#config;
  }

  init(_input: InitInput): Promise<InitResult> {
    return Promise.reject(notImplemented('init'));
  }

  capture(_input: CaptureInput): Promise<WriteResult> {
    return Promise.reject(notImplemented('capture'));
  }

  append(_input: AppendInput): Promise<WriteResult> {
    return Promise.reject(notImplemented('append'));
  }

  correct(_input: CorrectInput): Promise<WriteResult> {
    return Promise.reject(notImplemented('correct'));
  }

  undo(_input: UndoInput): Promise<WriteResult> {
    return Promise.reject(notImplemented('undo'));
  }

  delete(_input: DeleteInput): Promise<WriteResult> {
    return Promise.reject(notImplemented('delete'));
  }

  readNote(_input: ReadInput): Promise<NoteRecord> {
    return Promise.reject(notImplemented('readNote'));
  }

  head(_input: HeadInput): Promise<HeadResult | null> {
    return Promise.reject(notImplemented('head'));
  }
}
