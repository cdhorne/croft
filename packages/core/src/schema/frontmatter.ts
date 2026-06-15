import { z } from 'zod';

// Convention version (ADR-0012). Locked to 1 until a forward migration ships.
export const CONVENTION_VERSION = 1 as const;

// ISO-8601 UTC timestamp with mandatory 'Z' suffix
// (ADR-0005 / docs/specs/core-spec.md §1.2).
const isoDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/,
    'must be ISO-8601 UTC with Z suffix',
  );

// A normalized tag slug (lowercase, hyphenated, deduped — applied by
// core/convention/normalize-tags per docs/specs/core-spec.md §1.5).
const tagSlugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'tag must be lowercase letters/digits separated by hyphens');

// A thread slug (same shape; single string per note in v1 per ADR-0005).
const threadSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

// Open type-name vocabulary (ADR-0005 — defaults to 'note';
// 'context' is reserved for source nodes and rejected on note frontmatter).
const noteTypeNameSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/)
  .refine((v) => v !== 'context', { message: '"context" is reserved for source nodes' });

// Note frontmatter — tolerant pass-through of unknown keys (ADR-0005).
// MUST / SHOULD / COULD discipline expressed by required vs. optional fields.
export const noteFrontmatterSchema = z.looseObject({
  // MUST
  id: z.ulid(),
  v: z.literal(CONVENTION_VERSION),
  created: isoDateTimeSchema,
  tags: z.array(tagSlugSchema),

  // SHOULD
  updated: isoDateTimeSchema.optional(),
  type: noteTypeNameSchema.optional(),

  // COULD
  aliases: z.array(z.string()).optional(),
  thread: threadSlugSchema.optional(),
  title: z.string().optional(),
  workspace: z.string().optional(),
  source: z.ulid().optional(),
});
export type NoteFrontmatter = z.infer<typeof noteFrontmatterSchema>;

// Source frontmatter — type: 'context' literal; conditional node (ADR-0005).
export const sourceFrontmatterSchema = z.looseObject({
  id: z.ulid(),
  v: z.literal(CONVENTION_VERSION),
  type: z.literal('context'),
  of: z.ulid().optional(),
  created: isoDateTimeSchema,
  source: z.string().optional(),
  model: z.string().optional(),
  updated: isoDateTimeSchema.optional(),
  workspace: z.string().optional(),
});
export type SourceFrontmatter = z.infer<typeof sourceFrontmatterSchema>;
