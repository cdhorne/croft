import { describe, expect, test } from 'bun:test';
import { slugify } from '../slug.ts';

const ID = '01HZZZA1B2C3D4E5F6G7H8J9K0';

describe('slugify', () => {
  test('empty title falls back to id', () => {
    expect(slugify({ id: ID })).toBe(ID);
    expect(slugify({ id: ID, title: '' })).toBe(ID);
    expect(slugify({ id: ID, title: '   ' })).toBe(ID);
  });

  test('basic ASCII title', () => {
    expect(slugify({ id: ID, title: 'Quick note about launch' })).toBe('quick-note-about-launch');
  });

  test('strips diacritics (NFD decomposition)', () => {
    expect(slugify({ id: ID, title: 'Café résumé' })).toBe('cafe-resume');
  });

  test('precomposed and combining diacritics produce the same slug', () => {
    // 'é' as precomposed (U+00E9) vs. combining (U+0065 U+0301)
    const precomposed = 'caf\u00e9';
    const combining = 'cafe\u0301';
    expect(slugify({ id: ID, title: precomposed })).toBe(slugify({ id: ID, title: combining }));
  });

  test('replaces reserved filesystem chars with hyphens', () => {
    expect(slugify({ id: ID, title: 'Foo/Bar: Baz?' })).toBe('foo-bar-baz');
  });

  test('truncates at the last hyphen within 60 chars', () => {
    const long = 'A very long title that exceeds sixty characters when slugified for sure';
    const slug = slugify({ id: ID, title: long });
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });

  test('hard-cuts when no hyphen fits within the limit', () => {
    const long = 'a'.repeat(80);
    const slug = slugify({ id: ID, title: long });
    expect(slug).toBe('a'.repeat(60));
  });

  test('emoji and other non-letter chars become hyphens', () => {
    expect(slugify({ id: ID, title: '🚀 Launch!' })).toBe('launch');
  });

  test('RTL title produces a deterministic slug', () => {
    // Hebrew characters fall through Unicode letter category.
    const slug = slugify({ id: ID, title: 'שלום עולם' });
    expect(slug).toBe('שלום-עולם');
  });
});
