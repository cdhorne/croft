import { describe, expect, test } from 'bun:test';
import { splitBody } from '../body.ts';

describe('splitBody', () => {
  test('no divider — all compiled, empty timeline', () => {
    const split = splitBody('Just a note.\n');
    expect(split.compiled).toBe('Just a note.\n');
    expect(split.timeline).toBe('');
  });

  test('divider at start — empty compiled, all timeline', () => {
    const split = splitBody('---\n2026-06-15 — first entry\n');
    expect(split.compiled).toBe('');
    expect(split.timeline).toBe('2026-06-15 — first entry\n');
  });

  test('mid-body divider', () => {
    const body = 'Compiled truth\n\n---\n\n2026-06-15 — seed';
    const split = splitBody(body);
    expect(split.compiled).toBe('Compiled truth\n');
    expect(split.timeline).toBe('\n2026-06-15 — seed');
  });

  test('multiple top-level dividers — only the first splits', () => {
    const body = 'Top\n---\nMiddle\n---\nBottom';
    const split = splitBody(body);
    expect(split.compiled).toBe('Top');
    expect(split.timeline).toBe('Middle\n---\nBottom');
  });

  test('divider inside fenced code block is ignored', () => {
    const body = ['Compiled', '```', '---', '```', 'Still compiled', '---', 'Timeline'].join('\n');
    const split = splitBody(body);
    expect(split.compiled).toBe(['Compiled', '```', '---', '```', 'Still compiled'].join('\n'));
    expect(split.timeline).toBe('Timeline');
  });

  test('divider inside tilde-fenced code block is ignored', () => {
    const body = ['Top', '~~~', '---', '~~~', '---', 'Below'].join('\n');
    const split = splitBody(body);
    expect(split.compiled).toBe(['Top', '~~~', '---', '~~~'].join('\n'));
    expect(split.timeline).toBe('Below');
  });
});
