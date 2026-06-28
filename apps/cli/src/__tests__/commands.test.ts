import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from '../args.ts';
import {
  cmdAppend,
  cmdCapture,
  cmdCorrect,
  cmdDelete,
  cmdInit,
  cmdRead,
  cmdUndo,
  cmdWorkspaces,
} from '../commands.ts';

let home: string;
const prev = process.env.ZONOT_HOME;

/** Run a handler with stdout captured (non-TTY → handlers emit NDJSON). */
async function run<T = unknown>(
  fn: () => number | Promise<number>,
): Promise<{ code: number; json: T }> {
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((s: string) => {
    chunks.push(String(s));
    return true;
  }) as typeof process.stdout.write;
  try {
    const code = await fn();
    const out = chunks.join('').trim();
    return { code, json: (out ? JSON.parse(out.split('\n')[0] as string) : null) as T };
  } finally {
    process.stdout.write = orig;
  }
}

/** Run with stdin reported as a TTY (so handlers don't block reading stdin). */
async function asTty<T>(fn: () => T | Promise<T>): Promise<T> {
  const desc = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  try {
    return await fn();
  } finally {
    if (desc) Object.defineProperty(process.stdin, 'isTTY', desc);
  }
}

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'zonot-cmd-'));
  process.env.ZONOT_HOME = home;
});
afterEach(async () => {
  if (prev === undefined) delete process.env.ZONOT_HOME;
  else process.env.ZONOT_HOME = prev;
  await rm(home, { recursive: true, force: true });
});

describe('command loop (init → capture → read → append → correct → undo)', () => {
  test('full local dogfood loop', async () => {
    await run(() => cmdInit(parseArgs(['init'])));

    const cap = await run<{ id: string; applied_tags: string[] }>(() =>
      cmdCapture(parseArgs(['capture', 'hello #design @launch'])),
    );
    const id = cap.json.id;
    expect(cap.json.applied_tags).toEqual(['design']);

    type Note = {
      frontmatter: { thread?: string; title?: string };
      body_compiled: string;
      body_timeline: string;
    };
    const read = await run<Note>(() => cmdRead(parseArgs(['read', id])));
    expect(read.json.frontmatter.thread).toBe('launch');
    expect(read.json.body_compiled.trim()).toBe('hello #design @launch');

    await run(() => cmdAppend(parseArgs(['append', id, '- 2026-06-28 | event'])));
    const afterAppend = await run<Note>(() => cmdRead(parseArgs(['read', id])));
    expect(afterAppend.json.body_timeline).toContain('event');

    await run(() => cmdCorrect(parseArgs(['correct', id, 'corrected body', '--title=Fixed'])));
    const afterCorrect = await run<Note>(() => cmdRead(parseArgs(['read', id])));
    expect(afterCorrect.json.frontmatter.title).toBe('Fixed');
    expect(afterCorrect.json.body_compiled.trim()).toBe('corrected body');
    expect(afterCorrect.json.body_timeline).toContain('event'); // timeline preserved

    await run(() => cmdUndo(parseArgs(['undo', id])));
    await expect(run(() => cmdRead(parseArgs(['read', id])))).rejects.toBeInstanceOf(Error); // gone
  });

  test('capture with no body (interactive) is a ConfigError', async () => {
    await run(() => cmdInit(parseArgs(['init'])));
    await asTty(() =>
      expect(run(() => cmdCapture(parseArgs(['capture'])))).rejects.toThrow(/body/),
    );
  });

  test('delete removes the note', async () => {
    await run(() => cmdInit(parseArgs(['init'])));
    const cap = await run<{ id: string }>(() => cmdCapture(parseArgs(['capture', 'doomed'])));
    const del = await run(() => cmdDelete(parseArgs(['delete', cap.json.id])));
    expect(del.code).toBe(0);
  });

  test('workspaces lists the configured workspace as default', async () => {
    await run(() => cmdInit(parseArgs(['init'])));
    const ws = await run<Array<{ name: string; default: boolean }>>(() =>
      cmdWorkspaces(parseArgs(['workspaces'])),
    );
    expect(ws.json[0]).toMatchObject({ name: 'personal', default: true });
  });
});
