import { describe, expect, test } from 'bun:test';
import { serializeNoteFrontmatter, serializeSourceFrontmatter } from '../frontmatter-serialize.ts';

const ID = '01HZZZA1B2C3D4E5F6G7H8J9K0';
const SOURCE_ID = '01HZZZB1B2C3D4E5F6G7H8J9K0';

describe('serializeNoteFrontmatter', () => {
  test('emits MUST keys in canonical order', () => {
    const bytes = serializeNoteFrontmatter({
      id: ID,
      v: 1,
      created: '2026-06-15T12:00:00Z',
      tags: ['design'],
    });
    expect(bytes).toBe(
      [
        '---',
        `id: ${ID}`,
        'v: 1',
        'created: 2026-06-15T12:00:00Z',
        'tags:',
        '  - design',
        '---',
        '',
      ].join('\n'),
    );
  });

  test('emits empty tags as inline []', () => {
    const bytes = serializeNoteFrontmatter({
      id: ID,
      v: 1,
      created: '2026-06-15T12:00:00Z',
      tags: [],
    });
    expect(bytes).toContain('tags: []');
  });

  test('honors MUST → SHOULD → COULD → unknown ordering', () => {
    const bytes = serializeNoteFrontmatter({
      title: 'Should appear after type',
      custom_key: 'tail-passthrough',
      id: ID,
      v: 1,
      created: '2026-06-15T12:00:00Z',
      tags: ['x'],
      type: 'todo',
      updated: '2026-06-15T13:00:00Z',
    });
    const lines = bytes.split('\n');
    const indexOf = (prefix: string) => lines.findIndex((l) => l.startsWith(prefix));
    expect(indexOf('id:')).toBeLessThan(indexOf('updated:'));
    expect(indexOf('updated:')).toBeLessThan(indexOf('type:'));
    expect(indexOf('type:')).toBeLessThan(indexOf('title:'));
    expect(indexOf('title:')).toBeLessThan(indexOf('custom_key:'));
  });

  test('quotes strings containing colon-space', () => {
    const bytes = serializeNoteFrontmatter({
      id: ID,
      v: 1,
      created: '2026-06-15T12:00:00Z',
      tags: [],
      title: 'foo: bar',
    });
    expect(bytes).toContain("title: 'foo: bar'");
  });

  test('quotes strings starting with reserved YAML chars', () => {
    const bytes = serializeNoteFrontmatter({
      id: ID,
      v: 1,
      created: '2026-06-15T12:00:00Z',
      tags: [],
      title: '@mention should be quoted',
    });
    expect(bytes).toContain("title: '@mention should be quoted'");
  });

  test('quotes strings that look like bool/null/number', () => {
    const bytes = serializeNoteFrontmatter({
      id: ID,
      v: 1,
      created: '2026-06-15T12:00:00Z',
      tags: [],
      title: 'true',
    });
    expect(bytes).toContain("title: 'true'");
  });

  test('escapes single quotes in quoted strings', () => {
    const bytes = serializeNoteFrontmatter({
      id: ID,
      v: 1,
      created: '2026-06-15T12:00:00Z',
      tags: [],
      title: "Joe's note: hi",
    });
    expect(bytes).toContain("title: 'Joe''s note: hi'");
  });

  test('omits undefined optional keys', () => {
    const bytes = serializeNoteFrontmatter({
      id: ID,
      v: 1,
      created: '2026-06-15T12:00:00Z',
      tags: [],
      title: undefined,
      thread: undefined,
    });
    expect(bytes).not.toContain('title');
    expect(bytes).not.toContain('thread');
  });
});

describe('serializeSourceFrontmatter', () => {
  test('emits type: context immediately after v', () => {
    const bytes = serializeSourceFrontmatter({
      id: SOURCE_ID,
      v: 1,
      type: 'context',
      of: ID,
      created: '2026-06-15T12:00:00Z',
    });
    expect(bytes).toBe(
      [
        '---',
        `id: ${SOURCE_ID}`,
        'v: 1',
        'type: context',
        `of: ${ID}`,
        'created: 2026-06-15T12:00:00Z',
        '---',
        '',
      ].join('\n'),
    );
  });
});
