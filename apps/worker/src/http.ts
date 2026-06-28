// HTTP transport (ADR-0021 / 0022). Thin adapter over the shared handlers: it
// parses the path-secret URL, dispatches the workspace (auth), reads the body,
// and shapes the JSON response. All error translation happens in the root
// middleware (index.ts) — handlers throw core errors, never Responses.
//
// URL scheme (path-secret auth, v1.0 / ADR-0013):
//   /v1/{workspace}/{secret}/capture                 POST
//   /v1/{workspace}/{secret}/init                    POST
//   /v1/{workspace}/{secret}/notes                   GET   ?since=&limit=
//   /v1/{workspace}/{secret}/tags                    GET   ?prefix=
//   /v1/{workspace}/{secret}/notes/{id}              GET   ?include_source=1  | DELETE
//   /v1/{workspace}/{secret}/notes/{id}/append       POST
//   /v1/{workspace}/{secret}/notes/{id}/correct      POST
//   /v1/{workspace}/{secret}/notes/{id}/undo         POST

import { NotFoundError, ValidationError } from '@zonot/core/errors';
import type { Env, RequestContext } from './env.ts';
import {
  runAppend,
  runCapture,
  runCorrect,
  runDelete,
  runInit,
  runListRecent,
  runListTags,
  runReadNote,
  runUndo,
} from './handlers.ts';
import { dispatchWorkspace } from './workspace.ts';

const SOURCE = 'http:zonot';

export async function handleHttp(
  request: Request,
  env: Env,
  req: RequestContext,
): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean); // ['v1', workspace, secret, ...rest]
  if (parts[0] !== 'v1' || parts.length < 4) {
    throw new NotFoundError(`route ${request.method} ${url.pathname}`);
  }
  const [, workspaceRaw, secret, ...rest] = parts;
  const ctx = await dispatchWorkspace(
    decodeURIComponent(workspaceRaw ?? ''),
    secret ?? null,
    env,
    req.trace_id,
  );
  req.workspace_hash = ctx.workspace_hash; // now known → reaches logs + metrics
  const idemKey = request.headers.get('idempotency-key') ?? undefined;
  const sub = rest.map((p) => decodeURIComponent(p)).join('/');
  const method = request.method;
  const at = (op: string): true => {
    req.op = op;
    return true;
  };

  // /capture, /init
  if (sub === 'capture' && method === 'POST' && at('capture')) {
    return json(await runCapture(ctx, env, SOURCE, await body(request), idemKey), 201);
  }
  if (sub === 'init' && method === 'POST' && at('init')) {
    return json(await runInit(ctx, env, SOURCE), 201);
  }

  // /notes (list), /tags
  if (sub === 'notes' && method === 'GET' && at('list')) {
    return json(
      await runListRecent(ctx, env, SOURCE, {
        ...(url.searchParams.get('since')
          ? { since: url.searchParams.get('since') as string }
          : {}),
        ...parseLimit(url.searchParams.get('limit')),
      }),
    );
  }
  if (sub === 'tags' && method === 'GET' && at('tags')) {
    return json(
      await runListTags(ctx, env, SOURCE, {
        ...(url.searchParams.get('prefix')
          ? { prefix: url.searchParams.get('prefix') as string }
          : {}),
      }),
    );
  }

  // /notes/{id}[/{action}]
  if (rest[0] === 'notes' && rest[1]) {
    const id = decodeURIComponent(rest[1]);
    const action = rest[2];

    if (!action && method === 'GET' && at('read')) {
      const includeSource = isTruthy(url.searchParams.get('include_source'));
      return json(await runReadNote(ctx, env, SOURCE, id, includeSource));
    }
    if (!action && method === 'DELETE' && at('delete')) {
      return json(await runDelete(ctx, env, SOURCE, id, await body(request)));
    }
    if (action === 'append' && method === 'POST' && at('append')) {
      return json(await runAppend(ctx, env, SOURCE, id, await body(request), idemKey));
    }
    if (action === 'correct' && method === 'POST' && at('correct')) {
      return json(await runCorrect(ctx, env, SOURCE, id, await body(request), idemKey));
    }
    if (action === 'undo' && method === 'POST' && at('undo')) {
      return json(await runUndo(ctx, env, SOURCE, id, await body(request)));
    }
  }

  throw new NotFoundError(`route ${method} ${url.pathname}`);
}

/** Parse a JSON request body; an empty body is `{}`, malformed is a 400. */
async function body(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim() === '') return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError([{ path: '(root)', message: 'request body is not valid JSON' }]);
  }
}

function parseLimit(raw: string | null): { limit?: number } {
  if (!raw) return {};
  const n = Number(raw);
  if (!Number.isFinite(n))
    throw new ValidationError([{ path: 'limit', message: 'must be a number' }]);
  return { limit: n };
}

function isTruthy(v: string | null): boolean {
  return v === '1' || v === 'true' || v === 'yes';
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
