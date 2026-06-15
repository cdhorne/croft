import { describe, expect, test } from 'bun:test';
import { normalizeTags } from '../normalize-tags.ts';

describe('normalizeTags', () => {
  test('lowercases, trims, hyphenates whitespace and underscores', () => {
    expect(normalizeTags(['Foo Bar', 'foo-bar', ' FOO_BAR '])).toEqual(['foo-bar']);
  });

  test('collapses multiple hyphens', () => {
    expect(normalizeTags(['x--y', '__a___b__'])).toEqual(['x-y', 'a-b']);
  });

  test('strips leading and trailing hyphens', () => {
    expect(normalizeTags(['-abc-', '--def--'])).toEqual(['abc', 'def']);
  });

  test('drops empty results', () => {
    expect(normalizeTags(['', '   ', '--', '_'])).toEqual([]);
  });

  test('dedupes after normalization', () => {
    expect(normalizeTags(['design', 'Design', 'DESIGN', 'design  '])).toEqual(['design']);
  });

  test('preserves input order of distinct results', () => {
    expect(normalizeTags(['zeta', 'alpha', 'beta', 'alpha'])).toEqual(['zeta', 'alpha', 'beta']);
  });
});
