#!/usr/bin/env bun
// @zonot/cli entry point (cli-spec §1, §8). Parse args, dispatch, and map any
// thrown error to a stderr message + an exit code that carries the class. A
// per-invocation trace id ties an error to the (future) local JSONL log.

import { generateUlid } from '@zonot/core';
import { type ParsedArgs, parseArgs } from './args.ts';
import {
  cmdAppend,
  cmdCapture,
  cmdCorrect,
  cmdDelete,
  cmdInit,
  cmdRead,
  cmdStatus,
  cmdUndo,
  cmdWorkspaces,
} from './commands.ts';
import { EXIT, renderError } from './output.ts';
import { VERSION } from './version.ts';

const HELP = `zonot — calm capture, deep notes, plain Markdown in your own repo

usage: zonot <command> [args] [flags]

commands:
  init [--workspace=NAME] [--repo=URL]   scaffold a workspace (local clone-holder)
  capture [BODY] [--title=…] [--tags=…]  create a note (inline #tag @thread !type)
  append <id> [BLOCK]                    add a dated timeline entry
  correct <id> [BODY]                    replace the compiled body (timeline kept)
  undo <capture-id>                      remove a just-captured note
  delete <id>                            delete a note + its source
  read <id> [--raw] [--json]             render a note
  status                                 workspace + mirror state
  workspaces                             list configured workspaces

global flags: --workspace=NAME  --json  --quiet/-q  --no-color  --help/-h  --version
`;

type Handler = (args: ParsedArgs) => number | Promise<number>;

const COMMANDS: Record<string, Handler> = {
  init: cmdInit,
  capture: cmdCapture,
  append: cmdAppend,
  correct: cmdCorrect,
  undo: cmdUndo,
  delete: cmdDelete,
  read: cmdRead,
  status: cmdStatus,
  workspaces: cmdWorkspaces,
};

// Commands whose landing is sequenced later in Phase 2.
const PENDING: Record<string, string> = {
  search: 'Phase 2c (local FTS index)',
  list: 'Phase 2c (local FTS index)',
  tags: 'Phase 2c (local FTS index)',
  import: 'Phase 2d (bulk importer)',
  mcp: 'a later Phase 2 unit',
  serve: 'a later Phase 2 unit',
  sync: 'a later Phase 2 unit',
  logs: 'a later Phase 2 unit',
  doctor: 'a later Phase 2 unit',
  completion: 'a later Phase 2 unit',
};

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  if (args.flags.version === true || args.command === 'version') {
    process.stdout.write(`zonot ${VERSION}\n`);
    return EXIT.ok;
  }
  if (!args.command || args.flags.help === true || args.command === 'help') {
    process.stdout.write(HELP);
    return EXIT.ok;
  }

  const handler = COMMANDS[args.command];
  if (handler) return handler(args);

  if (PENDING[args.command]) {
    process.stderr.write(
      `zonot ${args.command}: not yet implemented — lands in ${PENDING[args.command]}\n`,
    );
    return EXIT.ok;
  }

  process.stderr.write(`zonot: unknown command "${args.command}"\n\n${HELP}`);
  return EXIT.user;
}

const traceId = generateUlid();
main()
  .then((code) => process.exit(code))
  .catch((err) => process.exit(renderError(parseArgs(process.argv.slice(2)), err, traceId)));
