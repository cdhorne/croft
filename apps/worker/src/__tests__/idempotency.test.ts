import { describe, expect, test } from 'bun:test';
import { IdempotencyReplayError } from '@zonot/core/errors';
import type { WriteResult } from '@zonot/core/schema';
import { type IdempotencyStore, withIdempotency } from '../idempotency.ts';

function memStore(): IdempotencyStore {
  const m = new Map<string, { body_hash: string; result: WriteResult }>();
  return {
    async get(k) {
      return m.get(k) ?? null;
    },
    async put(k, e) {
      m.set(k, e);
    },
  };
}

const result = (id: string): WriteResult => ({
  id,
  path: `notes/2026/06/${id}.md`,
  commit_sha: 'abc',
  applied_tags: [],
  capture_id: id,
});

const ID = '01HZZZA1B2C3D4E5F6G7H8J9K0';

describe('withIdempotency', () => {
  test('runs the write once and caches it; a same-body replay returns the cache', async () => {
    const store = memStore();
    let calls = 0;
    const run = () => {
      calls++;
      return Promise.resolve(result(ID));
    };

    const first = await withIdempotency(store, 'personal', 'key-1', { body: 'x' }, run);
    const replay = await withIdempotency(store, 'personal', 'key-1', { body: 'x' }, run);

    expect(calls).toBe(1); // write executed only once
    expect(replay).toEqual(first);
  });

  test('same key + different body raises IdempotencyReplayError', async () => {
    const store = memStore();
    await withIdempotency(store, 'personal', 'key-1', { body: 'x' }, () =>
      Promise.resolve(result(ID)),
    );
    await expect(
      withIdempotency(store, 'personal', 'key-1', { body: 'DIFFERENT' }, () =>
        Promise.resolve(result(ID)),
      ),
    ).rejects.toBeInstanceOf(IdempotencyReplayError);
  });

  test('absent key or store passes straight through (no caching)', async () => {
    let calls = 0;
    const run = () => {
      calls++;
      return Promise.resolve(result(ID));
    };
    await withIdempotency(memStore(), 'personal', undefined, {}, run);
    await withIdempotency(null, 'personal', 'key-1', {}, run);
    expect(calls).toBe(2); // neither path short-circuits
  });
});
