/**
 * @file BIFF helpers for generating XLS fixtures.
 */

export const BIFF_RECORD_TYPES = {
  // Foundation
  BOF: 0x0809,
  EOF: 0x000a,
  CONTINUE: 0x003c,

  // Workbook globals
  BOUNDSHEET: 0x0085,
  SST: 0x00fc,
  FONT: 0x0231,
  FORMAT: 0x041e,
  XF: 0x00e0,
  STYLE: 0x0293,
  PALETTE: 0x0092,
  DATEMODE: 0x0022,

  // Sheet structure
  DIMENSIONS: 0x0200,
  ROW: 0x0208,
  COLINFO: 0x007d,
  DEFCOLWIDTH: 0x0055,
  DEFAULTROWHEIGHT: 0x0225,
  MERGECELLS: 0x00e5,

  // Cell records
  BLANK: 0x0201,
  MULBLANK: 0x00be,
  NUMBER: 0x0203,
  RK: 0x007e,
  MULRK: 0x00bd,
  LABELSST: 0x00fd,
  BOOLERR: 0x0205,
  FORMULA: 0x0006,
  STRING: 0x0207,
} as const;

/** Write a UInt16LE value into the given view. */
export function u16le(view: DataView, offset: number, v: number): void {
  view.setUint16(offset, v, true);
}

/** Write a UInt32LE value into the given view. */
export function u32le(view: DataView, offset: number, v: number): void {
  view.setUint32(offset, v >>> 0, true);
}

/** Write a UInt64LE value into the given view. */
export function u64le(view: DataView, offset: number, v: bigint): void {
  view.setBigUint64(offset, v, true);
}

/** Concatenate multiple byte chunks into one Uint8Array. */
export function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(length);
  chunks.reduce((offset, chunk) => {
    out.set(chunk, offset);
    return offset + chunk.length;
  }, 0);
  return out;
}

/** Create a BIFF record: 4-byte header + payload. */
export function makeRecordBytes(type: number, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + payload.length);
  const view = new DataView(out.buffer);
  u16le(view, 0, type);
  u16le(view, 2, payload.length);
  out.set(payload, 4);
  return out;
}

/** Create a BOF record payload for the given substream type. */
export function makeBofPayload(substreamType: number): Uint8Array {
  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);
  u16le(view, 0, 0x0600);
  u16le(view, 2, substreamType);
  u16le(view, 4, 0);
  u16le(view, 6, 0);
  u32le(view, 8, 0);
  u32le(view, 12, 0x0600);
  return out;
}

/** Create a BOUNDSHEET record payload. */
export function makeBoundsheetPayload(args: {
  readonly lbPlyPos: number;
  readonly hiddenState: 0 | 1 | 2;
  readonly sheetType: 0 | 1 | 2 | 6;
  readonly name: string;
}): Uint8Array {
  // BOUNDSHEET uses a 1-byte cch and ShortUnicodeString with 1-byte flags (we generate compressed ASCII only).
  const name = args.name;
  const cch = name.length;
  if (cch > 255) {
    throw new Error(`BOUNDSHEET name too long: ${cch} (max 255)`);
  }
  const nameBytes = new Uint8Array(1 + cch);
  nameBytes[0] = 0x00; // compressed
  for (let i = 0; i < cch; i++) {
    const codeUnit = name.charCodeAt(i);
    if (codeUnit > 0xff) {
      throw new Error(`BOUNDSHEET name must be ASCII for this generator (got 0x${codeUnit.toString(16)})`);
    }
    nameBytes[1 + i] = codeUnit;
  }

  const payload = new Uint8Array(7 + nameBytes.length);
  const view = new DataView(payload.buffer);
  u32le(view, 0, args.lbPlyPos);
  const grbit = (args.hiddenState & 0x03) | ((args.sheetType & 0xff) << 8);
  u16le(view, 4, grbit);
  payload[6] = cch;
  payload.set(nameBytes, 7);
  return payload;
}

/** Create an SST record payload from a list of strings. */
export function makeSstPayload(strings: readonly { readonly text: string; readonly highByte?: boolean }[]): Uint8Array {
  const header = new Uint8Array(8);
  const view = new DataView(header.buffer);
  u32le(view, 0, strings.length);
  u32le(view, 4, strings.length);

  const encoded = strings.map(({ text, highByte }) => {
    const cch = text.length;
    const usesHighByte = highByte ?? false;
    const bytes = new Uint8Array(2 + 1 + (usesHighByte ? cch * 2 : cch));
    const v = new DataView(bytes.buffer);
    u16le(v, 0, cch);
    bytes[2] = usesHighByte ? 0x01 : 0x00;
    if (usesHighByte) {
      for (let i = 0; i < cch; i++) {
        u16le(v, 3 + i * 2, text.charCodeAt(i));
      }
      return bytes;
    }

    for (let i = 0; i < cch; i++) {
      const codeUnit = text.charCodeAt(i);
      if (codeUnit > 0xff) {
        throw new Error(`SST compressed string must be ASCII in this generator (got 0x${codeUnit.toString(16)})`);
      }
      bytes[3 + i] = codeUnit;
    }
    return bytes;
  });

  return concat([header, ...encoded]);
}

/** Create a LABELSST record payload. */
export function makeLabelSstPayload(args: { readonly row: number; readonly col: number; readonly xfIndex: number; readonly sstIndex: number }): Uint8Array {
  const payload = new Uint8Array(10);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.col);
  u16le(view, 4, args.xfIndex);
  u32le(view, 6, args.sstIndex);
  return payload;
}

/** Create a NUMBER record payload. */
export function makeNumberPayload(args: { readonly row: number; readonly col: number; readonly xfIndex: number; readonly value: number }): Uint8Array {
  const payload = new Uint8Array(14);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.col);
  u16le(view, 4, args.xfIndex);
  view.setFloat64(6, args.value, true);
  return payload;
}

/** Encode an RK value from an integer. */
export function encodeRkFromInt(value: number, div100: boolean): number {
  const flags = 0x02 | (div100 ? 0x01 : 0x00);
  return ((value << 2) | flags) >>> 0;
}

/** Encode an RK value from a floating-point number (stored as IEEE 754 double). */
export function encodeRkFromFloat(value: number, div100: boolean): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, true);
  const highDword = view.getUint32(4, true) & 0xfffffffc;
  return (highDword | (div100 ? 0x01 : 0x00)) >>> 0;
}

/** Create an RK record payload. */
export function makeRkPayload(args: { readonly row: number; readonly col: number; readonly xfIndex: number; readonly rk: number }): Uint8Array {
  const payload = new Uint8Array(10);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.col);
  u16le(view, 4, args.xfIndex);
  u32le(view, 6, args.rk);
  return payload;
}

/** Create a MULRK record payload. */
export function makeMulrkPayload(args: { readonly row: number; readonly colFirst: number; readonly rkCells: readonly { readonly xfIndex: number; readonly rk: number }[] }): Uint8Array {
  const count = args.rkCells.length;
  if (count === 0) {
    throw new Error("MULRK requires at least 1 cell");
  }
  const colLast = args.colFirst + count - 1;
  const payload = new Uint8Array(2 + 2 + count * 6 + 2);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.colFirst);
  for (let i = 0; i < count; i++) {
    const cell = args.rkCells[i];
    const base = 4 + i * 6;
    u16le(view, base, cell?.xfIndex ?? 0);
    u32le(view, base + 2, cell?.rk ?? 0);
  }
  u16le(view, payload.length - 2, colLast);
  return payload;
}

/** Create a BLANK record payload. */
export function makeBlankPayload(args: { readonly row: number; readonly col: number; readonly xfIndex: number }): Uint8Array {
  const payload = new Uint8Array(6);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.col);
  u16le(view, 4, args.xfIndex);
  return payload;
}

/** Create a MULBLANK record payload. */
export function makeMulblankPayload(args: { readonly row: number; readonly colFirst: number; readonly xfIndexes: readonly number[] }): Uint8Array {
  if (args.xfIndexes.length === 0) {
    throw new Error("MULBLANK requires at least 1 xfIndex");
  }
  const colLast = args.colFirst + args.xfIndexes.length - 1;
  const payload = new Uint8Array(2 + 2 + args.xfIndexes.length * 2 + 2);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.colFirst);
  for (let i = 0; i < args.xfIndexes.length; i++) {
    u16le(view, 4 + i * 2, args.xfIndexes[i] ?? 0);
  }
  u16le(view, payload.length - 2, colLast);
  return payload;
}

/** Create a BOOLERR record payload. */
export function makeBoolerrPayload(args: {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
  readonly kind: "boolean" | "error";
  readonly value: number;
}): Uint8Array {
  const payload = new Uint8Array(8);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.col);
  u16le(view, 4, args.xfIndex);
  payload[6] = args.value & 0xff;
  payload[7] = args.kind === "error" ? 1 : 0;
  return payload;
}

/** Create a FORMULA record payload (cached result + tokens). */
export function makeFormulaPayload(args: {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
  readonly cached: { readonly kind: "number"; readonly value: number } | { readonly kind: "string" } | { readonly kind: "boolean"; readonly value: boolean } | { readonly kind: "error"; readonly errorCode: number };
  readonly tokens: Uint8Array;
}): Uint8Array {
  const out = new Uint8Array(22 + args.tokens.length);
  const view = new DataView(out.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.col);
  u16le(view, 4, args.xfIndex);

  const numBytes = new Uint8Array(8);
  const numView = new DataView(numBytes.buffer);
  if (args.cached.kind === "number") {
    numView.setFloat64(0, args.cached.value, true);
  } else {
    // non-number marker: bytes 6..7 = 0xFFFF
    numView.setUint16(6, 0xffff, true);
    if (args.cached.kind === "string") {
      numBytes[0] = 0; // ot=string
    } else if (args.cached.kind === "boolean") {
      numBytes[0] = 1; // ot=bool
      numBytes[2] = args.cached.value ? 1 : 0;
    } else {
      numBytes[0] = 2; // ot=error
      numBytes[2] = args.cached.errorCode & 0xff;
    }
  }
  out.set(numBytes, 6);

  u16le(view, 14, 0); // grbit
  u32le(view, 16, 0); // chn
  u16le(view, 20, args.tokens.length);
  out.set(args.tokens, 22);
  return out;
}

/** Create a STRING record payload. */
export function makeStringPayload(text: string, highByte: boolean): Uint8Array {
  const cch = text.length;
  const payload = new Uint8Array(3 + (highByte ? cch * 2 : cch));
  const view = new DataView(payload.buffer);
  u16le(view, 0, cch);
  payload[2] = highByte ? 1 : 0;
  if (highByte) {
    for (let i = 0; i < cch; i++) {
      u16le(view, 3 + i * 2, text.charCodeAt(i));
    }
    return payload;
  }
  for (let i = 0; i < cch; i++) {
    const codeUnit = text.charCodeAt(i);
    if (codeUnit > 0xff) {
      throw new Error(`STRING compressed payload must be ASCII for this generator (got 0x${codeUnit.toString(16)})`);
    }
    payload[3 + i] = codeUnit;
  }
  return payload;
}

/** Create a DIMENSIONS record payload. */
export function makeDimensionsPayload(args: { readonly firstRow: number; readonly lastRowExclusive: number; readonly firstCol: number; readonly lastColExclusive: number }): Uint8Array {
  const payload = new Uint8Array(14);
  const view = new DataView(payload.buffer);
  u32le(view, 0, args.firstRow);
  u32le(view, 4, args.lastRowExclusive);
  u16le(view, 8, args.firstCol);
  u16le(view, 10, args.lastColExclusive);
  u16le(view, 12, 0);
  return payload;
}

/** Create a ROW record payload. */
export function makeRowPayload(args: { readonly row: number; readonly colMic: number; readonly colMac: number; readonly miyRw: number; readonly xfIndex: number }): Uint8Array {
  const payload = new Uint8Array(16);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.row);
  u16le(view, 2, args.colMic);
  u16le(view, 4, args.colMac);
  u16le(view, 6, args.miyRw);
  // reserved 8..11
  u16le(view, 12, 0x0080); // grbit: hasDefaultFormat
  u16le(view, 14, args.xfIndex);
  return payload;
}

/** Create a COLINFO record payload. */
export function makeColinfoPayload(args: { readonly colFirst: number; readonly colLast: number; readonly width256: number; readonly xfIndex: number; readonly grbit: number }): Uint8Array {
  const payload = new Uint8Array(12);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.colFirst);
  u16le(view, 2, args.colLast);
  u16le(view, 4, args.width256);
  u16le(view, 6, args.xfIndex);
  u16le(view, 8, args.grbit);
  u16le(view, 10, 0);
  return payload;
}

/** Create a DEFCOLWIDTH record payload. */
export function makeDefcolwidthPayload(defaultCharWidth: number): Uint8Array {
  const payload = new Uint8Array(2);
  const view = new DataView(payload.buffer);
  u16le(view, 0, defaultCharWidth);
  return payload;
}

/** Create a DEFAULTROWHEIGHT record payload. */
export function makeDefaultrowheightPayload(args: { readonly flags: number; readonly miyRw: number }): Uint8Array {
  const payload = new Uint8Array(4);
  const view = new DataView(payload.buffer);
  u16le(view, 0, args.flags);
  u16le(view, 2, args.miyRw);
  return payload;
}

/** Create a MERGECELLS record payload. */
export function makeMergecellsPayload(ranges: readonly { readonly firstRow: number; readonly lastRow: number; readonly firstCol: number; readonly lastCol: number }[]): Uint8Array {
  const payload = new Uint8Array(2 + ranges.length * 8);
  const view = new DataView(payload.buffer);
  u16le(view, 0, ranges.length);
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const base = 2 + i * 8;
    u16le(view, base, r?.firstRow ?? 0);
    u16le(view, base + 2, r?.lastRow ?? 0);
    u16le(view, base + 4, r?.firstCol ?? 0);
    u16le(view, base + 6, r?.lastCol ?? 0);
  }
  return payload;
}

/** Create a DATEMODE record payload (1900/1904 date system). */
export function makeDatemodePayload(use1904: boolean): Uint8Array {
  const payload = new Uint8Array(2);
  const view = new DataView(payload.buffer);
  u16le(view, 0, use1904 ? 1 : 0);
  return payload;
}

/** Create a PALETTE record payload. */
export function makePalettePayload(rgbColors: readonly { readonly r: number; readonly g: number; readonly b: number }[]): Uint8Array {
  const payload = new Uint8Array(2 + rgbColors.length * 4);
  const view = new DataView(payload.buffer);
  u16le(view, 0, rgbColors.length);
  for (let i = 0; i < rgbColors.length; i++) {
    const c = rgbColors[i];
    const base = 2 + i * 4;
    payload[base] = c?.r ?? 0;
    payload[base + 1] = c?.g ?? 0;
    payload[base + 2] = c?.b ?? 0;
    payload[base + 3] = 0;
  }
  return payload;
}

/** Create a FONT record payload (simple compressed ASCII font name). */
export function makeFontPayload(name: string): Uint8Array {
  const nameBytes = new Uint8Array(1 + name.length);
  nameBytes[0] = 0x00; // compressed
  for (let i = 0; i < name.length; i++) {
    const codeUnit = name.charCodeAt(i);
    if (codeUnit > 0xff) {
      throw new Error(`FONT name must be ASCII for this generator (got 0x${codeUnit.toString(16)})`);
    }
    nameBytes[1 + i] = codeUnit;
  }

  const out = new Uint8Array(15 + nameBytes.length);
  const view = new DataView(out.buffer);
  u16le(view, 0, 200); // dyHeight=10pt
  u16le(view, 2, 0x0002); // italic
  u16le(view, 4, 0x0008); // icv: black
  u16le(view, 6, 700); // bold-ish
  u16le(view, 8, 0); // script
  out[10] = 1; // underline single
  out[11] = 2; // family
  out[12] = 0; // charset
  out[13] = 0;
  out[14] = name.length;
  out.set(nameBytes, 15);
  return out;
}

/** Create a FORMAT record payload (compressed ASCII format code). */
export function makeFormatPayload(formatIndex: number, formatCode: string): Uint8Array {
  const bytes = new Uint8Array(Array.from(formatCode).map((c) => c.charCodeAt(0)));
  const out = new Uint8Array(5 + bytes.length);
  const view = new DataView(out.buffer);
  u16le(view, 0, formatIndex);
  u16le(view, 2, formatCode.length);
  out[4] = 0x00; // compressed
  out.set(bytes, 5);
  return out;
}

/** Create an XF record payload. */
export function makeXfPayload(args: { readonly fontIndex: number; readonly formatIndex: number; readonly isStyle: boolean; readonly parentXfIndex: number }): Uint8Array {
  const out = new Uint8Array(20);
  const view = new DataView(out.buffer);
  u16le(view, 0, args.fontIndex); // ifnt
  u16le(view, 2, args.formatIndex); // ifmt
  const fStyleBit = args.isStyle ? 0x0004 : 0x0000;
  u16le(view, 4, 0x0001 | fStyleBit | ((args.parentXfIndex & 0x0fff) << 4)); // locked + style + parent
  // align: horizontal=2 (center), wrap=1, vertical=1
  u16le(view, 6, 0x001a);
  // indent=1 + apply flags (font/align/border/pattern/protection/numFmt)
  u16le(view, 8, 0xfc01);
  // border: left=0, right=1, top=2, bottom=3
  u16le(view, 10, 0x3210);
  u32le(view, 12, 0);
  const fillRaw = (0x01 << 26) | (0x09 << 7) | 0x0a; // solid, icvBack=9, icvFore=10
  u32le(view, 16, fillRaw);
  return out;
}

/** Create a built-in STYLE record payload. */
export function makeStylePayloadBuiltIn(args: { readonly styleXfIndex: number; readonly builtInStyleId: number; readonly outlineLevel: number }): Uint8Array {
  const out = new Uint8Array(4);
  const view = new DataView(out.buffer);
  u16le(view, 0, 0x8000 | (args.styleXfIndex & 0x0fff));
  out[2] = args.builtInStyleId & 0xff;
  out[3] = args.outlineLevel & 0xff;
  return out;
}
