// WriteClient interface (docs/specs/core-spec.md §3 / ADR-0022).
// One interface, two backends:
//   - GitHubRestBackend (Worker; stateless; via @zonot/core/write-client/backends/github-rest)
//   - IsomorphicGitBackend (CLI / mobile; clone-holder; via .../backends/isomorphic-git)
// Same surface in the core; the runtime picks the backend.

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
} from '../schema/index.ts';

export interface WriteClient {
  /** Scaffold a fresh workspace (notes/ + sources/ + convention version). */
  init(input: InitInput): Promise<InitResult>;

  /** Create a new note (and optional source) atomically. Default op. */
  capture(input: CaptureInput): Promise<WriteResult>;

  /** Append a dated block to a note's timeline (ADR-0005 body convention). */
  append(input: AppendInput): Promise<WriteResult>;

  /** Replace the compiled body of an existing note. Timeline preserved. */
  correct(input: CorrectInput): Promise<WriteResult>;

  /** Remove a capture by its capture_id; commits with an `Undo-Of` trailer. */
  undo(input: UndoInput): Promise<WriteResult>;

  /** Delete a note (and its source) by id; commits with a `Delete-Of` trailer. */
  delete(input: DeleteInput): Promise<WriteResult>;

  /** Read the current state of a note (optionally with its source). */
  readNote(input: ReadInput): Promise<NoteRecord>;

  /** Existence + SHA preflight; returns null when the note does not exist. */
  head(input: HeadInput): Promise<HeadResult | null>;
}
