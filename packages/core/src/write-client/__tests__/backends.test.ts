import { describe, expect, test } from 'bun:test';
import { GitHubRestBackend } from '../backends/github-rest.ts';
import { IsomorphicGitBackend } from '../backends/isomorphic-git.ts';
import type { WriteClient } from '../interface.ts';

describe('WriteClient — Phase 0 skeleton', () => {
  // (Structural conformance to the WriteClient interface is enforced by the
  // type annotations on backend variables below; no runtime `typeof` checks
  // needed — TS already proved them.)

  test('GitHubRest skeleton ops reject as not-implemented', async () => {
    const backend: WriteClient = new GitHubRestBackend({
      owner: 'cdhorne',
      repo: 'zonot-notes',
      token: 'ghp_test',
    });
    await expect(backend.init({ workspace: 'personal', conventionVersion: 1 })).rejects.toThrow(
      'not yet implemented',
    );
  });

  test('IsomorphicGit skeleton ops reject as not-implemented', async () => {
    const backend: WriteClient = new IsomorphicGitBackend({ dir: '/tmp/zonot' });
    await expect(
      backend.head({ workspace: 'personal', id: '01HZZZA1B2C3D4E5F6G7H8J9K0' }),
    ).rejects.toThrow('not yet implemented');
  });

  test('config is readable for introspection', () => {
    const ghBackend = new GitHubRestBackend({
      owner: 'cdhorne',
      repo: 'zonot-notes',
      token: 'ghp_test',
      branch: 'main',
    });
    expect(ghBackend.getConfig().owner).toBe('cdhorne');

    const gitBackend = new IsomorphicGitBackend({
      dir: '/tmp/zonot',
      remote: 'origin',
    });
    expect(gitBackend.getConfig().dir).toBe('/tmp/zonot');
  });
});
