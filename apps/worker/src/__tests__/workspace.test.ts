import { describe, expect, test } from 'bun:test';
import { NotFoundError, UnauthorizedError } from '@zonot/core/errors';
import type { Env } from '../env.ts';
import {
  constantTimeEquals,
  dispatchWorkspace,
  hashWorkspace,
  resolveWorkspace,
} from '../workspace.ts';

const TRACE = '01HZZZA1B2C3D4E5F6G7H8J9K0';

function envWith(map: Record<string, unknown>): Env {
  return { WORKSPACE_MAP_JSON: JSON.stringify(map) };
}

const personal = { owner: 'cdhorne', repo: 'zonot-notes', token: 'ghp_x', path_secret: 's3cr3t' };

describe('hashWorkspace', () => {
  test('produces a stable sha256: hex digest, never the raw name', async () => {
    const h = await hashWorkspace('personal');
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(h).not.toContain('personal');
    expect(await hashWorkspace('personal')).toBe(h);
    expect(await hashWorkspace('work')).not.toBe(h);
  });
});

describe('resolveWorkspace', () => {
  test('returns the entry or null', () => {
    const env = envWith({ personal });
    expect(resolveWorkspace('personal', env)?.repo).toBe('zonot-notes');
    expect(resolveWorkspace('missing', env)).toBeNull();
  });

  test('throws on malformed secret JSON', () => {
    expect(() => resolveWorkspace('x', { WORKSPACE_MAP_JSON: 'not json' })).toThrow(
      /not valid JSON/,
    );
  });
});

describe('dispatchWorkspace', () => {
  test('valid workspace + secret → context with hashed id', async () => {
    const ctx = await dispatchWorkspace('personal', 's3cr3t', envWith({ personal }), TRACE);
    expect(ctx.resolution.owner).toBe('cdhorne');
    expect(ctx.workspace_hash).toMatch(/^sha256:/);
    expect(ctx.trace_id).toBe(TRACE);
  });

  test('unknown workspace → NotFoundError', async () => {
    await expect(
      dispatchWorkspace('ghost', 's3cr3t', envWith({ personal }), TRACE),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test('wrong secret → UnauthorizedError', async () => {
    await expect(
      dispatchWorkspace('personal', 'wrong', envWith({ personal }), TRACE),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('missing secret → UnauthorizedError', async () => {
    await expect(
      dispatchWorkspace('personal', null, envWith({ personal }), TRACE),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('constantTimeEquals', () => {
  test('matches equal strings and rejects differing ones (incl. length)', () => {
    expect(constantTimeEquals('abc', 'abc')).toBe(true);
    expect(constantTimeEquals('abc', 'abd')).toBe(false);
    expect(constantTimeEquals('abc', 'abcd')).toBe(false);
    expect(constantTimeEquals('', '')).toBe(true);
  });
});
