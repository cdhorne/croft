import { describe, expect, test } from 'bun:test';
import {
  CONVENTION_VERSION,
  noteFrontmatterSchema,
  sourceFrontmatterSchema,
} from '../frontmatter.ts';

const FIXED_ID = '01HZZZA1B2C3D4E5F6G7H8J9K0';
const FIXED_SOURCE_ID = '01HZZZB1B2C3D4E5F6G7H8J9K0';
const FIXED_CREATED = '2026-06-15T12:00:00Z';

describe('noteFrontmatterSchema', () => {
  test('accepts the minimal MUST set', () => {
    const result = noteFrontmatterSchema.parse({
      id: FIXED_ID,
      v: CONVENTION_VERSION,
      created: FIXED_CREATED,
      tags: ['design'],
    });
    expect(result.id).toBe(FIXED_ID);
    expect(result.v).toBe(1);
    expect(result.tags).toEqual(['design']);
  });

  test('accepts MUST + SHOULD + COULD set', () => {
    const parsed = noteFrontmatterSchema.parse({
      id: FIXED_ID,
      v: CONVENTION_VERSION,
      created: FIXED_CREATED,
      tags: ['design', 'priority'],
      updated: '2026-06-15T14:30:00Z',
      type: 'todo',
      aliases: ['Quick launch note'],
      thread: 'q3-launch',
      title: 'Quick note about launch',
      workspace: 'personal',
      source: FIXED_SOURCE_ID,
    });
    expect(parsed.type).toBe('todo');
    expect(parsed.thread).toBe('q3-launch');
    expect(parsed.source).toBe(FIXED_SOURCE_ID);
  });

  test('tolerantly passes unknown keys (ADR-0005)', () => {
    const parsed = noteFrontmatterSchema.parse({
      id: FIXED_ID,
      v: CONVENTION_VERSION,
      created: FIXED_CREATED,
      tags: [],
      cssclasses: ['important'], // unknown Obsidian-reserved key
      custom_field: 'preserved',
    });
    expect(parsed).toMatchObject({
      cssclasses: ['important'],
      custom_field: 'preserved',
    });
  });

  test('rejects missing MUST keys', () => {
    expect(() => noteFrontmatterSchema.parse({ id: FIXED_ID, v: 1, tags: [] })).toThrow();
  });

  test('rejects invalid ULID', () => {
    expect(() =>
      noteFrontmatterSchema.parse({
        id: 'not-a-ulid',
        v: 1,
        created: FIXED_CREATED,
        tags: [],
      }),
    ).toThrow();
  });

  test('rejects non-UTC datetime (no Z suffix)', () => {
    expect(() =>
      noteFrontmatterSchema.parse({
        id: FIXED_ID,
        v: 1,
        created: '2026-06-15T12:00:00-07:00',
        tags: [],
      }),
    ).toThrow();
  });

  test('rejects un-normalized tags', () => {
    expect(() =>
      noteFrontmatterSchema.parse({
        id: FIXED_ID,
        v: 1,
        created: FIXED_CREATED,
        tags: ['Mixed Case'],
      }),
    ).toThrow();
  });

  test('rejects "context" as a note type (reserved for source)', () => {
    expect(() =>
      noteFrontmatterSchema.parse({
        id: FIXED_ID,
        v: 1,
        created: FIXED_CREATED,
        tags: [],
        type: 'context',
      }),
    ).toThrow();
  });
});

describe('sourceFrontmatterSchema', () => {
  test('accepts a minimal source node', () => {
    const parsed = sourceFrontmatterSchema.parse({
      id: FIXED_SOURCE_ID,
      v: CONVENTION_VERSION,
      type: 'context',
      created: FIXED_CREATED,
    });
    expect(parsed.type).toBe('context');
  });

  test('requires type: "context"', () => {
    expect(() =>
      sourceFrontmatterSchema.parse({
        id: FIXED_SOURCE_ID,
        v: 1,
        type: 'note',
        created: FIXED_CREATED,
      }),
    ).toThrow();
  });

  test('accepts the of/source/model SHOULD+COULD fields', () => {
    const parsed = sourceFrontmatterSchema.parse({
      id: FIXED_SOURCE_ID,
      v: CONVENTION_VERSION,
      type: 'context',
      of: FIXED_ID,
      created: FIXED_CREATED,
      source: 'mcp:claude',
      model: 'claude-opus-4-7',
      workspace: 'personal',
    });
    expect(parsed.of).toBe(FIXED_ID);
    expect(parsed.source).toBe('mcp:claude');
  });
});
