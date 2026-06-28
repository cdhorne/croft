// In-memory fake of the GitHub Git Data API surface the GitHubRestBackend uses.
// Models a single branch as: a content-addressed blob store, full-snapshot trees
// (path -> blob sha), commits (tree + parents), and a movable head ref. Blob shas
// are real git-ish content hashes so SHA-conditional reads are reproducible.
//
// Test-only helper (not shipped). Lets backend tests run with zero network.

import { createHash } from 'node:crypto';

interface Commit {
  tree: string;
  parents: string[];
  message: string;
}

export class FakeGitHub {
  readonly blobs = new Map<string, string>();
  readonly trees = new Map<string, Map<string, string>>(); // treeSha -> (path -> blobSha)
  readonly commits = new Map<string, Commit>();
  headCommit: string | null = null;
  #seq = 0;

  readonly fetch: typeof fetch;

  constructor(private readonly branch = 'main') {
    this.fetch = this.#handle.bind(this) as unknown as typeof fetch;
  }

  /** The commit message of HEAD (for trailer assertions). */
  headMessage(): string {
    return this.headCommit ? (this.commits.get(this.headCommit)?.message ?? '') : '';
  }

  /** Current path -> content snapshot of HEAD (for assertions). */
  headFiles(): Map<string, string> {
    const out = new Map<string, string>();
    if (!this.headCommit) return out;
    const tree = this.trees.get(this.commits.get(this.headCommit)!.tree)!;
    for (const [path, blob] of tree) out.set(path, this.blobs.get(blob) ?? '');
    return out;
  }

  /** Simulate a concurrent committer advancing HEAD out from under the backend. */
  injectCommit(files: Record<string, string>): void {
    const snapshot = new Map(this.#headTree());
    for (const [path, content] of Object.entries(files)) {
      const sha = this.#putBlob(content);
      snapshot.set(path, sha);
    }
    const treeSha = this.#put('tree', snapshot);
    this.trees.set(treeSha, snapshot);
    const commitSha = this.#put('commit');
    this.commits.set(commitSha, {
      tree: treeSha,
      parents: this.headCommit ? [this.headCommit] : [],
      message: 'injected',
    });
    this.headCommit = commitSha;
  }

  #headTree(): Map<string, string> {
    if (!this.headCommit) return new Map();
    return this.trees.get(this.commits.get(this.headCommit)!.tree) ?? new Map();
  }

  #putBlob(content: string): string {
    const sha = createHash('sha1').update(`blob ${content.length}\0${content}`).digest('hex');
    this.blobs.set(sha, content);
    return sha;
  }

  #put(kind: string, _payload?: unknown): string {
    this.#seq += 1;
    return createHash('sha1').update(`${kind}:${this.#seq}`).digest('hex');
  }

  async #handle(url: string | URL, init?: RequestInit): Promise<Response> {
    const u = new URL(url.toString());
    const method = (init?.method ?? 'GET').toUpperCase();
    // Strip the /repos/{owner}/{repo} prefix to the bare Git Data path.
    const path = u.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, '');
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;

    // GET /git/ref/heads/{branch}
    if (method === 'GET' && path === `/git/ref/heads/${this.branch}`) {
      if (!this.headCommit) return json({ message: 'Not Found' }, 404);
      return json({ object: { sha: this.headCommit } });
    }
    // GET /git/commits/{sha}
    let m = /^\/git\/commits\/(.+)$/.exec(path);
    if (method === 'GET' && m) {
      const commit = this.commits.get(m[1]!);
      if (!commit) return json({ message: 'Not Found' }, 404);
      return json({ tree: { sha: commit.tree } });
    }
    // GET /git/trees/{sha}?recursive=1
    m = /^\/git\/trees\/([^?]+)/.exec(path);
    if (method === 'GET' && m) {
      const tree = this.trees.get(m[1]!);
      if (!tree) return json({ message: 'Not Found' }, 404);
      return json({
        sha: m[1],
        truncated: false,
        tree: [...tree].map(([p, sha]) => ({ path: p, mode: '100644', type: 'blob', sha })),
      });
    }
    // GET /git/blobs/{sha}
    m = /^\/git\/blobs\/(.+)$/.exec(path);
    if (method === 'GET' && m) {
      const content = this.blobs.get(m[1]!);
      if (content === undefined) return json({ message: 'Not Found' }, 404);
      return json({ content: Buffer.from(content, 'utf8').toString('base64'), encoding: 'base64' });
    }
    // POST /git/trees
    if (method === 'POST' && path === '/git/trees') {
      const snapshot = new Map(body.base_tree ? (this.trees.get(body.base_tree) ?? new Map()) : []);
      for (const e of body.tree as Array<{ path: string; content?: string; sha?: string | null }>) {
        if (e.sha === null) snapshot.delete(e.path);
        else if (typeof e.content === 'string') snapshot.set(e.path, this.#putBlob(e.content));
      }
      const sha = this.#put('tree');
      this.trees.set(sha, snapshot);
      return json({ sha });
    }
    // POST /git/commits
    if (method === 'POST' && path === '/git/commits') {
      const sha = this.#put('commit');
      this.commits.set(sha, {
        tree: body.tree,
        parents: body.parents ?? [],
        message: body.message,
      });
      return json({ sha });
    }
    // POST /git/refs (create)
    if (method === 'POST' && path === '/git/refs') {
      this.headCommit = body.sha;
      return json({ ref: body.ref, object: { sha: body.sha } });
    }
    // PATCH /git/refs/heads/{branch} (fast-forward only)
    if (method === 'PATCH' && path === `/git/refs/heads/${this.branch}`) {
      const commit = this.commits.get(body.sha);
      const ff = commit && commit.parents[0] === this.headCommit;
      if (!ff && !body.force) {
        return json({ message: 'Update is not a fast forward' }, 422);
      }
      this.headCommit = body.sha;
      return json({ object: { sha: body.sha } });
    }

    return json({ message: `unhandled ${method} ${path}` }, 500);
  }
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Deterministic, schema-valid ULID factory for tests (Crockford base32, 26 chars).
export function ulidFactory(): () => string {
  const SAFE = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let n = 0;
  return () => {
    const c = n++;
    const hi = SAFE[Math.floor(c / 32) % 32] ?? '0';
    const lo = SAFE[c % 32] ?? '0';
    return `01HZZZA1B2C3D4E5F6G7H8JK${hi}${lo}`;
  };
}
