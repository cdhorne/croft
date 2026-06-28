import { describe, expect, test } from 'bun:test';
import { flagNum, flagStr, parseArgs } from '../args.ts';

describe('parseArgs', () => {
  test('command, positionals, and =value / boolean / short flags', () => {
    const a = parseArgs(['capture', 'hello', '--title=Hi', '--json', '-q']);
    expect(a.command).toBe('capture');
    expect(a.positionals).toEqual(['hello']);
    expect(a.flags).toMatchObject({ title: 'Hi', json: true, quiet: true });
  });

  test('a positional starting with "-" is NOT treated as a flag', () => {
    const a = parseArgs(['append', '01HZ', '- 2026-06-28 | entry']);
    expect(a.positionals).toEqual(['01HZ', '- 2026-06-28 | entry']);
    expect(Object.keys(a.flags)).toHaveLength(0);
  });

  test('negative numbers are positionals, real short flags still parse', () => {
    expect(parseArgs(['x', '-5']).positionals).toEqual(['-5']);
    expect(parseArgs(['x', '-qv']).flags).toMatchObject({ quiet: true, verbose: true });
  });

  test('-- stops flag parsing', () => {
    const a = parseArgs(['capture', '--', '--not-a-flag']);
    expect(a.positionals).toEqual(['--not-a-flag']);
  });

  test('flag accessors', () => {
    const a = parseArgs(['x', '--n=5', '--name=bob']);
    expect(flagStr(a.flags, 'name')).toBe('bob');
    expect(flagNum(a.flags, 'n')).toBe(5);
    expect(flagStr(a.flags, 'missing')).toBeUndefined();
    expect(() => flagNum(parseArgs(['x', '--n=abc']).flags, 'n')).toThrow();
  });
});
