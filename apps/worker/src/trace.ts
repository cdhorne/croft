// Trace propagation (worker-spec §1.4). Every response — success or problem —
// carries a zonot-trace-id (a ULID) that ties the response to logs + Sentry.

import { generateUlid } from '@zonot/core';

export function newTraceId(): string {
  return generateUlid();
}

/** Re-emit a response with the trace header attached (responses are immutable). */
export function withTraceHeader(res: Response, trace_id: string): Response {
  const headers = new Headers(res.headers);
  headers.set('zonot-trace-id', trace_id);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
