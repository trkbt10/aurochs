/**
 * @file SpreadsheetML text formatter (numFmt text section)
 *
 * Uses an intermediate representation (IR) for text sections:
 * - literal chunks
 * - `@` placeholder for the input text
 */

import { splitFormatSections } from "../format-code/sections";
import { scanFormatCodeSection } from "../format-code/scan";

type TextSectionToken =
  | Readonly<{ kind: "literal"; text: string }>
  | Readonly<{ kind: "value" }>;

function parseTextSection(section: string): readonly TextSectionToken[] {
  const tokens: TextSectionToken[] = [];
  const buffer: string[] = [];
  const state = { skipNextAfterPaddingOrFill: false };

  const flush = (): void => {
    if (buffer.length === 0) {
      return;
    }
    tokens.push({ kind: "literal", text: buffer.join("") });
    buffer.length = 0;
  };

  scanFormatCodeSection(section, {
    onEscape: (escaped) => {
      // In text sections, `\x` means literal `x`.
      buffer.push(escaped);
    },
    onBracketCode: () => {
      // Ignore bracket codes in text sections (e.g. [Red], [>=0], locale codes).
    },
    onChar: (ch, index) => {
      if (state.skipNextAfterPaddingOrFill) {
        state.skipNextAfterPaddingOrFill = false;
        void index;
        return;
      }
      // `_x` adds spacing and `*x` fills by repeating chars.
      if (ch === "_" || ch === "*") {
        flush();
        state.skipNextAfterPaddingOrFill = true;
        return;
      }
      if (ch === "@") {
        flush();
        tokens.push({ kind: "value" });
        return;
      }
      buffer.push(ch);
    },
    onQuotedChar: (ch) => {
      buffer.push(ch);
    },
  });

  flush();
  return tokens;
}

function renderTextSection(valueText: string, tokens: readonly TextSectionToken[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    if (token.kind === "literal") {
      parts.push(token.text);
      continue;
    }
    parts.push(valueText);
  }
  return parts.join("");
}

/**
 * Format a text value by an Excel/SpreadsheetML format code (text section only).
 *
 * This is used by the formula `TEXT()` function when its first argument is non-numeric.
 */
export function formatTextByCode(valueText: string, formatCode: string): string {
  const sections = splitFormatSections(formatCode);
  if (sections.length >= 4) {
    const section = sections[3] ?? "";
    return renderTextSection(valueText, parseTextSection(section));
  }
  return valueText;
}
