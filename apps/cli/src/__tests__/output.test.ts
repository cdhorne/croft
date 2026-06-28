import { describe, expect, test } from 'bun:test';
import {
  NotFoundError,
  SHAConflictError,
  UpstreamDownError,
  WorkspaceNotInitializedError,
} from '@zonot/core/errors';
import { parseArgs } from '../args.ts';
import { ConfigError } from '../config.ts';
import { EXIT, renderError } from '../output.ts';

const TRACE = '01HZZZA1B2C3D4E5F6G7H8J9K0';
const args = parseArgs(['x', '--no-color']);

/** renderError writes to stderr — capture it and return [code, text]. */
function render(err: unknown): { code: number; text: string } {
  const chunks: string[] = [];
  const orig = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((s: string) => {
    chunks.push(String(s));
    return true;
  }) as typeof process.stderr.write;
  try {
    return { code: renderError(args, err, TRACE), text: chunks.join('') };
  } finally {
    process.stderr.write = orig;
  }
}

describe('renderError — exit-code mapping (cli-spec §2.5/§8)', () => {
  test.each([
    [new NotFoundError('note x'), EXIT.user],
    [new SHAConflictError('notes/x.md', 'aaa', 'bbb'), EXIT.user],
    [new ConfigError('bad config'), EXIT.config],
    [new WorkspaceNotInitializedError('/dir'), EXIT.config],
    [new UpstreamDownError('github 503'), EXIT.upstream],
    [new Error('surprise'), EXIT.internal],
  ])('%s → exit %d', (err, code) => {
    expect(render(err).code).toBe(code);
  });

  test('renders the slug, message, trace id, and a hint where defined', () => {
    const { text } = render(new SHAConflictError('notes/x.md', 'aaa', 'bbb'));
    expect(text).toContain('error: sha-conflict');
    expect(text).toContain(`trace_id: ${TRACE}`);
    expect(text).toContain('try: zonot read'); // hint
  });

  test('uninitialized error hints at `zonot init`', () => {
    expect(render(new WorkspaceNotInitializedError('/dir')).text).toContain('zonot init');
  });
});
