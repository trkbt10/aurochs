/**
 * @file PDF text decoder
 *
 * Pure PDF text decoding using font mappings.
 * PDF Reference Section 5.9 - ToUnicode CMaps
 */

import type { FontInfo, FontMappings } from "./types";
import { decodeCIDFallback } from "./cid-ordering";

function bytesToString(bytes: readonly number[]): string {
  return String.fromCharCode(...bytes);
}

function scoreAsciiQuality(s: string): number {
  if (s.length === 0) {
    return 0;
  }
  let score = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x09 || c === 0x0a || c === 0x0d) {
      score += 1;
      continue;
    }
    if (c === 0x20) {
      score += 2;
      continue;
    }
    if (c < 0x20 || c === 0x7f) {
      score -= 3;
      continue;
    }
    if (c >= 0x30 && c <= 0x39) {
      score += 1;
      continue;
    }
    if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) {
      score += 1;
      continue;
    }
    // Common code/text punctuation
    if ("=()[]{}.,;:'\"_-+/\\<>".includes(String.fromCharCode(c))) {
      score += 1;
      continue;
    }
    // Other printable ASCII: neutral
  }
  return score / s.length;
}

function maybeNormalizeSingleByteRawText(rawText: string): string {
  if (!rawText.includes("\u0000")) {
    return rawText;
  }

  const bytes = new Array<number>(rawText.length);
  for (let i = 0; i < rawText.length; i++) {
    bytes[i] = rawText.charCodeAt(i) & 0xff;
  }

  const candidates: string[] = [];

  // Candidate 1: strip NUL bytes (common in some PDFs that encode text as 2-byte sequences).
  candidates.push(bytesToString(bytes.filter((b) => b !== 0x00)));

  // Candidate 2: if the byte stream looks like UTF-16BE-ish (high bytes near 0), take low bytes.
  if (bytes.length >= 6 && bytes.length % 2 === 0) {
    let hiNearZero = 0;
    let loAscii = 0;
    const pairs = bytes.length / 2;
    for (let i = 0; i < bytes.length; i += 2) {
      const hi = bytes[i]!;
      const lo = bytes[i + 1]!;
      if (hi <= 0x01) {
        hiNearZero += 1;
      }
      if (lo >= 0x03 && lo <= 0x7e) {
        loAscii += 1;
      }
    }
    if (hiNearZero / pairs >= 0.7 && loAscii / pairs >= 0.7) {
      const lows: number[] = [];
      for (let i = 1; i < bytes.length; i += 2) {
        lows.push(bytes[i]!);
      }
      candidates.push(bytesToString(lows));
    }
  }

  // Candidate 3: some PDFs obfuscate ASCII by shifting bytes (+3). If shifting back improves
  // readability, prefer it. Apply on each candidate and pick the best.
  const shifted: string[] = [];
  for (const c of candidates) {
    const b2 = new Array<number>(c.length);
    for (let i = 0; i < c.length; i++) {
      const b = c.charCodeAt(i) & 0xff;
      b2[i] = b >= 3 ? b - 3 : 0;
    }
    shifted.push(bytesToString(b2));
  }

  const sanitizeXml = (s: string): string => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");

  const all = [...candidates, ...shifted].map((s) => sanitizeXml(s.replace(/\u0000/g, "")));
  let best = sanitizeXml(rawText.replace(/\u0000/g, ""));
  let bestScore = scoreAsciiQuality(best);
  for (const s of all) {
    const score = scoreAsciiQuality(s);
    if (score > bestScore + 0.1) {
      best = s;
      bestScore = score;
    }
  }

  return best;
}

function sanitizeDecodedText(decoded: string): string {
  // XML 1.0 forbids most C0 control characters inside text nodes.
  // Replace them to keep downstream renderers (SVG/XML) robust.
  //
  // Keep \t/\n/\r as-is for readability; replace other controls with spaces.
  return decoded
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
}

/**
 * Find font info by name with fallback strategies
 */
function findFontInfo(fontName: string, mappings: FontMappings): FontInfo | undefined {
  // Clean font name (remove leading slash and subset prefix)
  const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;

  // Try exact match first
  const exactMatch = mappings.get(cleanName);
  if (exactMatch) {
    return exactMatch;
  }

  // Try without subset prefix (e.g., "XGIAKD+Arial" → "Arial")
  const plusIndex = cleanName.indexOf("+");
  if (plusIndex > 0) {
    const baseName = cleanName.slice(plusIndex + 1);
    const baseMatch = mappings.get(baseName);
    if (baseMatch) {
      return baseMatch;
    }
  }

  // Try matching by prefix
  for (const [key, value] of mappings.entries()) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Decode text using font mapping
 */
export function decodeText(
  rawText: string,
  fontName: string,
  mappings: FontMappings
): string {
  const fontInfo = findFontInfo(fontName, mappings);

  if (!fontInfo) {
    return sanitizeDecodedText(rawText);
  }
  return decodeTextWithFontInfo(rawText, fontInfo);
}






export function decodeTextWithFontInfo(rawText: string, fontInfo: FontInfo): string {
  const { mapping, codeByteWidth, ordering, encodingMap } = fontInfo;

  // For 2-byte CID fonts, try CID fallback if mapping is empty or incomplete
  if (codeByteWidth === 2) {
    // Identity ordering has no standard CID fallback mappings
    const fallbackOrdering = ordering === "Identity" ? undefined : ordering;
    return sanitizeDecodedText(decodeTwoByteText(rawText, mapping, fallbackOrdering));
  }

  // For single-byte fonts, use ToUnicode mapping if available
  if (mapping.size > 0) {
    return sanitizeDecodedText(decodeSingleByteTextWithFallback(rawText, mapping, encodingMap));
  }

  // Fall back to encoding map if available (WinAnsi, MacRoman, etc.)
  if (encodingMap && encodingMap.size > 0) {
    const normalized = maybeNormalizeSingleByteRawText(rawText);
    // Convert ReadonlyMap to Map for decodeSingleByteText
    const mutableMap = new Map(encodingMap);
    return sanitizeDecodedText(decodeSingleByteText(normalized, mutableMap));
  }

  // No mapping available, return raw text
  return sanitizeDecodedText(rawText);
}

/**
 * Decode text with 2-byte (CID) encoding.
 *
 * CID fonts use 2-byte character codes that map to Unicode via ToUnicode CMap.
 * Unlike single-byte fonts, the character code does NOT correspond to Unicode
 * code points directly.
 *
 * When ToUnicode mapping is not available or incomplete, attempts CID fallback
 * based on the font's CID ordering (Japan1, GB1, etc.).
 *
 * @see PDF Reference 1.7, Section 5.9 (ToUnicode CMaps)
 */
function decodeTwoByteText(
  rawText: string,
  mapping: Map<number, string>,
  ordering?: "Japan1" | "GB1" | "CNS1" | "Korea1"
): string {
  const chars: string[] = [];
  for (let i = 0; i < rawText.length; i += 2) {
    const highByte = rawText.charCodeAt(i);
    const lowByte = i + 1 < rawText.length ? rawText.charCodeAt(i + 1) : 0;
    const code = (highByte << 8) | lowByte;

    // Try ToUnicode mapping first
    const mapped = mapping.get(code);
    if (mapped) {
      chars.push(mapped);
      continue;
    }

    // Try CID fallback based on ordering
    const cidFallback = decodeCIDFallback(code, ordering ?? null);
    if (cidFallback) {
      chars.push(cidFallback);
      continue;
    }

    // No mapping found - use replacement character (U+FFFD)
    // Do NOT fall back to ASCII interpretation, as 2-byte codes
    // are not ASCII-compatible in CID fonts
    chars.push("\uFFFD");
  }
  return chars.join("");
}

/**
 * Decode text with single-byte encoding
 */
function decodeSingleByteText(rawText: string, mapping: Map<number, string>): string {
  return Array.from(rawText)
    .map((char) => {
      const code = char.charCodeAt(0);
      return mapping.get(code) ?? char;
    })
    .join("");
}

function decodeSingleByteTextWithFallback(
  rawText: string,
  toUnicode: Map<number, string>,
  encodingMap: ReadonlyMap<number, string> | undefined,
): string {
  return Array.from(rawText)
    .map((char) => {
      const code = char.charCodeAt(0);
      const mapped = toUnicode.get(code);
      if (mapped) {return mapped;}
      const fallback = encodingMap?.get(code);
      return fallback ?? char;
    })
    .join("");
}
