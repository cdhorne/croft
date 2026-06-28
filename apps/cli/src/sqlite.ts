// Production bun:sqlite adapter for the local FTS index (cli-spec §3). Wraps a
// file-backed Database in the core SqliteAdapter contract; the index is
// derivable/disposable (ADR-0001), so WAL + relaxed sync is fine.

import { Database } from 'bun:sqlite';
import type { SqliteAdapter, SqliteStatement } from '@zonot/core/fts';

export function openBunSqlite(path: string): SqliteAdapter {
  const db = new Database(path, { create: true });
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  return {
    exec(sql: string): void {
      db.exec(sql);
    },
    prepare(sql: string): SqliteStatement {
      const stmt = db.prepare(sql);
      return {
        run(...params: ReadonlyArray<unknown>) {
          const r = stmt.run(...(params as never[]));
          return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
        },
        get<T = Record<string, unknown>>(...params: ReadonlyArray<unknown>): T | undefined {
          return stmt.get(...(params as never[])) as T | undefined;
        },
        all<T = Record<string, unknown>>(...params: ReadonlyArray<unknown>): T[] {
          return stmt.all(...(params as never[])) as T[];
        },
      };
    },
    transaction<T>(fn: () => T): T {
      return db.transaction(fn)();
    },
    close(): void {
      db.close();
    },
  };
}
