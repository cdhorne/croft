import { describe, expect, test } from 'bun:test';
import { NoteFileParseError } from '../../errors/index.ts';
import type { NoteFrontmatter, SourceFrontmatter } from '../../schema/index.ts';
import {
  assembleNoteFile,
  assembleSourceFile,
  parseNoteFile,
  parseSourceFile,
} from '../note-file.ts';

const ID = '01HZZZA1B2C3D4E5F6G7H8J9K0';
const SRC_ID = '01HZZZB1B2C3D4E5F6G7H8J9K1';

const noteFm: NoteFrontmatter = {
  id: ID,
  v: 1,
  created: '2026-06-14T12:00:00Z',
  tags: ['foo-bar', 'kickoff'],
  type: 'note',
  title: 'Kickoff',
  workspace: 'personal',
};

describe('assembleNoteFile', () => {
  test('frontmatter block then verbatim body', () => {
    const body = 'compiled truth\n\n---\n\n- **2026-06-14** | seed';
    const file = assembleNoteFile(noteFm, body);
    expect(file).toBe(
      `---\nid: ${ID}\nv: 1\ncreated: 2026-06-14T12:00:00Z\ntags:\n  - foo-bar\n  - kickoff\ntype: note\ntitle: Kickoff\nworkspace: personal\n---\n${body}`,
    );
  });
});

describe('parseNoteFile', () => {
  test('round-trips assemble -> parse with the body split exposed', () => {
    const body = 'compiled truth\n\n---\n\n- **2026-06-14** | seed';
    const parsed = parseNoteFile(assembleNoteFile(noteFm, body));
    expect(parsed.frontmatter).toEqual(noteFm);
    expect(parsed.raw_body).toBe(body);
    expect(parsed.body_compiled).toBe('compiled truth\n');
    expect(parsed.body_timeline).toBe('\n- **2026-06-14** | seed');
  });

  test('preserves unknown frontmatter keys (tolerant pass-through)', () => {
    const file = `---\nid: ${ID}\nv: 1\ncreated: 2026-06-14T12:00:00Z\ntags:\n  - x\ncssclass: wide\n---\nbody`;
    const parsed = parseNoteFile(file);
    expect(parsed.frontmatter.cssclass).toBe('wide');
  });

  test('no-divider body is all compiled, empty timeline', () => {
    const parsed = parseNoteFile(assembleNoteFile(noteFm, 'just a thought\n'));
    expect(parsed.body_compiled).toBe('just a thought\n');
    expect(parsed.body_timeline).toBe('');
  });

  test('throws NoteFileParseError on missing frontmatter', () => {
    expect(() => parseNoteFile('no frontmatter here', 'notes/2026/06/x.md')).toThrow(
      NoteFileParseError,
    );
  });

  test('throws NoteFileParseError on unterminated frontmatter', () => {
    expect(() => parseNoteFile('---\nid: x\nstill going')).toThrow(/unterminated/);
  });

  test('throws NoteFileParseError when frontmatter violates the schema', () => {
    // created is not ISO-8601 UTC.
    const file = `---\nid: ${ID}\nv: 1\ncreated: yesterday\ntags: []\n---\nbody`;
    expect(() => parseNoteFile(file, 'notes/2026/06/bad.md')).toThrow(NoteFileParseError);
  });

  test('error message carries the path and the offending field', () => {
    const file = `---\nid: ${ID}\nv: 1\ncreated: yesterday\ntags: []\n---\nbody`;
    try {
      parseNoteFile(file, 'notes/2026/06/bad.md');
      throw new Error('expected throw');
    } catch (err) {
      expect((err as NoteFileParseError).path).toBe('notes/2026/06/bad.md');
      expect((err as Error).message).toContain('created');
    }
  });
});

describe('source files', () => {
  const sourceFm: SourceFrontmatter = {
    id: SRC_ID,
    v: 1,
    type: 'context',
    of: ID,
    created: '2026-06-14T12:00:00Z',
    source: 'mcp:claude',
  };

  test('round-trips assemble -> parse', () => {
    const body = 'verbatim raw capture text';
    const parsed = parseSourceFile(assembleSourceFile(sourceFm, body));
    expect(parsed.frontmatter).toEqual(sourceFm);
    expect(parsed.body).toBe(body);
  });

  test('source frontmatter emits type: context right after id/v', () => {
    const file = assembleSourceFile(sourceFm, 'x');
    const head = file.split('\n').slice(0, 4);
    expect(head).toEqual([`---`, `id: ${SRC_ID}`, 'v: 1', 'type: context']);
  });
});
