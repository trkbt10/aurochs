/**
 * @file SPRM (Single Property Modifier) decoder
 *
 * Reference: [MS-DOC] 2.6.1
 *
 * SPRM opcode is a 2-byte little-endian uint16:
 *   bits 0-8:   ispmd  (property identifier)
 *   bit 9:      fSpec  (special processing flag)
 *   bits 10-12: sgc    (property class: 1=para, 2=char, 3=pic, 4=section, 5=table)
 *   bits 13-15: spra   (operand size specifier)
 *
 * A Prl (Property List Entry) = [Sprm(2B)][Operand(nB)]
 * grpprl = array of Prl entries, read sequentially until end of buffer.
 */

/** Decoded SPRM opcode fields. */
export type SprmOpcode = {
  /** Raw 2-byte opcode value */
  readonly raw: number;
  /** Property identifier (9 bits) */
  readonly ispmd: number;
  /** Special processing flag */
  readonly fSpec: boolean;
  /** Property class: 1=para, 2=char, 3=pic, 4=section, 5=table */
  readonly sgc: number;
  /** Operand size specifier (3 bits) */
  readonly spra: number;
};

/** A decoded SPRM with its operand bytes. */
export type Sprm = {
  readonly opcode: SprmOpcode;
  /** Raw operand bytes (length depends on spra) */
  readonly operand: Uint8Array;
};

/** Decode SPRM opcode from a 2-byte value. */
export function decodeSprmOpcode(raw: number): SprmOpcode {
  return {
    raw,
    ispmd: raw & 0x01ff,
    fSpec: ((raw >> 9) & 1) !== 0,
    sgc: (raw >> 10) & 7,
    spra: (raw >> 13) & 7,
  };
}

/**
 * SPRMs that use 2-byte size prefix instead of 1-byte for variable-length (spra=6).
 * sprmTDefTable (0xD608) and sprmPChgTabs (0xC615)
 */
const VARIABLE_2BYTE_SIZE_SPRMS = new Set([0xd608, 0xc615]);

/** Get the operand size for a SPRM based on its spra value. */
export function getOperandSize(spra: number, raw: number, data: Uint8Array, offset: number): number {
  switch (spra) {
    case 0:
      return 1; // ToggleOperand
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 4;
    case 4:
      return 2;
    case 5:
      return 2;
    case 6: {
      // Variable-length: first byte (or 2 bytes for exceptions) is size
      if (VARIABLE_2BYTE_SIZE_SPRMS.has(raw)) {
        if (offset >= data.length) return 0;
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        return offset + 1 < data.length ? view.getUint16(offset, true) + 2 : 0;
      }
      return offset < data.length ? data[offset] + 1 : 0; // +1 for size byte itself
    }
    case 7:
      return 3;
    default:
      return 0;
  }
}

/** Parse a grpprl (array of Prl entries) from a byte buffer. */
export function parseGrpprl(data: Uint8Array): readonly Sprm[] {
  const result: Sprm[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = 0;

  while (offset + 2 <= data.length) {
    const raw = view.getUint16(offset, true);
    const opcode = decodeSprmOpcode(raw);
    offset += 2;

    const operandSize = getOperandSize(opcode.spra, raw, data, offset);
    if (operandSize <= 0 || offset + operandSize > data.length) {
      break;
    }

    const operand = data.subarray(offset, offset + operandSize);
    result.push({ opcode, operand });
    offset += operandSize;
  }

  return result;
}

/** Read a SPRM's operand as a uint8. */
export function sprmUint8(sprm: Sprm): number {
  return sprm.operand[0];
}

/** Read a SPRM's operand as a uint16 (little-endian). */
export function sprmUint16(sprm: Sprm): number {
  const view = new DataView(sprm.operand.buffer, sprm.operand.byteOffset, sprm.operand.byteLength);
  return view.getUint16(0, true);
}

/** Read a SPRM's operand as an int16 (little-endian). */
export function sprmInt16(sprm: Sprm): number {
  const view = new DataView(sprm.operand.buffer, sprm.operand.byteOffset, sprm.operand.byteLength);
  return view.getInt16(0, true);
}

/** Read a SPRM's operand as a uint32 (little-endian). */
export function sprmUint32(sprm: Sprm): number {
  const view = new DataView(sprm.operand.buffer, sprm.operand.byteOffset, sprm.operand.byteLength);
  return view.getUint32(0, true);
}

/** Read a SPRM's operand as an int32 (little-endian). */
export function sprmInt32(sprm: Sprm): number {
  const view = new DataView(sprm.operand.buffer, sprm.operand.byteOffset, sprm.operand.byteLength);
  return view.getInt32(0, true);
}

/**
 * Interpret ToggleOperand (spra=0, 1-byte).
 * - 0x00 = OFF (explicit)
 * - 0x01 = ON (explicit)
 * - 0x80 = inherit from style + toggle
 * - 0x81 = inherit from style (as-is)
 *
 * For simplicity, we treat 0x00 as false, anything else as true.
 */
export function sprmToggle(sprm: Sprm): boolean {
  return sprm.operand[0] !== 0;
}

/** SPRM opcode constants for character properties. */
export const SPRM_CHP = {
  CFBold: 0x0835,
  CFItalic: 0x0836,
  CFStrike: 0x0837,
  CFOutline: 0x0838,
  CFShadow: 0x0839,
  CFSmallCaps: 0x083a,
  CFCaps: 0x083b,
  CFVanish: 0x083c,
  CFSpec: 0x0855,
  CFEmboss: 0x0858,
  CFImprint: 0x0854,
  CFDStrike: 0x2a53,
  CKul: 0x2a3e,
  CIco: 0x2a42,
  CIss: 0x2a48,
  CHighlight: 0x2a0c,
  CHps: 0x4a43,
  CRgFtc0: 0x4a4f,
  CRgFtc1: 0x4a50,
  CRgFtc2: 0x4a51,
  CFtcBi: 0x4a5e,
  CHpsBi: 0x4a61,
  CDxaSpace: 0x8840,
  CHpsKern: 0x484b,
  CCv: 0x6870,
  CCvUl: 0x6877,
  CPicLocation: 0x6a03,
  CFObj: 0x0856,
  CFOle2: 0x085a,
} as const;

/** SPRM opcode constants for paragraph properties. */
export const SPRM_PAP = {
  PJc80: 0x2403,
  PJc: 0x2461,
  PFKeep: 0x2405,
  PFKeepFollow: 0x2406,
  PFPageBreakBefore: 0x2407,
  PFInTable: 0x2416,
  PFTtp: 0x2417,
  PFWidowControl: 0x2431,
  PIlvl: 0x260a,
  POutLvl: 0x2640,
  PFDyaBeforeAuto: 0x245b,
  PFDyaAfterAuto: 0x245c,
  PIlfo: 0x460b,
  PDxaLeft80: 0x840f,
  PDxaLeft: 0x845e,
  PDxaRight80: 0x840e,
  PDxaRight: 0x845d,
  PDxaLeft180: 0x8411,
  PDxaLeft1: 0x8460,
  PDyaBefore: 0xa413,
  PDyaAfter: 0xa414,
  PDyaLine: 0x6412,
  PItap: 0x6649,
  // Legacy borders (BRC80, spra=3, 4B)
  PBrcTop80: 0x6424,
  PBrcLeft80: 0x6425,
  PBrcBottom80: 0x6426,
  PBrcRight80: 0x6427,
  PBrcBetween80: 0x6428,
  PBrcBar80: 0x6629,
  // Modern borders (BRC, spra=6, variable)
  PBrcTop: 0xc64e,
  PBrcLeft: 0xc64f,
  PBrcBottom: 0xc650,
  PBrcRight: 0xc651,
  PBrcBetween: 0xc652,
  PBrcBar: 0xc653,
  // Shading
  PShd80: 0x4622,
  PShd: 0xc64d,
  // Tab stops
  PChgTabsPapx: 0xc615,
} as const;

/** SPRM opcode constants for section properties. */
export const SPRM_SEP = {
  SBkc: 0x3009,
  SFTitlePage: 0x300a,
  SBOrientation: 0x301d,
  SCcolumns: 0x500b,
  SDxaColumns: 0x900c,
  SDyaTop: 0x9023,
  SDyaBottom: 0x9024,
  SXaPage: 0xb01f,
  SYaPage: 0xb020,
  SDxaLeft: 0xb021,
  SDxaRight: 0xb022,
  SDzaGutter: 0xb025,
  SDyaHdrTop: 0xb017,
  SDyaHdrBottom: 0xb018,
  // Line numbering
  SLnc: 0x3013,
  SNLnnMod: 0x5009,
  SDxaLnn: 0x9010,
  SLnnMin: 0x501b,
  // Page numbering
  SNfcPgn: 0x300e,
  SPgnStart97: 0x501c,
  SFPgnRestart: 0x3011,
  // Vertical alignment
  SVjc: 0x301a,
} as const;

/** SPRM opcode constants for table properties. */
export const SPRM_TAP = {
  TDefTable: 0xd608,
  TJc: 0x548a,
  TDyaRowHeight: 0x9407,
  TTableHeader: 0x3404,
  TMerge: 0x5624,
  TVertMerge: 0xd62b,
  TTableBorders: 0xd613,
  TDefTableShd: 0xd612,
  TVertAlign: 0xd62c,
} as const;

/** Kul (underline style) enum values. */
export const KUL = {
  None: 0,
  Single: 1,
  WordsOnly: 2,
  Double: 3,
  Dotted: 4,
  Thick: 6,
  Dash: 7,
  DotDash: 9,
  DotDotDash: 10,
  Wave: 11,
} as const;

/** Ico (16-color index) → RGB hex mapping. */
export const ICO_COLORS: readonly (string | undefined)[] = [
  undefined, // 0 = auto
  "000000",  // 1 = black
  "0000FF",  // 2 = blue
  "00FFFF",  // 3 = cyan
  "00FF00",  // 4 = green
  "FF00FF",  // 5 = magenta
  "FF0000",  // 6 = red
  "FFFF00",  // 7 = yellow
  "FFFFFF",  // 8 = white
  "000080",  // 9 = dark blue
  "008080",  // 10 = dark cyan
  "008000",  // 11 = dark green
  "800080",  // 12 = dark magenta
  "800000",  // 13 = dark red
  "808000",  // 14 = dark yellow
  "808080",  // 15 = dark gray
  "C0C0C0",  // 16 = light gray
];

/** Convert a COLORREF (4 bytes: R,G,B,0) to hex string "RRGGBB". */
export function colorRefToHex(sprm: Sprm): string {
  const r = sprm.operand[0];
  const g = sprm.operand[1];
  const b = sprm.operand[2];
  return (
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  ).toUpperCase();
}
