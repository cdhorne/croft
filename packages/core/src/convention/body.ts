// Body splitter per docs/specs/core-spec.md §1.6.
// The first top-level `---` line splits the body into compiled-truth (above)
// and append-only timeline (below). "Top-level" excludes content inside
// fenced code blocks (``` or ~~~).

export interface BodySplit {
  compiled: string;
  timeline: string;
}

export function splitBody(body: string): BodySplit {
  const lines = body.split('\n');
  let inFence = false;
  let fenceChar: '`' | '~' | '' = '';
  let splitAt = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (inFence) {
      if (fenceChar !== '' && trimmed.startsWith(fenceChar.repeat(3))) {
        inFence = false;
        fenceChar = '';
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      inFence = true;
      fenceChar = '`';
      continue;
    }
    if (trimmed.startsWith('~~~')) {
      inFence = true;
      fenceChar = '~';
      continue;
    }

    if (trimmed === '---') {
      splitAt = i;
      break;
    }
  }

  if (splitAt === -1) {
    return { compiled: body, timeline: '' };
  }

  const compiled = lines.slice(0, splitAt).join('\n');
  const timeline = lines.slice(splitAt + 1).join('\n');
  return { compiled, timeline };
}
