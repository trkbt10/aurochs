/**
 * @file Minimal CFF CID-keyed charset parser.
 */

type CffIndex = Readonly<{
  count: number;
  dataStart: number;
  offsets: readonly number[];
  nextOffset: number;
}>;

type CffDictOperator = Readonly<{
  key: string;
  operands: readonly number[];
}>;

type CffCidCharsetParseResult = Readonly<{
  gidToCid: ReadonlyMap<number, number>;
  glyphCount: number;
  ros?: Readonly<{
    registrySid: number;
    orderingSid: number;
    supplement: number;
    registry?: string;
    ordering?: string;
  }>;
}>;

const CFF_CUSTOM_STRING_BASE_SID = 391;

function readUIntBE(data: Uint8Array, offset: number, byteLength: number): number {
  if (byteLength <= 0 || byteLength > 4) {
    return NaN;
  }
  if (offset < 0 || offset + byteLength > data.length) {
    return NaN;
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (byteLength === 1) {
    return view.getUint8(offset);
  }
  if (byteLength === 2) {
    return view.getUint16(offset, false);
  }
  if (byteLength === 3) {
    return (view.getUint8(offset) << 16) | view.getUint16(offset + 1, false);
  }
  return view.getUint32(offset, false);
}

function parseCffIndex(data: Uint8Array, offset: number): CffIndex | null {
  if (offset < 0 || offset + 2 > data.length) {
    return null;
  }

  const count = readUIntBE(data, offset, 2);
  if (!Number.isInteger(count) || count < 0) {
    return null;
  }
  if (count === 0) {
    return {
      count: 0,
      dataStart: offset + 2,
      offsets: [],
      nextOffset: offset + 2,
    };
  }

  const offSizeOffset = offset + 2;
  const offSize = readUIntBE(data, offSizeOffset, 1);
  if (!Number.isInteger(offSize) || offSize < 1 || offSize > 4) {
    return null;
  }

  const offsetsStart = offSizeOffset + 1;
  const offsetsByteLength = (count + 1) * offSize;
  if (offsetsStart + offsetsByteLength > data.length) {
    return null;
  }

  const offsets = Array.from({ length: count + 1 }, (_, i) =>
    readUIntBE(data, offsetsStart + i * offSize, offSize)
  );
  const firstOffset = offsets[0];
  const lastOffset = offsets[offsets.length - 1];
  if (
    !Number.isInteger(firstOffset) ||
    !Number.isInteger(lastOffset) ||
    firstOffset < 1 ||
    lastOffset < firstOffset
  ) {
    return null;
  }

  const dataStart = offsetsStart + offsetsByteLength;
  const dataLength = lastOffset - 1;
  const nextOffset = dataStart + dataLength;
  if (nextOffset > data.length) {
    return null;
  }

  return {
    count,
    dataStart,
    offsets,
    nextOffset,
  };
}

function extractIndexObjectBytes(data: Uint8Array, index: CffIndex, objectIndex: number): Uint8Array | null {
  if (objectIndex < 0 || objectIndex >= index.count || index.offsets.length < objectIndex + 2) {
    return null;
  }
  const start = index.dataStart + index.offsets[objectIndex]! - 1;
  const end = index.dataStart + index.offsets[objectIndex + 1]! - 1;
  if (start < index.dataStart || end < start || end > data.length) {
    return null;
  }
  return data.subarray(start, end);
}

function readCffNumber(data: Uint8Array, offset: number): Readonly<{ value: number; nextOffset: number }> | null {
  if (offset >= data.length) {
    return null;
  }
  const b0 = data[offset]!;

  if (b0 >= 32 && b0 <= 246) {
    return { value: b0 - 139, nextOffset: offset + 1 };
  }
  if (b0 >= 247 && b0 <= 250) {
    if (offset + 2 > data.length) {
      return null;
    }
    const b1 = data[offset + 1]!;
    return { value: (b0 - 247) * 256 + b1 + 108, nextOffset: offset + 2 };
  }
  if (b0 >= 251 && b0 <= 254) {
    if (offset + 2 > data.length) {
      return null;
    }
    const b1 = data[offset + 1]!;
    return { value: -((b0 - 251) * 256) - b1 - 108, nextOffset: offset + 2 };
  }
  if (b0 === 28) {
    if (offset + 3 > data.length) {
      return null;
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { value: view.getInt16(offset + 1, false), nextOffset: offset + 3 };
  }
  if (b0 === 29) {
    if (offset + 5 > data.length) {
      return null;
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { value: view.getInt32(offset + 1, false), nextOffset: offset + 5 };
  }
  if (b0 === 30) {
    // Real number; skip tokens until end nibble 0xF
    for (let i = offset + 1; i < data.length; i += 1) {
      const byte = data[i]!;
      const low = byte & 0x0f;
      const high = byte >> 4;
      if (high === 0x0f || low === 0x0f) {
        return { value: NaN, nextOffset: i + 1 };
      }
    }
    return null;
  }

  return null;
}

function parseCffDict(dictData: Uint8Array): readonly CffDictOperator[] {
  const entries: CffDictOperator[] = [];
  const operands: number[] = [];
  for (let offset = 0; offset < dictData.length;) {
    const b0 = dictData[offset]!;
    const isOperator = b0 <= 21 && b0 !== 28;
    if (isOperator) {
      if (b0 === 12) {
        if (offset + 2 > dictData.length) {
          break;
        }
        const b1 = dictData[offset + 1]!;
        entries.push({ key: `12-${b1}`, operands: [...operands] });
        operands.length = 0;
        offset += 2;
        continue;
      }
      entries.push({ key: `${b0}`, operands: [...operands] });
      operands.length = 0;
      offset += 1;
      continue;
    }

    const parsed = readCffNumber(dictData, offset);
    if (!parsed) {
      break;
    }
    operands.push(parsed.value);
    offset = parsed.nextOffset;
  }
  return entries;
}

function decodeLatin1(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte & 0xff)).join("");
}

function parseCffStringIndex(data: Uint8Array, index: CffIndex): readonly string[] {
  if (index.count === 0) {
    return [];
  }

  const values: string[] = [];
  for (let i = 0; i < index.count; i += 1) {
    const bytes = extractIndexObjectBytes(data, index, i);
    if (!bytes) {
      return [];
    }
    values.push(decodeLatin1(bytes));
  }
  return values;
}

function resolveSidToString(sid: number, customStrings: readonly string[]): string | undefined {
  if (!Number.isInteger(sid)) {
    return undefined;
  }
  const customIndex = sid - CFF_CUSTOM_STRING_BASE_SID;
  if (customIndex < 0 || customIndex >= customStrings.length) {
    return undefined;
  }
  return customStrings[customIndex];
}

function parseCidRos(args: {
  readonly topEntries: readonly CffDictOperator[];
  readonly customStrings: readonly string[];
}): CffCidCharsetParseResult["ros"] | undefined {
  const { topEntries, customStrings } = args;

  for (let i = topEntries.length - 1; i >= 0; i -= 1) {
    const entry = topEntries[i];
    if (!entry || entry.key !== "12-30" || entry.operands.length < 3) {
      continue;
    }

    const registrySid = entry.operands[0];
    const orderingSid = entry.operands[1];
    const supplementRaw = entry.operands[2];
    if (
      registrySid === undefined ||
      orderingSid === undefined ||
      supplementRaw === undefined ||
      !Number.isFinite(registrySid) ||
      !Number.isFinite(orderingSid) ||
      !Number.isFinite(supplementRaw)
    ) {
      continue;
    }

    const supplement = Math.trunc(supplementRaw);
    if (supplement < 0) {
      continue;
    }

    return {
      registrySid: Math.trunc(registrySid),
      orderingSid: Math.trunc(orderingSid),
      supplement,
      registry: resolveSidToString(Math.trunc(registrySid), customStrings),
      ordering: resolveSidToString(Math.trunc(orderingSid), customStrings),
    };
  }

  return undefined;
}

function getLastOperand(entries: readonly CffDictOperator[], key: string): number | undefined {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (!entry || entry.key !== key || entry.operands.length === 0) {
      continue;
    }
    const value = entry.operands[entry.operands.length - 1];
    if (value !== undefined && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function parseCharsetFormat0(args: {
  readonly data: Uint8Array;
  readonly offset: number;
  readonly glyphCount: number;
}): ReadonlyMap<number, number> | null {
  const { data, offset, glyphCount } = args;
  const required = 1 + (glyphCount - 1) * 2;
  if (offset + required > data.length) {
    return null;
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const gidToCid = new Map<number, number>();
  gidToCid.set(0, 0);
  for (let gid = 1; gid < glyphCount; gid += 1) {
    const cid = view.getUint16(offset + 1 + (gid - 1) * 2, false);
    gidToCid.set(gid, cid);
  }
  return gidToCid;
}

function parseCharsetFormat1(args: {
  readonly data: Uint8Array;
  readonly offset: number;
  readonly glyphCount: number;
}): ReadonlyMap<number, number> | null {
  const { data, offset, glyphCount } = args;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const gidToCid = new Map<number, number>();
  gidToCid.set(0, 0);

  const state = { cursor: offset + 1, gid: 1 };
  while (state.gid < glyphCount) {
    if (state.cursor + 3 > data.length) {
      return null;
    }
    const first = view.getUint16(state.cursor, false);
    const nLeft = view.getUint8(state.cursor + 2);
    const takeCount = Math.min(nLeft + 1, glyphCount - state.gid);
    for (let i = 0; i < takeCount; i += 1) {
      gidToCid.set(state.gid + i, first + i);
    }
    state.gid += takeCount;
    state.cursor += 3;
  }

  return gidToCid;
}

function parseCharsetFormat2(args: {
  readonly data: Uint8Array;
  readonly offset: number;
  readonly glyphCount: number;
}): ReadonlyMap<number, number> | null {
  const { data, offset, glyphCount } = args;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const gidToCid = new Map<number, number>();
  gidToCid.set(0, 0);

  const state = { cursor: offset + 1, gid: 1 };
  while (state.gid < glyphCount) {
    if (state.cursor + 4 > data.length) {
      return null;
    }
    const first = view.getUint16(state.cursor, false);
    const nLeft = view.getUint16(state.cursor + 2, false);
    const takeCount = Math.min(nLeft + 1, glyphCount - state.gid);
    for (let i = 0; i < takeCount; i += 1) {
      gidToCid.set(state.gid + i, first + i);
    }
    state.gid += takeCount;
    state.cursor += 4;
  }

  return gidToCid;
}

function parseCidCharset(args: {
  readonly data: Uint8Array;
  readonly charsetOffset: number;
  readonly glyphCount: number;
}): ReadonlyMap<number, number> | null {
  const { data, charsetOffset, glyphCount } = args;
  if (glyphCount <= 0 || charsetOffset < 0 || charsetOffset >= data.length) {
    return null;
  }
  if (charsetOffset <= 2) {
    // Predefined charsets are for name-keyed fonts.
    return null;
  }

  const format = data[charsetOffset]!;
  if (format === 0) {
    return parseCharsetFormat0({ data, offset: charsetOffset, glyphCount });
  }
  if (format === 1) {
    return parseCharsetFormat1({ data, offset: charsetOffset, glyphCount });
  }
  if (format === 2) {
    return parseCharsetFormat2({ data, offset: charsetOffset, glyphCount });
  }
  return null;
}

/**
 * Parse CID-keyed CFF bytes and extract GID->CID map from charset.
 */
export function parseCffCidCharset(fontData: Uint8Array): CffCidCharsetParseResult | null {
  if (fontData.length < 4) {
    return null;
  }

  const headerSize = fontData[2]!;
  if (headerSize < 4 || headerSize >= fontData.length) {
    return null;
  }

  const nameIndex = parseCffIndex(fontData, headerSize);
  if (!nameIndex) {
    return null;
  }
  const topDictIndex = parseCffIndex(fontData, nameIndex.nextOffset);
  if (!topDictIndex || topDictIndex.count < 1) {
    return null;
  }
  const stringIndex = parseCffIndex(fontData, topDictIndex.nextOffset);
  if (!stringIndex) {
    return null;
  }
  const globalSubrIndex = parseCffIndex(fontData, stringIndex.nextOffset);
  if (!globalSubrIndex) {
    return null;
  }

  const customStrings = parseCffStringIndex(fontData, stringIndex);

  const topDictData = extractIndexObjectBytes(fontData, topDictIndex, 0);
  if (!topDictData) {
    return null;
  }
  const topEntries = parseCffDict(topDictData);
  const ros = parseCidRos({
    topEntries,
    customStrings,
  });
  const maybeCharsetOffset = getLastOperand(topEntries, "15");
  const maybeCharStringsOffset = getLastOperand(topEntries, "17");
  if (
    typeof maybeCharsetOffset !== "number" ||
    typeof maybeCharStringsOffset !== "number" ||
    !Number.isInteger(maybeCharsetOffset) ||
    !Number.isInteger(maybeCharStringsOffset)
  ) {
    return null;
  }
  const charsetOffset: number = maybeCharsetOffset;
  const charStringsOffset: number = maybeCharStringsOffset;
  if (charsetOffset <= 0 || charStringsOffset <= 0) {
    return null;
  }

  const charStringsIndex = parseCffIndex(fontData, charStringsOffset);
  if (!charStringsIndex || charStringsIndex.count <= 0) {
    return null;
  }
  const glyphCount = charStringsIndex.count;

  const gidToCid = parseCidCharset({
    data: fontData,
    charsetOffset,
    glyphCount,
  });
  if (!gidToCid || gidToCid.size === 0) {
    return null;
  }

  return {
    gidToCid,
    glyphCount,
    ros,
  };
}
