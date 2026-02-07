/**
 * @file Text extractor – reads text from WordDocument stream using piece table
 *
 * Reference: [MS-DOC] 2.8.37 – PlcPcd
 *
 * Each piece descriptor tells us where in the WordDocument stream the text
 * bytes live, and whether they are compressed (cp1252, 1 byte/char) or
 * Unicode (UTF-16LE, 2 bytes/char).
 */

import type { PieceDescriptor } from "./piece-table";

/** CP1252 → Unicode mapping for bytes 0x80–0x9F (the "Windows" range). */
const CP1252_MAP: Record<number, number> = {
  0x80: 0x20ac, // €
  0x82: 0x201a, // ‚
  0x83: 0x0192, // ƒ
  0x84: 0x201e, // „
  0x85: 0x2026, // …
  0x86: 0x2020, // †
  0x87: 0x2021, // ‡
  0x88: 0x02c6, // ˆ
  0x89: 0x2030, // ‰
  0x8a: 0x0160, // Š
  0x8b: 0x2039, // ‹
  0x8c: 0x0152, // Œ
  0x8e: 0x017d, // Ž
  0x91: 0x2018, // '
  0x92: 0x2019, // '
  0x93: 0x201c, // "
  0x94: 0x201d, // "
  0x95: 0x2022, // •
  0x96: 0x2013, // –
  0x97: 0x2014, // —
  0x98: 0x02dc, // ˜
  0x99: 0x2122, // ™
  0x9a: 0x0161, // š
  0x9b: 0x203a, // ›
  0x9c: 0x0153, // œ
  0x9e: 0x017e, // ž
  0x9f: 0x0178, // Ÿ
};

function decodeCp1252(bytes: Uint8Array): string {
  const codes: number[] = [];
  for (const b of bytes) {
    codes.push(CP1252_MAP[b] ?? b);
  }
  return String.fromCodePoint(...codes);
}

function decodeUtf16le(bytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-16le");
  return decoder.decode(bytes);
}

function extractPieceText(
  wordDocStream: Uint8Array,
  piece: PieceDescriptor,
  charsToRead: number,
): string {
  if (piece.compressed) {
    // 1 byte per character (cp1252)
    const start = piece.fileOffset;
    const end = start + charsToRead;
    if (end > wordDocStream.length) {
      throw new Error(
        `Compressed piece extends beyond WordDocument stream: offset ${start}+${charsToRead} > ${wordDocStream.length}`,
      );
    }
    return decodeCp1252(wordDocStream.subarray(start, end));
  }

  // 2 bytes per character (UTF-16LE)
  const start = piece.fileOffset;
  const end = start + charsToRead * 2;
  if (end > wordDocStream.length) {
    throw new Error(
      `Unicode piece extends beyond WordDocument stream: offset ${start}+${charsToRead * 2} > ${wordDocStream.length}`,
    );
  }
  return decodeUtf16le(wordDocStream.subarray(start, end));
}

/**
 * Extract full text from the WordDocument stream using piece descriptors.
 * Only extracts the main document text (up to `ccpText` characters).
 */
export function extractText(
  wordDocStream: Uint8Array,
  pieces: readonly PieceDescriptor[],
  ccpText: number,
): string {
  const parts: string[] = [];
  // eslint-disable-next-line no-restricted-syntax -- charsRead is accumulated across pieces
  let charsRead = 0;

  for (const piece of pieces) {
    if (charsRead >= ccpText) {
      break;
    }

    const pieceCharCount = piece.cpEnd - piece.cpStart;
    const charsToRead = Math.min(pieceCharCount, ccpText - charsRead);

    parts.push(extractPieceText(wordDocStream, piece, charsToRead));
    charsRead += charsToRead;
  }

  return parts.join("");
}

/**
 * Split raw text into paragraphs at paragraph marks (\r).
 * Filters out special marker characters within paragraphs.
 */
export function splitIntoParagraphs(rawText: string): readonly string[] {
  // Split on paragraph marks
  const rawParagraphs = rawText.split("\r");

  // Clean up special characters and map
  const paragraphs: string[] = rawParagraphs.map((raw) =>
    cleanSpecialChars(raw),
  );

  // Remove trailing empty paragraph (artifact of trailing \r)
  if (paragraphs.length > 0 && paragraphs[paragraphs.length - 1] === "") {
    paragraphs.pop();
  }

  return paragraphs;
}

function cleanSpecialChars(text: string): string {
  const result: string[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    switch (code) {
      case 0x07: // cell mark
      case 0x0e: // column break
      case 0x0c: // page/section break
        break;
      case 0x0b: // line break → newline
        result.push("\n");
        break;
      default:
        result.push(ch);
    }
  }
  return result.join("");
}
