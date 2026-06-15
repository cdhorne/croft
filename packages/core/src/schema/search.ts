import { z } from 'zod';

// Faceted narrowing applied to search and list ops.
export const searchFilterSchema = z.object({
  tags_any: z.array(z.string()).optional(),
  tags_all: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  thread: z.string().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
});
export type SearchFilter = z.infer<typeof searchFilterSchema>;

// search — lexical FTS5 over the configured backend.
export const searchInputSchema = z.object({
  workspace: z.string(),
  q: z.string(),
  filter: searchFilterSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});
export type SearchInput = z.infer<typeof searchInputSchema>;

// list — faceted aggregation (group_by) over the corpus.
export const listGroupBySchema = z.enum(['tag', 'type', 'thread', 'day', 'week', 'month']);
export type ListGroupBy = z.infer<typeof listGroupBySchema>;

export const listInputSchema = z.object({
  workspace: z.string(),
  group_by: listGroupBySchema.optional(),
  filter: searchFilterSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});
export type ListInput = z.infer<typeof listInputSchema>;

export const listTagsInputSchema = z.object({
  workspace: z.string(),
  prefix: z.string().optional(),
});
export type ListTagsInput = z.infer<typeof listTagsInputSchema>;

export const listRecentInputSchema = z.object({
  workspace: z.string(),
  since: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});
export type ListRecentInput = z.infer<typeof listRecentInputSchema>;

// Read-back result shapes.
export const noteSummarySchema = z.object({
  id: z.ulid(),
  path: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  type: z.string(),
  thread: z.string().optional(),
  created: z.string(),
  updated: z.string().optional(),
  snippet: z.string().optional(), // populated by FTS5 snippet() in search mode only
});
export type NoteSummary = z.infer<typeof noteSummarySchema>;

export const tagSummarySchema = z.object({
  tag: z.string(),
  count: z.number().int().nonnegative(),
});
export type TagSummary = z.infer<typeof tagSummarySchema>;

export const searchPageSchema = z.object({
  results: z.array(noteSummarySchema),
  next_cursor: z.string().optional(),
  total_estimate: z.number().int().nonnegative().optional(),
});
export type SearchPage = z.infer<typeof searchPageSchema>;

export const groupBucketSchema = z.object({
  key: z.string(),
  count: z.number().int().nonnegative(),
  sample: z.array(noteSummarySchema),
});
export type GroupBucket = z.infer<typeof groupBucketSchema>;

export const groupedPageSchema = z.object({
  groups: z.array(groupBucketSchema),
  next_cursor: z.string().optional(),
});
export type GroupedPage = z.infer<typeof groupedPageSchema>;
