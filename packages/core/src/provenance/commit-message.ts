// Commit-message + provenance-trailer builder (message format in core-spec §3.5 /
// ADR-0007). The core builds the message; the backend writes it. Provenance rides
// in commit trailers, NOT note frontmatter — git history is the immutability record.
// Trailers are git-style (`Key: value`, one per line) in a single final paragraph.

// Trailer keys, in the canonical emission order.
const TRAILER_ORDER = ['Source', 'Capture-Id', 'Edit-Of', 'Undo-Of', 'Delete-Of', 'Model'] as const;
type TrailerKey = (typeof TRAILER_ORDER)[number];

export interface CommitTrailers {
  /** Capture origin, e.g. "mcp:claude" or "cli:zonot@0.1.0". Always present. */
  source: string;
  /** ULID of this write event; mirrors the WriteResult.capture_id. Always present. */
  captureId: string;
  /** Id of the note being corrected (correct op). */
  editOf?: string | undefined;
  /** Capture-Id of the write being undone (undo op). */
  undoOf?: string | undefined;
  /** Id of the note being deleted (delete op). */
  deleteOf?: string | undefined;
  /** Model identifier — set ONLY when an enrichment model touched the body. */
  model?: string | undefined;
}

export interface CommitMessageInput {
  /** Single-line summary. Required, non-empty, no newlines. */
  subject: string;
  /** Optional free-form body paragraph(s), placed above the trailer block. */
  body?: string | undefined;
  trailers: CommitTrailers;
}

const TRAILER_VALUE_FORBIDDEN = /[\r\n]/;

function trailerEntries(t: CommitTrailers): Array<[TrailerKey, string]> {
  const map: Partial<Record<TrailerKey, string | undefined>> = {
    Source: t.source,
    'Capture-Id': t.captureId,
    'Edit-Of': t.editOf,
    'Undo-Of': t.undoOf,
    'Delete-Of': t.deleteOf,
    Model: t.model,
  };
  const out: Array<[TrailerKey, string]> = [];
  for (const key of TRAILER_ORDER) {
    const value = map[key];
    if (value === undefined) continue;
    if (value === '') {
      throw new Error(`commit trailer ${key} must not be empty`);
    }
    if (TRAILER_VALUE_FORBIDDEN.test(value)) {
      throw new Error(`commit trailer ${key} must not contain a newline`);
    }
    out.push([key, value]);
  }
  return out;
}

/**
 * Assemble the full commit message (subject + optional body + trailer block).
 * Throws on a malformed subject or trailer value so a bad message never reaches
 * the backend's commit call.
 */
export function buildCommitMessage(input: CommitMessageInput): string {
  const subject = input.subject.trim();
  if (subject === '') throw new Error('commit subject must not be empty');
  if (TRAILER_VALUE_FORBIDDEN.test(subject)) {
    throw new Error('commit subject must be a single line');
  }

  const trailers = trailerEntries(input.trailers);

  const paragraphs: string[] = [subject];
  const body = input.body?.trim();
  if (body) paragraphs.push(body);
  paragraphs.push(trailers.map(([k, v]) => `${k}: ${v}`).join('\n'));

  return paragraphs.join('\n\n');
}

/**
 * Parse the trailer block back out of a commit message (last paragraph of
 * `Key: value` lines). Used by undo/read paths that resolve a write event by
 * its Capture-Id, and by tests. Returns the raw key→value map.
 */
export function parseCommitTrailers(message: string): Record<string, string> {
  const paragraphs = message.replace(/\r\n/g, '\n').trimEnd().split('\n\n');
  const last = paragraphs.at(-1) ?? '';
  const out: Record<string, string> = {};
  for (const line of last.split('\n')) {
    const match = /^([A-Za-z][A-Za-z-]*): (.+)$/.exec(line);
    if (!match || match[1] === undefined || match[2] === undefined) {
      // A non-trailer line means this paragraph isn't a trailer block.
      return out;
    }
    out[match[1]] = match[2];
  }
  return out;
}
