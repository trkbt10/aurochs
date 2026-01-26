/**
 * @file BIFF8 SST record parser (Shared String Table)
 */

import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type SstRecord = {
  readonly totalCount: number;
  readonly uniqueCount: number;
  readonly strings: readonly string[];
};

type FragmentCursor = {
  readonly fragments: readonly Uint8Array[];
  fragmentIndex: number;
  offset: number;
};

function currentFragment(cursor: FragmentCursor): Uint8Array {
  const fragment = cursor.fragments[cursor.fragmentIndex];
  if (!fragment) {
    throw new Error("SST parse error: missing fragment");
  }
  return fragment;
}

function remainingBytes(cursor: FragmentCursor): number {
  const fragment = currentFragment(cursor);
  return fragment.length - cursor.offset;
}

function advanceFragment(cursor: FragmentCursor): void {
  cursor.fragmentIndex += 1;
  cursor.offset = 0;
  if (cursor.fragmentIndex >= cursor.fragments.length) {
    throw new Error("SST parse error: unexpected end of CONTINUE fragments");
  }
}

function readUint8(cursor: FragmentCursor): number {
  if (remainingBytes(cursor) === 0) {
    advanceFragment(cursor);
  }
  const fragment = currentFragment(cursor);
  const value = fragment[cursor.offset];
  if (value === undefined) {
    throw new Error("SST parse error: unexpected end of fragment");
  }
  cursor.offset += 1;
  return value;
}

function readUint16LE(cursor: FragmentCursor): number {
  const b0 = readUint8(cursor);
  const b1 = readUint8(cursor);
  return b0 | (b1 << 8);
}

function readUint32LE(cursor: FragmentCursor): number {
  const b0 = readUint8(cursor);
  const b1 = readUint8(cursor);
  const b2 = readUint8(cursor);
  const b3 = readUint8(cursor);
  return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
}

function skipBytes(cursor: FragmentCursor, byteLength: number): void {
  if (!Number.isInteger(byteLength) || byteLength < 0) {
    throw new Error(`SST parse error: invalid skip length: ${byteLength}`);
  }
  for (let remaining = byteLength; remaining > 0; ) {
    const available = remainingBytes(cursor);
    if (available === 0) {
      advanceFragment(cursor);
      continue;
    }
    const consume = Math.min(available, remaining);
    cursor.offset += consume;
    remaining -= consume;
  }
}

function readContinuationEncodingFlag(cursor: FragmentCursor): boolean {
  // See [MS-XLS] / Excel97-2007 spec: when continued data is a string,
  // CONTINUE payload starts with 1 byte: 0=compressed, 1=uncompressed.
  advanceFragment(cursor);
  const flag = readUint8(cursor);
  if (flag !== 0 && flag !== 1) {
    throw new Error(`SST parse error: invalid CONTINUE string encoding flag: ${flag}`);
  }
  return flag === 1;
}

function readStringChars(cursor: FragmentCursor, cch: number, initialHighByte: boolean): string {
  if (!Number.isInteger(cch) || cch < 0) {
    throw new Error(`SST parse error: invalid character count: ${cch}`);
  }

  const state: { highByte: boolean; remainingChars: number; out: string } = { highByte: initialHighByte, remainingChars: cch, out: "" };

  while (state.remainingChars > 0) {
    const bytesPerChar = state.highByte ? 2 : 1;
    const available = remainingBytes(cursor);
    const availableChars = Math.floor(available / bytesPerChar);

    if (availableChars === 0) {
      if (available !== 0) {
        throw new Error("SST parse error: string data split mid-code-unit");
      }
      state.highByte = readContinuationEncodingFlag(cursor);
      continue;
    }

    const toRead = Math.min(state.remainingChars, availableChars);
    if (state.highByte) {
      for (let i = 0; i < toRead; i++) {
        state.out += String.fromCharCode(readUint16LE(cursor));
      }
    } else {
      for (let i = 0; i < toRead; i++) {
        state.out += String.fromCharCode(readUint8(cursor));
      }
    }
    state.remainingChars -= toRead;
  }

  return state.out;
}

function parseUnicodeString(cursor: FragmentCursor): string {
  const cch = readUint16LE(cursor);
  const grbit = readUint8(cursor);

  const fHighByte = (grbit & 0x01) !== 0;
  const fExtSt = (grbit & 0x04) !== 0;
  const fRichSt = (grbit & 0x08) !== 0;

  const cRun = fRichSt ? readUint16LE(cursor) : 0;
  const cbExtRst = fExtSt ? readUint32LE(cursor) : 0;

  const value = readStringChars(cursor, cch, fHighByte);

  // formatting runs (4 bytes each)
  if (cRun > 0) {
    skipBytes(cursor, cRun * 4);
  }
  if (cbExtRst > 0) {
    skipBytes(cursor, cbExtRst);
  }

  return value;
}

/**
 * Parse an SST (0x00FC) record.
 *
 * @param data SST payload (starts at cstTotal)
 * @param continues CONTINUE payloads (each starts at its own payload offset 0)
 */
export function parseSstRecord(data: Uint8Array, continues: readonly Uint8Array[], ctx: XlsParseContext = { mode: "strict" }): SstRecord {
  if (data.length < 8) {
    try {
      throw new Error(`Invalid SST payload length: ${data.length} (expected >= 8)`);
    } catch (err) {
      warnOrThrow(
        ctx,
        { code: "SST_TRUNCATED", where: "SST", message: "SST header is truncated; treating shared strings as empty.", meta: { dataLength: data.length } },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
    return { totalCount: 0, uniqueCount: 0, strings: [] };
  }
  const fragments: Uint8Array[] = [data, ...continues];
  const cursor: FragmentCursor = { fragments, fragmentIndex: 0, offset: 0 };

  const totalCount = readUint32LE(cursor);
  const uniqueCount = readUint32LE(cursor);

  const strings: string[] = [];
  for (let i = 0; i < uniqueCount; i++) {
    try {
      strings.push(parseUnicodeString(cursor));
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "SST_TRUNCATED",
          where: "SST",
          message: `SST is truncated; returning ${strings.length} strings out of declared uniqueCount=${uniqueCount}.`,
          meta: { uniqueCount, parsed: strings.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
      break;
    }
  }

  return { totalCount, uniqueCount, strings };
}
