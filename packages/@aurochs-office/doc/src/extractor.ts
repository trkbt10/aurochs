/**
 * @file Extracts DocDocument domain model from parsed .doc streams
 */

import type { DocDocument, DocParagraph, DocTextRun, DocSection, DocImage, DocNote, DocComment } from "./domain/types";
import type { DocParseContext } from "./parse-context";
import { warnOrThrow } from "./parse-context";
import type { Fib } from "./stream/fib";
import type { PieceDescriptor } from "./stream/piece-table";
import { extractText, splitIntoParagraphs } from "./stream/text-extractor";
import { parseBinTable, type BinTable } from "./stream/bin-table";
import { parseFontTable, buildFontLookup } from "./stream/font-table";
import { parseStyleSheet } from "./stream/style-sheet";
import { createStyleResolver, type StyleResolver } from "./extractor/style-resolver";
import { parseListDefinitions, parseListOverrides } from "./stream/list-data";
import { extractChpProps, chpPropsToRunProps, cpToFc, findChpxAtFc, getAllChpxRunsInRange } from "./extractor/chp-extractor";
import { extractPapProps, findRawPapxAtFc, type PapProps } from "./extractor/pap-extractor";
import { extractTapProps, type TapProps } from "./extractor/tap-extractor";
import { parsePlcfSed, parseSepx, sepPropsToSection } from "./extractor/sep-extractor";
import { extractTables } from "./extractor/table-extractor";
import { parsePlcfFld, extractFields, extractFormFields, extractHyperlinks } from "./extractor/field-extractor";
import { parsePlcfTxbxTxt, extractTextboxes } from "./extractor/textbox-extractor";
import {
  parsePlcfHdd,
  extractHeadersFooters,
  parseNotePosPlc,
  parseNoteTextPlc,
  extractNotes,
  parseCommentRefs,
  parseCommentAuthors,
  parseBookmarkNames,
  parseBookmarkStarts,
  parseBookmarkEnds,
  extractBookmarks,
  extractComments,
  type SubdocParagraphBuilder,
} from "./extractor/subdoc-extractor";
import type { Sprm } from "./sprm/sprm-decoder";
import type { ChpxRun } from "./stream/fkp";
import type { PapxRun } from "./stream/fkp";
import { parseBStoreContainer, type BlipEntry } from "./stream/blip-store";
import { parsePicStructure, picToDisplayEmu } from "./extractor/picture-extractor";
import { parsePlcSpaMom } from "./stream/spa-table";

export type ExtractDocOptions = {
  readonly wordDocStream: Uint8Array;
  readonly tableStream: Uint8Array;
  readonly fib: Fib;
  readonly pieces: readonly PieceDescriptor[];
  readonly ctx: DocParseContext;
  readonly dataStream?: Uint8Array;
};

/** Extract the intermediate DocDocument from parsed stream data. */
export function extractDocDocument(options: ExtractDocOptions): DocDocument {
  const { wordDocStream, tableStream, fib, pieces, ctx, dataStream } = options;

  // --- Text extraction ---
  const rawText = tryExtractText({ wordDocStream, fib, pieces, ctx });
  if (rawText === undefined) {
    return { paragraphs: [] };
  }

  // --- Build BinTables for character and paragraph properties ---
  const chpBinTable = tryParse(() => parseBinTable(tableStream, fib.fcPlcfbteChpx, fib.lcbPlcfbteChpx));
  const papBinTable = tryParse(() => parseBinTable(tableStream, fib.fcPlcfbtePapx, fib.lcbPlcfbtePapx));

  // --- Font table ---
  const fontEntries = tryParse(() => parseFontTable(tableStream, fib.fcSttbfFfn, fib.lcbSttbfFfn)) ?? [];
  const fontLookup = buildFontLookup(fontEntries);
  const fonts = fontEntries.map((f) => f.name);

  // --- Styles ---
  const styleData = tryParse(() => parseStyleSheet(tableStream, fib.fcStshf, fib.lcbStshf))
    ?? { styles: [], upxMap: new Map() };
  const styles = styleData.styles;
  const styleResolver = createStyleResolver(styles, styleData.upxMap);

  // --- Lists ---
  const lists = tryParse(() => parseListDefinitions(tableStream, fib.fcPlfLst, fib.lcbPlfLst)) ?? [];
  const listOverrides = tryParse(() => parseListOverrides(tableStream, fib.fcPlfLfo, fib.lcbPlfLfo)) ?? [];

  // --- Build paragraphs with formatting ---
  const textParagraphs = splitIntoParagraphs(rawText);

  // FKP caches
  const chpCache = new Map<number, readonly ChpxRun[]>();
  const papCache = new Map<number, readonly PapxRun[]>();

  // Build paragraphs with formatting and track CP positions
  const { paragraphs, paragraphCps, tapPropsMap } = buildParagraphs({
    textParagraphs,
    pieces,
    wordDocStream,
    chpBinTable,
    papBinTable,
    fontLookup,
    chpCache,
    papCache,
    styleResolver,
  });

  // --- Tables: group table paragraphs into DocTable objects ---
  const content = extractTables(paragraphs, tapPropsMap);

  // --- Sections ---
  const sections = extractSections({ fib, tableStream, wordDocStream, paragraphs, paragraphCps });

  // --- Fields and hyperlinks ---
  const fldMarkers = tryParse(() => parsePlcfFld(tableStream, fib.fcPlcfFldMom, fib.lcbPlcfFldMom)) ?? [];
  const fields = extractFields(fldMarkers, rawText);
  const hyperlinks = extractHyperlinks(fields);

  // --- Inline images ---
  const blipStore = tryParse(() => parseBStoreContainer(tableStream, fib.fcDggInfo, fib.lcbDggInfo)) ?? [];
  const images = extractInlineImages({
    rawText, pieces, wordDocStream, chpBinTable, chpCache, dataStream, blipStore,
  });

  // --- Shape anchors ---
  const shapeAnchors = tryParse(() => parsePlcSpaMom(tableStream, fib.fcPlcSpaMom, fib.lcbPlcSpaMom)) ?? [];

  // --- Sub-documents ---
  // Build full document text for sub-document extraction
  const fullText = tryBuildFullText(wordDocStream, fib, pieces);

  // Build formatted paragraph builder for sub-documents
  const subdocBuilder = createSubdocParagraphBuilder({
    fullText, pieces, wordDocStream, chpBinTable, papBinTable,
    fontLookup, chpCache, papCache, styleResolver,
  });

  // Headers/Footers
  const hddCps = tryParse(() => parsePlcfHdd(tableStream, fib.fcPlcfHdd, fib.lcbPlcfHdd)) ?? [];
  const hdrTextStart = fib.ccpText + fib.ccpFtn;
  const { headers, footers } = extractHeadersFooters({ hddCps, fullText, hdrTextStart, buildParagraphs: subdocBuilder });

  // Footnotes
  const ftnRefResult = tryParse(() => parseNotePosPlc({ tableStream, fc: fib.fcPlcffndRef, lcb: fib.lcbPlcffndRef, dataSize: 0 })) ?? { refCps: [], textCps: [] };
  const ftnTextCps = tryParse(() => parseNoteTextPlc(tableStream, fib.fcPlcffndTxt, fib.lcbPlcffndTxt)) ?? [];
  const footnotes = extractFootnotes({ fib, refCps: ftnRefResult.refCps, textCps: ftnTextCps, fullText, subdocBuilder });

  // Endnotes
  const endRefResult = tryParse(() => parseNotePosPlc({ tableStream, fc: fib.fcPlcfendRef, lcb: fib.lcbPlcfendRef, dataSize: 0 })) ?? { refCps: [], textCps: [] };
  const endTextCps = tryParse(() => parseNoteTextPlc(tableStream, fib.fcPlcfendTxt, fib.lcbPlcfendTxt)) ?? [];
  const endnoteTextStart = fib.ccpText + fib.ccpFtn + fib.ccpHdd + fib.ccpAtn;
  const endnotes = extractEndnotes({
    fib, refCps: endRefResult.refCps, textCps: endTextCps, fullText, endnoteTextStart, subdocBuilder,
  });

  // Comments
  const commentRefs = tryParse(() => parseCommentRefs(tableStream, fib.fcPlcfandRef, fib.lcbPlcfandRef)) ?? [];
  const commentTextCps = tryParse(() => parseNoteTextPlc(tableStream, fib.fcPlcfandTxt, fib.lcbPlcfandTxt)) ?? [];
  const commentAuthors = tryParse(() => parseCommentAuthors(tableStream, fib.fcGrpXstAtnOwners, fib.lcbGrpXstAtnOwners)) ?? [];
  const commentTextStart = fib.ccpText + fib.ccpFtn + fib.ccpHdd;

  // Annotation bookmarks (comment range)
  const atnBkmkStarts = tryParse(() => parseBookmarkStarts(tableStream, fib.fcPlcfAtnBkf, fib.lcbPlcfAtnBkf)) ?? [];
  const atnBkmkEndCps = tryParse(() => parseBookmarkEnds(tableStream, fib.fcPlcfAtnBkl, fib.lcbPlcfAtnBkl)) ?? [];
  const atnBookmarks = resolveAnnotationBookmarks(atnBkmkStarts, atnBkmkEndCps);

  const comments = extractDocComments({
    fib, refs: commentRefs, textCps: commentTextCps, authors: commentAuthors, fullText, commentTextStart, subdocBuilder, atnBookmarks,
  });

  // Bookmarks
  const bkmkNames = tryParse(() => parseBookmarkNames(tableStream, fib.fcSttbfBkmk, fib.lcbSttbfBkmk)) ?? [];
  const bkmkStarts = tryParse(() => parseBookmarkStarts(tableStream, fib.fcPlcfBkf, fib.lcbPlcfBkf)) ?? [];
  const bkmkEndCps = tryParse(() => parseBookmarkEnds(tableStream, fib.fcPlcfBkl, fib.lcbPlcfBkl)) ?? [];
  const bookmarks = extractBookmarks(bkmkNames, bkmkStarts, bkmkEndCps);

  // Form fields
  const formFields = extractFormFields(fields);

  // Textboxes
  const txbxTextStart = fib.ccpText + fib.ccpFtn + fib.ccpHdd + fib.ccpAtn + fib.ccpEdn;
  const txbxTextCps = tryParse(() => parsePlcfTxbxTxt(tableStream, fib.fcPlcfTxbxTxt, fib.lcbPlcfTxbxTxt)) ?? [];
  const textboxes = extractDocTextboxes({ fib, txbxTextCps, fullText, txbxTextStart, subdocBuilder });

  // Only include content if there are tables (otherwise it's just paragraphs)
  const hasTables = content.some((item) => "rows" in item);

  return {
    paragraphs,
    ...(hasTables ? { content } : {}),
    ...(sections.length > 0 ? { sections } : {}),
    ...(styles.length > 0 ? { styles } : {}),
    ...(fonts.length > 0 ? { fonts } : {}),
    ...(lists.length > 0 ? { lists } : {}),
    ...(listOverrides.length > 0 ? { listOverrides } : {}),
    ...(headers.length > 0 ? { headers } : {}),
    ...(footers.length > 0 ? { footers } : {}),
    ...(footnotes.length > 0 ? { footnotes } : {}),
    ...(endnotes.length > 0 ? { endnotes } : {}),
    ...(comments.length > 0 ? { comments } : {}),
    ...(bookmarks.length > 0 ? { bookmarks } : {}),
    ...(fields.length > 0 ? { fields } : {}),
    ...(hyperlinks.length > 0 ? { hyperlinks } : {}),
    ...(images.length > 0 ? { images } : {}),
    ...(shapeAnchors.length > 0 ? { shapeAnchors } : {}),
    ...(formFields.length > 0 ? { formFields } : {}),
    ...(textboxes.length > 0 ? { textboxes } : {}),
  };
}

type BuildParagraphsOptions = {
  readonly textParagraphs: readonly string[];
  readonly pieces: readonly PieceDescriptor[];
  readonly wordDocStream: Uint8Array;
  readonly chpBinTable: BinTable | undefined;
  readonly papBinTable: BinTable | undefined;
  readonly fontLookup: ReadonlyMap<number, string>;
  readonly chpCache: Map<number, readonly ChpxRun[]>;
  readonly papCache: Map<number, readonly PapxRun[]>;
  readonly styleResolver: StyleResolver;
};

function buildParagraphs(options: BuildParagraphsOptions): { paragraphs: readonly DocParagraph[]; paragraphCps: readonly number[]; tapPropsMap: ReadonlyMap<number, TapProps> } {
  const { textParagraphs, pieces, wordDocStream, chpBinTable, papBinTable, fontLookup, chpCache, papCache, styleResolver } = options;
  const paragraphs: DocParagraph[] = [];
  const paragraphCps: number[] = [];
  const tapPropsMap = new Map<number, TapProps>();
  const cpCounter = { value: 0 };

  for (const text of textParagraphs) {
    const paraStartCp = cpCounter.value;
    paragraphCps.push(paraStartCp);

    // Get paragraph properties from PAPX with style inheritance
    const { papProps, istd } = resolvePapPropsForParagraph({
      paraStartCp, pieces, wordDocStream, papBinTable, papCache, styleResolver, tapPropsMap, paragraphIndex: paragraphs.length,
    });

    // Build runs with character properties (with style inheritance)
    const styleChpSprms = resolveStyleChpSprms(istd, styleResolver);
    const runs = buildRuns({
      text, paraStartCp, pieces, wordDocStream, chpBinTable, fontLookup, chpCache, styleChpSprms,
    });

    const para: DocParagraph = {
      runs,
      ...(papProps.alignment ? { alignment: papProps.alignment } : {}),
      ...(papProps.indentLeft ? { indentLeft: papProps.indentLeft } : {}),
      ...(papProps.indentRight ? { indentRight: papProps.indentRight } : {}),
      ...(papProps.firstLineIndent ? { firstLineIndent: papProps.firstLineIndent } : {}),
      ...(papProps.spaceBefore ? { spaceBefore: papProps.spaceBefore } : {}),
      ...(papProps.spaceAfter ? { spaceAfter: papProps.spaceAfter } : {}),
      ...(papProps.lineSpacing ? { lineSpacing: papProps.lineSpacing } : {}),
      ...(papProps.keepTogether ? { keepTogether: papProps.keepTogether } : {}),
      ...(papProps.keepWithNext ? { keepWithNext: papProps.keepWithNext } : {}),
      ...(papProps.pageBreakBefore ? { pageBreakBefore: papProps.pageBreakBefore } : {}),
      ...(papProps.widowControl !== undefined ? { widowControl: papProps.widowControl } : {}),
      ...(papProps.outlineLevel !== undefined ? { outlineLevel: papProps.outlineLevel } : {}),
      ...(papProps.istd !== undefined ? { styleIndex: papProps.istd } : {}),
      ...(papProps.listIndex ? { listIndex: papProps.listIndex } : {}),
      ...(papProps.listLevel !== undefined && papProps.listIndex ? { listLevel: papProps.listLevel } : {}),
      ...(papProps.inTable ? { inTable: papProps.inTable } : {}),
      ...(papProps.isRowEnd ? { isRowEnd: papProps.isRowEnd } : {}),
      ...(papProps.tableDepth ? { tableDepth: papProps.tableDepth } : {}),
      ...(papProps.borders ? { borders: papProps.borders } : {}),
      ...(papProps.shading ? { shading: papProps.shading } : {}),
      ...(papProps.tabs ? { tabs: papProps.tabs } : {}),
      ...(papProps.spaceBeforeAuto ? { spaceBeforeAuto: papProps.spaceBeforeAuto } : {}),
      ...(papProps.spaceAfterAuto ? { spaceAfterAuto: papProps.spaceAfterAuto } : {}),
    };

    paragraphs.push(para);

    // Advance CP: text length + 1 for the \r paragraph mark
    cpCounter.value += text.length + 1;
  }

  return { paragraphs, paragraphCps, tapPropsMap };
}

/** Swallow error and return undefined for optional parsing operations. */
function handleSwallowedError(_error: unknown): undefined {
  return undefined;
}

function mergeSprmArrays(styleSprms: readonly Sprm[], directSprms: readonly Sprm[]): readonly Sprm[] {
  if (styleSprms.length > 0) { return [...styleSprms, ...directSprms]; }
  return directSprms;
}

function resolveStyleChpSprms(istd: number | undefined, styleResolver: StyleResolver): readonly Sprm[] {
  if (istd === undefined) { return []; }
  return styleResolver.getCharacterSprms(istd);
}

type ResolvePapPropsResult = { papProps: PapProps; istd: number | undefined };

function resolvePapPropsForParagraph(ctx: {
  paraStartCp: number;
  pieces: readonly PieceDescriptor[];
  wordDocStream: Uint8Array;
  papBinTable: BinTable | undefined;
  papCache: Map<number, readonly PapxRun[]>;
  styleResolver: StyleResolver;
  tapPropsMap: Map<number, TapProps>;
  paragraphIndex: number;
}): ResolvePapPropsResult {
  if (!ctx.papBinTable) { return { papProps: {}, istd: undefined }; }
  const fc = cpToFc(ctx.paraStartCp, ctx.pieces);
  if (fc === undefined) { return { papProps: {}, istd: undefined }; }
  const rawRun = findRawPapxAtFc({ fc, papBinTable: ctx.papBinTable, wordDocStream: ctx.wordDocStream, cache: ctx.papCache });
  if (!rawRun) { return { papProps: {}, istd: undefined }; }
  const istd = rawRun.istd;
  const stylePapSprms = istd !== undefined ? ctx.styleResolver.getParagraphSprms(istd) : [];
  const allSprms = stylePapSprms.length > 0 ? [...stylePapSprms, ...rawRun.sprms] : rawRun.sprms;
  const papProps = extractPapProps(allSprms, rawRun.istd);
  // For row-end (TTP) paragraphs, extract TAP properties
  if (papProps.isRowEnd) {
    const tapProps = extractTapProps(rawRun.sprms);
    if (Object.keys(tapProps).length > 0) {
      ctx.tapPropsMap.set(ctx.paragraphIndex, tapProps);
    }
  }
  return { papProps, istd };
}

function resolvePapPropsForSubdoc(ctx: {
  paraGlobalCp: number;
  pieces: readonly PieceDescriptor[];
  wordDocStream: Uint8Array;
  papBinTable: BinTable | undefined;
  papCache: Map<number, readonly PapxRun[]>;
  styleResolver: StyleResolver;
}): ResolvePapPropsResult {
  const { paraGlobalCp, pieces, wordDocStream, papBinTable, papCache, styleResolver } = ctx;
  if (!papBinTable) { return { papProps: {}, istd: undefined }; }
  const fc = cpToFc(paraGlobalCp, pieces);
  if (fc === undefined) { return { papProps: {}, istd: undefined }; }
  const rawRun = findRawPapxAtFc({ fc, papBinTable, wordDocStream, cache: papCache });
  if (!rawRun) { return { papProps: {}, istd: undefined }; }
  const istd = rawRun.istd;
  const stylePapSprms = istd !== undefined ? styleResolver.getParagraphSprms(istd) : [];
  const allSprms = stylePapSprms.length > 0 ? [...stylePapSprms, ...rawRun.sprms] : rawRun.sprms;
  const papProps = extractPapProps(allSprms, rawRun.istd);
  return { papProps, istd };
}

function extractFootnotes(ctx: {
  fib: Fib;
  refCps: readonly number[];
  textCps: readonly number[];
  fullText: string;
  subdocBuilder: SubdocParagraphBuilder;
}): readonly DocNote[] {
  if (ctx.fib.ccpFtn <= 0) { return []; }
  return extractNotes({ refCps: ctx.refCps, textCps: ctx.textCps, fullText: ctx.fullText, noteTextStart: ctx.fib.ccpText, buildParagraphsOpt: ctx.subdocBuilder });
}

function extractEndnotes(ctx: {
  fib: Fib;
  refCps: readonly number[];
  textCps: readonly number[];
  fullText: string;
  endnoteTextStart: number;
  subdocBuilder: SubdocParagraphBuilder;
}): readonly DocNote[] {
  if (ctx.fib.ccpEdn <= 0) { return []; }
  return extractNotes({ refCps: ctx.refCps, textCps: ctx.textCps, fullText: ctx.fullText, noteTextStart: ctx.endnoteTextStart, buildParagraphsOpt: ctx.subdocBuilder });
}

function resolveAnnotationBookmarks(
  atnBkmkStarts: readonly { cp: number; ibkl: number }[],
  atnBkmkEndCps: readonly number[],
): { readonly starts: readonly { cp: number; ibkl: number }[]; readonly endCps: readonly number[] } | undefined {
  if (atnBkmkStarts.length <= 0) { return undefined; }
  return { starts: atnBkmkStarts, endCps: atnBkmkEndCps };
}

type AtnBookmarks = { readonly starts: readonly { cp: number; ibkl: number }[]; readonly endCps: readonly number[] };

function extractDocComments(ctx: {
  fib: Fib;
  refs: readonly { cpRef: number; authorIndex: number }[];
  textCps: readonly number[];
  authors: readonly string[];
  fullText: string;
  commentTextStart: number;
  subdocBuilder: SubdocParagraphBuilder;
  atnBookmarks: AtnBookmarks | undefined;
}): readonly DocComment[] {
  if (ctx.fib.ccpAtn <= 0) { return []; }
  return extractComments({
    refs: ctx.refs, textCps: ctx.textCps, authors: ctx.authors, fullText: ctx.fullText,
    commentTextStart: ctx.commentTextStart, buildParagraphsFn: ctx.subdocBuilder, atnBookmarks: ctx.atnBookmarks,
  });
}

function extractDocTextboxes(ctx: {
  fib: Fib;
  txbxTextCps: readonly number[];
  fullText: string;
  txbxTextStart: number;
  subdocBuilder: SubdocParagraphBuilder;
}): readonly ReturnType<typeof extractTextboxes> {
  if (ctx.fib.ccpTxbx <= 0) { return []; }
  return extractTextboxes({ textCps: ctx.txbxTextCps, fullText: ctx.fullText, txbxTextStart: ctx.txbxTextStart, buildParagraphs: ctx.subdocBuilder });
}

/**
 * Convert CP to FC within a known piece (no search needed).
 * Compressed: baseFc + (cp - cpStart)
 * Unicode: piece.fc + (cp - cpStart) * 2
 */
function pieceCpToFc(cp: number, piece: PieceDescriptor): number {
  const offset = cp - piece.cpStart;
  if (piece.compressed) {
    return ((piece.fc & ~0x40000000) / 2) + offset;
  }
  return piece.fc + offset * 2;
}

/**
 * Convert FC to CP within a known piece (no search needed).
 * Compressed: cpStart + (fc - baseFc)
 * Unicode: cpStart + (fc - piece.fc) / 2
 */
function pieceFcToCp(fc: number, piece: PieceDescriptor): number {
  if (piece.compressed) {
    const baseFc = (piece.fc & ~0x40000000) / 2;
    return piece.cpStart + (fc - baseFc);
  }
  return piece.cpStart + (fc - piece.fc) / 2;
}

/**
 * Collect CHP run boundary split points within a paragraph's CP range.
 * Returns sorted, unique offsets relative to paraStartCp (always includes 0 and text.length).
 */
type CollectChpBoundariesOptions = {
  readonly paraStartCp: number;
  readonly paraEndCp: number;
  readonly pieces: readonly PieceDescriptor[];
  readonly chpBinTable: BinTable;
  readonly wordDocStream: Uint8Array;
  readonly chpCache: Map<number, readonly ChpxRun[]>;
};

function collectChpBoundaries(options: CollectChpBoundariesOptions): readonly number[] {
  const { paraStartCp, paraEndCp, pieces, chpBinTable, wordDocStream, chpCache } = options;
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(paraEndCp - paraStartCp);

  for (const piece of pieces) {
    if (piece.cpStart >= paraEndCp || piece.cpEnd <= paraStartCp) {continue;}

    // Piece boundary within the paragraph
    if (piece.cpStart > paraStartCp) {
      boundaries.add(piece.cpStart - paraStartCp);
    }

    // CP sub-range of this piece overlapping the paragraph
    const cpA = Math.max(paraStartCp, piece.cpStart);
    const cpB = Math.min(paraEndCp, piece.cpEnd);

    // Convert to FC range within this piece
    const fcA = pieceCpToFc(cpA, piece);
    const fcB = pieceCpToFc(cpB, piece);

    // Get all CHP runs overlapping this FC range
    const chpxRuns = getAllChpxRunsInRange({ fcStart: fcA, fcEnd: fcB, chpBinTable, wordDocStream, cache: chpCache });

    for (const run of chpxRuns) {
      // Convert CHP FC boundaries to CP offsets within the paragraph
      if (run.fcStart > fcA) {
        const cp = pieceFcToCp(run.fcStart, piece);
        if (cp > paraStartCp && cp < paraEndCp) {
          boundaries.add(cp - paraStartCp);
        }
      }
      if (run.fcEnd < fcB) {
        const cp = pieceFcToCp(run.fcEnd, piece);
        if (cp > paraStartCp && cp < paraEndCp) {
          boundaries.add(cp - paraStartCp);
        }
      }
    }
  }

  return [...boundaries].sort((a, b) => a - b);
}

type BuildRunsOptions = {
  readonly text: string;
  readonly paraStartCp: number;
  readonly pieces: readonly PieceDescriptor[];
  readonly wordDocStream: Uint8Array;
  readonly chpBinTable: BinTable | undefined;
  readonly fontLookup: ReadonlyMap<number, string>;
  readonly chpCache: Map<number, readonly ChpxRun[]>;
  readonly styleChpSprms: readonly Sprm[];
};

function buildRuns(options: BuildRunsOptions): readonly DocTextRun[] {
  const { text, paraStartCp, pieces, wordDocStream, chpBinTable, fontLookup, chpCache, styleChpSprms } = options;
  if (!chpBinTable || text.length === 0) {
    return [{ text }];
  }

  const paraEndCp = paraStartCp + text.length;

  // Collect all CHP boundary split points within the paragraph
  const boundaries = collectChpBoundaries({ paraStartCp, paraEndCp, pieces, chpBinTable, wordDocStream, chpCache });

  // Build a DocTextRun for each chunk between consecutive boundaries
  const runs: DocTextRun[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startOffset = boundaries[i];
    const endOffset = boundaries[i + 1];
    if (startOffset >= endOffset) {continue;}

    const runText = text.substring(startOffset, endOffset);
    const runCp = paraStartCp + startOffset;

    // Get CHP properties at this CP
    const fc = cpToFc(runCp, pieces);
    if (fc === undefined) {
      runs.push({ text: runText });
      continue;
    }

    const directSprms = findChpxAtFc({ fc, chpBinTable, wordDocStream, cache: chpCache });
    if (directSprms.length === 0 && styleChpSprms.length === 0) {
      runs.push({ text: runText });
      continue;
    }

    // Merge style character SPRMs + direct SPRMs (direct overrides style)
    const allChpSprms = mergeSprmArrays(styleChpSprms, directSprms);
    const chpProps = extractChpProps(allChpSprms);
    const runProps = chpPropsToRunProps(chpProps, fontLookup);

    if (Object.keys(runProps).length > 0) {
      runs.push({ text: runText, ...runProps });
    } else {
      runs.push({ text: runText });
    }
  }

  return runs.length > 0 ? runs : [{ text }];
}

type ExtractSectionsOptions = {
  readonly fib: Fib;
  readonly tableStream: Uint8Array;
  readonly wordDocStream: Uint8Array;
  readonly paragraphs: readonly DocParagraph[];
  readonly paragraphCps: readonly number[];
};

function extractSections(options: ExtractSectionsOptions): readonly DocSection[] {
  const { fib, tableStream, wordDocStream, paragraphs, paragraphCps } = options;
  const seds = tryParse(() => parsePlcfSed(tableStream, fib.fcPlcfSed, fib.lcbPlcfSed)) ?? [];
  if (seds.length === 0) {return [];}

  const sections: DocSection[] = [];
  const paraIdxRef = { value: 0 };

  for (let i = 0; i < seds.length; i++) {
    const sed = seds[i];
    const sepProps = tryParse(() => parseSepx(wordDocStream, sed.fcSepx)) ?? {};
    const sectionBase = sepPropsToSection(sepProps);

    // Collect paragraphs whose start CP is before this section's end CP.
    // The last section gets all remaining paragraphs.
    const isLast = i === seds.length - 1;
    const sectionParas: DocParagraph[] = [];

    while (paraIdxRef.value < paragraphs.length) {
      if (isLast || paragraphCps[paraIdxRef.value] < sed.cpEnd) {
        sectionParas.push(paragraphs[paraIdxRef.value]);
        paraIdxRef.value++;
      } else {
        break;
      }
    }

    sections.push({ ...sectionBase, paragraphs: sectionParas });
  }

  return sections;
}

function tryExtractText(options: {
  wordDocStream: Uint8Array;
  fib: Fib;
  pieces: readonly PieceDescriptor[];
  ctx: DocParseContext;
}): string | undefined {
  const { wordDocStream, fib, pieces, ctx } = options;
  try {
    return extractText(wordDocStream, pieces, fib.ccpText);
  } catch (e: unknown) {
    warnOrThrow(
      ctx,
      {
        code: "DOC_TEXT_DECODE_FAILED",
        message: e instanceof Error ? e.message : String(e),
        where: "extractDocDocument",
      },
      e instanceof Error ? e : new Error(String(e)),
    );
    return undefined;
  }
}

/**
 * Build the full document text including all sub-documents.
 * DOC text layout: main text + footnotes + headers + comments + endnotes + textboxes
 */
function tryBuildFullText(
  wordDocStream: Uint8Array,
  fib: Fib,
  pieces: readonly PieceDescriptor[],
): string {
  const totalCcp = fib.ccpText + fib.ccpFtn + fib.ccpHdd + fib.ccpAtn + fib.ccpEdn + fib.ccpTxbx + fib.ccpHdrTxbx;
  const fullResult = tryParse(() => extractText(wordDocStream, pieces, totalCcp));
  if (fullResult !== undefined) { return fullResult; }
  // Fall back to just main text
  const mainResult = tryParse(() => extractText(wordDocStream, pieces, fib.ccpText));
  return mainResult ?? "";
}

/**
 * Extract inline images by scanning for \x01 special characters in text.
 * For each \x01 with fSpecial=true and picLocation, reads PIC from Data Stream.
 */
type ExtractInlineImagesOptions = {
  readonly rawText: string;
  readonly pieces: readonly PieceDescriptor[];
  readonly wordDocStream: Uint8Array;
  readonly chpBinTable: BinTable | undefined;
  readonly chpCache: Map<number, readonly ChpxRun[]>;
  readonly dataStream: Uint8Array | undefined;
  readonly blipStore: readonly BlipEntry[];
};

function extractInlineImages(options: ExtractInlineImagesOptions): readonly DocImage[] {
  const { rawText, pieces, wordDocStream, chpBinTable, chpCache, dataStream, blipStore } = options;
  if (!chpBinTable) {return [];}

  // The image stream is the Data stream if available, otherwise the WordDocument stream
  const imageStream = dataStream ?? wordDocStream;
  const images: DocImage[] = [];

  for (let cp = 0; cp < rawText.length; cp++) {
    if (rawText[cp] === "\x01") {
      const image = tryExtractImageAtCp({ cp, pieces, wordDocStream, chpBinTable, chpCache, imageStream, blipStore });
      if (image) {
        images.push(image);
      }
    }
  }

  return images;
}

/**
 * Try to extract an image at the given CP position.
 * Returns DocImage if the CP has fSpecial=true, picLocation, and valid PIC data.
 */
type TryExtractImageAtCpOptions = {
  readonly cp: number;
  readonly pieces: readonly PieceDescriptor[];
  readonly wordDocStream: Uint8Array;
  readonly chpBinTable: BinTable;
  readonly chpCache: Map<number, readonly ChpxRun[]>;
  readonly imageStream: Uint8Array;
  readonly blipStore: readonly BlipEntry[];
};

function tryExtractImageAtCp(options: TryExtractImageAtCpOptions): DocImage | undefined {
  const { cp, pieces, wordDocStream, chpBinTable, chpCache, imageStream, blipStore } = options;
  const fc = cpToFc(cp, pieces);
  if (fc === undefined) {return undefined;}

  const sprms = findChpxAtFc({ fc, chpBinTable, wordDocStream, cache: chpCache });
  const chpProps = extractChpProps(sprms);

  if (!chpProps.fSpecial) {return undefined;}
  if (chpProps.picLocation === undefined) {return undefined;}

  const pic = tryParse(() => parsePicStructure(imageStream, chpProps.picLocation!, blipStore));
  if (!pic) {return undefined;}

  const { widthEmu, heightEmu } = picToDisplayEmu(pic);
  const isOle = chpProps.fObj === true && chpProps.fOle2 === true;

  return {
    cp,
    contentType: pic.contentType,
    data: pic.imageData,
    widthTwips: pic.widthTwips,
    heightTwips: pic.heightTwips,
    widthEmu,
    heightEmu,
    ...(isOle ? { isOlePreview: true } : {}),
  };
}

function tryParse<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (error: unknown) {
    return handleSwallowedError(error);
  }
}

/**
 * Create a SubdocParagraphBuilder that applies CHP/PAP formatting to sub-document text.
 * Sub-document CPs are global positions in the full document text (main + footnotes + headers + ...).
 */
type CreateSubdocParagraphBuilderOptions = {
  readonly fullText: string;
  readonly pieces: readonly PieceDescriptor[];
  readonly wordDocStream: Uint8Array;
  readonly chpBinTable: BinTable | undefined;
  readonly papBinTable: BinTable | undefined;
  readonly fontLookup: ReadonlyMap<number, string>;
  readonly chpCache: Map<number, readonly ChpxRun[]>;
  readonly papCache: Map<number, readonly PapxRun[]>;
  readonly styleResolver: StyleResolver;
};

function createSubdocParagraphBuilder(options: CreateSubdocParagraphBuilderOptions): SubdocParagraphBuilder {
  const { fullText, pieces, wordDocStream, chpBinTable, papBinTable, fontLookup, chpCache, papCache, styleResolver } = options;
  return (globalCpStart: number, globalCpEnd: number): readonly DocParagraph[] => {
    if (globalCpStart >= globalCpEnd) {return [];}
    const text = fullText.substring(globalCpStart, Math.min(globalCpEnd, fullText.length));
    if (!text.trim()) {return [];}

    const parts = text.split("\r");
    const paragraphs: DocParagraph[] = [];
    const cpCounter = { value: 0 };

    for (const partText of parts) {
      if (partText.length > 0) {
        const paraGlobalCp = globalCpStart + cpCounter.value;

        // Get paragraph properties via PAP pipeline
        const { papProps, istd } = resolvePapPropsForSubdoc({
          paraGlobalCp, pieces, wordDocStream, papBinTable, papCache, styleResolver,
        });

        // Build character runs via CHP pipeline
        const styleChpSprms = resolveStyleChpSprms(istd, styleResolver);
        const runs = buildRuns({
          text: partText, paraStartCp: paraGlobalCp, pieces, wordDocStream,
          chpBinTable, fontLookup, chpCache, styleChpSprms,
        });

        paragraphs.push({
          runs,
          ...(papProps.alignment ? { alignment: papProps.alignment } : {}),
          ...(papProps.indentLeft ? { indentLeft: papProps.indentLeft } : {}),
          ...(papProps.indentRight ? { indentRight: papProps.indentRight } : {}),
          ...(papProps.firstLineIndent ? { firstLineIndent: papProps.firstLineIndent } : {}),
          ...(papProps.spaceBefore ? { spaceBefore: papProps.spaceBefore } : {}),
          ...(papProps.spaceAfter ? { spaceAfter: papProps.spaceAfter } : {}),
          ...(papProps.lineSpacing ? { lineSpacing: papProps.lineSpacing } : {}),
          ...(papProps.istd !== undefined ? { styleIndex: papProps.istd } : {}),
          ...(papProps.borders ? { borders: papProps.borders } : {}),
          ...(papProps.shading ? { shading: papProps.shading } : {}),
          ...(papProps.tabs ? { tabs: papProps.tabs } : {}),
          ...(papProps.spaceBeforeAuto ? { spaceBeforeAuto: papProps.spaceBeforeAuto } : {}),
          ...(papProps.spaceAfterAuto ? { spaceAfterAuto: papProps.spaceAfterAuto } : {}),
        });
      }
      cpCounter.value += partText.length + 1; // +1 for \r
    }

    return paragraphs;
  };
}
