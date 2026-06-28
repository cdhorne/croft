#!/usr/bin/env bun
// Cross-compile the standalone single binaries for every release target and emit
// a checksums file (ADR-0023). Bun cross-compiles all targets from one host, so
// this runs in a single CI job. The npm artifact is built separately (build:npm).

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { $ } from 'bun';

const TARGETS: Array<{ target: string; out: string }> = [
  { target: 'bun-linux-x64', out: 'zonot-linux-x64' },
  { target: 'bun-linux-arm64', out: 'zonot-linux-arm64' },
  { target: 'bun-darwin-x64', out: 'zonot-darwin-x64' },
  { target: 'bun-darwin-arm64', out: 'zonot-darwin-arm64' },
  { target: 'bun-windows-x64', out: 'zonot-windows-x64.exe' },
];

for (const { target, out } of TARGETS) {
  console.log(`compiling ${out} (${target})…`);
  await $`bun build ./src/index.ts --compile --target=${target} --outfile ./dist/${out}`;
}

// SHA-256 checksums for the installer + Homebrew formula to verify against.
const lines = readdirSync('./dist')
  .filter((f) => f.startsWith('zonot-'))
  .sort()
  .map(
    (f) =>
      `${createHash('sha256')
        .update(readFileSync(`./dist/${f}`))
        .digest('hex')}  ${f}`,
  );
await Bun.write('./dist/checksums.txt', `${lines.join('\n')}\n`);
console.log(`\n${lines.join('\n')}`);
