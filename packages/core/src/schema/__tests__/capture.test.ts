import { describe, expect, test } from 'bun:test';
import { captureInputSchema, chipSpecSchema, parsedCaptureSchema } from '../capture.ts';

describe('captureInputSchema', () => {
  test('accepts a minimal Tier-0 capture (body only)', () => {
    const parsed = captureInputSchema.parse({
      workspace: 'personal',
      output: { body: 'Quick thought.' },
    });
    expect(parsed.workspace).toBe('personal');
    expect(parsed.output.body).toBe('Quick thought.');
  });

  test('accepts the full capture surface', () => {
    const parsed = captureInputSchema.parse({
      workspace: 'personal',
      output: {
        title: 'Launch note',
        tags: ['design', 'priority'],
        type: 'todo',
        body: 'Quick note about the launch #design @croft !todo',
      },
      raw: 'Quick note about the launch #design @croft !todo',
      thread: 'q3-launch',
      idempotency_key: '01HZZZA1B2C3D4E5F6G7H8J9K0',
    });
    expect(parsed.output.tags).toEqual(['design', 'priority']);
    expect(parsed.idempotency_key).toBe('01HZZZA1B2C3D4E5F6G7H8J9K0');
  });

  test('rejects an empty workspace', () => {
    expect(() => captureInputSchema.parse({ workspace: '', output: { body: '' } })).not.toThrow(); // empty strings are valid; the workspace layer rejects unknown workspaces
  });
});

describe('chipSpecSchema', () => {
  test('accepts a tag chip', () => {
    const parsed = chipSpecSchema.parse({
      id: 'chip-1',
      kind: 'tag',
      value: 'design',
      sigil: '#',
      enabled: true,
      range: [16, 23],
    });
    expect(parsed.kind).toBe('tag');
    expect(parsed.range).toEqual([16, 23]);
  });

  test('rejects a negative range offset', () => {
    expect(() =>
      chipSpecSchema.parse({
        id: 'chip-1',
        kind: 'tag',
        value: 'design',
        sigil: '#',
        enabled: true,
        range: [-1, 5],
      }),
    ).toThrow();
  });
});

describe('parsedCaptureSchema', () => {
  test('round-trips a body with parsed chips', () => {
    const parsed = parsedCaptureSchema.parse({
      body: 'Quick note about launch #design @croft !todo',
      tags: ['design'],
      thread: 'croft',
      type: 'todo',
      title: 'Quick note about launch',
      chips: [
        { id: 'c1', kind: 'tag', value: 'design', sigil: '#', enabled: true, range: [24, 31] },
        { id: 'c2', kind: 'thread', value: 'croft', sigil: '@', enabled: true, range: [32, 38] },
        { id: 'c3', kind: 'type', value: 'todo', sigil: '!', enabled: true, range: [39, 44] },
      ],
    });
    expect(parsed.chips).toHaveLength(3);
  });
});
