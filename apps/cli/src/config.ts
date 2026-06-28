// Config layout (cli-spec §3). XDG-aware paths; `ZONOT_HOME` overrides the whole
// tree (used by tests). config.json holds the workspace map; per-workspace data
// (the git mirror + the FTS sqlite, Phase 2c) lives under the data dir.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

export type Backend = 'local' | 'worker';

export interface WorkspaceConfig {
  backend: Backend;
  /** local: the upstream repo (for clone/push, wired later). */
  repo?: string;
  /** local: absolute path to the isomorphic-git mirror. */
  mirror_path?: string;
  /** worker: the path-secret base URL of the Worker (thin-client mode). */
  worker_url?: string;
}

export interface ZonotConfig {
  default_workspace?: string;
  workspaces: Record<string, WorkspaceConfig>;
}

export interface Paths {
  configDir: string;
  dataDir: string;
  configFile: string;
}

export function paths(): Paths {
  const zh = process.env.ZONOT_HOME;
  if (zh) return { configDir: zh, dataDir: zh, configFile: `${zh}/config.json` };
  const home = homedir();
  const configDir = `${process.env.XDG_CONFIG_HOME ?? `${home}/.config`}/zonot`;
  const dataDir = `${process.env.XDG_DATA_HOME ?? `${home}/.local/share`}/zonot`;
  return { configDir, dataDir, configFile: `${configDir}/config.json` };
}

export function loadConfig(): ZonotConfig {
  const { configFile } = paths();
  if (!existsSync(configFile)) return { workspaces: {} };
  try {
    return JSON.parse(readFileSync(configFile, 'utf8')) as ZonotConfig;
  } catch {
    throw new ConfigError(`config is not valid JSON: ${configFile}`);
  }
}

export function saveConfig(config: ZonotConfig): void {
  const { configDir, configFile } = paths();
  mkdirSync(configDir, { recursive: true });
  writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
}

/** Resolve the workspace to operate on (explicit flag → default → sole workspace). */
export function resolveWorkspace(
  config: ZonotConfig,
  requested?: string,
): { name: string; ws: WorkspaceConfig } {
  const names = Object.keys(config.workspaces);
  const name = requested ?? config.default_workspace ?? (names.length === 1 ? names[0] : undefined);
  if (!name) {
    throw new ConfigError(
      names.length === 0
        ? 'no workspaces configured — run `zonot init`'
        : 'multiple workspaces; pass --workspace=NAME',
    );
  }
  const ws = config.workspaces[name];
  if (!ws) throw new ConfigError(`unknown workspace: ${name}`);
  return { name, ws };
}

/** Default mirror path for a workspace under the data dir. */
export function defaultMirrorPath(workspace: string): string {
  return `${paths().dataDir}/${workspace}/mirror`;
}

/** A config-level failure (missing creds, malformed config) — CLI exit code 3. */
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}
