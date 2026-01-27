/**
 * @file BIFF STRING record parser
 */

import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type StringRecord = {
  readonly text: string;
};

type FragmentCursor = {
  readonly fragments: readonly Uint8Array[];
  fragmentIndex: number;
  offset: number;
};

function currentFragment(cursor: FragmentCursor): Uint8Array {
  const fragment = cursor.fragments[cursor.fragmentIndex];
  if (!fragment) {
    throw new Error("STRING parse error: missing fragment");
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
    throw new Error("STRING parse error: unexpected end of CONTINUE fragments");
  }
}

function readUint8(cursor: FragmentCursor): number {
  if (remainingBytes(cursor) === 0) {
    advanceFragment(cursor);
  }
  const fragment = currentFragment(cursor);
  const value = fragment[cursor.offset];
  if (value === undefined) {
    throw new Error("STRING parse error: unexpected end of fragment");
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
  advanceFragment(cursor);
  const flag = readUint8(cursor);
  if (flag !== 0 && flag !== 1) {
    throw new Error(`STRING parse error: invalid CONTINUE string encoding flag: ${flag}`);
  }
  return flag === 1;
}

function readStringChars(cursor: FragmentCursor, cch: number, initialHighByte: boolean): string {
  const state: { highByte: boolean; remainingChars: number; out: string } = { highByte: initialHighByte, remainingChars: cch, out: "" };

  while (state.remainingChars > 0) {
    const bytesPerChar = state.highByte ? 2 : 1;
    const available = remainingBytes(cursor);
    const availableChars = Math.floor(available / bytesPerChar);

    if (availableChars === 0) {
      if (available !== 0) {
        throw new Error("STRING parse error: string data split mid-code-unit");
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

/**
 * Parse a BIFF STRING (0x0207) record data payload.
 *
 * Record data:
 * - cch: 2 bytes
 * - grbit: 1 byte (Unicode string option flags)
 * - rgch: char data
 */
export function parseStringRecord(
  data: Uint8Array,
  continues: readonly Uint8Array[] = [],
  ctx: XlsParseContext = { mode: "strict" },
): StringRecord {
  try {
    if (data.length < 3) {
      throw new Error(`Invalid STRING payload length: ${data.length} (expected >= 3)`);
    }

    const cursor: FragmentCursor = { fragments: [data, ...continues], fragmentIndex: 0, offset: 0 };

    const cch = readUint16LE(cursor);
    const grbit = readUint8(cursor);
    const allowedMask = 0x0d; // fHighByte | fExtSt | fRichSt
    if ((grbit & ~allowedMask) !== 0) {
      throw new Error(`Unsupported STRING grbit: 0x${grbit.toString(16)}`);
    }
    const fHighByte = (grbit & 0x01) !== 0;
    const fExtSt = (grbit & 0x04) !== 0;
    const fRichSt = (grbit & 0x08) !== 0;

    const cRun = fRichSt ? readUint16LE(cursor) : 0;
    const cbExtRst = fExtSt ? readUint32LE(cursor) : 0;

    const text = readStringChars(cursor, cch, fHighByte);

    if (cRun > 0) {
      skipBytes(cursor, cRun * 4);
    }
    if (cbExtRst > 0) {
      skipBytes(cursor, cbExtRst);
    }

    return { text };
  } catch (err) {
    warnOrThrow(
      ctx,
      {
        code: "STRING_CONTINUE_TRUNCATED",
        where: "STRING",
        message: `STRING parse failed; returning empty string: ${err instanceof Error ? err.message : String(err)}`,
        meta: { dataLength: data.length, continues: continues.length },
      },
      err instanceof Error ? err : new Error(String(err)),
    );
    return { text: "" };
  }
}
