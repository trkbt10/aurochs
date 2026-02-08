/**
 * @file SpreadsheetML formatCode scanner (quote/escape/bracket aware)
 *
 * Provides a single-pass scanner over a `numFmt` format section that respects:
 * - quoted strings (`"..."`, doubled quotes `""`)
 * - escape sequences (`\x`)
 * - bracket codes (`[...]`)
 *
 * This is used to build intermediate representations without re-implementing
 * the same quote/escape/bracket rules in multiple helpers.
 */

export type FormatCodeScanState = Readonly<{
  /** Whether the scanner is currently inside a quoted string. */
  inQuoted: boolean;
}>;

export type FormatCodeScanHandlers = Readonly<{
  onChar?: (ch: string, index: number, state: FormatCodeScanState) => void;
  onQuotedChar?: (ch: string, index: number) => void;
  onBracketCode?: (raw: string, startIndex: number, endIndex: number) => void;
  onEscape?: (escapedChar: string, backslashIndex: number, escapedIndex: number, state: FormatCodeScanState) => void;
}>;

/**
 * Scan a format section while honoring SpreadsheetML quote/escape/bracket semantics.
 *
 * The handler callbacks are invoked in source order and are responsible for any derived state.
 *
 * @param section - A single format section (split by `;`)
 * @param handlers - Callbacks invoked during scanning
 */
export function scanFormatCodeSection(section: string, handlers: FormatCodeScanHandlers): void {
  const state = { inQuoted: false };

  for (let i = 0; i < section.length; i += 1) {
    const ch = section[i]!;

    if (ch === "\\" && i + 1 < section.length) {
      const escaped = section[i + 1]!;
      handlers.onEscape?.(escaped, i, i + 1, state);
      i += 1;
      continue;
    }

    if (ch === "\"") {
      if (state.inQuoted && section[i + 1] === "\"") {
        // Literal quote inside a quoted string
        handlers.onQuotedChar?.("\"", i);
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      continue;
    }

    if (state.inQuoted) {
      handlers.onQuotedChar?.(ch, i);
      continue;
    }

    if (ch === "[") {
      const end = section.indexOf("]", i + 1);
      if (end !== -1) {
        handlers.onBracketCode?.(section.slice(i, end + 1), i, end);
        i = end;
        continue;
      }
    }

    handlers.onChar?.(ch, i, state);
  }
}

