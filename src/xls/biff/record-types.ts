/**
 * @file BIFF record type constants
 */

export const BIFF_RECORD_TYPES = {
  // Foundation
  BOF: 0x0809,
  EOF: 0x000a,
  CONTINUE: 0x003c,

  // Workbook globals
  BOUNDSHEET: 0x0085,
  SST: 0x00fc,
  EXTSST: 0x00ff,
  FONT: 0x0231,
  /**
   * Legacy/alternate FONT record id seen in some XLS generators.
   * Treated as FONT for parsing purposes.
   */
  FONT_LEGACY: 0x0031,
  FORMAT: 0x041e,
  XF: 0x00e0,
  STYLE: 0x0293,
  PALETTE: 0x0092,

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

  // Other
  CODEPAGE: 0x0042,
  COUNTRY: 0x008c,
  DATEMODE: 0x0022,
  WINDOW1: 0x003d,
  WINDOW2: 0x023e,
} as const;

export type BiffRecordType = (typeof BIFF_RECORD_TYPES)[keyof typeof BIFF_RECORD_TYPES];
