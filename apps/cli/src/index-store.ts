// Local FTS index orchestration (cli-spec §3). The index at <data>/<ws>/zonot.sqlite
// is derivable from the mirror (ADR-0001) and rebuilt whenever git HEAD has moved
// since it was last built — covering CLI writes and external commits/pulls (an
// uncommitted working-tree edit is not detected). Rebuild is a full O(repo)
// re-index (not incremental — fine at v1 scale) into a freshly recreated db file.

import nodeFs, { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { parseNoteFile, parseSourceFile } from '@zonot/core';
import { IndexWriter, SearchEngine, type SqliteAdapter } from '@zonot/core/fts';
import git from 'isomorphic-git';
import { openSqlite } from './sqlite.ts';

export interface Index {
  engine: SearchEngine;
  close(): void;
}

/** Open the index for a workspace, rebuilding from the mirror if HEAD has moved. */
export async function openIndex(
  workspace: string,
  mirrorPath: string,
  dataDir: string,
): Promise<Index> {
  const dir = `${dataDir}/${workspace}`;
  mkdirSync(dir, { recursive: true });
  const dbPath = `${dir}/zonot.sqlite`;
  const head = (await currentHead(mirrorPath)) ?? '';

  let adapter = await openSqlite(dbPath);
  new IndexWriter(adapter).ensureSchema();

  if (getMeta(adapter, 'indexed_head') !== head) {
    adapter.close();
    removeDb(dbPath);
    adapter = await openSqlite(dbPath);
    const writer = new IndexWriter(adapter);
    writer.ensureSchema();
    adapter.transaction(() => indexAll(writer, workspace, mirrorPath)); // one commit, not N
    setMeta(adapter, 'indexed_head', head);
  }

  return { engine: new SearchEngine(adapter), close: () => adapter.close() };
}

function indexAll(writer: IndexWriter, workspace: string, mirrorPath: string): void {
  for (const rel of mdFiles(mirrorPath, 'notes')) {
    const { frontmatter: fm, raw_body } = parseNoteFile(read(mirrorPath, rel), rel);
    writer.upsertNote({
      id: fm.id,
      path: rel,
      title: fm.title ?? '',
      type: fm.type ?? 'note',
      thread: fm.thread,
      workspace,
      created: fm.created,
      updated: fm.updated,
      v: fm.v,
      source_id: fm.source,
      tags: fm.tags,
      aliases: fm.aliases,
      body: raw_body,
    });
  }
  for (const rel of mdFiles(mirrorPath, 'sources')) {
    const { frontmatter: fm } = parseSourceFile(read(mirrorPath, rel), rel);
    writer.upsertSource({
      id: fm.id,
      path: rel,
      of: fm.of,
      created: fm.created,
      source: fm.source,
      model: fm.model,
      workspace,
      v: fm.v,
    });
  }
}

async function currentHead(mirrorPath: string): Promise<string | null> {
  try {
    return await git.resolveRef({ fs: nodeFs, dir: mirrorPath, ref: 'HEAD' });
  } catch {
    return null;
  }
}

function mdFiles(mirrorPath: string, sub: string): string[] {
  const root = `${mirrorPath}/${sub}`;
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true })
    .filter((p): p is string => typeof p === 'string' && p.endsWith('.md'))
    .map((p) => `${sub}/${p.replaceAll('\\', '/')}`); // canonical forward-slash paths on Windows too
}

function read(mirrorPath: string, rel: string): string {
  return readFileSync(`${mirrorPath}/${rel}`, 'utf8');
}

function getMeta(adapter: SqliteAdapter, k: string): string | null {
  return adapter.prepare(`SELECT v FROM zonot_meta WHERE k = ?`).get<{ v: string }>(k)?.v ?? null;
}

function setMeta(adapter: SqliteAdapter, k: string, v: string): void {
  adapter.prepare(`INSERT OR REPLACE INTO zonot_meta(k, v) VALUES (?, ?)`).run(k, v);
}

function removeDb(dbPath: string): void {
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${dbPath}${suffix}`, { force: true });
}
