// Idempotency for write ops (core-spec §3.4). A caller-supplied Idempotency-Key
// is hashed with the workspace + canonical request body into a cache key. The
// first success is cached (Worker KV, 24h TTL); a replay with the SAME body
// returns the cached result, a replay with a DIFFERENT body raises
// IdempotencyReplayError. Absent a key (or a KV binding), writes pass through.

import type { KVNamespace } from '@cloudflare/workers-types';
import { IdempotencyReplayError } from '@zonot/core/errors';
import type { WriteResult } from '@zonot/core/schema';

const TTL_SECONDS = 24 * 60 * 60;

interface CachedEntry {
  body_hash: string;
  result: WriteResult;
}

export interface IdempotencyStore {
  get(key: string): Promise<CachedEntry | null>;
  put(key: string, entry: CachedEntry): Promise<void>;
}

/** KV-backed store (production). */
export function kvIdempotencyStore(kv: KVNamespace): IdempotencyStore {
  return {
    async get(key) {
      return (await kv.get(key, { type: 'json' })) as CachedEntry | null;
    },
    async put(key, entry) {
      await kv.put(key, JSON.stringify(entry), { expirationTtl: TTL_SECONDS });
    },
  };
}

/**
 * Run a write under the idempotency contract. `idemKey` is the caller's
 * Idempotency-Key (or the ULID id as the de-facto key); `body` is the canonical
 * request used to detect a same-key/different-body replay.
 */
export async function withIdempotency(
  store: IdempotencyStore | null,
  workspace: string,
  idemKey: string | undefined,
  body: unknown,
  write: () => Promise<WriteResult>,
): Promise<WriteResult> {
  if (!store || !idemKey) return write();

  const body_hash = await sha256Hex(JSON.stringify(body));
  const cacheKey = `idem:${workspace}:${idemKey}`;

  const cached = await store.get(cacheKey);
  if (cached) {
    if (cached.body_hash !== body_hash) {
      throw new IdempotencyReplayError(idemKey, cached.result, body_hash);
    }
    return cached.result;
  }

  const result = await write();
  await store.put(cacheKey, { body_hash, result });
  return result;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
