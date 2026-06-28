// Bulk importer (cli-spec §7). Walks a folder of Markdown, synthesizes the
// convention envelope (deterministic id so reruns don't duplicate), preserves the
// verbatim original as a sources/ node, and commits in batches with an
// Imported-From trailer. Commits via isomorphic-git directly — batched, which the
// single-note WriteClient.capture surface doesn't model.

import nodeFs, { readdirSync, readFileSync, statSync } from 'node:fs';
import {
  assembleNoteFile,
  assembleSourceFile,
  buildCommitMessage,
  buildNoteFrontmatter,
  buildSourceFrontmatter,
  deriveNotePath,
  deriveSourcePath,
  deterministicUlid,
  generateUlid,
  normalizeTags,
  parseFrontmatterLoose,
  slugify,
} from '@zonot/core';
import git from 'isomorphic-git';
import { parseInline } from './capture-parse.ts';
import { VERSION } from './version.ts';

const SOURCE = `import:zonot@${VERSION}`;
const SKIP_DIRS = new Set(['.git', 'node_modules']);

export interface PlannedNote {
  relpath: string;
  notePath: string;
  sourcePath?: string;
  noteContent: string;
  sourceContent?: string;
  status: 'new' | 'update';
}

export interface ImportPlan {
  notes: PlannedNote[];
  skipped: number;
}

/** Build the import plan: discover files, synthesize the envelope, detect re-imports. */
export function planImport(root: string, mirrorPath: string): ImportPlan {
  const notes: PlannedNote[] = [];
  const skipped = 0;

  for (const rel of discover(root)) {
    const abs = `${root}/${rel}`;
    const raw = readFileSync(abs, 'utf8');
    const { data, body } = parseFrontmatterLoose(raw);
    const createdAt = createdMs(data, statSync(abs).ctimeMs);
    const created = new Date(createdAt).toISOString();

    // Deterministic id keyed on (relpath, created) → reruns don't duplicate (§7.2).
    const id = deterministicUlid(createdAt, rel);
    const title = stringField(data, 'title');
    const tags = normalizeTags([...frontmatterTags(data), ...parseInline(body).tags]);
    const type = stringField(data, 'type') ?? 'note';

    const slug = slugify(title === undefined ? { id } : { title, id });
    const notePath = deriveNotePath({ id, slug, created });

    // The imported file (with its original frontmatter) differs from the rendered
    // note, so a sources/ node preserves the verbatim original (cli-spec §7.3).
    const sourceId = deterministicUlid(createdAt, `${rel}#source`);
    const sourcePath = deriveSourcePath({ id: sourceId, created });
    const sourceFm = buildSourceFrontmatter({ id: sourceId, created, noteId: id, source: SOURCE });

    // Provenance (incl. the origin relpath) rides in the commit trailer, NOT
    // frontmatter (ADR-0007). The note frontmatter carries no workspace.
    const noteFm = buildNoteFrontmatter({
      id,
      created,
      output: { ...(title !== undefined ? { title } : {}), tags, type },
      sourceId,
    });

    notes.push({
      relpath: rel,
      notePath,
      sourcePath,
      noteContent: assembleNoteFile(noteFm, ensureTrailingNewline(body)),
      sourceContent: assembleSourceFile(sourceFm, ensureTrailingNewline(raw)),
      status: existsInTree(mirrorPath, notePath) ? 'update' : 'new',
    });
  }

  return { notes, skipped };
}

/** Execute a plan: write the files and commit in batches with Imported-From. */
export async function runImport(
  plan: ImportPlan,
  mirrorPath: string,
  author: { name: string; email: string },
  batchSize: number,
): Promise<{ committed: number; commits: number }> {
  let commits = 0;
  for (let i = 0; i < plan.notes.length; i += batchSize) {
    const batch = plan.notes.slice(i, i + batchSize);
    for (const note of batch) {
      writeFile(mirrorPath, note.notePath, note.noteContent);
      await git.add({ fs: nodeFs, dir: mirrorPath, filepath: note.notePath });
      if (note.sourcePath && note.sourceContent) {
        writeFile(mirrorPath, note.sourcePath, note.sourceContent);
        await git.add({ fs: nodeFs, dir: mirrorPath, filepath: note.sourcePath });
      }
    }
    await git.commit({
      fs: nodeFs,
      dir: mirrorPath,
      author,
      message: buildCommitMessage({
        subject: `import: ${batch.length} note${batch.length === 1 ? '' : 's'}`,
        // Per-note origins are preserved here (comma-joined for a batch).
        trailers: {
          source: SOURCE,
          captureId: generateUlid(),
          importedFrom: batch.map((n) => n.relpath).join(', '),
        },
      }),
    });
    commits++;
  }
  return { committed: plan.notes.length, commits };
}

// --- discovery + synthesis helpers -----------------------------------------

/** Recursively list .md files, skipping .git/node_modules and hidden dirs. */
function discover(root: string): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(rel ? `${root}/${rel}` : root, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        walk(childRel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push(childRel);
      }
    }
  };
  walk('');
  return out.sort();
}

function createdMs(data: Record<string, unknown>, ctimeMs: number): number {
  const candidate = stringField(data, 'created') ?? stringField(data, 'date');
  if (candidate) {
    const t = Date.parse(candidate);
    if (!Number.isNaN(t)) return t;
  }
  return Math.floor(ctimeMs);
}

function frontmatterTags(data: Record<string, unknown>): string[] {
  const t = data.tags;
  if (Array.isArray(t)) return t.map(String);
  if (typeof t === 'string') return t.split(',').map((s) => s.trim());
  return [];
}

function stringField(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key];
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

function existsInTree(mirrorPath: string, relpath: string): boolean {
  try {
    statSync(`${mirrorPath}/${relpath}`);
    return true;
  } catch {
    return false;
  }
}

function writeFile(mirrorPath: string, relpath: string, content: string): void {
  const abs = `${mirrorPath}/${relpath}`;
  nodeFs.mkdirSync(abs.slice(0, abs.lastIndexOf('/')), { recursive: true });
  nodeFs.writeFileSync(abs, content);
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s : `${s}\n`;
}
