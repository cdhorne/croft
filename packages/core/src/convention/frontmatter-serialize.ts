// Frontmatter serialization per docs/specs/core-spec.md §1.1 + §1.2.
// Bespoke serializer for byte-deterministic output. We do NOT use a generic
// YAML lib because we need exact control over quoting, key order, and list
// style for the conformance test (ADR-0011).
//
// Key order:
//   Note:   id, v, created, tags  (MUST)
//         + updated, type           (SHOULD)
//         + aliases, thread, title, workspace, source  (COULD)
//         + unknown keys (passthrough in input order at the tail)
//
//   Source: id, v, type, of, created
//         + source, model, updated
//         + workspace
//         + unknown

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const NOTE_ORDER: ReadonlyArray<string> = [
  // MUST
  'id',
  'v',
  'created',
  'tags',
  // SHOULD
  'updated',
  'type',
  // COULD
  'aliases',
  'thread',
  'title',
  'workspace',
  'source',
];

const SOURCE_ORDER: ReadonlyArray<string> = [
  'id',
  'v',
  'type',
  'of',
  'created',
  'source',
  'model',
  'updated',
  'workspace',
];

const NOTE_KNOWN = new Set(NOTE_ORDER);
const SOURCE_KNOWN = new Set(SOURCE_ORDER);

export function serializeNoteFrontmatter(input: Record<string, Json | undefined>): string {
  return serialize(input, NOTE_ORDER, NOTE_KNOWN);
}

export function serializeSourceFrontmatter(input: Record<string, Json | undefined>): string {
  return serialize(input, SOURCE_ORDER, SOURCE_KNOWN);
}

function serialize(
  input: Record<string, Json | undefined>,
  order: ReadonlyArray<string>,
  known: ReadonlySet<string>,
): string {
  const lines: string[] = ['---'];

  for (const key of order) {
    if (!(key in input)) continue;
    const value = input[key];
    if (value === undefined) continue;
    emitKey(lines, key, value);
  }

  for (const key of Object.keys(input)) {
    if (known.has(key)) continue;
    const value = input[key];
    if (value === undefined) continue;
    emitKey(lines, key, value);
  }

  lines.push('---');
  lines.push(''); // trailing newline after the closing ---
  return lines.join('\n');
}

function emitKey(lines: string[], key: string, value: Json): void {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${key}: []`);
      return;
    }
    lines.push(`${key}:`);
    for (const item of value) {
      lines.push(`  - ${formatScalar(item)}`);
    }
    return;
  }

  if (typeof value === 'object' && value !== null) {
    // Unknown nested object — JSON-encode (this is the safe fallback for
    // passthrough keys carrying structured data; rare in v1).
    lines.push(`${key}: ${JSON.stringify(value)}`);
    return;
  }

  lines.push(`${key}: ${formatScalar(value)}`);
}

function formatScalar(value: Json): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return formatString(value);
  // Array / object at scalar position — JSON-encode.
  return JSON.stringify(value);
}

// Unquoted unless quoting is required (§1.2). ISO-8601 datetimes, ULIDs,
// and other safe strings emit unquoted.
function formatString(s: string): string {
  if (needsQuoting(s)) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}

// YAML 1.2 plain-scalar rules: quote only what would change meaning.
// `C#` and `email@example.com` style values stay unquoted; comment / mapping
// indicators force quoting. Single-quoted scalars don't admit newlines, so
// any control char in the value forces quoting; values with embedded newlines
// are detected here but produce technically-malformed single-quoted YAML —
// frontmatter values shouldn't contain newlines per the convention (the body
// is below the `---`); enforced at parse time, not here.
function needsQuoting(s: string): boolean {
  if (s === '') return true;
  if (/^\s|\s$/.test(s)) return true;
  if (/^[!&*|>%@`?,[{]/.test(s)) return true;
  if (/^(true|false|null|yes|no|on|off|~)$/i.test(s)) return true;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return true;
  if (s.includes(': ')) return true; // would parse as a nested mapping
  if (s.includes(' #')) return true; // would parse as a comment break
  if (s.startsWith('#')) return true; // would parse as a full-line comment
  if (s.endsWith(':')) return true; // would parse as a key
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}
