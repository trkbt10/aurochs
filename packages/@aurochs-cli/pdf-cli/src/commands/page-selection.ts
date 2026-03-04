/**
 * @file Page selection parser for CLI options
 */

function parsePositiveInteger(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid page number: ${value}`);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid page number: ${value}`);
  }
  return parsed;
}

function parseRangeToken(token: string): readonly [number, number] {
  const parts = token.split("-");
  if (parts.length !== 2) {
    throw new Error(`Invalid page range token: ${token}`);
  }
  const start = parsePositiveInteger(parts[0]!.trim());
  const end = parsePositiveInteger(parts[1]!.trim());
  if (start > end) {
    throw new Error(`Invalid page range (start > end): ${token}`);
  }
  return [start, end] as const;
}

function parseToken(token: string): readonly number[] {
  if (token.includes("-")) {
    const [start, end] = parseRangeToken(token);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }
  return [parsePositiveInteger(token)];
}

/**
 * Parse page range string such as "1,3-5".
 * Throws when the selection is invalid or outside the available range.
 */
export function parsePageSelection(selection: string, pageCount: number): readonly number[] {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error(`pageCount must be a positive integer: ${pageCount}`);
  }

  const tokens = selection
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    throw new Error("Page selection is empty");
  }

  const selected = new Set<number>();
  for (const token of tokens) {
    const pages = parseToken(token);
    for (const page of pages) {
      if (page > pageCount) {
        throw new Error(`Page ${page} is out of range (1-${pageCount})`);
      }
      selected.add(page);
    }
  }

  return [...selected].sort((a, b) => a - b);
}

/** Parse optional selection and return undefined when option is omitted. */
export function parseOptionalPageSelection(selection: string | undefined, pageCount: number): readonly number[] | undefined {
  if (selection === undefined) {
    return undefined;
  }
  return parsePageSelection(selection, pageCount);
}
