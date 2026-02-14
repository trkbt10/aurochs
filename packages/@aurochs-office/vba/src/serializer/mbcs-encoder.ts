/**
 * @file MBCS (Multi-Byte Character Set) encoder for VBA serialization
 *
 * Provides encoding from Unicode strings to MBCS byte sequences for code pages
 * that TextEncoder doesn't support (Shift_JIS, GBK, EUC-KR, etc.).
 *
 * Strategy: Use reverse lookup from the browser's TextDecoder to build encoding tables.
 * This ensures consistency between decoding and encoding.
 */

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when MBCS encoding fails.
 */
export class MbcsEncodingError extends Error {
  constructor(
    message: string,
    public readonly codePage: number,
    public readonly character?: string
  ) {
    super(message);
    this.name = "MbcsEncodingError";
  }
}

// =============================================================================
// Supported Code Pages
// =============================================================================

/**
 * Map Windows code page numbers to TextDecoder encoding labels.
 * Only includes code pages that are explicitly supported.
 */
const CODE_PAGE_TO_ENCODING: ReadonlyMap<number, string> = new Map([
  [932, "shift_jis"], // Japanese
  [936, "gbk"], // Simplified Chinese
  [949, "euc-kr"], // Korean
  [950, "big5"], // Traditional Chinese
  [1250, "windows-1250"], // Central European
  [1251, "windows-1251"], // Cyrillic
  [1252, "windows-1252"], // Western European (default)
  [1253, "windows-1253"], // Greek
  [1254, "windows-1254"], // Turkish
  [1255, "windows-1255"], // Hebrew
  [1256, "windows-1256"], // Arabic
  [1257, "windows-1257"], // Baltic
  [1258, "windows-1258"], // Vietnamese
  [65001, "utf-8"], // UTF-8
]);

/**
 * Check if a code page is supported.
 */
export function isSupportedCodePage(codePage: number): boolean {
  return CODE_PAGE_TO_ENCODING.has(codePage);
}

/**
 * Get supported code pages.
 */
export function getSupportedCodePages(): readonly number[] {
  return Array.from(CODE_PAGE_TO_ENCODING.keys());
}

// =============================================================================
// Encoding Table Generation
// =============================================================================

/**
 * Get lead byte ranges for MBCS encodings.
 */
function getLeadByteRanges(encoding: string): ReadonlyArray<readonly [number, number]> {
  const enc = encoding.toLowerCase();

  if (enc === "shift_jis" || enc === "shift-jis" || enc === "sjis") {
    return [
      [0x81, 0x9f],
      [0xe0, 0xfc],
    ];
  }

  if (enc === "gbk" || enc === "gb2312" || enc === "gb18030") {
    return [[0x81, 0xfe]];
  }

  if (enc === "euc-kr" || enc === "euc_kr" || enc === "cp949") {
    return [[0x81, 0xfe]];
  }

  if (enc === "big5") {
    return [[0x81, 0xfe]];
  }

  // Single-byte encodings have no lead byte ranges
  return [];
}

/**
 * Unicode replacement character used by TextDecoder for invalid sequences.
 */
const REPLACEMENT_CHAR = "\uFFFD";

/**
 * Check if a decoded character is valid (not a replacement character).
 */
function isValidDecodedChar(char: string): boolean {
  return char.length === 1 && char !== REPLACEMENT_CHAR;
}

/**
 * Create a TextDecoder for the given encoding.
 * Uses fatal:false so invalid sequences produce replacement characters instead of throwing.
 *
 * @throws MbcsEncodingError if the encoding is not supported by this runtime
 */
function createDecoder(encoding: string, codePage: number): TextDecoder {
  try {
    return new TextDecoder(encoding, { fatal: false });
  } catch (err) {
    throw new MbcsEncodingError(
      `Encoding "${encoding}" (code page ${codePage}) is not supported by this runtime: ${err instanceof Error ? err.message : String(err)}`,
      codePage
    );
  }
}

/**
 * Add single-byte mappings to the encoding table.
 * Iterates through all possible single-byte values (0x00-0xFF).
 */
function addSingleByteMappings(table: Map<string, Uint8Array>, decoder: TextDecoder): void {
  for (let i = 0; i < 256; i++) {
    const bytes = new Uint8Array([i]);
    const char = decoder.decode(bytes);
    if (isValidDecodedChar(char) && !table.has(char)) {
      table.set(char, bytes);
    }
  }
}

/**
 * Add double-byte mappings to the encoding table for MBCS encodings.
 * Iterates through lead byte ranges and valid trail bytes.
 */
function addDoubleByteMappings(
  table: Map<string, Uint8Array>,
  decoder: TextDecoder,
  leadByteRanges: ReadonlyArray<readonly [number, number]>
): void {
  for (const [leadStart, leadEnd] of leadByteRanges) {
    for (let lead = leadStart; lead <= leadEnd; lead++) {
      for (let trail = 0x40; trail <= 0xfc; trail++) {
        if (trail === 0x7f) { continue; } // 0x7F is invalid as trail byte

        const bytes = new Uint8Array([lead, trail]);
        const char = decoder.decode(bytes);
        if (isValidDecodedChar(char) && !table.has(char)) {
          table.set(char, bytes);
        }
      }
    }
  }
}

/**
 * Generate a Unicode to byte mapping for a given encoding.
 *
 * This works by decoding all possible byte sequences and building a reverse map.
 * For MBCS encodings, we try both single-byte and double-byte sequences.
 * Invalid byte sequences produce the Unicode replacement character (U+FFFD),
 * which is filtered out.
 *
 * @throws MbcsEncodingError if the encoding is not supported by TextDecoder
 */
function generateEncodingTable(encoding: string, codePage: number): Map<string, Uint8Array> {
  const table = new Map<string, Uint8Array>();
  const decoder = createDecoder(encoding, codePage);

  // Single-byte characters (0x00-0xFF)
  addSingleByteMappings(table, decoder);

  // Double-byte characters for MBCS encodings
  const leadByteRanges = getLeadByteRanges(encoding);
  addDoubleByteMappings(table, decoder, leadByteRanges);

  return table;
}

// =============================================================================
// Encoding Table Cache
// =============================================================================

const encodingTableCache = new Map<number, Map<string, Uint8Array>>();

function getEncodingTable(encoding: string, codePage: number): Map<string, Uint8Array> {
  const cached = encodingTableCache.get(codePage);
  if (cached) {
    return cached;
  }
  const table = generateEncodingTable(encoding, codePage);
  encodingTableCache.set(codePage, table);
  return table;
}

// =============================================================================
// Main Encoding Function
// =============================================================================

/**
 * Encode a string to bytes using the specified code page.
 *
 * For UTF-8 (code page 65001), uses TextEncoder directly.
 * For ASCII-only text, uses TextEncoder (ASCII is compatible with all code pages).
 * For MBCS encodings (Shift_JIS, GBK, EUC-KR, Big5), uses a reverse lookup table.
 *
 * @param text - The string to encode
 * @param codePage - The code page number (e.g., 932 for Shift_JIS)
 * @returns Encoded bytes
 * @throws MbcsEncodingError if code page is unsupported or character cannot be encoded
 */
export function encodeMbcs(text: string, codePage: number): Uint8Array {
  const encoding = CODE_PAGE_TO_ENCODING.get(codePage);

  if (encoding === undefined) {
    throw new MbcsEncodingError(
      `Unsupported code page: ${codePage}. Supported: ${getSupportedCodePages().join(", ")}`,
      codePage
    );
  }

  // UTF-8 can be handled directly by TextEncoder
  if (encoding === "utf-8") {
    return new TextEncoder().encode(text);
  }

  // ASCII-only text works with any code page
  if (isAsciiOnly(text)) {
    return new TextEncoder().encode(text);
  }

  // Use lookup table for MBCS encoding
  const table = getEncodingTable(encoding, codePage);

  // Encode character by character, collecting byte arrays
  const chunks = Array.from(text).map((char) => {
    const bytes = table.get(char);
    if (bytes) {
      return bytes;
    }
    throw new MbcsEncodingError(
      `Character "${char}" (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}) cannot be encoded in code page ${codePage}`,
      codePage,
      char
    );
  });

  // Combine all chunks into a single Uint8Array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  chunks.reduce((offset, chunk) => {
    result.set(chunk, offset);
    return offset + chunk.length;
  }, 0);

  return result;
}

/**
 * Check if a string contains only ASCII characters.
 */
function isAsciiOnly(text: string): boolean {
  return Array.from(text).every((char) => char.charCodeAt(0) <= 127);
}
