/**
 * @file PDF Cross-Reference Table Builder
 *
 * Builds the xref table and trailer for PDF documents.
 * @see ISO 32000-1:2008 Section 7.5.4 (Cross-Reference Table)
 */

import type { PdfObject } from "../native/core/types";
import { serializePdfDict } from "./object-serializer";
import type { PdfObjectEntry } from "./document/object-tracker";

const encoder = new TextEncoder();

function encodeAscii(text: string): Uint8Array {
  return encoder.encode(text);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Entry for xref table.
 */
export type XRefEntry = {
  /** Byte offset in file (for in-use entries) */
  readonly offset: number;
  /** Generation number */
  readonly gen: number;
  /** Entry type: 'n' for in-use, 'f' for free */
  readonly type: "n" | "f";
};

/**
 * Build a traditional xref table.
 *
 * @param entries - Object entries with offsets set
 * @param size - Total number of objects (including free entry 0)
 * @returns Serialized xref table
 */
export function buildXrefTable(
  entries: readonly PdfObjectEntry[],
  size: number
): Uint8Array {
  const lines: string[] = [];

  // xref header
  lines.push("xref");
  lines.push(`0 ${size}`);

  // Entry 0: free entry (head of free list)
  lines.push("0000000000 65535 f ");

  // Build in-use entries
  // Create a map of objNum -> offset for quick lookup
  const offsetMap = new Map<number, number>();
  for (const entry of entries) {
    if (entry.offset !== undefined) {
      offsetMap.set(entry.objNum, entry.offset);
    }
  }

  // Output entries 1 to size-1
  for (let i = 1; i < size; i++) {
    const offset = offsetMap.get(i);
    if (offset !== undefined) {
      // In-use entry
      const offsetStr = String(offset).padStart(10, "0");
      lines.push(`${offsetStr} 00000 n `);
    } else {
      // Free entry (shouldn't happen in our case, but handle gracefully)
      lines.push("0000000000 00000 f ");
    }
  }

  return encodeAscii(lines.join("\n") + "\n");
}

/**
 * Build trailer dictionary and footer.
 *
 * @param args - Trailer parameters
 * @returns Serialized trailer and footer
 */
export function buildTrailer(args: {
  readonly size: number;
  readonly rootObjNum: number;
  readonly infoObjNum?: number;
}): Uint8Array {
  const trailerDict = new Map<string, PdfObject>([
    ["Size", { type: "number", value: args.size }],
    ["Root", { type: "ref", obj: args.rootObjNum, gen: 0 }],
  ]);

  if (args.infoObjNum !== undefined) {
    trailerDict.set("Info", { type: "ref", obj: args.infoObjNum, gen: 0 });
  }

  const dictBytes = serializePdfDict(trailerDict);

  return concat(encodeAscii("trailer\n"), dictBytes, encodeAscii("\n"));
}

/**
 * Build startxref and %%EOF footer.
 *
 * @param xrefOffset - Byte offset of xref table
 * @returns Serialized footer
 */
export function buildFooter(xrefOffset: number): Uint8Array {
  return encodeAscii(`startxref\n${xrefOffset}\n%%EOF\n`);
}

/**
 * Build complete xref section (table + trailer + footer).
 *
 * @param entries - Object entries with offsets
 * @param size - Total object count
 * @param rootObjNum - Catalog object number
 * @param infoObjNum - Optional info dictionary object number
 * @param xrefOffset - Byte offset where xref table starts
 * @returns Complete xref section
 */
export function buildXrefSection(args: {
  readonly entries: readonly PdfObjectEntry[];
  readonly size: number;
  readonly rootObjNum: number;
  readonly infoObjNum?: number;
  readonly xrefOffset: number;
}): Uint8Array {
  const xrefTable = buildXrefTable(args.entries, args.size);
  const trailer = buildTrailer({
    size: args.size,
    rootObjNum: args.rootObjNum,
    infoObjNum: args.infoObjNum,
  });
  const footer = buildFooter(args.xrefOffset);

  return concat(xrefTable, trailer, footer);
}
