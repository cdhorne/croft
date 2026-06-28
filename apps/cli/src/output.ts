// Output discipline (cli-spec §2, §8). Human-rendered on a TTY; NDJSON when piped
// or `--json`. Errors always go to stderr as plain text with the trace id and an
// exit code that carries the class. Color uses semantic roles (no theming),
// disabled by NO_COLOR / --no-color.

import type { ParsedArgs } from './args.ts';

export const EXIT = {
  ok: 0,
  user: 1, // validation / not-found / conflict
  upstream: 2, // worker / GitHub down
  config: 3, // missing creds / malformed config
  interrupted: 4,
  internal: 10,
} as const;

export function wantJson(args: ParsedArgs): boolean {
  return args.flags.json === true || !process.stdout.isTTY;
}

function colorEnabled(args: ParsedArgs): boolean {
  return (
    process.stdout.isTTY &&
    !process.env.NO_COLOR &&
    args.flags.color !== false &&
    args.flags['no-color'] !== true
  );
}

const CODES = { accent: 36, muted: 2, danger: 31, bold: 1 } as const;

export function makeStyle(args: ParsedArgs) {
  const on = colorEnabled(args);
  const wrap = (code: number) => (s: string) => (on ? `\x1b[${code}m${s}\x1b[0m` : s);
  return {
    accent: wrap(CODES.accent),
    muted: wrap(CODES.muted),
    danger: wrap(CODES.danger),
    bold: wrap(CODES.bold),
  };
}

/** Emit one record: an NDJSON line when piped/--json, else `human` to stdout. */
export function emit(args: ParsedArgs, record: unknown, human: () => string): void {
  if (args.flags.quiet === true) return;
  process.stdout.write(wantJson(args) ? `${JSON.stringify(record)}\n` : `${human()}\n`);
}

export function emitLines(
  args: ParsedArgs,
  records: unknown[],
  human: (r: unknown) => string,
): void {
  if (args.flags.quiet === true) return;
  const json = wantJson(args);
  for (const r of records) process.stdout.write(json ? `${JSON.stringify(r)}\n` : `${human(r)}\n`);
}

// Error name → (exit code, problem slug, actionable hint).
const ERROR_MAP: Record<string, { code: number; slug: string; hint?: string }> = {
  SHAConflictError: {
    code: EXIT.user,
    slug: 'sha-conflict',
    hint: 'zonot read <id> to see the current version',
  },
  NotFoundError: { code: EXIT.user, slug: 'not-found' },
  ValidationError: { code: EXIT.user, slug: 'validation' },
  IdempotencyReplayError: { code: EXIT.user, slug: 'idempotency-replay' },
  WorkspaceNotInitializedError: {
    code: EXIT.config,
    slug: 'uninitialized',
    hint: 'run `zonot init`',
  },
  ConfigError: { code: EXIT.config, slug: 'config' },
  UnauthorizedError: { code: EXIT.upstream, slug: 'unauthorized' },
  RateLimitedError: { code: EXIT.upstream, slug: 'rate-limited' },
  UpstreamRateLimitedError: { code: EXIT.upstream, slug: 'upstream-rate-limited' },
  UpstreamDownError: { code: EXIT.upstream, slug: 'upstream-down' },
  NoteFileParseError: { code: EXIT.internal, slug: 'internal' },
};

/** Render a thrown error to stderr (cli-spec §8.2); returns the exit code. */
export function renderError(args: ParsedArgs, err: unknown, traceId: string): number {
  const e = err as { name?: string; message?: string };
  const mapped = (e?.name && ERROR_MAP[e.name]) || { code: EXIT.internal, slug: 'internal' };
  const s = makeStyle(args);
  const lines = [
    `${s.danger('error:')} ${mapped.slug}`,
    `  ${e?.message ?? 'an error occurred'}`,
    `  ${s.muted(`trace_id: ${traceId}`)}`,
  ];
  if (mapped.hint) lines.push(`  ${s.muted(`try: ${mapped.hint}`)}`);
  process.stderr.write(`${lines.join('\n')}\n`);
  return mapped.code;
}
