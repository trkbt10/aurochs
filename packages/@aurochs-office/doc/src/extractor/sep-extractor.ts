/**
 * @file Section property extractor
 *
 * Pipeline: PlcfSed → SEPX → SPRM → DocSection properties
 */

import type { DocSection, DocSectionBreakType, DocLineNumbering, DocPageNumberFormat } from "../domain/types";
import { parseGrpprl, type Sprm } from "../sprm/sprm-decoder";
import { SPRM_SEP, sprmUint8, sprmUint16, sprmInt16 } from "../sprm/sprm-decoder";

/** Parsed section descriptor from PlcfSed. */
export type SectionDescriptor = {
  readonly cpEnd: number;
  readonly fcSepx: number;
};

/** Parse PlcfSed from the table stream. */
export function parsePlcfSed(tableStream: Uint8Array, fc: number, lcb: number): readonly SectionDescriptor[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  // PlcfSed: CP array (n+1 × 4B) + Sed array (n × 12B)
  // size = (n+1)*4 + n*12 = 4 + 16*n → n = (lcb - 4) / 16
  const n = (lcb - 4) / 16;
  if (!Number.isInteger(n) || n <= 0) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const results: SectionDescriptor[] = [];

  for (let i = 0; i < n; i++) {
    const cpEnd = view.getInt32(fc + (i + 1) * 4, true);
    // Sed structure (12B): fn(2B) + fcSepx(4B) + fnMpr(2B) + fcMpr(4B)
    const sedOffset = fc + (n + 1) * 4 + i * 12;
    const fcSepx = view.getInt32(sedOffset + 2, true);
    results.push({ cpEnd, fcSepx });
  }

  return results;
}

/** Mutable section properties. */
type SepProps = {
  pageWidth?: number;
  pageHeight?: number;
  orientation?: "portrait" | "landscape";
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  gutter?: number;
  columns?: number;
  columnSpacing?: number;
  breakType?: DocSectionBreakType;
  titlePage?: boolean;
  headerDistance?: number;
  footerDistance?: number;
  lineNumbering?: DocLineNumbering;
  pageNumberFormat?: DocPageNumberFormat;
  pageNumberStart?: number;
  pageNumberRestart?: boolean;
  verticalAlign?: "top" | "center" | "bottom" | "justified";
};

function bkcToBreakType(bkc: number): DocSectionBreakType {
  switch (bkc) {
    case 0:
      return "continuous";
    case 1:
      return "newColumn";
    case 2:
      return "newPage";
    case 3:
      return "evenPage";
    case 4:
      return "oddPage";
    default:
      return "newPage";
  }
}

function applySepSprm(props: SepProps, sprm: Sprm): void {
  switch (sprm.opcode.raw) {
    case SPRM_SEP.SBkc:
      props.breakType = bkcToBreakType(sprmUint8(sprm));
      break;
    case SPRM_SEP.SFTitlePage:
      props.titlePage = sprmUint8(sprm) !== 0;
      break;
    case SPRM_SEP.SBOrientation:
      props.orientation = sprmUint8(sprm) === 1 ? "landscape" : "portrait";
      break;
    case SPRM_SEP.SCcolumns:
      props.columns = sprmUint16(sprm) + 1; // stored as columns - 1
      break;
    case SPRM_SEP.SDxaColumns:
      props.columnSpacing = sprmInt16(sprm);
      break;
    case SPRM_SEP.SDyaTop:
      props.marginTop = sprmInt16(sprm);
      break;
    case SPRM_SEP.SDyaBottom:
      props.marginBottom = sprmInt16(sprm);
      break;
    case SPRM_SEP.SXaPage:
      props.pageWidth = sprmUint16(sprm);
      break;
    case SPRM_SEP.SYaPage:
      props.pageHeight = sprmUint16(sprm);
      break;
    case SPRM_SEP.SDxaLeft:
      props.marginLeft = sprmUint16(sprm);
      break;
    case SPRM_SEP.SDxaRight:
      props.marginRight = sprmUint16(sprm);
      break;
    case SPRM_SEP.SDzaGutter:
      props.gutter = sprmUint16(sprm);
      break;
    case SPRM_SEP.SDyaHdrTop:
      props.headerDistance = sprmUint16(sprm);
      break;
    case SPRM_SEP.SDyaHdrBottom:
      props.footerDistance = sprmUint16(sprm);
      break;
    // Line numbering
    case SPRM_SEP.SLnc: {
      const lnc = sprmUint8(sprm);
      if (!props.lineNumbering) props.lineNumbering = {};
      const restart: "perPage" | "perSection" | "continuous" = lnc === 1 ? "perSection" : lnc === 2 ? "continuous" : "perPage";
      props.lineNumbering = { ...props.lineNumbering, restart };
      break;
    }
    case SPRM_SEP.SNLnnMod:
      if (!props.lineNumbering) props.lineNumbering = {};
      props.lineNumbering = { ...props.lineNumbering, countBy: sprmUint16(sprm) };
      break;
    case SPRM_SEP.SDxaLnn:
      if (!props.lineNumbering) props.lineNumbering = {};
      props.lineNumbering = { ...props.lineNumbering, distance: sprmInt16(sprm) };
      break;
    case SPRM_SEP.SLnnMin:
      if (!props.lineNumbering) props.lineNumbering = {};
      props.lineNumbering = { ...props.lineNumbering, start: sprmUint16(sprm) };
      break;
    // Page numbering
    case SPRM_SEP.SNfcPgn: {
      const nfc = sprmUint8(sprm);
      const fmtMap: readonly DocPageNumberFormat[] = ["decimal", "upperRoman", "lowerRoman", "upperLetter", "lowerLetter"];
      props.pageNumberFormat = nfc < fmtMap.length ? fmtMap[nfc] : "decimal";
      break;
    }
    case SPRM_SEP.SPgnStart97:
      props.pageNumberStart = sprmUint16(sprm);
      break;
    case SPRM_SEP.SFPgnRestart:
      props.pageNumberRestart = sprmUint8(sprm) !== 0;
      break;
    // Vertical alignment
    case SPRM_SEP.SVjc: {
      const vjc = sprmUint8(sprm);
      const vjcMap: readonly ("top" | "center" | "bottom" | "justified")[] = ["top", "center", "bottom", "justified"];
      props.verticalAlign = vjc < vjcMap.length ? vjcMap[vjc] : undefined;
      break;
    }
  }
}

/**
 * Parse SEPX from WordDocument stream.
 * SEPX: cb(2B) + grpprl(cb bytes)
 */
export function parseSepx(wordDocStream: Uint8Array, fcSepx: number): SepProps {
  if (fcSepx < 0 || fcSepx === -1) return {};
  if (fcSepx + 2 > wordDocStream.length) return {};

  const view = new DataView(wordDocStream.buffer, wordDocStream.byteOffset, wordDocStream.byteLength);
  const cb = view.getUint16(fcSepx, true);
  if (cb === 0 || fcSepx + 2 + cb > wordDocStream.length) return {};

  const grpprl = wordDocStream.subarray(fcSepx + 2, fcSepx + 2 + cb);
  const sprms = parseGrpprl(grpprl);

  const props: SepProps = {};
  for (const sprm of sprms) {
    applySepSprm(props, sprm);
  }
  return props;
}

/** Convert SepProps to DocSection (without paragraphs). */
export function sepPropsToSection(props: SepProps): Omit<DocSection, "paragraphs"> {
  return {
    ...(props.pageWidth ? { pageWidth: props.pageWidth } : {}),
    ...(props.pageHeight ? { pageHeight: props.pageHeight } : {}),
    ...(props.orientation ? { orientation: props.orientation } : {}),
    ...(props.marginTop !== undefined ? { marginTop: props.marginTop } : {}),
    ...(props.marginBottom !== undefined ? { marginBottom: props.marginBottom } : {}),
    ...(props.marginLeft ? { marginLeft: props.marginLeft } : {}),
    ...(props.marginRight ? { marginRight: props.marginRight } : {}),
    ...(props.gutter ? { gutter: props.gutter } : {}),
    ...(props.columns && props.columns > 1 ? { columns: props.columns } : {}),
    ...(props.columnSpacing ? { columnSpacing: props.columnSpacing } : {}),
    ...(props.breakType ? { breakType: props.breakType } : {}),
    ...(props.titlePage ? { titlePage: props.titlePage } : {}),
    ...(props.headerDistance ? { headerDistance: props.headerDistance } : {}),
    ...(props.footerDistance ? { footerDistance: props.footerDistance } : {}),
    ...(props.lineNumbering ? { lineNumbering: props.lineNumbering } : {}),
    ...(props.pageNumberFormat ? { pageNumberFormat: props.pageNumberFormat } : {}),
    ...(props.pageNumberStart !== undefined ? { pageNumberStart: props.pageNumberStart } : {}),
    ...(props.pageNumberRestart ? { pageNumberRestart: props.pageNumberRestart } : {}),
    ...(props.verticalAlign ? { verticalAlign: props.verticalAlign } : {}),
  };
}
