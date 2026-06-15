// Path derivation per docs/specs/core-spec.md §1.4.
// Layout: notes/YYYY/MM/<id>-<slug>.md and sources/YYYY/MM/<id>.md.
// Once a path is written, it is immutable for the life of the note.

import { isValidUlid } from './ulid.ts';

function yearMonth(createdIso: string): { yyyy: string; mm: string } {
  const dt = new Date(createdIso);
  if (Number.isNaN(dt.getTime())) {
    throw new Error(`invalid ISO-8601 timestamp: ${createdIso}`);
  }
  const yyyy = String(dt.getUTCFullYear());
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return { yyyy, mm };
}

function assertUlid(id: string): void {
  if (!isValidUlid(id)) {
    throw new Error(`invalid ULID: ${id}`);
  }
}

export function deriveNotePath(input: { id: string; slug: string; created: string }): string {
  assertUlid(input.id);
  const { yyyy, mm } = yearMonth(input.created);
  return `notes/${yyyy}/${mm}/${input.id}-${input.slug}.md`;
}

export function deriveSourcePath(input: { id: string; created: string }): string {
  assertUlid(input.id);
  const { yyyy, mm } = yearMonth(input.created);
  return `sources/${yyyy}/${mm}/${input.id}.md`;
}
