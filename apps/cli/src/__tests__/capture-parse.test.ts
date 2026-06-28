import { describe, expect, test } from 'bun:test';
import { parseInline } from '../capture-parse.ts';

describe('parseInline', () => {
  test('extracts + normalizes #tags, first @thread, first !type', () => {
    const f = parseInline('Ship it #Design #design @Launch-Q3 !task and @ignored !ignored');
    expect(f.tags).toEqual(['design']); // deduped + lowercased
    expect(f.thread).toBe('launch-q3');
    expect(f.type).toBe('task');
  });

  test('no facets → empty tags, undefined thread/type', () => {
    expect(parseInline('just a plain note')).toEqual({ tags: [] });
  });

  test('does not match mid-word # (e.g. C# or a url fragment)', () => {
    // "C#" — the # is not preceded by whitespace/start, so it is not a tag.
    expect(parseInline('I like C# a lot').tags).toEqual([]);
  });

  test('numeric/leading-digit tags and a leading #tag are picked up', () => {
    expect(parseInline('#2026-goals and #q3').tags).toEqual(['2026-goals', 'q3']);
  });

  test('!type only matches at a token boundary, not mid-word', () => {
    expect(parseInline('do this!now please').type).toBeUndefined(); // "this!now" is not a !type
    expect(parseInline('urgent !task').type).toBe('task');
  });
});
