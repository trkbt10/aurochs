/**
 * @file ToUnicode CMap Writer
 *
 * Generates ToUnicode CMap streams for CID fonts.
 * @see ISO 32000-1:2008 Section 9.10.3 (ToUnicode CMaps)
 */

import type { PdfFontToUnicode } from "../../domain/document";

/**
 * Generate a ToUnicode CMap stream.
 *
 * @param toUnicode - The ToUnicode mapping data
 * @returns CMap stream content as UTF-8 encoded bytes
 */
export function generateToUnicodeStream(
  toUnicode: PdfFontToUnicode
): Uint8Array {
  const lines: string[] = [];

  // Header
  lines.push("/CIDInit /ProcSet findresource begin");
  lines.push("12 dict begin");
  lines.push("begincmap");
  lines.push("/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def");
  lines.push("/CMapName /aurochs-ToUnicode def");
  lines.push("/CMapType 2 def");

  // codespacerange
  lines.push(buildCodeSpaceRange(toUnicode.sourceCodeByteLengths));

  // bfchar / bfrange (optimized)
  const { charMappings, rangeMappings } = optimizeMappings(toUnicode.byteMapping);

  if (charMappings.length > 0) {
    lines.push(buildBfCharSection(charMappings));
  }

  if (rangeMappings.length > 0) {
    lines.push(buildBfRangeSection(rangeMappings));
  }

  // Footer
  lines.push("endcmap");
  lines.push("CMapName currentdict /CMap defineresource pop");
  lines.push("end");
  lines.push("end");

  return new TextEncoder().encode(lines.join("\n"));
}

/**
 * Build codespacerange section.
 *
 * Example for 2-byte codes:
 * ```
 * 1 begincodespacerange
 * <0000> <FFFF>
 * endcodespacerange
 * ```
 */
function buildCodeSpaceRange(byteLengths: readonly number[]): string {
  if (byteLengths.length === 0) {
    // Default to 2-byte codespace
    return "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange";
  }

  const ranges: string[] = [];

  for (const byteLen of byteLengths) {
    const start = "0".repeat(byteLen * 2);
    const end = "F".repeat(byteLen * 2);
    ranges.push(`<${start}> <${end}>`);
  }

  return `${ranges.length} begincodespacerange\n${ranges.join("\n")}\nendcodespacerange`;
}

type RangeMapping = {
  readonly start: string;
  readonly end: string;
  readonly destStart: string;
};

/**
 * Optimize mappings by detecting consecutive ranges.
 *
 * Consecutive source codes with consecutive Unicode destinations
 * can be combined into bfrange entries.
 */
function optimizeMappings(
  byteMapping: ReadonlyMap<string, string>
): {
  charMappings: readonly [string, string][];
  rangeMappings: readonly RangeMapping[];
} {
  if (byteMapping.size === 0) {
    return { charMappings: [], rangeMappings: [] };
  }

  // Sort entries by source hex
  const entries = [...byteMapping.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const charMappings: [string, string][] = [];
  const rangeMappings: RangeMapping[] = [];

  /**
   * Find the length of a consecutive run starting at `from`.
   * A run requires same byte-length hex codes, consecutive hex values,
   * and consecutive Unicode code points.
   */
  const findRunLength = (from: number): number => {
    const [startHex] = entries[from]!;
    return entries.slice(from + 1).reduce((runEnd, [nextHex, nextUnicode], offset) => {
      if (runEnd < from + offset) {
        // Already stopped extending
        return runEnd;
      }
      const currentIdx = from + offset;
      const [currentHex, currentUnicode] = entries[currentIdx]!;
      if (
        nextHex.length !== startHex.length ||
        !isConsecutiveHex(currentHex, nextHex) ||
        !isConsecutiveUnicode(currentUnicode, nextUnicode)
      ) {
        return runEnd;
      }
      return from + offset + 1;
    }, from);
  };

  // Process entries by finding consecutive runs
  const processEntries = (from: number): void => {
    if (from >= entries.length) {
      return;
    }
    const [startHex, startUnicode] = entries[from]!;
    const endIdx = findRunLength(from);
    const rangeSize = endIdx - from + 1;

    if (rangeSize >= 3) {
      // Use bfrange for 3+ consecutive entries
      const endHex = entries[endIdx]![0];
      rangeMappings.push({
        start: startHex,
        end: endHex,
        destStart: unicodeToUtf16BeHex(startUnicode),
      });
    } else {
      // Use bfchar for individual entries
      for (const [srcHex, unicode] of entries.slice(from, endIdx + 1)) {
        charMappings.push([srcHex, unicodeToUtf16BeHex(unicode)]);
      }
    }

    processEntries(endIdx + 1);
  };

  processEntries(0);

  return { charMappings, rangeMappings };
}

/**
 * Check if two hex strings are consecutive.
 */
function isConsecutiveHex(a: string, b: string): boolean {
  const aVal = parseInt(a, 16);
  const bVal = parseInt(b, 16);
  return bVal === aVal + 1;
}

/**
 * Check if two Unicode strings are consecutive single characters.
 */
function isConsecutiveUnicode(a: string, b: string): boolean {
  if (a.length !== 1 || b.length !== 1) {
    // Only optimize single-character mappings
    return false;
  }

  const aCode = a.codePointAt(0)!;
  const bCode = b.codePointAt(0)!;
  return bCode === aCode + 1;
}

/**
 * Convert Unicode string to UTF-16BE hex string.
 */
function unicodeToUtf16BeHex(str: string): string {
  return [...str].map((char) => {
    const cp = char.codePointAt(0)!;

    if (cp > 0xFFFF) {
      // Surrogate pair
      const high = 0xD800 + ((cp - 0x10000) >> 10);
      const low = 0xDC00 + ((cp - 0x10000) & 0x3FF);
      return (
        high.toString(16).padStart(4, "0").toUpperCase() +
        low.toString(16).padStart(4, "0").toUpperCase()
      );
    }
    return cp.toString(16).padStart(4, "0").toUpperCase();
  }).join("");
}

/**
 * Build bfchar section.
 *
 * PDF spec allows max 100 entries per beginbfchar block.
 */
function buildBfCharSection(mappings: readonly [string, string][]): string {
  const lines: string[] = [];
  const chunkSize = 100;

  for (let i = 0; i < mappings.length; i += chunkSize) {
    const chunk = mappings.slice(i, i + chunkSize);
    lines.push(`${chunk.length} beginbfchar`);

    for (const [src, dest] of chunk) {
      lines.push(`<${src}> <${dest}>`);
    }

    lines.push("endbfchar");
  }

  return lines.join("\n");
}

/**
 * Build bfrange section.
 *
 * PDF spec allows max 100 entries per beginbfrange block.
 */
function buildBfRangeSection(ranges: readonly RangeMapping[]): string {
  const lines: string[] = [];
  const chunkSize = 100;

  for (let i = 0; i < ranges.length; i += chunkSize) {
    const chunk = ranges.slice(i, i + chunkSize);
    lines.push(`${chunk.length} beginbfrange`);

    for (const { start, end, destStart } of chunk) {
      lines.push(`<${start}> <${end}> <${destStart}>`);
    }

    lines.push("endbfrange");
  }

  return lines.join("\n");
}
