/**
 * @file SpreadsheetML numFmt section splitting
 *
 * Splits a format code into `;`-separated sections while being quote/escape aware.
 */

/**
 * Split a full formatCode into sections delimited by `;`.
 *
 * @param formatCode - Full format code (e.g. `0.00;[Red]-0.00;"-"`)
 */
export function splitFormatSections(formatCode: string): readonly string[] {
  const sections: string[] = [];
  const state = { inQuoted: false, bufferParts: [] as string[] };

  for (let i = 0; i < formatCode.length; i += 1) {
    const ch = formatCode[i]!;
    if (ch === "\\" && i + 1 < formatCode.length) {
      state.bufferParts.push(ch, formatCode[i + 1]!);
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && formatCode[i + 1] === "\"") {
        state.bufferParts.push("\"\"");
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      state.bufferParts.push(ch);
      continue;
    }
    if (!state.inQuoted && ch === ";") {
      sections.push(state.bufferParts.join(""));
      state.bufferParts.length = 0;
      continue;
    }
    state.bufferParts.push(ch);
  }

  sections.push(state.bufferParts.join(""));
  return sections;
}

