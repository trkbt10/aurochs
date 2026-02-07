/**
 * @file Sub-document extractors: headers/footers, footnotes, endnotes, comments, bookmarks
 */

import type {
  DocHeaderFooter,
  DocHeaderFooterType,
  DocNote,
  DocComment,
  DocBookmark,
  DocParagraph,
} from "../domain/types";

/** Callback that builds formatted paragraphs from a global CP range. */
export type SubdocParagraphBuilder = (globalCpStart: number, globalCpEnd: number) => readonly DocParagraph[];

// --- Helper: extract sub-document text range ---

/**
 * Extract paragraphs from a raw text range (split by \r, trim).
 * Used for sub-document text ranges.
 */
export function textRangeToParagraphs(rawText: string, cpStart: number, cpEnd: number): readonly DocParagraph[] {
  if (cpStart >= cpEnd) return [];
  const text = rawText.substring(cpStart, Math.min(cpEnd, rawText.length));
  if (!text.trim()) return [];

  const parts = text.split("\r").filter((p) => p.length > 0);
  return parts.map((t) => ({
    runs: [{ text: t }],
  }));
}

// --- Headers/Footers ---

/**
 * Parse PlcfHdd (header/footer CP positions).
 * PlcfHdd is just an array of CPs (4B each) — no data part.
 * size = (n+1) × 4B
 */
export function parsePlcfHdd(tableStream: Uint8Array, fc: number, lcb: number): readonly number[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  const n = lcb / 4;
  if (!Number.isInteger(n)) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cps: number[] = [];

  for (let i = 0; i < n; i++) {
    cps.push(view.getInt32(fc + i * 4, true));
  }

  return cps;
}

/**
 * Extract headers and footers from PlcfHdd CPs and full document text.
 *
 * The header/footer text is located after main text + footnotes in the document text.
 * PlcfHdd CPs are relative to the start of the header/footer sub-document.
 *
 * First 6 stories: footnote/endnote separators (skip)
 * Then per section (6 stories each):
 *   [0] even header, [1] odd header, [2] even footer, [3] odd footer,
 *   [4] first header, [5] first footer
 */
export function extractHeadersFooters(
  hddCps: readonly number[],
  fullText: string,
  hdrTextStart: number,
  buildParagraphs?: SubdocParagraphBuilder,
): { headers: readonly DocHeaderFooter[]; footers: readonly DocHeaderFooter[] } {
  const headers: DocHeaderFooter[] = [];
  const footers: DocHeaderFooter[] = [];

  if (hddCps.length < 12) return { headers, footers };

  const builder = buildParagraphs ?? ((s: number, e: number) => textRangeToParagraphs(fullText, s, e));

  // Skip first 6 separator stories
  const sectionStories = hddCps.slice(6);

  // Track last seen content per story slot for empty story inheritance
  // Keys: "header:even", "header:odd", "footer:even", "footer:odd", "header:first", "footer:first"
  const lastSeen = new Map<string, readonly DocParagraph[]>();

  const storySlots: Array<{ type: DocHeaderFooterType; isHeader: boolean }> = [
    { type: "even", isHeader: true },
    { type: "odd", isHeader: true },
    { type: "even", isHeader: false },
    { type: "odd", isHeader: false },
    { type: "first", isHeader: true },
    { type: "first", isHeader: false },
  ];

  // Process sections (6 stories per section)
  for (let s = 0; s + 6 < sectionStories.length; s += 6) {
    for (let i = 0; i < 6; i++) {
      const cpStart = sectionStories[s + i];
      const cpEnd = s + i + 1 < sectionStories.length ? sectionStories[s + i + 1] : cpStart;
      const slot = storySlots[i];
      const key = `${slot.isHeader ? "header" : "footer"}:${slot.type}`;

      let content: readonly DocParagraph[] | undefined;

      if (cpStart < cpEnd) {
        content = builder(hdrTextStart + cpStart, hdrTextStart + cpEnd);
        if (content.length > 0) {
          lastSeen.set(key, content);
        } else {
          content = undefined;
        }
      }

      // If empty, inherit from previous section
      if (!content) {
        content = lastSeen.get(key);
      }

      if (!content || content.length === 0) continue;

      const entry: DocHeaderFooter = { type: slot.type, content };
      if (slot.isHeader) {
        headers.push(entry);
      } else {
        footers.push(entry);
      }
    }
  }

  return { headers, footers };
}

// --- Footnote/Endnote reference mark detection ---

/** Special character for footnote/endnote reference marks. */
const FOOTNOTE_REF_CHAR = "\x02";

/**
 * Detect footnote/endnote reference marks in the main document text.
 *
 * In .doc format, `\x02` characters with CHP fSpec=1 are note reference marks.
 * This function scans the main text for `\x02` characters and cross-references
 * them with the PlcffndRef/PlcfendRef CP arrays.
 *
 * Returns indices into the refCps array (excluding the boundary CP) for each
 * matched reference mark.
 */
export function detectNoteReferenceMarks(
  mainText: string,
  refCps: readonly number[],
): readonly { cp: number; noteIndex: number }[] {
  if (refCps.length < 2) return []; // Need at least 2 CPs (n+1 boundary format)

  // Build a set of reference CPs (excluding the final boundary CP)
  const refCpSet = new Map<number, number>(); // CP → index
  for (let i = 0; i < refCps.length - 1; i++) {
    refCpSet.set(refCps[i], i);
  }

  const results: Array<{ cp: number; noteIndex: number }> = [];

  for (let cp = 0; cp < mainText.length; cp++) {
    if (mainText[cp] === FOOTNOTE_REF_CHAR) {
      const noteIndex = refCpSet.get(cp);
      if (noteIndex !== undefined) {
        results.push({ cp, noteIndex });
      }
    }
  }

  return results;
}

// --- Footnotes/Endnotes ---

/**
 * Parse PlcffndRef or PlcfendRef (note reference positions).
 * Structure: CP array (n+1 × 4B) + data entries
 */
export function parseNotePosPlc(tableStream: Uint8Array, fc: number, lcb: number, dataSize: number): {
  readonly refCps: readonly number[];
  readonly textCps: readonly number[];
} {
  if (lcb === 0) return { refCps: [], textCps: [] };
  if (fc + lcb > tableStream.length) return { refCps: [], textCps: [] };

  // n = (lcb - 4) / (4 + dataSize)
  const n = (lcb - 4) / (4 + dataSize);
  if (!Number.isInteger(n) || n <= 0) return { refCps: [], textCps: [] };

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const refCps: number[] = [];

  for (let i = 0; i <= n; i++) {
    refCps.push(view.getInt32(fc + i * 4, true));
  }

  return { refCps, textCps: [] };
}

/** Parse note text positions (PlcffndTxt / PlcfendTxt). */
export function parseNoteTextPlc(tableStream: Uint8Array, fc: number, lcb: number): readonly number[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  // Just CP array (no data part, or minimal data)
  const n = lcb / 4;
  if (!Number.isInteger(n) || n <= 0) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cps: number[] = [];

  for (let i = 0; i < n; i++) {
    cps.push(view.getInt32(fc + i * 4, true));
  }

  return cps;
}

/** Extract footnotes or endnotes. */
export function extractNotes(
  refCps: readonly number[],
  textCps: readonly number[],
  fullText: string,
  noteTextStart: number,
  buildParagraphs?: SubdocParagraphBuilder,
): readonly DocNote[] {
  const builder = buildParagraphs ?? ((s: number, e: number) => textRangeToParagraphs(fullText, s, e));
  const notes: DocNote[] = [];

  // refCps has n+1 entries (boundaries), textCps has n+1 entries
  const count = Math.min(refCps.length - 1, textCps.length - 1);

  for (let i = 0; i < count; i++) {
    const cpRef = refCps[i];
    const cpStart = textCps[i];
    const cpEnd = textCps[i + 1];

    const content = builder(noteTextStart + cpStart, noteTextStart + cpEnd);
    notes.push({ cpRef, content });
  }

  return notes;
}

// --- Comments ---

/**
 * Parse comment references (PlcfandRef).
 * Structure: CP array (n+1 × 4B) + ATRD array (n × 30B)
 */
export function parseCommentRefs(
  tableStream: Uint8Array,
  fc: number,
  lcb: number,
): readonly { cpRef: number; authorIndex: number }[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  // ATRD is 30 bytes
  const n = (lcb - 4) / (4 + 30);
  if (!Number.isInteger(n) || n <= 0) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const results: Array<{ cpRef: number; authorIndex: number }> = [];

  for (let i = 0; i < n; i++) {
    const cpRef = view.getInt32(fc + i * 4, true);
    // ATRD: first 2 bytes = xstUsrInitl (20 bytes) + ibst (2 bytes) + ...
    // ibst (author index) at offset 20 within ATRD
    const atrdOffset = fc + (n + 1) * 4 + i * 30;
    const authorIndex = view.getUint16(atrdOffset + 20, true);
    results.push({ cpRef, authorIndex });
  }

  return results;
}

/** Parse comment author names (grpXstAtnOwners). */
export function parseCommentAuthors(tableStream: Uint8Array, fc: number, lcb: number): readonly string[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  const authors: string[] = [];
  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc;
  const end = fc + lcb;

  while (offset + 2 <= end) {
    const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
    const cch = view.getUint16(offset, true);
    offset += 2;

    if (cch === 0 || offset + cch * 2 > end) break;

    const nameBytes = tableStream.subarray(offset, offset + cch * 2);
    authors.push(new TextDecoder("utf-16le").decode(nameBytes));
    offset += cch * 2 + 2; // +2 for null terminator
  }

  return authors;
}

/**
 * Extract comments.
 *
 * When annotation bookmarks (atnBookmarks) are provided, cpStart/cpEnd are set
 * from the bookmark range. Otherwise they fall back to cpRef (reference point only).
 */
export function extractComments(
  refs: readonly { cpRef: number; authorIndex: number }[],
  textCps: readonly number[],
  authors: readonly string[],
  fullText: string,
  commentTextStart: number,
  buildParagraphs?: SubdocParagraphBuilder,
  atnBookmarks?: {
    readonly starts: readonly { cp: number; ibkl: number }[];
    readonly endCps: readonly number[];
  },
): readonly DocComment[] {
  const builder = buildParagraphs ?? ((s: number, e: number) => textRangeToParagraphs(fullText, s, e));
  const comments: DocComment[] = [];

  const count = Math.min(refs.length, textCps.length - 1);
  for (let i = 0; i < count; i++) {
    const ref = refs[i];
    const cpStart = textCps[i];
    const cpEnd = textCps[i + 1];

    const content = builder(commentTextStart + cpStart, commentTextStart + cpEnd);
    const author = authors[ref.authorIndex] ?? `Author ${ref.authorIndex}`;

    // Use annotation bookmarks for comment range when available
    let rangeCpStart = ref.cpRef;
    let rangeCpEnd = ref.cpRef;
    if (atnBookmarks && i < atnBookmarks.starts.length) {
      rangeCpStart = atnBookmarks.starts[i].cp;
      const ibkl = atnBookmarks.starts[i].ibkl;
      rangeCpEnd = ibkl < atnBookmarks.endCps.length
        ? atnBookmarks.endCps[ibkl]
        : rangeCpStart;
    }

    comments.push({
      author,
      cpStart: rangeCpStart,
      cpEnd: rangeCpEnd,
      content,
    });
  }

  return comments;
}

// --- Bookmarks ---

/** Parse bookmark names (SttbfBkmk). */
export function parseBookmarkNames(tableStream: Uint8Array, fc: number, lcb: number): readonly string[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);

  // STTB: fExtend(2B) + cData(2B) + cbExtra(2B) + entries
  const fExtend = view.getUint16(fc, true);
  if (fExtend !== 0xffff) return []; // Non-extended not supported

  const cData = view.getUint16(fc + 2, true);
  const cbExtra = view.getUint16(fc + 4, true);

  const names: string[] = [];
  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc + 6;

  for (let i = 0; i < cData; i++) {
    if (offset + 2 > fc + lcb) break;

    const cch = view.getUint16(offset, true);
    offset += 2;

    if (cch > 0 && offset + cch * 2 <= fc + lcb) {
      const nameBytes = tableStream.subarray(offset, offset + cch * 2);
      names.push(new TextDecoder("utf-16le").decode(nameBytes));
      offset += cch * 2;
    }

    offset += cbExtra;
  }

  return names;
}

/** Parse bookmark start positions (PlcfBkf). */
export function parseBookmarkStarts(
  tableStream: Uint8Array,
  fc: number,
  lcb: number,
): readonly { cp: number; ibkl: number }[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  // PlcfBkf: CPs (n+1 × 4B) + BKF entries (n × 4B, first 2B = ibkl)
  const n = (lcb - 4) / (4 + 4);
  if (!Number.isInteger(n) || n <= 0) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const results: Array<{ cp: number; ibkl: number }> = [];

  for (let i = 0; i < n; i++) {
    const cp = view.getInt32(fc + i * 4, true);
    const bkfOffset = fc + (n + 1) * 4 + i * 4;
    const ibkl = view.getUint16(bkfOffset, true);
    results.push({ cp, ibkl });
  }

  return results;
}

/** Parse bookmark end positions (PlcfBkl). */
export function parseBookmarkEnds(tableStream: Uint8Array, fc: number, lcb: number): readonly number[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  // PlcfBkl: just CPs (n+1 × 4B), no data
  // But actually it's n+1 CPs where n is from PlcfBkf
  const count = lcb / 4;
  if (!Number.isInteger(count)) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cps: number[] = [];

  for (let i = 0; i < count; i++) {
    cps.push(view.getInt32(fc + i * 4, true));
  }

  return cps;
}

/** Extract bookmarks by combining names, starts, and ends. */
export function extractBookmarks(
  names: readonly string[],
  starts: readonly { cp: number; ibkl: number }[],
  endCps: readonly number[],
): readonly DocBookmark[] {
  const bookmarks: DocBookmark[] = [];

  for (let i = 0; i < Math.min(names.length, starts.length); i++) {
    const name = names[i];
    const cpStart = starts[i].cp;
    const ibkl = starts[i].ibkl;
    const cpEnd = ibkl < endCps.length ? endCps[ibkl] : cpStart;

    bookmarks.push({ name, cpStart, cpEnd });
  }

  return bookmarks;
}
