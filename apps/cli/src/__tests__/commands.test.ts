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
  cmdList,
  cmdRead,
  cmdSearch,
  cmdTags,
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

/** Like run(), but parses every emitted NDJSON line (for search/list/tags). */
async function runLines<T = unknown>(fn: () => number | Promise<number>): Promise<T[]> {
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((s: string) => {
    chunks.push(String(s));
    return true;
  }) as typeof process.stdout.write;
  try {
    await fn();
    return chunks
      .join('')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as T);
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

  test('delete removes the note (subsequent read 404s)', async () => {
    await run(() => cmdInit(parseArgs(['init'])));
    const cap = await run<{ id: string }>(() => cmdCapture(parseArgs(['capture', 'doomed'])));
    expect((await run(() => cmdDelete(parseArgs(['delete', cap.json.id])))).code).toBe(0);
    await expect(run(() => cmdRead(parseArgs(['read', cap.json.id])))).rejects.toBeInstanceOf(
      Error,
    );
  });

  test('capture with no body but a title is allowed (empty-body capture)', async () => {
    await run(() => cmdInit(parseArgs(['init'])));
    const cap = await asTty(() =>
      run<{ id: string }>(() => cmdCapture(parseArgs(['capture', '--title=Just a title']))),
    );
    const note = await run<{ frontmatter: { title: string } }>(() =>
      cmdRead(parseArgs(['read', cap.json.id])),
    );
    expect(note.json.frontmatter.title).toBe('Just a title');
  });

  test('workspaces lists the configured workspace as default (NDJSON, one per line)', async () => {
    await run(() => cmdInit(parseArgs(['init'])));
    const ws = await runLines<{ name: string; default: boolean }>(() =>
      cmdWorkspaces(parseArgs(['workspaces'])),
    );
    expect(ws[0]).toMatchObject({ name: 'personal', default: true });
  });
});

describe('local FTS (search / list / tags)', () => {
  type Summary = { id: string; title: string; tags: string[]; snippet?: string };

  test('search matches body, list groups by tag, tags count', async () => {
    await run(() => cmdInit(parseArgs(['init'])));
    await run(() => cmdCapture(parseArgs(['capture', 'launch preparation #design @launch'])));
    await run(() => cmdCapture(parseArgs(['capture', 'budget review #finance'])));
    await run(() => cmdCapture(parseArgs(['capture', 'design tokens #design'])));

    const hits = await runLines<Summary>(() => cmdSearch(parseArgs(['search', 'launch'])));
    expect(hits).toHaveLength(1);
    expect(hits[0]?.title).toBe('');
    expect(hits[0]?.snippet).toContain('<mark>launch</mark>');

    const recent = await runLines<Summary>(() => cmdList(parseArgs(['list'])));
    expect(recent).toHaveLength(3); // newest-first, all notes

    const groups = await runLines<{ key: string; count: number }>(() =>
      cmdList(parseArgs(['list', '--group=tag'])),
    );
    expect(groups.find((g) => g.key === 'design')?.count).toBe(2);

    const tags = await runLines<{ tag: string; count: number }>(() => cmdTags(parseArgs(['tags'])));
    expect(tags).toEqual([
      { tag: 'design', count: 2 },
      { tag: 'finance', count: 1 },
    ]);

    const de = await runLines<{ tag: string }>(() => cmdTags(parseArgs(['tags', '--prefix=fin'])));
    expect(de).toEqual([{ tag: 'finance', count: 1 }]);
  });

  test('the index rebuilds after a write (HEAD moved)', async () => {
    await run(() => cmdInit(parseArgs(['init'])));
    await run(() => cmdCapture(parseArgs(['capture', 'first #a'])));
    expect(await runLines(() => cmdList(parseArgs(['list'])))).toHaveLength(1);
    await run(() => cmdCapture(parseArgs(['capture', 'second #b'])));
    expect(await runLines(() => cmdList(parseArgs(['list'])))).toHaveLength(2); // picked up the new note
  });
});
