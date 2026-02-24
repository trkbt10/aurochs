/**
 * @file ToUnicode CMap parser
 *
 * Pure PDF CMap parsing functions for ToUnicode mappings.
 * PDF Reference Section 5.9.1 - ToUnicode CMaps
 */

import type { FontMapping } from "../types";

/**
 * Diagnostics captured while parsing ToUnicode CMaps.
 */
export type CMapParseDiagnostics = {
  /** Number of malformed entries ignored during parsing. */
  readonly invalidEntryCount: number;
  /** Number of `bfrange` entries truncated by configured limits. */
  readonly truncatedRangeCount: number;
  /** Number of mappings whose source-byte length is outside declared codespace lengths. */
  readonly sourceLengthOutsideCodeSpaceCount: number;
  /** Number of final mappings whose destination contains U+FFFD. */
  readonly replacementCharMapCount: number;
  /** Number of final mappings whose destination contains private-use characters. */
  readonly privateUseCharMapCount: number;
  /** Final mapping counts grouped by source code byte length. */
  readonly sourceCodeLengthHistogram: ReadonlyMap<number, number>;
};

/**
 * CMap parse result containing mapping, source code metadata, and diagnostics.
 */
export type CMapParseResult = {
  /** Legacy numeric mapping used by existing single-byte / two-byte decoders. */
  readonly mapping: FontMapping;
  /** Exact source-byte mapping. Key is uppercase hex without separators (e.g. `8140`). */
  readonly byteMapping: ReadonlyMap<string, string>;
  /** Source code byte lengths observed from mappings and codespace ranges (descending). */
  readonly sourceCodeByteLengths: readonly number[];
  /**
   * Legacy byte-width hint used by existing layout code.
   * Kept as 1|2 for backward compatibility.
   */
  readonly codeByteWidth: 1 | 2;
  readonly diagnostics: CMapParseDiagnostics;
};

export type CMapParserOptions = {
  /**
   * Maximum entries generated from one `bfrange` statement.
   *
   * Default: 65536 (full 2-byte CID space).
   */
  readonly maxRangeEntries?: number;
};

type ParseState = {
  invalidEntryCount: number;
  truncatedRangeCount: number;
};

/* eslint-disable no-restricted-syntax -- parsers require mutable state for regex iteration */

/**
 * Default cap for one `bfrange` expansion.
 * 65536 keeps complete 2-byte maps while still bounding memory use.
 */
const BFRANGE_MAX_ENTRIES = 65536;

/**
 * Parse ToUnicode CMap data and detect source code lengths.
 */
export function parseToUnicodeCMap(
  data: string,
  options: CMapParserOptions = {}
): CMapParseResult {
  const mapping: FontMapping = new Map();
  const byteMapping = new Map<string, string>();
  const parseState: ParseState = {
    invalidEntryCount: 0,
    truncatedRangeCount: 0,
  };

  const codeSpace = parseCodeSpaceMetadata(data);
  let maxSourceHexLength = 0;

  const bfcharLength = parseBfCharInternal({
    data,
    mapping,
    byteMapping,
    parseState,
  });
  maxSourceHexLength = Math.max(maxSourceHexLength, bfcharLength);

  const bfrangeLength = parseBfRangeInternal({
    data,
    mapping,
    byteMapping,
    parseState,
    options,
  });
  maxSourceHexLength = Math.max(maxSourceHexLength, bfrangeLength);

  const sourceCodeByteLengthsSet = new Set<number>(codeSpace.byteLengths);
  for (const key of byteMapping.keys()) {
    sourceCodeByteLengthsSet.add(key.length / 2);
  }

  const sourceCodeByteLengths = [...sourceCodeByteLengthsSet]
    .filter((length) => Number.isInteger(length) && length > 0)
    .sort((a, b) => b - a);

  const maxObservedByteLength =
    sourceCodeByteLengths[0] ?? (maxSourceHexLength > 2 ? 2 : maxSourceHexLength === 0 ? 1 : 1);
  const codeByteWidth: 1 | 2 = maxObservedByteLength <= 1 ? 1 : 2;

  const diagnostics = buildDiagnostics({
    byteMapping,
    parseState,
    codeSpaceByteLengths: codeSpace.byteLengths,
  });

  return {
    mapping,
    byteMapping,
    sourceCodeByteLengths,
    codeByteWidth,
    diagnostics,
  };
}

/**
 * Parse beginbfchar sections.
 * Format: `<source> <destination>`
 * Returns maximum source hex length found.
 */
export function parseBfChar(data: string, mapping: FontMapping): number {
  return parseBfCharInternal({
    data,
    mapping,
    byteMapping: new Map<string, string>(),
    parseState: {
      invalidEntryCount: 0,
      truncatedRangeCount: 0,
    },
  });
}

function parseBfCharInternal(
  args: Readonly<{
    data: string;
    mapping: FontMapping;
    byteMapping: Map<string, string>;
    parseState: ParseState;
  }>,
): number {
  const {
    data,
    mapping,
    byteMapping,
    parseState,
  } = args;
  const sectionRegex = /beginbfchar\s*\n?([\s\S]*?)endbfchar/gi;
  let sectionMatch;
  let maxSourceLength = 0;

  while ((sectionMatch = sectionRegex.exec(data)) !== null) {
    const content = stripComments(sectionMatch[1] ?? "");
    if (!content) {
      continue;
    }

    const hexTokens = [...content.matchAll(/<([^>]*)>/g)]
      .map((match) => match[1])
      .filter((value): value is string => value !== undefined);

    if (hexTokens.length === 0) {
      continue;
    }

    const pairCount = Math.floor(hexTokens.length / 2);
    if (hexTokens.length % 2 !== 0) {
      parseState.invalidEntryCount += 1;
    }

    for (let i = 0; i < pairCount; i += 1) {
      const sourceHex = hexTokens[i * 2];
      const destHex = hexTokens[i * 2 + 1];
      if (!sourceHex || !destHex) {
        parseState.invalidEntryCount += 1;
        continue;
      }

      const normalizedSource = normalizeHexLiteral(sourceHex);
      if (!normalizedSource) {
        parseState.invalidEntryCount += 1;
        continue;
      }

      maxSourceLength = Math.max(maxSourceLength, normalizedSource.length);

      const unicode = hexToString(destHex);
      if (unicode === null) {
        parseState.invalidEntryCount += 1;
        continue;
      }

      setDecodedMapping({
        normalizedSource,
        unicode,
        mapping,
        byteMapping,
      });
    }
  }

  return maxSourceLength;
}

/**
 * Parse beginbfrange sections.
 * Format: `<start> <end> <destStart>` or `<start> <end> [<dest1> <dest2> ...]`
 * Returns maximum source hex length found.
 */
export function parseBfRange(
  data: string,
  mapping: FontMapping,
  options: CMapParserOptions = {}
): number {
  return parseBfRangeInternal({
    data,
    mapping,
    byteMapping: new Map<string, string>(),
    parseState: {
      invalidEntryCount: 0,
      truncatedRangeCount: 0,
    },
    options,
  });
}

function parseBfRangeInternal(
  args: Readonly<{
    data: string;
    mapping: FontMapping;
    byteMapping: Map<string, string>;
    parseState: ParseState;
    options?: CMapParserOptions;
  }>,
): number {
  const {
    data,
    mapping,
    byteMapping,
    parseState,
    options = {},
  } = args;
  const sectionRegex = /beginbfrange\s*\n?([\s\S]*?)endbfrange/gi;
  let sectionMatch;
  let maxSourceLength = 0;
  const maxRangeEntries = options.maxRangeEntries ?? BFRANGE_MAX_ENTRIES;

  while ((sectionMatch = sectionRegex.exec(data)) !== null) {
    const content = stripComments(sectionMatch[1] ?? "");
    if (!content) {
      continue;
    }

    const tokens = tokenizeCMapSection(content);
    for (let i = 0; i < tokens.length;) {
      const startToken = tokens[i];
      if (!startToken) {
        break;
      }
      if (startToken.kind !== "hex") {
        i += 1;
        continue;
      }

      const endToken = tokens[i + 1];
      if (!endToken || endToken.kind !== "hex") {
        parseState.invalidEntryCount += 1;
        i += 1;
        continue;
      }

      const valueToken = tokens[i + 2];
      if (!valueToken) {
        parseState.invalidEntryCount += 1;
        break;
      }

      if (valueToken.kind === "hex") {
        const sourceMeta = parseSourceRangeMeta(startToken.value, endToken.value);
        if (!sourceMeta) {
          parseState.invalidEntryCount += 1;
          i += 3;
          continue;
        }

        maxSourceLength = Math.max(maxSourceLength, sourceMeta.sourceHexLength);

        applySimpleRangeMappings({
          sourceMeta,
          destinationStartHex: valueToken.value,
          maxRangeEntries,
          mapping,
          byteMapping,
          parseState,
        });
        i += 3;
        continue;
      }

      if (valueToken.kind === "lbracket") {
        const sourceMeta = parseSourceRangeMeta(startToken.value, endToken.value);
        if (!sourceMeta) {
          parseState.invalidEntryCount += 1;
          i += 3;
          continue;
        }

        maxSourceLength = Math.max(maxSourceLength, sourceMeta.sourceHexLength);

        const destinationHexes: string[] = [];
        let closed = false;
        let cursor = i + 3;
        while (cursor < tokens.length) {
          const token = tokens[cursor];
          if (!token) {
            break;
          }
          if (token.kind === "rbracket") {
            closed = true;
            cursor += 1;
            break;
          }
          if (token.kind === "hex") {
            destinationHexes.push(token.value);
          } else {
            parseState.invalidEntryCount += 1;
          }
          cursor += 1;
        }
        if (!closed) {
          parseState.invalidEntryCount += 1;
        }

        applyArrayRangeMappings({
          sourceMeta,
          destinationHexes,
          maxRangeEntries,
          mapping,
          byteMapping,
          parseState,
        });

        i = cursor;
        continue;
      }

      parseState.invalidEntryCount += 1;
      i += 1;
    }
  }

  return maxSourceLength;
}

type CMapSectionToken =
  | { readonly kind: "hex"; readonly value: string }
  | { readonly kind: "lbracket" }
  | { readonly kind: "rbracket" }
  | { readonly kind: "other"; readonly value: string };

function tokenizeCMapSection(content: string): readonly CMapSectionToken[] {
  const tokens: CMapSectionToken[] = [];
  const tokenRegex = /<([^>]*)>|\[|\]|[^\s]+/g;
  let match;
  while ((match = tokenRegex.exec(content)) !== null) {
    if (match[1] !== undefined) {
      tokens.push({ kind: "hex", value: match[1] });
      continue;
    }
    const token = match[0];
    if (token === "[") {
      tokens.push({ kind: "lbracket" });
      continue;
    }
    if (token === "]") {
      tokens.push({ kind: "rbracket" });
      continue;
    }
    tokens.push({ kind: "other", value: token });
  }
  return tokens;
}

type SourceRangeMeta = {
  readonly start: number;
  readonly end: number;
  readonly sourceByteLength: number;
  readonly sourceHexLength: number;
};

function parseSourceRangeMeta(startHexRaw: string, endHexRaw: string): SourceRangeMeta | null {
  const normalizedStartHex = normalizeHexLiteral(startHexRaw);
  const normalizedEndHex = normalizeHexLiteral(endHexRaw);
  if (!normalizedStartHex || !normalizedEndHex) {
    return null;
  }

  if (normalizedStartHex.length !== normalizedEndHex.length) {
    return null;
  }

  const start = parseHexToInteger(normalizedStartHex);
  const end = parseHexToInteger(normalizedEndHex);
  if (start === null || end === null || end < start) {
    return null;
  }

  return {
    start,
    end,
    sourceByteLength: normalizedStartHex.length / 2,
    sourceHexLength: normalizedStartHex.length,
  };
}

function applySimpleRangeMappings(args: {
  readonly sourceMeta: SourceRangeMeta;
  readonly destinationStartHex: string;
  readonly maxRangeEntries: number;
  readonly mapping: FontMapping;
  readonly byteMapping: Map<string, string>;
  readonly parseState: ParseState;
}): void {
  const {
    sourceMeta,
    destinationStartHex,
    maxRangeEntries,
    mapping,
    byteMapping,
    parseState,
  } = args;

  const normalizedDestinationStart = normalizeHexLiteral(destinationStartHex);
  if (!normalizedDestinationStart) {
    parseState.invalidEntryCount += 1;
    return;
  }

  const totalRangeSize = sourceMeta.end - sourceMeta.start + 1;
  const actualRangeSize = Math.min(totalRangeSize, maxRangeEntries);
  if (actualRangeSize < totalRangeSize) {
    parseState.truncatedRangeCount += 1;
    console.warn(
      `[PDF CMap] bfrange from 0x${sourceMeta.start.toString(16)} to 0x${sourceMeta.end.toString(16)} ` +
        `has ${totalRangeSize} entries, limiting to ${maxRangeEntries}. ` +
        "Some character mappings may be missing."
    );
  }

  for (let offset = 0; offset < actualRangeSize; offset++) {
    const sourceCode = sourceMeta.start + offset;
    const sourceHex = sourceCode.toString(16).padStart(sourceMeta.sourceHexLength, "0").toUpperCase();

    const destinationHex = incrementHexString(normalizedDestinationStart, offset);
    if (!destinationHex) {
      parseState.invalidEntryCount += 1;
      continue;
    }

    const unicode = hexToString(destinationHex);
    if (unicode === null) {
      parseState.invalidEntryCount += 1;
      continue;
    }

    setDecodedMapping({
      normalizedSource: sourceHex,
      unicode,
      mapping,
      byteMapping,
    });

    if (!Number.isSafeInteger(sourceCode)) {
      parseState.invalidEntryCount += 1;
    }
  }
}

function applyArrayRangeMappings(args: {
  readonly sourceMeta: SourceRangeMeta;
  readonly destinationHexes: readonly string[];
  readonly maxRangeEntries: number;
  readonly mapping: FontMapping;
  readonly byteMapping: Map<string, string>;
  readonly parseState: ParseState;
}): void {
  const {
    sourceMeta,
    destinationHexes,
    maxRangeEntries,
    mapping,
    byteMapping,
    parseState,
  } = args;

  const totalRangeSize = sourceMeta.end - sourceMeta.start + 1;
  const maxAllowedByConfig = Math.min(totalRangeSize, maxRangeEntries);
  if (maxAllowedByConfig < totalRangeSize) {
    parseState.truncatedRangeCount += 1;
    console.warn(
      `[PDF CMap] bfrange from 0x${sourceMeta.start.toString(16)} to 0x${sourceMeta.end.toString(16)} ` +
        `has ${totalRangeSize} entries, limiting to ${maxRangeEntries}. ` +
        "Some character mappings may be missing."
    );
  }

  const actualRangeSize = Math.min(maxAllowedByConfig, destinationHexes.length);

  for (let offset = 0; offset < actualRangeSize; offset++) {
    const sourceCode = sourceMeta.start + offset;
    const sourceHex = sourceCode.toString(16).padStart(sourceMeta.sourceHexLength, "0").toUpperCase();
    const destinationHex = destinationHexes[offset];
    if (!destinationHex) {
      parseState.invalidEntryCount += 1;
      continue;
    }

    const unicode = hexToString(destinationHex);
    if (unicode === null) {
      parseState.invalidEntryCount += 1;
      continue;
    }

    setDecodedMapping({
      normalizedSource: sourceHex,
      unicode,
      mapping,
      byteMapping,
    });
  }

  if (destinationHexes.length < maxAllowedByConfig) {
    parseState.invalidEntryCount += maxAllowedByConfig - destinationHexes.length;
  }
}

function setDecodedMapping(args: {
  readonly normalizedSource: string;
  readonly unicode: string;
  readonly mapping: FontMapping;
  readonly byteMapping: Map<string, string>;
}): void {
  const { normalizedSource, unicode, mapping, byteMapping } = args;
  byteMapping.set(normalizedSource, unicode);

  if (normalizedSource.length <= 4) {
    const sourceCode = parseHexToInteger(normalizedSource);
    if (sourceCode !== null) {
      mapping.set(sourceCode, unicode);
    }
  }
}

type CodeSpaceParseResult = Readonly<{
  byteLengths: ReadonlySet<number>;
}>;

function parseCodeSpaceMetadata(data: string): CodeSpaceParseResult {
  const lengths = new Set<number>();
  const sectionRegex = /begincodespacerange\s*\n?([\s\S]*?)endcodespacerange/gi;
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(data)) !== null) {
    const content = stripComments(sectionMatch[1] ?? "");
    const hexTokens = [...content.matchAll(/<([^>]*)>/g)]
      .map((match) => match[1])
      .filter((value): value is string => value !== undefined);
    const pairCount = Math.floor(hexTokens.length / 2);

    for (let i = 0; i < pairCount; i += 1) {
      const startHex = normalizeHexLiteral(hexTokens[i * 2] ?? "");
      const endHex = normalizeHexLiteral(hexTokens[i * 2 + 1] ?? "");
      if (!startHex || !endHex || startHex.length !== endHex.length) {
        continue;
      }
      lengths.add(startHex.length / 2);
    }
  }

  return {
    byteLengths: lengths,
  };
}

function normalizeHexLiteral(hex: string): string | null {
  const compact = hex.replace(/\s+/g, "");
  if (compact.length === 0 || compact.length % 2 !== 0) {
    return null;
  }
  if (!/^[0-9a-fA-F]+$/.test(compact)) {
    return null;
  }
  return compact.toUpperCase();
}

function parseHexToInteger(hex: string): number | null {
  const parsed = Number.parseInt(hex, 16);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isSafeInteger(parsed)) {
    return null;
  }
  return parsed;
}

function stripComment(line: string): string {
  const index = line.indexOf("%");
  if (index < 0) {
    return line;
  }
  return line.slice(0, index);
}

function stripComments(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => stripComment(line))
    .join("\n");
}

function incrementHexString(hex: string, increment: number): string | null {
  const normalized = normalizeHexLiteral(hex);
  if (!normalized || increment < 0 || !Number.isSafeInteger(increment)) {
    return null;
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    const value = Number.parseInt(normalized.slice(i, i + 2), 16);
    if (!Number.isFinite(value)) {
      return null;
    }
    bytes[i / 2] = value;
  }

  let carry = increment;
  for (let i = bytes.length - 1; i >= 0; i--) {
    if (carry <= 0) {
      break;
    }

    const add = carry & 0xff;
    const sum = bytes[i]! + add;
    bytes[i] = sum & 0xff;
    carry = (carry >>> 8) + (sum >>> 8);
  }

  if (carry > 0) {
    return null;
  }

  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join("");
}

function buildDiagnostics(args: Readonly<{
  byteMapping: ReadonlyMap<string, string>;
  parseState: ParseState;
  codeSpaceByteLengths: ReadonlySet<number>;
}>): CMapParseDiagnostics {
  const {
    byteMapping,
    parseState,
    codeSpaceByteLengths,
  } = args;
  const histogram = new Map<number, number>();
  let replacementCharMapCount = 0;
  let privateUseCharMapCount = 0;
  let sourceLengthOutsideCodeSpaceCount = 0;
  const hasCodeSpaceInfo = codeSpaceByteLengths.size > 0;

  for (const [sourceHex, decoded] of byteMapping.entries()) {
    const sourceLength = sourceHex.length / 2;
    histogram.set(sourceLength, (histogram.get(sourceLength) ?? 0) + 1);
    if (hasCodeSpaceInfo && !codeSpaceByteLengths.has(sourceLength)) {
      sourceLengthOutsideCodeSpaceCount += 1;
    }

    if (decoded.includes("\uFFFD")) {
      replacementCharMapCount += 1;
    }
    if (containsPrivateUseCharacter(decoded)) {
      privateUseCharMapCount += 1;
    }
  }

  return {
    invalidEntryCount: parseState.invalidEntryCount,
    truncatedRangeCount: parseState.truncatedRangeCount,
    sourceLengthOutsideCodeSpaceCount,
    replacementCharMapCount,
    privateUseCharMapCount,
    sourceCodeLengthHistogram: histogram,
  };
}

function containsPrivateUseCharacter(text: string): boolean {
  return Array.from(text).some((char) => {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      return false;
    }
    return (
      (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
      (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
      (codePoint >= 0x100000 && codePoint <= 0x10fffd)
    );
  });
}

/**
 * Convert destination hex string to Unicode string.
 * Destination is interpreted as UTF-16BE code units.
 */
export function hexToString(hex: string): string | null {
  const normalized = normalizeHexLiteral(hex);
  if (!normalized) {
    return null;
  }

  try {
    if (normalized.length <= 4) {
      return String.fromCodePoint(Number.parseInt(normalized, 16));
    }

    if (normalized.length % 4 !== 0) {
      let result = "";
      for (let i = 0; i < normalized.length; i += 2) {
        const byte = Number.parseInt(normalized.slice(i, i + 2), 16);
        if (!Number.isFinite(byte)) {
          return null;
        }
        result += String.fromCodePoint(byte);
      }
      return result;
    }

    const codeUnits: number[] = [];
    for (let i = 0; i < normalized.length; i += 4) {
      const unit = Number.parseInt(normalized.slice(i, i + 4), 16);
      if (!Number.isFinite(unit)) {
        return null;
      }
      codeUnits.push(unit);
    }

    let result = "";
    for (let i = 0; i < codeUnits.length; i++) {
      const codeUnit = codeUnits[i]!;

      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff && i + 1 < codeUnits.length) {
        const low = codeUnits[i + 1]!;
        if (low >= 0xdc00 && low <= 0xdfff) {
          const codePoint = ((codeUnit - 0xd800) << 10) + (low - 0xdc00) + 0x10000;
          result += String.fromCodePoint(codePoint);
          i += 1;
          continue;
        }
      }

      result += String.fromCharCode(codeUnit);
    }

    return result;
  } catch {
    return null;
  }
}
