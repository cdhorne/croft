import { describe, expect, test } from 'bun:test';
import { jsonSchemas } from '../json-schema.ts';

describe('jsonSchemas', () => {
  test('exposes every key the spec mentions', () => {
    expect(Object.keys(jsonSchemas).sort()).toEqual(
      [
        'AppendInput',
        'CaptureInput',
        'CaptureOutput',
        'CorrectInput',
        'DeleteInput',
        'InitInput',
        'ListInput',
        'ListRecentInput',
        'ListTagsInput',
        'NoteFrontmatter',
        'NoteRecord',
        'ParsedCapture',
        'ReadInput',
        'SearchInput',
        'SourceFrontmatter',
        'SourceRecord',
        'UndoInput',
        'WriteResult',
      ].sort(),
    );
  });

  test('each emitted JSON Schema declares a top-level type', () => {
    for (const [name, schema] of Object.entries(jsonSchemas)) {
      expect(schema, `${name} missing top-level type`).toHaveProperty('type');
    }
  });

  test('CaptureInput JSON Schema requires workspace + output', () => {
    const schema = jsonSchemas.CaptureInput as { required: string[] };
    expect(schema.required).toEqual(expect.arrayContaining(['workspace', 'output']));
  });
});
