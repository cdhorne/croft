// @zonot/worker — Cloudflare Worker entry point (worker-spec / ADR-0035).
//
// One root middleware: assign a trace id, run the router, and translate any
// thrown error into an RFC 9457 problem. Every response carries zonot-trace-id;
// every request emits one content-free structured log line (+ a metric) on
// completion. The transports fill in workspace_hash/op on the shared request
// context once known, so logs carry them even when the request errors.

import type { ExecutionContext } from '@cloudflare/workers-types';
import { NotFoundError } from '@zonot/core/errors';
import type { Env, RequestContext } from './env.ts';
import { handleHttp } from './http.ts';
import { logRequest, writeMetric } from './log.ts';
import { handleMcp } from './mcp.ts';
import { isServerError, problemResponse, toZonotProblem } from './problem.ts';
import { newTraceId, withTraceHeader } from './trace.ts';

export default {
  async fetch(request: Request, env: Env, _execCtx: ExecutionContext): Promise<Response> {
    const ctx: RequestContext = { trace_id: newTraceId(), workspace_hash: null, op: null };
    const startedAt = Date.now();
    const url = new URL(request.url);
    let status = 500;
    let error_type: string | null = null;

    try {
      const res = await route(request, env, ctx);
      status = res.status;
      return withTraceHeader(res, ctx.trace_id);
    } catch (err) {
      const problem = toZonotProblem(err, ctx.trace_id);
      status = problem.status;
      error_type = problem.title;
      if (isServerError(problem)) {
        // TODO(deploy): wire Sentry.captureException (content-stripped, §2.3);
        // until then the structured console.error + trace_id is the floor.
        console.error(JSON.stringify({ trace_id: ctx.trace_id, level: 'error', error_type }));
      }
      return problemResponse(problem);
    } finally {
      const latency_ms = Date.now() - startedAt;
      logRequest({
        trace_id: ctx.trace_id,
        workspace_hash: ctx.workspace_hash,
        op: ctx.op,
        method: request.method,
        path_shape: pathShape(url.pathname),
        status,
        latency_ms,
        error_type,
      });
      if (ctx.workspace_hash && ctx.op) {
        writeMetric(env.METRICS, {
          op: ctx.op,
          status,
          workspace_hash: ctx.workspace_hash,
          latency_ms,
        });
      }
    }
  },
};

/** Route table: health probe, the MCP transport (agent), the HTTP transport (app). */
async function route(request: Request, env: Env, ctx: RequestContext): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/healthz') {
    return Response.json({ status: 'ok', service: 'zonot-worker' });
  }

  // MCP transport (Claude-as-agent): /v1/{workspace}/{secret}/mcp — all methods.
  if (url.pathname.startsWith('/v1/') && url.pathname.endsWith('/mcp')) {
    return handleMcp(request, env, ctx);
  }

  // HTTP transport (app + integrators).
  if (url.pathname.startsWith('/v1/')) {
    return handleHttp(request, env, ctx);
  }

  throw new NotFoundError(`route ${request.method} ${url.pathname}`);
}

/** Collapse the workspace, path-secret, and ids to a template so logs leak nothing. */
function pathShape(pathname: string): string {
  return pathname
    .replace(/^\/v1\/[^/]+\/[^/]+/, '/v1/:workspace/:secret')
    .replace(/\/[0-9A-HJKMNP-TV-Z]{26}(?:-[^/]*)?/g, '/:id');
}
