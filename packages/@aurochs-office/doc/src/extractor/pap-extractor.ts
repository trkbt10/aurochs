/**
 * @file Paragraph property extractor
 *
 * Pipeline: CP → FC (via piece table) → BinTable → FKP page → PAPX → SPRM → DocParagraph properties
 */

import type { DocAlignment, DocLineSpacing, DocParagraphBorders, DocBorder, DocShading, DocTabStop, DocTabAlignment, DocTabLeader } from "../domain/types";
import type { Sprm } from "../sprm/sprm-decoder";
import {
  SPRM_PAP,
  ICO_COLORS,
  sprmUint8,
  sprmInt16,
  sprmUint16,
  sprmInt32,
} from "../sprm/sprm-decoder";
import { parseBrc80, parseBrc, colorrefToHex } from "./border-utils";
import type { BinTable } from "../stream/bin-table";
import { findFkpPage } from "../stream/bin-table";
import { parsePapFkp, type PapxRun } from "../stream/fkp";

/** Mutable paragraph properties accumulated from SPRMs. */
export type PapProps = {
  alignment?: DocAlignment;
  indentLeft?: number;
  indentRight?: number;
  firstLineIndent?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  lineSpacing?: DocLineSpacing;
  keepTogether?: boolean;
  keepWithNext?: boolean;
  pageBreakBefore?: boolean;
  widowControl?: boolean;
  outlineLevel?: number;
  listIndex?: number;
  listLevel?: number;
  inTable?: boolean;
  isRowEnd?: boolean;
  tableDepth?: number;
  istd?: number;
  borders?: DocParagraphBorders;
  shading?: DocShading;
  tabs?: DocTabStop[];
  spaceBeforeAuto?: boolean;
  spaceAfterAuto?: boolean;
};

function jcToAlignment(jc: number): DocAlignment | undefined {
  switch (jc) {
    case 0:
      return "left";
    case 1:
      return "center";
    case 2:
      return "right";
    case 3:
      return "justify";
    case 4:
      return "distribute";
    default:
      return undefined;
  }
}

function applyPapSprm(props: PapProps, sprm: Sprm): void {
  switch (sprm.opcode.raw) {
    case SPRM_PAP.PJc:
    case SPRM_PAP.PJc80:
      props.alignment = jcToAlignment(sprmUint8(sprm));
      break;
    case SPRM_PAP.PFKeep:
      props.keepTogether = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFKeepFollow:
      props.keepWithNext = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFPageBreakBefore:
      props.pageBreakBefore = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFInTable:
      props.inTable = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFTtp:
      props.isRowEnd = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFWidowControl:
      props.widowControl = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PIlvl:
      props.listLevel = sprmUint8(sprm);
      break;
    case SPRM_PAP.POutLvl: {
      const lvl = sprmUint8(sprm);
      props.outlineLevel = lvl <= 8 ? lvl : undefined; // 9 = body text
      break;
    }
    case SPRM_PAP.PIlfo:
      props.listIndex = sprmUint16(sprm);
      break;
    case SPRM_PAP.PDxaLeft:
    case SPRM_PAP.PDxaLeft80:
      props.indentLeft = sprmInt16(sprm);
      break;
    case SPRM_PAP.PDxaRight:
    case SPRM_PAP.PDxaRight80:
      props.indentRight = sprmInt16(sprm);
      break;
    case SPRM_PAP.PDxaLeft1:
    case SPRM_PAP.PDxaLeft180:
      props.firstLineIndent = sprmInt16(sprm);
      break;
    case SPRM_PAP.PDyaBefore:
      props.spaceBefore = sprmUint16(sprm);
      break;
    case SPRM_PAP.PDyaAfter:
      props.spaceAfter = sprmUint16(sprm);
      break;
    case SPRM_PAP.PDyaLine: {
      // LSPD structure: dyaLine(int16) + fMultLinespace(int16)
      if (sprm.operand.length >= 4) {
        const view = new DataView(sprm.operand.buffer, sprm.operand.byteOffset, sprm.operand.byteLength);
        const dyaLine = view.getInt16(0, true);
        const fMult = view.getInt16(2, true);
        props.lineSpacing = { value: dyaLine, multi: fMult !== 0 };
      }
      break;
    }
    case SPRM_PAP.PItap:
      props.tableDepth = sprmInt32(sprm);
      break;
    // Legacy borders (BRC80, 4B operand at offset 0)
    case SPRM_PAP.PBrcTop80:
      setBorder(props, "top", parseBrc80(sprm.operand, 0));
      break;
    case SPRM_PAP.PBrcLeft80:
      setBorder(props, "left", parseBrc80(sprm.operand, 0));
      break;
    case SPRM_PAP.PBrcBottom80:
      setBorder(props, "bottom", parseBrc80(sprm.operand, 0));
      break;
    case SPRM_PAP.PBrcRight80:
      setBorder(props, "right", parseBrc80(sprm.operand, 0));
      break;
    case SPRM_PAP.PBrcBetween80:
      setBorder(props, "between", parseBrc80(sprm.operand, 0));
      break;
    case SPRM_PAP.PBrcBar80:
      setBorder(props, "bar", parseBrc80(sprm.operand, 0));
      break;
    // Modern borders (BRC, variable-length: cb(1B) + BRC(8B))
    case SPRM_PAP.PBrcTop:
      setBorder(props, "top", parseBrc(sprm.operand, 1));
      break;
    case SPRM_PAP.PBrcLeft:
      setBorder(props, "left", parseBrc(sprm.operand, 1));
      break;
    case SPRM_PAP.PBrcBottom:
      setBorder(props, "bottom", parseBrc(sprm.operand, 1));
      break;
    case SPRM_PAP.PBrcRight:
      setBorder(props, "right", parseBrc(sprm.operand, 1));
      break;
    case SPRM_PAP.PBrcBetween:
      setBorder(props, "between", parseBrc(sprm.operand, 1));
      break;
    case SPRM_PAP.PBrcBar:
      setBorder(props, "bar", parseBrc(sprm.operand, 1));
      break;
    // Shading
    case SPRM_PAP.PShd80:
      props.shading = parseShd80(sprm);
      break;
    case SPRM_PAP.PShd:
      props.shading = parseShd(sprm);
      break;
    // Tab stops
    case SPRM_PAP.PChgTabsPapx:
      props.tabs = parseChgTabsPapx(sprm);
      break;
    // Spacing auto
    case SPRM_PAP.PFDyaBeforeAuto:
      props.spaceBeforeAuto = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFDyaAfterAuto:
      props.spaceAfterAuto = sprmUint8(sprm) !== 0;
      break;
  }
}

/**
 * Parse Shd80 (legacy shading, 2 bytes):
 *   bits 0-4:   icoFore (5 bits)
 *   bits 5-9:   icoBack (5 bits)
 *   bits 10-15: ipat (6 bits)
 */
function parseShd80(sprm: Sprm): DocShading | undefined {
  const val = sprmUint16(sprm);
  const icoFore = val & 0x1f;
  const icoBack = (val >> 5) & 0x1f;
  const ipat = (val >> 10) & 0x3f;
  // Shd80Nil: icoFore=0x1F, icoBack=0x1F, ipat=0x3F
  if (icoFore === 0x1f && icoBack === 0x1f && ipat === 0x3f) return undefined;
  const foreColor = icoFore < ICO_COLORS.length ? ICO_COLORS[icoFore] : undefined;
  const backColor = icoBack < ICO_COLORS.length ? ICO_COLORS[icoBack] : undefined;
  if (!foreColor && !backColor && ipat === 0) return undefined;
  return {
    ...(foreColor ? { foreColor } : {}),
    ...(backColor ? { backColor } : {}),
    ...(ipat > 0 ? { pattern: ipat } : {}),
  };
}

/**
 * Parse modern SHD (variable-length: cb(1B) + cvFore(4B) + cvBack(4B) + ipat(2B))
 */
function parseShd(sprm: Sprm): DocShading | undefined {
  const data = sprm.operand;
  if (data.length < 11) return undefined; // 1 + 4 + 4 + 2
  const foreColor = colorrefToHex(data, 1);
  const backColor = colorrefToHex(data, 5);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ipat = view.getUint16(9, true);
  if (!foreColor && !backColor && ipat === 0) return undefined;
  return {
    ...(foreColor ? { foreColor } : {}),
    ...(backColor ? { backColor } : {}),
    ...(ipat > 0 ? { pattern: ipat } : {}),
  };
}

const TAB_JC_MAP: readonly DocTabAlignment[] = ["left", "center", "right", "decimal", "bar"];
const TAB_TLC_MAP: readonly (DocTabLeader | undefined)[] = [
  undefined,   // 0 = none
  "dot",       // 1
  "hyphen",    // 2
  "underscore", // 3
  "heavy",     // 4
  "middleDot", // 5
];

/**
 * Parse PChgTabsPapx (0xC615, spra=6, 2-byte size prefix).
 * Operand: cb(2B) + itbdMac(1B) + rgdxaTab[itbdMac](int16 each) + rgtbd[itbdMac](1B each)
 * TBD byte: jc(bits 0-2), tlc(bits 3-5)
 */
function parseChgTabsPapx(sprm: Sprm): DocTabStop[] | undefined {
  const data = sprm.operand;
  if (data.length < 3) return undefined;
  // operand starts with cb(2B), then itbdMac(1B)
  const itbdMac = data[2];
  if (itbdMac === 0) return undefined;
  // rgdxaTab: itbdMac × 2B int16 positions, starting at offset 3
  const positionsOffset = 3;
  const tbdOffset = positionsOffset + itbdMac * 2;
  if (tbdOffset + itbdMac > data.length) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const tabs: DocTabStop[] = [];

  for (let i = 0; i < itbdMac; i++) {
    const position = view.getInt16(positionsOffset + i * 2, true);
    const tbd = data[tbdOffset + i];
    const jc = tbd & 0x07;
    const tlc = (tbd >> 3) & 0x07;
    const alignment = jc < TAB_JC_MAP.length ? TAB_JC_MAP[jc] : "left";
    const leader = tlc < TAB_TLC_MAP.length ? TAB_TLC_MAP[tlc] : undefined;
    tabs.push({
      position,
      alignment,
      ...(leader ? { leader } : {}),
    });
  }

  return tabs.length > 0 ? tabs : undefined;
}

function setBorder(props: PapProps, side: keyof DocParagraphBorders, border: DocBorder | undefined): void {
  if (!border) return;
  if (!props.borders) {
    props.borders = {};
  }
  (props.borders as Record<string, DocBorder>)[side] = border;
}

/** Apply paragraph SPRMs to build paragraph properties. */
export function extractPapProps(sprms: readonly Sprm[], istd: number): PapProps {
  const props: PapProps = { istd };
  for (const sprm of sprms) {
    applyPapSprm(props, sprm);
  }
  return props;
}

/** Cached PAP-FKP page data. */
type PapFkpCache = Map<number, readonly PapxRun[]>;

/** Find paragraph properties for a given FC. */
export function findPapxAtFc(
  fc: number,
  papBinTable: BinTable,
  wordDocStream: Uint8Array,
  cache: PapFkpCache,
): PapProps {
  const run = findRawPapxAtFc(fc, papBinTable, wordDocStream, cache);
  if (!run) return {};
  return extractPapProps(run.sprms, run.istd);
}

/** Find raw PapxRun for a given FC. Returns the full run including raw SPRMs. */
export function findRawPapxAtFc(
  fc: number,
  papBinTable: BinTable,
  wordDocStream: Uint8Array,
  cache: PapFkpCache,
): PapxRun | undefined {
  const pageNum = findFkpPage(papBinTable, fc);
  if (pageNum === undefined) return undefined;

  let runs = cache.get(pageNum);
  if (!runs) {
    try {
      runs = parsePapFkp(wordDocStream, pageNum);
    } catch {
      return undefined;
    }
    cache.set(pageNum, runs);
  }

  for (const run of runs) {
    if (fc >= run.fcStart && fc < run.fcEnd) {
      return run;
    }
  }

  return undefined;
}
