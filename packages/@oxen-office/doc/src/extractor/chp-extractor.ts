/**
 * @file Character property extractor
 *
 * Pipeline: CP → FC (via piece table) → BinTable → FKP page → CHPX → SPRM → DocTextRun properties
 */

import type { DocTextRun, DocUnderlineStyle } from "../domain/types";
import type { Sprm } from "../sprm/sprm-decoder";
import {
  SPRM_CHP,
  KUL,
  ICO_COLORS,
  sprmToggle,
  sprmUint8,
  sprmUint16,
  sprmInt16,
  colorRefToHex,
} from "../sprm/sprm-decoder";
import type { BinTable } from "../stream/bin-table";
import { findFkpPage } from "../stream/bin-table";
import { parseChpFkp, type ChpxRun } from "../stream/fkp";
import type { PieceDescriptor } from "../stream/piece-table";

/** Mutable character properties accumulated from SPRMs. */
export type ChpProps = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  underlineStyle?: DocUnderlineStyle;
  underlineColor?: string;
  strike?: boolean;
  dstrike?: boolean;
  caps?: boolean;
  smallCaps?: boolean;
  hidden?: boolean;
  outline?: boolean;
  shadow?: boolean;
  emboss?: boolean;
  imprint?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  fontSize?: number;
  fontIndex?: number;
  fontIndexEastAsia?: number;
  fontIndexComplex?: number;
  fontIndexBiDi?: number;
  color?: string;
  highlight?: string;
  spacing?: number;
  /** CHP fSpec flag — character is special (e.g. \x02 footnote ref, \x01 picture) */
  fSpecial?: boolean;
};

function kulToDocUnderlineStyle(kul: number): DocUnderlineStyle | undefined {
  switch (kul) {
    case KUL.Single:
      return "single";
    case KUL.WordsOnly:
      return "wordsOnly";
    case KUL.Double:
      return "double";
    case KUL.Dotted:
      return "dotted";
    case KUL.Thick:
      return "thick";
    case KUL.Dash:
      return "dash";
    case KUL.DotDash:
      return "dotDash";
    case KUL.DotDotDash:
      return "dotDotDash";
    case KUL.Wave:
      return "wave";
    default:
      return undefined;
  }
}

function applyChpSprm(props: ChpProps, sprm: Sprm): void {
  switch (sprm.opcode.raw) {
    case SPRM_CHP.CFBold:
      props.bold = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFItalic:
      props.italic = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFStrike:
      props.strike = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFOutline:
      props.outline = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFShadow:
      props.shadow = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFSmallCaps:
      props.smallCaps = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFCaps:
      props.caps = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFVanish:
      props.hidden = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFEmboss:
      props.emboss = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFSpec:
      props.fSpecial = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFImprint:
      props.imprint = sprmToggle(sprm);
      break;
    case SPRM_CHP.CFDStrike:
      props.dstrike = sprmUint8(sprm) !== 0;
      break;
    case SPRM_CHP.CKul: {
      const kul = sprmUint8(sprm);
      if (kul === KUL.None) {
        props.underline = false;
        props.underlineStyle = undefined;
      } else {
        props.underline = true;
        props.underlineStyle = kulToDocUnderlineStyle(kul);
      }
      break;
    }
    case SPRM_CHP.CIco: {
      const ico = sprmUint8(sprm);
      const rgb = ICO_COLORS[ico];
      if (rgb) props.color = rgb;
      break;
    }
    case SPRM_CHP.CIss: {
      const iss = sprmUint8(sprm);
      props.superscript = iss === 1;
      props.subscript = iss === 2;
      break;
    }
    case SPRM_CHP.CHighlight: {
      const ico = sprmUint8(sprm);
      const rgb = ICO_COLORS[ico];
      if (rgb) props.highlight = rgb;
      break;
    }
    case SPRM_CHP.CHps:
      props.fontSize = sprmUint16(sprm) / 2; // half-points → points
      break;
    case SPRM_CHP.CRgFtc0:
      props.fontIndex = sprmUint16(sprm);
      break;
    case SPRM_CHP.CRgFtc1:
      props.fontIndexEastAsia = sprmUint16(sprm);
      break;
    case SPRM_CHP.CRgFtc2:
      props.fontIndexComplex = sprmUint16(sprm);
      break;
    case SPRM_CHP.CFtcBi:
      props.fontIndexBiDi = sprmUint16(sprm);
      break;
    case SPRM_CHP.CDxaSpace:
      props.spacing = sprmInt16(sprm);
      break;
    case SPRM_CHP.CCv:
      props.color = colorRefToHex(sprm);
      break;
    case SPRM_CHP.CCvUl:
      props.underlineColor = colorRefToHex(sprm);
      break;
  }
}

/** Apply character SPRMs to build text run properties. */
export function extractChpProps(sprms: readonly Sprm[]): ChpProps {
  const props: ChpProps = {};
  for (const sprm of sprms) {
    applyChpSprm(props, sprm);
  }
  return props;
}

/** Convert ChpProps to DocTextRun properties (with font name resolution). */
export function chpPropsToRunProps(
  props: ChpProps,
  fontLookup: ReadonlyMap<number, string>,
): Omit<DocTextRun, "text"> {
  return {
    ...(props.bold ? { bold: true } : {}),
    ...(props.italic ? { italic: true } : {}),
    ...(props.underline ? { underline: true } : {}),
    ...(props.underlineStyle ? { underlineStyle: props.underlineStyle } : {}),
    ...(props.underlineColor ? { underlineColor: props.underlineColor } : {}),
    ...(props.strike ? { strike: true } : {}),
    ...(props.dstrike ? { dstrike: true } : {}),
    ...(props.caps ? { caps: true } : {}),
    ...(props.smallCaps ? { smallCaps: true } : {}),
    ...(props.hidden ? { hidden: true } : {}),
    ...(props.outline ? { outline: true } : {}),
    ...(props.shadow ? { shadow: true } : {}),
    ...(props.emboss ? { emboss: true } : {}),
    ...(props.imprint ? { imprint: true } : {}),
    ...(props.superscript ? { superscript: true } : {}),
    ...(props.subscript ? { subscript: true } : {}),
    ...(props.fontSize ? { fontSize: props.fontSize } : {}),
    ...(props.fontIndex !== undefined ? { fontName: fontLookup.get(props.fontIndex) } : {}),
    ...(props.fontIndexEastAsia !== undefined ? { fontNameEastAsia: fontLookup.get(props.fontIndexEastAsia) } : {}),
    ...(props.fontIndexComplex !== undefined ? { fontNameComplex: fontLookup.get(props.fontIndexComplex) } : {}),
    ...(props.fontIndexBiDi !== undefined ? { fontNameBiDi: fontLookup.get(props.fontIndexBiDi) } : {}),
    ...(props.color ? { color: props.color } : {}),
    ...(props.highlight ? { highlight: props.highlight } : {}),
    ...(props.spacing ? { spacing: props.spacing } : {}),
  };
}

/**
 * Convert CP to FC using the piece table.
 * For compressed pieces, FC = piece.fc_base + (cp - piece.cpStart)
 * (the raw fc with compression bit 30 set, divided by 2)
 * For Unicode pieces, FC = piece.fc_base + (cp - piece.cpStart) * 2
 */
export function cpToFc(cp: number, pieces: readonly PieceDescriptor[]): number | undefined {
  for (const piece of pieces) {
    if (cp >= piece.cpStart && cp < piece.cpEnd) {
      const offset = cp - piece.cpStart;
      if (piece.compressed) {
        // Compressed: FC has bit 30 set. The actual FC for BinTable lookup
        // needs to include the compression flag for proper matching.
        // The raw FC (with bit 30 clear) + offset
        const baseFc = piece.fc & ~0x40000000;
        return (baseFc / 2) + offset;
      }
      // Unicode: 2 bytes per character
      return piece.fc + offset * 2;
    }
  }
  return undefined;
}

/**
 * Convert FC to CP using the piece table (inverse of cpToFc).
 * For compressed pieces, cp = cpStart + (fc - baseFc)
 * For Unicode pieces, cp = cpStart + (fc - piece.fc) / 2
 */
export function fcToCp(fc: number, pieces: readonly PieceDescriptor[]): number | undefined {
  for (const piece of pieces) {
    if (piece.compressed) {
      const baseFc = (piece.fc & ~0x40000000) / 2;
      const offset = fc - baseFc;
      if (offset >= 0 && offset < piece.cpEnd - piece.cpStart) {
        return piece.cpStart + offset;
      }
    } else {
      const offset = fc - piece.fc;
      if (offset >= 0 && offset % 2 === 0 && offset / 2 < piece.cpEnd - piece.cpStart) {
        return piece.cpStart + offset / 2;
      }
    }
  }
  return undefined;
}

/** Cached FKP page data to avoid re-parsing. */
type FkpCache = Map<number, readonly ChpxRun[]>;

/** Parse FKP page with caching. Returns runs array or empty on error. */
function getCachedChpRuns(
  pageNum: number,
  wordDocStream: Uint8Array,
  cache: FkpCache,
): readonly ChpxRun[] {
  let runs = cache.get(pageNum);
  if (!runs) {
    try {
      runs = parseChpFkp(wordDocStream, pageNum);
    } catch {
      return [];
    }
    cache.set(pageNum, runs);
  }
  return runs;
}

/**
 * Find character properties for a given FC.
 * Uses BinTable → FKP → CHPX pipeline.
 */
export function findChpxAtFc(
  fc: number,
  chpBinTable: BinTable,
  wordDocStream: Uint8Array,
  cache: FkpCache,
): readonly Sprm[] {
  const pageNum = findFkpPage(chpBinTable, fc);
  if (pageNum === undefined) return [];

  const runs = getCachedChpRuns(pageNum, wordDocStream, cache);

  // Find the run containing the FC
  for (const run of runs) {
    if (fc >= run.fcStart && fc < run.fcEnd) {
      return run.sprms;
    }
  }

  return [];
}

/**
 * Get all ChpxRuns overlapping the FC range [fcStart, fcEnd).
 * Walks BinTable entries to find all FKP pages covering the range,
 * then collects all overlapping runs from those pages.
 */
export function getAllChpxRunsInRange(
  fcStart: number,
  fcEnd: number,
  chpBinTable: BinTable,
  wordDocStream: Uint8Array,
  cache: FkpCache,
): readonly ChpxRun[] {
  if (fcStart >= fcEnd) return [];

  // Find all BinTable entries overlapping [fcStart, fcEnd)
  const result: ChpxRun[] = [];
  for (const entry of chpBinTable.entries) {
    if (entry.fcStart >= fcEnd) break; // entries are sorted by FC
    if (entry.fcEnd <= fcStart) continue;

    const runs = getCachedChpRuns(entry.pageNumber, wordDocStream, cache);
    for (const run of runs) {
      if (run.fcStart >= fcEnd) break;
      if (run.fcEnd > fcStart) {
        result.push(run);
      }
    }
  }

  return result;
}
