// Tag normalization per docs/specs/core-spec.md §1.5.
// NFC → lowercase → trim → whitespace/underscore-to-hyphen → collapse → dedupe.

export function normalizeTags(input: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = raw
      .normalize('NFC')
      .toLowerCase()
      .trim()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (t === '' || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
