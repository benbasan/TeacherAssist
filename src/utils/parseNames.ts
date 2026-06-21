/**
 * Splits a raw textarea value (names separated by commas or newlines) into a
 * clean, de-duplicated, order-preserving list of names. Shared by the classroom
 * dashboard and the roster-based games so parsing stays consistent.
 */
export function parseNames(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const name = part.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}
