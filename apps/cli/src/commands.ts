// Command handlers (cli-spec §1.2). Each resolves its workspace + backend, calls
// the core WriteClient, and emits per the output discipline. Read-side search/
// list/tags land with the local FTS index (Phase 2c); they stub for now.

import { existsSync } from 'node:fs';
import type { NoteRecord, WriteResult } from '@zonot/core/schema';
import type { ParsedArgs } from './args.ts';
import { flagBool, flagStr } from './args.ts';
import { buildBackend } from './backend.ts';
import { parseInline } from './capture-parse.ts';
import {
  ConfigError,
  defaultMirrorPath,
  loadConfig,
  resolveWorkspace,
  saveConfig,
  type WorkspaceConfig,
} from './config.ts';
import { EXIT, emit, makeStyle } from './output.ts';

interface Ctx {
  name: string;
  ws: WorkspaceConfig;
  backend: ReturnType<typeof buildBackend>;
}

function resolve(args: ParsedArgs): Ctx {
  const { name, ws } = resolveWorkspace(loadConfig(), flagStr(args.flags, 'workspace'));
  return { name, ws, backend: buildBackend(name, ws) };
}

/** Body from the positional arg, else piped stdin. Undefined when interactive + empty. */
async function resolveBody(args: ParsedArgs, index: number): Promise<string | undefined> {
  const pos = args.positionals[index];
  if (pos !== undefined) return pos;
  if (!process.stdin.isTTY) {
    const piped = await Bun.stdin.text();
    return piped.replace(/\n$/, '');
  }
  return undefined;
}

function requireId(args: ParsedArgs, index: number, label = 'id'): string {
  const id = args.positionals[index];
  if (!id) throw new ConfigError(`missing ${label} argument`);
  return id;
}

// --- init ------------------------------------------------------------------

export async function cmdInit(args: ParsedArgs): Promise<number> {
  const name = flagStr(args.flags, 'workspace') ?? 'personal';
  if (flagStr(args.flags, 'worker')) {
    throw new ConfigError('worker thin-client mode is not wired yet (Phase 2a is local-only)');
  }
  const config = loadConfig();
  const mirror_path = defaultMirrorPath(name);
  const repo = flagStr(args.flags, 'repo');
  const ws: WorkspaceConfig = { backend: 'local', mirror_path, ...(repo ? { repo } : {}) };

  const result = await buildBackend(name, ws).init({ workspace: name, conventionVersion: 1 });

  config.workspaces[name] = ws;
  config.default_workspace ??= name;
  saveConfig(config);

  const s = makeStyle(args);
  emit(
    args,
    { workspace: name, mirror_path, paths: result.paths },
    () =>
      `${s.accent('✓')} initialized workspace ${s.bold(name)} at ${mirror_path}${ws.repo ? `\n  ${s.muted(`(repo ${ws.repo} stored; clone/push not yet wired — created an empty local repo)`)}` : ''}`,
  );
  return EXIT.ok;
}

// --- capture ---------------------------------------------------------------

export async function cmdCapture(args: ParsedArgs): Promise<number> {
  const ctx = resolve(args);
  const body = await resolveBody(args, 0);
  if (body === undefined || body.trim() === '') {
    throw new ConfigError('provide a body argument or pipe one on stdin');
  }

  const inline = parseInline(body);
  const flagTags = (flagStr(args.flags, 'tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const title = flagStr(args.flags, 'title');
  const type = flagStr(args.flags, 'type') ?? inline.type;
  const thread = flagStr(args.flags, 'thread') ?? inline.thread;
  const result = await ctx.backend.capture({
    workspace: ctx.name,
    output: {
      body,
      tags: [...inline.tags, ...flagTags],
      ...(title ? { title } : {}),
      ...(type ? { type } : {}),
    },
    ...(thread ? { thread } : {}),
  });
  emitWrite(args, result, 'captured');
  return EXIT.ok;
}

// --- correction surface ----------------------------------------------------

export async function cmdAppend(args: ParsedArgs): Promise<number> {
  const ctx = resolve(args);
  const id = requireId(args, 0);
  const block = await resolveBody(args, 1);
  if (!block) throw new ConfigError('provide a timeline block argument or pipe one on stdin');
  const head = await ctx.backend.head({ workspace: ctx.name, id });
  if (!head) throw notFound(id);
  emitWrite(
    args,
    await ctx.backend.append({ workspace: ctx.name, id, block, base_sha: head.sha }),
    'appended',
  );
  return EXIT.ok;
}

export async function cmdCorrect(args: ParsedArgs): Promise<number> {
  const ctx = resolve(args);
  const id = requireId(args, 0);
  const body = await resolveBody(args, 1);
  if (body === undefined) throw new ConfigError('provide a body argument or pipe one on stdin');
  const head = await ctx.backend.head({ workspace: ctx.name, id });
  if (!head) throw notFound(id);
  const title = flagStr(args.flags, 'title');
  const result = await ctx.backend.correct({
    workspace: ctx.name,
    id,
    output: { body, ...(title ? { title } : {}) },
    base_sha: head.sha,
  });
  emitWrite(args, result, 'corrected');
  return EXIT.ok;
}

export async function cmdUndo(args: ParsedArgs): Promise<number> {
  const ctx = resolve(args);
  emitWrite(
    args,
    await ctx.backend.undo({ workspace: ctx.name, capture_id: requireId(args, 0, 'capture-id') }),
    'undone',
  );
  return EXIT.ok;
}

export async function cmdDelete(args: ParsedArgs): Promise<number> {
  const ctx = resolve(args);
  emitWrite(
    args,
    await ctx.backend.delete({ workspace: ctx.name, id: requireId(args, 0) }),
    'deleted',
  );
  return EXIT.ok;
}

// --- read ------------------------------------------------------------------

export async function cmdRead(args: ParsedArgs): Promise<number> {
  const ctx = resolve(args);
  const note = await ctx.backend.readNote({
    workspace: ctx.name,
    id: requireId(args, 0),
    include_source: flagBool(args.flags, 'include-source'),
  });
  if (flagBool(args.flags, 'raw')) {
    process.stdout.write(`${note.raw_body}\n`);
    return EXIT.ok;
  }
  emit(args, note, () => renderNote(args, note));
  return EXIT.ok;
}

// --- introspection ---------------------------------------------------------

export function cmdStatus(args: ParsedArgs): number {
  const { name, ws } = resolveWorkspace(loadConfig(), flagStr(args.flags, 'workspace'));
  const initialized = ws.mirror_path ? existsSync(`${ws.mirror_path}/.git`) : false;
  const s = makeStyle(args);
  emit(
    args,
    { workspace: name, backend: ws.backend, mirror_path: ws.mirror_path, initialized },
    () =>
      `${s.bold(name)}  ${s.muted(`(${ws.backend})`)}\n  mirror: ${ws.mirror_path ?? '—'} ${initialized ? s.accent('✓') : s.danger('(not initialized)')}`,
  );
  return EXIT.ok;
}

export function cmdWorkspaces(args: ParsedArgs): number {
  const config = loadConfig();
  const s = makeStyle(args);
  const rows = Object.entries(config.workspaces).map(([name, ws]) => ({
    name,
    backend: ws.backend,
    default: name === config.default_workspace,
  }));
  emit(args, rows, () =>
    rows.length === 0
      ? s.muted('no workspaces configured — run `zonot init`')
      : rows
          .map((r) => `${r.default ? s.accent('*') : ' '} ${r.name} ${s.muted(`(${r.backend})`)}`)
          .join('\n'),
  );
  return EXIT.ok;
}

// --- helpers ---------------------------------------------------------------

function emitWrite(args: ParsedArgs, result: WriteResult, verb: string): void {
  const s = makeStyle(args);
  emit(args, result, () => `${s.accent('✓')} ${verb}  ${result.path}  ${s.muted(result.id)}`);
}

function renderNote(args: ParsedArgs, note: NoteRecord): string {
  const s = makeStyle(args);
  const fm = note.frontmatter;
  const head = [
    s.bold(fm.title ?? note.id),
    s.muted(`${note.path}`),
    fm.tags.length ? fm.tags.map((t) => s.accent(`#${t}`)).join(' ') : '',
  ].filter(Boolean);
  return `${head.join('\n')}\n\n${note.body_compiled.trimEnd()}${note.body_timeline.trim() ? `\n${s.muted('─── timeline ───')}\n${note.body_timeline.trim()}` : ''}`;
}

function notFound(id: string): Error {
  const e = new Error(`note ${id} not found`);
  (e as { name: string }).name = 'NotFoundError';
  return e;
}
