import { z } from 'zod';
import { captureInputSchema, captureOutputSchema, parsedCaptureSchema } from './capture.ts';
import { noteFrontmatterSchema, sourceFrontmatterSchema } from './frontmatter.ts';
import {
  listInputSchema,
  listRecentInputSchema,
  listTagsInputSchema,
  searchInputSchema,
} from './search.ts';
import {
  appendInputSchema,
  correctInputSchema,
  deleteInputSchema,
  initInputSchema,
  noteRecordSchema,
  readInputSchema,
  sourceRecordSchema,
  undoInputSchema,
  writeResultSchema,
} from './write.ts';

// One schema, many uses (ADR-0022) — JSON Schema for:
//   - MCP tool inputSchema / outputSchema (ADR-0021)
//   - HTTP request validation
//   - Frontmatter validation downstream
//   - Conformance fixtures (docs/specs/core-spec.md §4)
// Zod 4's toJSONSchema() emits JSON Schema 2020-12.
export const jsonSchemas = {
  // Frontmatter envelope
  NoteFrontmatter: z.toJSONSchema(noteFrontmatterSchema),
  SourceFrontmatter: z.toJSONSchema(sourceFrontmatterSchema),

  // Capture surface
  CaptureInput: z.toJSONSchema(captureInputSchema),
  CaptureOutput: z.toJSONSchema(captureOutputSchema),
  ParsedCapture: z.toJSONSchema(parsedCaptureSchema),

  // Write ops
  InitInput: z.toJSONSchema(initInputSchema),
  AppendInput: z.toJSONSchema(appendInputSchema),
  CorrectInput: z.toJSONSchema(correctInputSchema),
  UndoInput: z.toJSONSchema(undoInputSchema),
  DeleteInput: z.toJSONSchema(deleteInputSchema),
  ReadInput: z.toJSONSchema(readInputSchema),
  WriteResult: z.toJSONSchema(writeResultSchema),
  NoteRecord: z.toJSONSchema(noteRecordSchema),
  SourceRecord: z.toJSONSchema(sourceRecordSchema),

  // Read ops
  SearchInput: z.toJSONSchema(searchInputSchema),
  ListInput: z.toJSONSchema(listInputSchema),
  ListTagsInput: z.toJSONSchema(listTagsInputSchema),
  ListRecentInput: z.toJSONSchema(listRecentInputSchema),
} as const;

export type JsonSchemaName = keyof typeof jsonSchemas;
