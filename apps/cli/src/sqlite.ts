// Runtime-portable SQLite for the local FTS index. The CLI runs on either Bun
// (bun:sqlite) or Node (node:sqlite) — both ship FTS5 and satisfy the core
// SqliteAdapter contract. Selected at runtime; the drivers are kept external in
// the bundle so neither runtime pulls in the other's builtin. The index is
// derivable/disposable (ADR-0001), so WAL + relaxed sync is fine.

import type { SqliteAdapter, SqliteStatement } from '@zonot/core/fts';

/** Open the right driver for the current runtime. */
export async function openSqlite(path: string): Promise<SqliteAdapter> {
  if (process.versions.bun) {
    const { Database } = await import('bun:sqlite');
    return bunAdapter(new Database(path, { create: true }));
  }
  const { DatabaseSync } = await import('node:sqlite');
  return nodeAdapter(new DatabaseSync(path));
}

// --- bun:sqlite ------------------------------------------------------------

interface BunDb {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...p: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...p: unknown[]): unknown;
    all(...p: unknown[]): unknown[];
  };
  transaction(fn: () => unknown): () => unknown;
  close(): void;
}

function bunAdapter(db: BunDb): SqliteAdapter {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  return {
    exec: (sql) => db.exec(sql),
    prepare: (sql) => wrap(db.prepare(sql)),
    transaction: <T>(fn: () => T): T => db.transaction(fn as () => unknown)() as T,
    close: () => db.close(),
  };
}

// --- node:sqlite -----------------------------------------------------------

interface NodeDb {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...p: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...p: unknown[]): unknown;
    all(...p: unknown[]): unknown[];
  };
  close(): void;
}

function nodeAdapter(db: NodeDb): SqliteAdapter {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  // node:sqlite has no transaction() helper — reentrant BEGIN/SAVEPOINT so the
  // IndexWriter's per-upsert transactions nest inside a rebuild transaction.
  let depth = 0;
  const transaction = <T>(fn: () => T): T => {
    const outer = depth === 0;
    const sp = `zsp_${depth}`;
    db.exec(outer ? 'BEGIN' : `SAVEPOINT ${sp}`);
    depth++;
    try {
      const r = fn();
      depth--;
      db.exec(outer ? 'COMMIT' : `RELEASE ${sp}`);
      return r;
    } catch (e) {
      depth--;
      db.exec(outer ? 'ROLLBACK' : `ROLLBACK TO ${sp}`);
      throw e;
    }
  };
  return {
    exec: (sql) => db.exec(sql),
    prepare: (sql) => wrap(db.prepare(sql)),
    transaction,
    close: () => db.close(),
  };
}

// Both drivers expose run/get/all with positional params; normalize `changes`.
function wrap(stmt: {
  run(...p: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...p: unknown[]): unknown;
  all(...p: unknown[]): unknown[];
}): SqliteStatement {
  return {
    run(...params: ReadonlyArray<unknown>) {
      const r = stmt.run(...(params as unknown[]));
      return { changes: Number(r.changes), lastInsertRowid: r.lastInsertRowid };
    },
    get<T = Record<string, unknown>>(...params: ReadonlyArray<unknown>): T | undefined {
      return stmt.get(...(params as unknown[])) as T | undefined;
    },
    all<T = Record<string, unknown>>(...params: ReadonlyArray<unknown>): T[] {
      return stmt.all(...(params as unknown[])) as T[];
    },
  };
}
