/**
 * @file BIFF XF record parser
 */

export type XfAlignment = {
  readonly horizontal: number;
  readonly vertical: number;
  readonly wrapText: boolean;
  /** Rotation code 0-180, 255=vertical */
  readonly rotation: number;
  readonly indent: number;
  readonly shrinkToFit: boolean;
  readonly mergeCells: boolean;
};

export type XfAttributes = {
  readonly hasNumberFormat: boolean;
  readonly hasFont: boolean;
  readonly hasAlignment: boolean;
  readonly hasBorder: boolean;
  readonly hasPattern: boolean;
  readonly hasProtection: boolean;
};

export type XfBorderStyles = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export type XfRecord = {
  readonly fontIndex: number;
  readonly formatIndex: number;
  readonly isStyle: boolean;
  readonly isLocked: boolean;
  readonly isHidden: boolean;
  /** Parent style XF index (0xFFF if style XF) */
  readonly parentXfIndex: number;
  readonly alignment: XfAlignment;
  readonly attributes: XfAttributes;
  readonly border: XfBorderStyles;
  /** Remaining border/fill bitfields (implementation deferred) */
  readonly raw: {
    readonly borderColorsAndDiag: number;
    readonly fillPatternAndColors: number;
  };
};

/** Parse a BIFF XF (0x00E0) record payload. */
export function parseXfRecord(data: Uint8Array): XfRecord {
  if (data.length !== 20 && data.length !== 16) {
    throw new Error(`Invalid XF payload length: ${data.length} (expected 16 or 20)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ifnt = view.getUint16(0, true);
  const ifmt = view.getUint16(2, true);
  const flags = view.getUint16(4, true);
  const align = view.getUint16(6, true);
  const indent = view.getUint16(8, true);
  const border = view.getUint16(10, true);
  const borderColorsAndDiag = view.getUint32(12, true);
  const fillPatternAndColors = data.length === 20 ? view.getUint32(16, true) : 0;

  const isLocked = (flags & 0x0001) !== 0;
  const isHidden = (flags & 0x0002) !== 0;
  const isStyle = (flags & 0x0004) !== 0;
  const parentXfIndex = isStyle ? 0x0fff : (flags >> 4) & 0x0fff;

  const horizontal = align & 0x0007;
  const wrapText = (align & 0x0008) !== 0;
  const vertical = (align >> 4) & 0x0007;
  const rotation = (align >> 8) & 0x00ff;

  const indentValue = indent & 0x000f;
  const shrinkToFit = (indent & 0x0010) !== 0;
  const mergeCells = (indent & 0x0020) !== 0;

  const hasNumberFormat = (indent & 0x0400) !== 0;
  const hasFont = (indent & 0x0800) !== 0;
  const hasAlignment = (indent & 0x1000) !== 0;
  const hasBorder = (indent & 0x2000) !== 0;
  const hasPattern = (indent & 0x4000) !== 0;
  const hasProtection = (indent & 0x8000) !== 0;

  return {
    fontIndex: ifnt,
    formatIndex: ifmt,
    isStyle,
    isLocked,
    isHidden,
    parentXfIndex,
    alignment: {
      horizontal,
      vertical,
      wrapText,
      rotation,
      indent: indentValue,
      shrinkToFit,
      mergeCells,
    },
    attributes: {
      hasNumberFormat,
      hasFont,
      hasAlignment,
      hasBorder,
      hasPattern,
      hasProtection,
    },
    border: {
      left: border & 0x000f,
      right: (border >> 4) & 0x000f,
      top: (border >> 8) & 0x000f,
      bottom: (border >> 12) & 0x000f,
    },
    raw: { borderColorsAndDiag, fillPatternAndColors },
  };
}
