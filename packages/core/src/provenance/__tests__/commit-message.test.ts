import { describe, expect, test } from 'bun:test';
import { buildCommitMessage, parseCommitTrailers } from '../commit-message.ts';

const CAPTURE_ID = '01HZZZA1B2C3D4E5F6G7H8J9K0';
const NOTE_ID = '01HZZZB1B2C3D4E5F6G7H8J9K1';

describe('buildCommitMessage', () => {
  test('minimal capture: Source + Capture-Id only, no body', () => {
    const msg = buildCommitMessage({
      subject: 'capture: kickoff',
      trailers: { source: 'mcp:claude', captureId: CAPTURE_ID },
    });
    expect(msg).toBe(`capture: kickoff\n\nSource: mcp:claude\nCapture-Id: ${CAPTURE_ID}`);
  });

  test('body paragraph sits between subject and trailer block', () => {
    const msg = buildCommitMessage({
      subject: 'capture: kickoff',
      body: 'imported from voice memo',
      trailers: { source: 'cli:zonot@0.1.0', captureId: CAPTURE_ID },
    });
    expect(msg).toBe(
      `capture: kickoff\n\nimported from voice memo\n\nSource: cli:zonot@0.1.0\nCapture-Id: ${CAPTURE_ID}`,
    );
  });

  test('correct op emits Edit-Of after Capture-Id', () => {
    const msg = buildCommitMessage({
      subject: `correct ${NOTE_ID}`,
      trailers: { source: 'mcp:claude', captureId: CAPTURE_ID, editOf: NOTE_ID },
    });
    expect(msg.split('\n\n').at(-1)).toBe(
      `Source: mcp:claude\nCapture-Id: ${CAPTURE_ID}\nEdit-Of: ${NOTE_ID}`,
    );
  });

  test('undo op emits Undo-Of', () => {
    const msg = buildCommitMessage({
      subject: `undo ${CAPTURE_ID}`,
      trailers: {
        source: 'mcp:claude',
        captureId: '01HZZZC1B2C3D4E5F6G7H8J9K2',
        undoOf: CAPTURE_ID,
      },
    });
    expect(msg).toContain(`Undo-Of: ${CAPTURE_ID}`);
  });

  test('delete op emits Delete-Of', () => {
    const msg = buildCommitMessage({
      subject: `delete ${NOTE_ID}`,
      trailers: { source: 'mcp:claude', captureId: CAPTURE_ID, deleteOf: NOTE_ID },
    });
    expect(msg).toContain(`Delete-Of: ${NOTE_ID}`);
  });

  test('import op emits Imported-From (before Model)', () => {
    const msg = buildCommitMessage({
      subject: 'import: 2 notes',
      trailers: { source: 'import:zonot@0', captureId: CAPTURE_ID, importedFrom: 'a.md, b.md' },
    });
    expect(msg).toContain('Imported-From: a.md, b.md');
  });

  test('Model trailer emitted only when present, last in order', () => {
    const msg = buildCommitMessage({
      subject: 'capture: enriched',
      trailers: { source: 'mcp:claude', captureId: CAPTURE_ID, model: 'claude-opus-4-8' },
    });
    expect(msg.split('\n').at(-1)).toBe('Model: claude-opus-4-8');
  });

  test('canonical trailer order: Source, Capture-Id, Edit-Of, Model', () => {
    const msg = buildCommitMessage({
      subject: 'correct + reenrich',
      trailers: {
        source: 'mcp:claude',
        captureId: CAPTURE_ID,
        editOf: NOTE_ID,
        model: 'claude-opus-4-8',
      },
    });
    const trailerLines = (msg.split('\n\n').at(-1) ?? '').split('\n').map((l) => l.split(':')[0]);
    expect(trailerLines).toEqual(['Source', 'Capture-Id', 'Edit-Of', 'Model']);
  });

  test('rejects empty subject', () => {
    expect(() =>
      buildCommitMessage({ subject: '   ', trailers: { source: 'x', captureId: CAPTURE_ID } }),
    ).toThrow(/subject must not be empty/);
  });

  test('rejects multi-line subject', () => {
    expect(() =>
      buildCommitMessage({
        subject: 'line one\nline two',
        trailers: { source: 'x', captureId: CAPTURE_ID },
      }),
    ).toThrow(/single line/);
  });

  test('rejects trailer value with a newline', () => {
    expect(() =>
      buildCommitMessage({
        subject: 'capture',
        trailers: { source: 'a\nb', captureId: CAPTURE_ID },
      }),
    ).toThrow(/must not contain a newline/);
  });

  test('rejects empty trailer value', () => {
    expect(() =>
      buildCommitMessage({ subject: 'capture', trailers: { source: '', captureId: CAPTURE_ID } }),
    ).toThrow(/must not be empty/);
  });
});

describe('parseCommitTrailers', () => {
  test('round-trips the trailer block', () => {
    const msg = buildCommitMessage({
      subject: 'correct',
      body: 'fix typo',
      trailers: { source: 'mcp:claude', captureId: CAPTURE_ID, editOf: NOTE_ID },
    });
    expect(parseCommitTrailers(msg)).toEqual({
      Source: 'mcp:claude',
      'Capture-Id': CAPTURE_ID,
      'Edit-Of': NOTE_ID,
    });
  });

  test('returns empty map when the final paragraph is not a trailer block', () => {
    expect(parseCommitTrailers('just a subject\n\na prose body with no trailers')).toEqual({});
  });

  test('tolerates CRLF line endings', () => {
    const msg = `capture\r\n\r\nSource: mcp:claude\r\nCapture-Id: ${CAPTURE_ID}`;
    expect(parseCommitTrailers(msg)).toEqual({ Source: 'mcp:claude', 'Capture-Id': CAPTURE_ID });
  });
});
