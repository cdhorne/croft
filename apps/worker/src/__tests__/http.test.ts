import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { ExecutionContext, KVNamespace } from '@cloudflare/workers-types';
// Reuse the core backend's in-memory Git Data fake (test-only deep import).
import { FakeGitHub } from '../../../../packages/core/src/write-client/__tests__/fake-github.ts';
import type { Env } from '../env.ts';
import worker from '../index.ts';

const SECRET = 's3cr3t';
const CTX = {} as ExecutionContext;
const realFetch = globalThis.fetch;
let gh: FakeGitHub;

/** Minimal in-memory KV for the idempotency path. */
function memoryKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string, _opts?: unknown) {
      const v = store.get(key);
      return v === undefined ? null : JSON.parse(v);
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    WORKSPACE_MAP_JSON: JSON.stringify({
      personal: { owner: 'cdhorne', repo: 'zonot-notes', token: 'ghp_x', path_secret: SECRET },
    }),
    ...overrides,
  };
}

function req(
  method: string,
  path: string,
  init: { body?: unknown; headers?: Record<string, string> } = {},
) {
  return new Request(`https://w.zonot.app${path}`, {
    method,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    headers: init.headers ?? {},
  });
}

beforeEach(() => {
  gh = new FakeGitHub();
  globalThis.fetch = gh.fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('HTTP transport — auth', () => {
  test('valid workspace + secret → capture succeeds (201)', async () => {
    const res = await worker.fetch(
      req('POST', `/v1/personal/${SECRET}/capture`, {
        body: { output: { title: 'Hi', body: 'hello' } },
      }),
      makeEnv(),
      CTX,
    );
    expect(res.status).toBe(201);
    const result = (await res.json()) as { id: string; path: string; capture_id: string };
    expect(result.id).toBe(result.capture_id);
    expect(result.path).toMatch(/^notes\/.*\.md$/);
    expect(res.headers.get('zonot-trace-id')).toBeTruthy();
  });

  test('wrong secret → 401 problem', async () => {
    const res = await worker.fetch(
      req('POST', '/v1/personal/wrong/capture', { body: { output: { body: 'x' } } }),
      makeEnv(),
      CTX,
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toBe('application/problem+json');
  });

  test('unknown workspace → 404 problem', async () => {
    const res = await worker.fetch(
      req('POST', `/v1/ghost/${SECRET}/capture`, { body: { output: { body: 'x' } } }),
      makeEnv(),
      CTX,
    );
    expect(res.status).toBe(404);
  });
});

describe('HTTP transport — write/read round trip', () => {
  test('capture → read → append → list → tags → delete', async () => {
    const env = makeEnv();
    const cap = (await (
      await worker.fetch(
        req('POST', `/v1/personal/${SECRET}/capture`, {
          body: { output: { title: 'Note one', tags: ['Work'], body: 'compiled' } },
        }),
        env,
        CTX,
      )
    ).json()) as { id: string };

    // read
    const read = await worker.fetch(req('GET', `/v1/personal/${SECRET}/notes/${cap.id}`), env, CTX);
    expect(read.status).toBe(200);
    const note = (await read.json()) as {
      frontmatter: { title: string; tags: string[] };
      sha: string;
    };
    expect(note.frontmatter.title).toBe('Note one');
    expect(note.frontmatter.tags).toEqual(['work']);

    // append (SHA-conditional)
    const appended = await worker.fetch(
      req('POST', `/v1/personal/${SECRET}/notes/${cap.id}/append`, {
        body: { block: '- **2026-06-28** | first event', base_sha: note.sha },
      }),
      env,
      CTX,
    );
    expect(appended.status).toBe(200);

    // list_recent
    const list = (await (
      await worker.fetch(req('GET', `/v1/personal/${SECRET}/notes`), env, CTX)
    ).json()) as Array<{
      id: string;
    }>;
    expect(list[0]?.id).toBe(cap.id);

    // list_tags
    const tags = (await (
      await worker.fetch(req('GET', `/v1/personal/${SECRET}/tags`), env, CTX)
    ).json()) as Array<{
      tag: string;
    }>;
    expect(tags.map((t) => t.tag)).toContain('work');

    // delete
    const del = await worker.fetch(
      req('DELETE', `/v1/personal/${SECRET}/notes/${cap.id}`),
      env,
      CTX,
    );
    expect(del.status).toBe(200);
    const after = await worker.fetch(
      req('GET', `/v1/personal/${SECRET}/notes/${cap.id}`),
      env,
      CTX,
    );
    expect(after.status).toBe(404);
  });

  test('init scaffolds the workspace (201)', async () => {
    const res = await worker.fetch(req('POST', `/v1/personal/${SECRET}/init`), makeEnv(), CTX);
    expect(res.status).toBe(201);
    expect((await res.json()) as { paths: string[] }).toHaveProperty('paths');
  });
});

describe('HTTP transport — validation + idempotency', () => {
  test('malformed body → 400 validation problem with errors[]', async () => {
    const res = await worker.fetch(
      req('POST', `/v1/personal/${SECRET}/capture`, { body: { output: { tags: ['ok'] } } }), // missing body
      makeEnv(),
      CTX,
    );
    expect(res.status).toBe(400);
    const problem = (await res.json()) as { type: string; errors: unknown[] };
    expect(problem.type).toBe('https://zonot.app/problems/validation');
    expect(problem.errors.length).toBeGreaterThan(0);
  });

  test('Idempotency-Key: same key+body returns the cached result; different body → 422', async () => {
    const env = makeEnv({ IDEMPOTENCY: memoryKv() });
    const headers = { 'idempotency-key': 'abc-123' };

    const first = (await (
      await worker.fetch(
        req('POST', `/v1/personal/${SECRET}/capture`, {
          body: { output: { body: 'one' } },
          headers,
        }),
        env,
        CTX,
      )
    ).json()) as { id: string };

    const replay = (await (
      await worker.fetch(
        req('POST', `/v1/personal/${SECRET}/capture`, {
          body: { output: { body: 'one' } },
          headers,
        }),
        env,
        CTX,
      )
    ).json()) as { id: string };
    expect(replay.id).toBe(first.id); // same write, not a duplicate

    const conflict = await worker.fetch(
      req('POST', `/v1/personal/${SECRET}/capture`, {
        body: { output: { body: 'DIFFERENT' } },
        headers,
      }),
      env,
      CTX,
    );
    expect(conflict.status).toBe(422);
  });

  test('unknown /v1 route → 404 problem', async () => {
    const res = await worker.fetch(req('GET', `/v1/personal/${SECRET}/nope`), makeEnv(), CTX);
    expect(res.status).toBe(404);
  });
});
