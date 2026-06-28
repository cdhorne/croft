import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigError, loadConfig, paths, resolveWorkspace, saveConfig } from '../config.ts';

let home: string;
const prev = process.env.ZONOT_HOME;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'zonot-cfg-'));
  process.env.ZONOT_HOME = home;
});
afterEach(async () => {
  if (prev === undefined) delete process.env.ZONOT_HOME;
  else process.env.ZONOT_HOME = prev;
  await rm(home, { recursive: true, force: true });
});

describe('config', () => {
  test('ZONOT_HOME overrides the path tree', () => {
    expect(paths().configFile).toBe(`${home}/config.json`);
  });

  test('save then load round-trips', () => {
    expect(loadConfig()).toEqual({ workspaces: {} }); // absent → empty
    saveConfig({ default_workspace: 'personal', workspaces: { personal: { backend: 'local' } } });
    expect(loadConfig().default_workspace).toBe('personal');
  });

  test('resolveWorkspace: explicit → default → sole; errors otherwise', () => {
    const two = {
      workspaces: { a: { backend: 'local' as const }, b: { backend: 'local' as const } },
    };
    expect(resolveWorkspace(two, 'b').name).toBe('b');
    expect(resolveWorkspace({ default_workspace: 'a', ...two }).name).toBe('a');
    expect(resolveWorkspace({ workspaces: { only: { backend: 'local' } } }).name).toBe('only');
    expect(() => resolveWorkspace(two)).toThrow(ConfigError); // ambiguous
    expect(() => resolveWorkspace({ workspaces: {} })).toThrow(/no workspaces/);
  });
});
