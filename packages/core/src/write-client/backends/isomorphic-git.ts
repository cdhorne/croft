// IsomorphicGitBackend — clone-holder write backend (CLI + mobile).
// Workers skip this subpath; isomorphic-git's ~500 KB stays out of their bundle.
// TODO(phase2/3): implement against isomorphic-git.

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

export interface IsomorphicGitBackendConfig {
  /** Absolute path to the local clone (CLI) or virtual fs root (mobile). */
  dir: string;
  /** Auth token for remote push/pull (PAT or OAuth bearer). */
  token?: string;
  /** Remote name. Default: origin. */
  remote?: string;
  /** Branch. Default: main. */
  branch?: string;
}

const notImplemented = (op: string): Error =>
  new Error(`IsomorphicGitBackend.${op}: not yet implemented`);

export class IsomorphicGitBackend implements WriteClient {
  readonly #config: IsomorphicGitBackendConfig;

  constructor(config: IsomorphicGitBackendConfig) {
    this.#config = config;
  }

  getConfig(): Readonly<IsomorphicGitBackendConfig> {
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
