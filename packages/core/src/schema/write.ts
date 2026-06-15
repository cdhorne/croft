import { z } from 'zod';
import { captureOutputSchema } from './capture.ts';
import { noteFrontmatterSchema, sourceFrontmatterSchema } from './frontmatter.ts';

// init — one-time workspace scaffold.
export const initInputSchema = z.object({
  workspace: z.string(),
  conventionVersion: z.literal(1),
});
export type InitInput = z.infer<typeof initInputSchema>;

export const initResultSchema = z.object({
  commit_sha: z.string(),
  paths: z.array(z.string()),
});
export type InitResult = z.infer<typeof initResultSchema>;

// append — add a dated block to an existing note's timeline (ADR-0005 / 0026).
export const appendInputSchema = z.object({
  workspace: z.string(),
  id: z.ulid(),
  block: z.string(),
  base_sha: z.string(),
  idempotency_key: z.string().optional(),
});
export type AppendInput = z.infer<typeof appendInputSchema>;

// correct — replace the compiled body of an existing note (timeline preserved).
// Available at any age per ADR-0026 rev 14; gated only by SHA divergence.
export const correctInputSchema = z.object({
  workspace: z.string(),
  id: z.ulid(),
  output: captureOutputSchema,
  base_sha: z.string(),
  idempotency_key: z.string().optional(),
});
export type CorrectInput = z.infer<typeof correctInputSchema>;

// undo — remove a previous capture by its capture_id ULID.
export const undoInputSchema = z.object({
  workspace: z.string(),
  capture_id: z.ulid(),
  reason: z.string().optional(),
});
export type UndoInput = z.infer<typeof undoInputSchema>;

// delete — remove a note (+ its source) by id.
export const deleteInputSchema = z.object({
  workspace: z.string(),
  id: z.ulid(),
  reason: z.string().optional(),
});
export type DeleteInput = z.infer<typeof deleteInputSchema>;

// read — fetch a note (optionally with its source node).
export const readInputSchema = z.object({
  workspace: z.string(),
  id: z.ulid(),
  include_source: z.boolean().optional(),
});
export type ReadInput = z.infer<typeof readInputSchema>;

// head — current SHA + path for a note (used by correction-surface preflight).
export const headInputSchema = z.object({
  workspace: z.string(),
  id: z.ulid(),
});
export type HeadInput = z.infer<typeof headInputSchema>;

export const headResultSchema = z.object({
  sha: z.string(),
  path: z.string(),
});
export type HeadResult = z.infer<typeof headResultSchema>;

// WriteResult — universal shape returned by every write op.
export const writeResultSchema = z.object({
  id: z.ulid(),
  path: z.string(),
  source_path: z.string().optional(),
  commit_sha: z.string(),
  url: z.url().optional(), // GitHub URL — populated by the edge backend only
  applied_tags: z.array(z.string()),
  capture_id: z.ulid(), // matches the commit's Capture-Id trailer (ADR-0007)
});
export type WriteResult = z.infer<typeof writeResultSchema>;

// Read-back shapes.
export const sourceRecordSchema = z.object({
  id: z.ulid(),
  path: z.string(),
  frontmatter: sourceFrontmatterSchema,
  body: z.string(),
  sha: z.string(),
});
export type SourceRecord = z.infer<typeof sourceRecordSchema>;

export const noteRecordSchema = z.object({
  id: z.ulid(),
  path: z.string(),
  frontmatter: noteFrontmatterSchema,
  body_compiled: z.string(),
  body_timeline: z.string(),
  raw_body: z.string(),
  sha: z.string(),
  source: sourceRecordSchema.optional(),
});
export type NoteRecord = z.infer<typeof noteRecordSchema>;
