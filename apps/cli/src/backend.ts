// Resolve a WriteClient for a workspace (cli-spec §4). v1.0 of the CLI is
// clone-holder/local only — IsomorphicGitBackend over node:fs. Worker thin-client
// mode (--worker) is configured but not yet wired here.

import nodeFs from 'node:fs';
import { userInfo } from 'node:os';
import { IsomorphicGitBackend } from '@zonot/core/write-client/backends/isomorphic-git';
import { ConfigError, type WorkspaceConfig } from './config.ts';
import { VERSION } from './version.ts';

export function buildBackend(name: string, ws: WorkspaceConfig): IsomorphicGitBackend {
  if (ws.backend !== 'local') {
    throw new ConfigError(
      `workspace "${name}" uses the "${ws.backend}" backend, which the CLI does not support yet (local-only for now)`,
    );
  }
  if (!ws.mirror_path) throw new ConfigError(`workspace "${name}" has no mirror_path`);
  return new IsomorphicGitBackend({
    dir: ws.mirror_path,
    fs: nodeFs,
    source: `cli:zonot@${VERSION}`,
    author: gitAuthor(),
  });
}

function gitAuthor(): { name: string; email: string } {
  const user = safeUser();
  return {
    name: process.env.GIT_AUTHOR_NAME ?? user,
    email: process.env.GIT_AUTHOR_EMAIL ?? `${user}@localhost`,
  };
}

function safeUser(): string {
  try {
    return userInfo().username || 'zonot';
  } catch {
    return 'zonot';
  }
}
