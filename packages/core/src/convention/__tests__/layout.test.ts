import { describe, expect, test } from 'bun:test';
import { deriveNotePath, deriveSourcePath } from '../layout.ts';

const ID = '01HZZZA1B2C3D4E5F6G7H8J9K0';

describe('deriveNotePath', () => {
  test('builds notes/YYYY/MM/<id>-<slug>.md', () => {
    expect(
      deriveNotePath({
        id: ID,
        slug: 'quick-note',
        created: '2026-06-15T12:00:00Z',
      }),
    ).toBe(`notes/2026/06/${ID}-quick-note.md`);
  });

  test('pads month with leading zero', () => {
    expect(deriveNotePath({ id: ID, slug: 'x', created: '2026-01-01T00:00:00Z' })).toBe(
      `notes/2026/01/${ID}-x.md`,
    );
  });

  test('uses UTC year/month regardless of input offset', () => {
    expect(
      deriveNotePath({
        id: ID,
        slug: 'x',
        created: '2026-12-31T23:30:00Z',
      }),
    ).toBe(`notes/2026/12/${ID}-x.md`);
  });

  test('throws on invalid ULID', () => {
    expect(() =>
      deriveNotePath({ id: 'not-a-ulid', slug: 'x', created: '2026-06-15T00:00:00Z' }),
    ).toThrow();
  });

  test('throws on invalid datetime', () => {
    expect(() => deriveNotePath({ id: ID, slug: 'x', created: 'yesterday' })).toThrow();
  });
});

describe('deriveSourcePath', () => {
  test('builds sources/YYYY/MM/<id>.md (no slug)', () => {
    expect(deriveSourcePath({ id: ID, created: '2026-06-15T12:00:00Z' })).toBe(
      `sources/2026/06/${ID}.md`,
    );
  });
});
