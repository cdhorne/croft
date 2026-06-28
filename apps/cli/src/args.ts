// Minimal arg parser (cli-spec §1.1). Values use the `--key=value` form
// (unambiguous, matches the spec examples); bare `--key` / `-q` are booleans.
// `--` stops flag parsing. No dependency — the surface is small.

export interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

const SHORT: Record<string, string> = { q: 'quiet', v: 'verbose', h: 'help' };

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let command: string | undefined;
  let literal = false;

  for (const arg of argv) {
    if (literal) {
      positionals.push(arg);
    } else if (arg === '--') {
      literal = true;
    } else if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) flags[body.slice(0, eq)] = body.slice(eq + 1);
      else flags[body] = true;
    } else if (/^-[a-zA-Z]/.test(arg)) {
      // Short flags only when a letter follows the dash, so positionals like a
      // markdown block ("- entry") or a negative number ("-5") aren't eaten.
      for (const ch of arg.slice(1)) flags[SHORT[ch] ?? ch] = true;
    } else if (command === undefined) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }

  return { ...(command !== undefined ? { command } : {}), positionals, flags };
}

export function flagStr(flags: ParsedArgs['flags'], key: string): string | undefined {
  const v = flags[key];
  return typeof v === 'string' ? v : undefined;
}

export function flagBool(flags: ParsedArgs['flags'], key: string): boolean {
  return flags[key] === true || flags[key] === 'true';
}

export function flagNum(flags: ParsedArgs['flags'], key: string): number | undefined {
  const v = flagStr(flags, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${key} must be a number`);
  return n;
}
