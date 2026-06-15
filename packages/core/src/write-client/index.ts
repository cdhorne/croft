// Public surface for @zonot/core/write-client.
// Only the interface is exported here; backends live at their own
// subpaths so consumers pull in only what they ship:
//
//   import type { WriteClient } from '@zonot/core/write-client';
//   import { GitHubRestBackend } from '@zonot/core/write-client/backends/github-rest';
//   import { IsomorphicGitBackend } from '@zonot/core/write-client/backends/isomorphic-git';

export type { WriteClient } from './interface.ts';
