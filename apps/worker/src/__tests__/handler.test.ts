import { describe, expect, test } from 'bun:test';
import type { ExecutionContext } from '@cloudflare/workers-types';
import type { Env } from '../env.ts';
import worker from '../index.ts';

const ENV: Env = { WORKSPACE_MAP_JSON: '{}' };
const CTX = {} as ExecutionContext;

function call(method: string, path: string): Promise<Response> {
  return worker.fetch(new Request(`https://w.zonot.app${path}`, { method }), ENV, CTX);
}

describe('worker fetch middleware', () => {
  test('GET /healthz → 200 ok with a trace header', async () => {
    const res = await call('GET', '/healthz');
    expect(res.status).toBe(200);
    expect(res.headers.get('zonot-trace-id')).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect((await res.json()) as { status: string }).toEqual({
      status: 'ok',
      service: 'zonot-worker',
    });
  });

  test('unknown route → RFC 9457 not-found problem with matching trace id', async () => {
    const res = await call('GET', '/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toBe('application/problem+json');
    const traceHeader = res.headers.get('zonot-trace-id');
    const body = (await res.json()) as { type: string; trace_id: string };
    expect(body.type).toBe('https://zonot.app/problems/not-found');
    expect(body.trace_id).toBe(traceHeader);
  });

  test('every response carries a unique trace id', async () => {
    const a = (await call('GET', '/healthz')).headers.get('zonot-trace-id');
    const b = (await call('GET', '/healthz')).headers.get('zonot-trace-id');
    expect(a).not.toBe(b);
  });
});
