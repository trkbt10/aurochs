/**
 * @file Presentation parser for ECMA-376 p:presentation element
 *
 * Parses the presentation.xml root element and its child elements.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.26 (p:presentation)
 */

import type { XmlElement } from "../../../xml/index";
import { getChild, getChildren } from "../../../xml/index";
import type {
  Presentation,
  SlideSize,
  SlideSizeType,
  CustomShow,
  ModifyVerifier,
  PhotoAlbum,
  PhotoAlbumFrameShape,
  PhotoAlbumLayout,
  SmartTags,
  EmbeddedFont,
  EmbeddedFontReference,
  EmbeddedFontTypeface,
} from "../../domain/slide";
import { px } from "../../domain/types";
import { SLIDE_FACTOR } from "../../core/units/conversion";
import { parseTextStyleLevels } from "../text/text-style-levels";
import { parseSlideId, parseSlideMasterId, parseSlideSizeCoordinate } from "../primitive";
import {
  DEFAULT_SERVER_ZOOM,
  DEFAULT_FIRST_SLIDE_NUM,
  DEFAULT_SHOW_SPECIAL_PLS_ON_TITLE_SLD,
  DEFAULT_RTL,
  DEFAULT_REMOVE_PERSONAL_INFO_ON_SAVE,
  DEFAULT_COMPAT_MODE,
  DEFAULT_STRICT_FIRST_AND_LAST_CHARS,
  DEFAULT_EMBED_TRUETYPE_FONTS,
  DEFAULT_SAVE_SUBSET_FONTS,
  DEFAULT_AUTO_COMPRESS_PICTURES,
  DEFAULT_BOOKMARK_ID_SEED,
} from "../../core/ecma376/defaults";

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed slide size in EMU units.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.36
 */
export type ParsedSldSz = {
  readonly widthEmu: number;
  readonly heightEmu: number;
  readonly type?: SlideSizeType;
};

/**
 * Parsed notes size in EMU units.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.23
 */
export type ParsedNotesSz = {
  readonly widthEmu: number;
  readonly heightEmu: number;
};

/**
 * Parsed slide ID entry.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.32
 */
export type ParsedSldId = {
  readonly id: number;
  readonly rId: string;
};

/**
 * Parsed slide master ID entry.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.33
 */
export type ParsedSldMasterId = {
  readonly id: number;
  readonly rId: string;
};

/**
 * Parsed notes master ID entry.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.21
 */
export type ParsedNotesMasterId = {
  readonly rId: string;
};

/**
 * Parsed handout master ID entry.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.11
 */
export type ParsedHandoutMasterId = {
  readonly rId: string;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a boolean attribute value.
 *
 * Per ECMA-376, boolean values can be "true", "false", "1", or "0".
 *
 * @param value - The attribute value
 * @param defaultValue - Default value if attribute is undefined
 * @returns Parsed boolean value
 */
function parseBooleanAttr(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return value === "1" || value === "true";
}

/**
 * Parse an integer attribute value.
 *
 * @param value - The attribute value
 * @param defaultValue - Default value if attribute is undefined
 * @returns Parsed integer value
 */
function parseIntAttr(value: string | undefined, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a boolean attribute value when present.
 *
 * Per ECMA-376, boolean values can be "true", "false", "1", or "0".
 *
 * @param value - The attribute value
 * @returns Parsed boolean or undefined when attribute is missing
 */
function parseOptionalBooleanAttr(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "1" || value === "true";
}

/**
 * Parse an integer attribute value when present.
 *
 * @param value - The attribute value
 * @returns Parsed integer or undefined when attribute is missing/invalid
 */
function parseOptionalIntAttr(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse an embedded font reference element.
 *
 * @param element - The font reference element
 * @returns Embedded font reference or undefined when missing
 */
function parseEmbeddedFontReference(element: XmlElement | undefined): EmbeddedFontReference | undefined {
  if (element === undefined) {
    return undefined;
  }
  return {
    rId: element.attrs["r:id"] ?? "",
  };
}

// =============================================================================
// p:sldSz Parser - Section 19.2.1.36
// =============================================================================

/**
 * Parse p:sldSz (slide size) element.
 *
 * The slide size element specifies the dimensions of all slides in the presentation.
 * Dimensions are specified in EMU (English Metric Units).
 *
 * @param element - The p:sldSz element
 * @returns Parsed slide size with EMU values
 *
 * @see ECMA-376 Part 1, Section 19.2.1.36
 */
export function parseSldSz(element: XmlElement): ParsedSldSz {
  const cx = parseSlideSizeCoordinate(element.attrs["cx"]) ?? 0;
  const cy = parseSlideSizeCoordinate(element.attrs["cy"]) ?? 0;
  const type = element.attrs["type"] as SlideSizeType | undefined;

  return {
    widthEmu: cx,
    heightEmu: cy,
    type,
  };
}

/**
 * Convert parsed slide size to domain SlideSize (in pixels).
 *
 * @param parsed - Parsed slide size in EMU
 * @returns SlideSize in pixels
 */
export function sldSzToSlideSize(parsed: ParsedSldSz): SlideSize {
  return {
    width: px((parsed.widthEmu * SLIDE_FACTOR) | 0),
    height: px((parsed.heightEmu * SLIDE_FACTOR) | 0),
    type: parsed.type,
  };
}

// =============================================================================
// p:notesSz Parser - Section 19.2.1.23
// =============================================================================

/**
 * Parse p:notesSz (notes size) element.
 *
 * The notes size element specifies the size of the notes slide.
 * This element is REQUIRED in a presentation.
 *
 * @param element - The p:notesSz element
 * @returns Parsed notes size with EMU values
 *
 * @see ECMA-376 Part 1, Section 19.2.1.23
 */
export function parseNotesSz(element: XmlElement): ParsedNotesSz {
  const cx = parseSlideSizeCoordinate(element.attrs["cx"]) ?? 0;
  const cy = parseSlideSizeCoordinate(element.attrs["cy"]) ?? 0;

  return {
    widthEmu: cx,
    heightEmu: cy,
  };
}

/**
 * Convert parsed notes size to domain SlideSize (in pixels).
 *
 * @param parsed - Parsed notes size in EMU
 * @returns SlideSize in pixels
 */
export function notesSzToSlideSize(parsed: ParsedNotesSz): SlideSize {
  return {
    width: px((parsed.widthEmu * SLIDE_FACTOR) | 0),
    height: px((parsed.heightEmu * SLIDE_FACTOR) | 0),
  };
}

// =============================================================================
// p:embeddedFont Parser - Section 19.2.1.9
// =============================================================================

/**
 * Parse p:embeddedFont element.
 *
 * @param element - The p:embeddedFont element
 * @returns Parsed embedded font entry
 *
 * @see ECMA-376 Part 1, Section 19.2.1.9
 */
export function parseEmbeddedFont(element: XmlElement): EmbeddedFont {
  const fontEl = getChild(element, "p:font");
  const font = fontEl ? parseEmbeddedFontTypeface(fontEl) : undefined;

  return {
    font,
    regular: parseEmbeddedFontReference(getChild(element, "p:regular")),
    bold: parseEmbeddedFontReference(getChild(element, "p:bold")),
    italic: parseEmbeddedFontReference(getChild(element, "p:italic")),
    boldItalic: parseEmbeddedFontReference(getChild(element, "p:boldItalic")),
  };
}

// =============================================================================
// p:embeddedFontLst Parser - Section 19.2.1.10
// =============================================================================

/**
 * Parse p:embeddedFontLst (embedded font list) element.
 *
 * @param element - The p:embeddedFontLst element
 * @returns Array of parsed embedded font entries
 *
 * @see ECMA-376 Part 1, Section 19.2.1.10
 */
export function parseEmbeddedFontLst(element: XmlElement): EmbeddedFont[] {
  const entries = getChildren(element, "p:embeddedFont");
  return entries.map(parseEmbeddedFont);
}

// =============================================================================
// p:custShow Parser - Section 19.2.1.5
// =============================================================================

/**
 * Parse p:custShow (custom show) element.
 *
 * @param element - The p:custShow element
 * @returns Parsed custom show entry
 *
 * @see ECMA-376 Part 1, Section 19.2.1.5
 */
export function parseCustShow(element: XmlElement): CustomShow {
  const sldLst = getChild(element, "p:sldLst");
  const slideIds = sldLst ? parseSlideIdList(sldLst) : [];

  return {
    id: parseIntAttr(element.attrs["id"], 0),
    name: element.attrs["name"] ?? "",
    slideIds,
  };
}

function parseEmbeddedFontTypeface(element: XmlElement): EmbeddedFontTypeface {
  return {
    typeface: element.attrs["typeface"],
    panose: element.attrs["panose"],
    pitchFamily: element.attrs["pitchFamily"],
    charset: element.attrs["charset"],
  };
}

function parseSlideIdList(sldLst: XmlElement): string[] {
  return getChildren(sldLst, "p:sld").map((slide) => slide.attrs["r:id"] ?? "");
}

// =============================================================================
// p:custShowLst Parser - Section 19.2.1.7
// =============================================================================

/**
 * Parse p:custShowLst (custom show list) element.
 *
 * @param element - The p:custShowLst element
 * @returns Array of parsed custom show entries
 *
 * @see ECMA-376 Part 1, Section 19.2.1.7
 */
export function parseCustShowLst(element: XmlElement): CustomShow[] {
  const entries = getChildren(element, "p:custShow");
  return entries.map(parseCustShow);
}

// =============================================================================
// p:modifyVerifier Parser - Section 19.2.1.19
// =============================================================================

/**
 * Parse p:modifyVerifier element.
 *
 * @param element - The p:modifyVerifier element
 * @returns Parsed modify verifier settings
 *
 * @see ECMA-376 Part 1, Section 19.2.1.19
 */
export function parseModifyVerifier(element: XmlElement): ModifyVerifier {
  return {
    algorithmName: element.attrs["algorithmName"],
    hashValue: element.attrs["hashValue"],
    saltValue: element.attrs["saltValue"],
    spinCount: parseOptionalIntAttr(element.attrs["spinCount"] ?? element.attrs["spinValue"]),
  };
}

// =============================================================================
// p:photoAlbum Parser - Section 19.2.1.24
// =============================================================================

function parsePhotoAlbumFrameShape(value: string | undefined): PhotoAlbumFrameShape | undefined {
  switch (value) {
    case "frameStyle1":
    case "frameStyle2":
    case "frameStyle3":
    case "frameStyle4":
    case "frameStyle5":
    case "frameStyle6":
    case "frameStyle7":
      return value;
    default:
      return undefined;
  }
}

function parsePhotoAlbumLayout(value: string | undefined): PhotoAlbumLayout | undefined {
  switch (value) {
    case "1pic":
    case "1picTitle":
    case "2pic":
    case "2picTitle":
    case "4pic":
    case "4picTitle":
    case "fitToSlide":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse p:photoAlbum element.
 *
 * @param element - The p:photoAlbum element
 * @returns Parsed photo album settings
 *
 * @see ECMA-376 Part 1, Section 19.2.1.24
 */
export function parsePhotoAlbum(element: XmlElement): PhotoAlbum {
  return {
    blackAndWhite: parseOptionalBooleanAttr(element.attrs["bw"]),
    frame: parsePhotoAlbumFrameShape(element.attrs["frame"]),
    layout: parsePhotoAlbumLayout(element.attrs["layout"]),
    showCaptions: parseOptionalBooleanAttr(element.attrs["showCaptions"]),
  };
}

// =============================================================================
// p:smartTags Parser - Section 19.2.1.40
// =============================================================================

/**
 * Parse p:smartTags element.
 *
 * @param element - The p:smartTags element
 * @returns Parsed smart tags reference
 *
 * @see ECMA-376 Part 1, Section 19.2.1.40
 */
export function parseSmartTags(element: XmlElement): SmartTags {
  return {
    rId: element.attrs["r:id"] ?? "",
  };
}

// =============================================================================
// p:sldIdLst Parser - Section 19.2.1.34
// =============================================================================

/**
 * Parse p:sldIdLst (slide ID list) element.
 *
 * The slide ID list contains references to all slides in the presentation
 * in their display order.
 *
 * Per ECMA-376, slide IDs must be >= 256.
 *
 * @param element - The p:sldIdLst element
 * @returns Array of parsed slide ID entries
 *
 * @see ECMA-376 Part 1, Section 19.2.1.34
 */
export function parseSldIdLst(element: XmlElement): ParsedSldId[] {
  const sldIds = getChildren(element, "p:sldId");
  return sldIds.map((sldId) => ({
    id: parseSlideId(sldId.attrs["id"]) ?? 0,
    rId: sldId.attrs["r:id"] ?? "",
  }));
}

// =============================================================================
// p:sldMasterIdLst Parser - Section 19.2.1.35
// =============================================================================

/**
 * Parse p:sldMasterIdLst (slide master ID list) element.
 *
 * The slide master ID list contains references to all slide masters
 * in the presentation.
 *
 * @param element - The p:sldMasterIdLst element
 * @returns Array of parsed slide master ID entries
 *
 * @see ECMA-376 Part 1, Section 19.2.1.35
 */
export function parseSldMasterIdLst(element: XmlElement): ParsedSldMasterId[] {
  const sldMasterIds = getChildren(element, "p:sldMasterId");
  return sldMasterIds.map((sldMasterId) => ({
    id: parseSlideMasterId(sldMasterId.attrs["id"]) ?? 0,
    rId: sldMasterId.attrs["r:id"] ?? "",
  }));
}

// =============================================================================
// p:notesMasterIdLst Parser - Section 19.2.1.22
// =============================================================================

/**
 * Parse p:notesMasterIdLst (notes master ID list) element.
 *
 * The notes master ID list contains references to all notes masters
 * in the presentation. Typically there is only one notes master.
 *
 * @param element - The p:notesMasterIdLst element
 * @returns Array of parsed notes master ID entries
 *
 * @see ECMA-376 Part 1, Section 19.2.1.22
 */
export function parseNotesMasterIdLst(element: XmlElement): ParsedNotesMasterId[] {
  const notesMasterIds = getChildren(element, "p:notesMasterId");
  return notesMasterIds.map((notesMasterId) => ({
    rId: notesMasterId.attrs["r:id"] ?? "",
  }));
}

// =============================================================================
// p:handoutMasterIdLst Parser - Section 19.2.1.12
// =============================================================================

/**
 * Parse p:handoutMasterIdLst (handout master ID list) element.
 *
 * The handout master ID list contains references to all handout masters
 * in the presentation. Typically there is only one handout master.
 *
 * @param element - The p:handoutMasterIdLst element
 * @returns Array of parsed handout master ID entries
 *
 * @see ECMA-376 Part 1, Section 19.2.1.12
 */
export function parseHandoutMasterIdLst(element: XmlElement): ParsedHandoutMasterId[] {
  const handoutMasterIds = getChildren(element, "p:handoutMasterId");
  return handoutMasterIds.map((handoutMasterId) => ({
    rId: handoutMasterId.attrs["r:id"] ?? "",
  }));
}

// =============================================================================
// p:presentation Parser - Section 19.2.1.26
// =============================================================================

/**
 * Parse p:presentation element.
 *
 * This is the root element of presentation.xml. It contains references
 * to all slides, masters, and presentation-level settings.
 *
 * Child element order per ECMA-376:
 * 1. p:sldMasterIdLst
 * 2. p:notesMasterIdLst
 * 3. p:handoutMasterIdLst
 * 4. p:sldIdLst
 * 5. p:sldSz
 * 6. p:notesSz (REQUIRED)
 * 7. p:smartTags
 * 8. p:embeddedFontLst
 * 9. p:custShowLst
 * 10. p:photoAlbum
 * 11. p:custDataLst
 * 12. p:kinsoku
 * 13. p:defaultTextStyle
 * 14. p:modifyVerifier
 * 15. p:extLst
 *
 * @param element - The p:presentation element
 * @returns Parsed Presentation domain object
 *
 * @see ECMA-376 Part 1, Section 19.2.1.26
 */
export function parsePresentation(element: XmlElement): Presentation {
  const attrs = element.attrs;

  // Parse slide size
  const sldSzEl = getChild(element, "p:sldSz");
  const slideSize = resolveSlideSize(sldSzEl);

  // Parse notes size (REQUIRED but we handle missing gracefully)
  const notesSzEl = getChild(element, "p:notesSz");
  const noteSize = notesSzEl ? notesSzToSlideSize(parseNotesSz(notesSzEl)) : undefined;

  const embeddedFontLstEl = getChild(element, "p:embeddedFontLst");
  const embeddedFonts = embeddedFontLstEl ? parseEmbeddedFontLst(embeddedFontLstEl) : undefined;
  const custShowLstEl = getChild(element, "p:custShowLst");
  const customShows = custShowLstEl ? parseCustShowLst(custShowLstEl) : undefined;
  const photoAlbumEl = getChild(element, "p:photoAlbum");
  const modifyVerifierEl = getChild(element, "p:modifyVerifier");
  const smartTagsEl = getChild(element, "p:smartTags");
  const defaultTextStyleEl = getChild(element, "p:defaultTextStyle");

  return {
    slideSize,
    noteSize,
    defaultTextStyle: parseTextStyleLevels(defaultTextStyleEl),
    embeddedFonts,
    customShows,
    photoAlbum: photoAlbumEl ? parsePhotoAlbum(photoAlbumEl) : undefined,
    modifyVerifier: modifyVerifierEl ? parseModifyVerifier(modifyVerifierEl) : undefined,
    smartTags: smartTagsEl ? parseSmartTags(smartTagsEl) : undefined,
    serverZoom: parseIntAttr(attrs["serverZoom"], DEFAULT_SERVER_ZOOM),
    firstSlideNum: parseIntAttr(attrs["firstSlideNum"], DEFAULT_FIRST_SLIDE_NUM),
    showSpecialPlsOnTitleSld: parseBooleanAttr(
      attrs["showSpecialPlsOnTitleSld"],
      DEFAULT_SHOW_SPECIAL_PLS_ON_TITLE_SLD
    ),
    rtl: parseBooleanAttr(attrs["rtl"], DEFAULT_RTL),
    removePersonalInfoOnSave: parseBooleanAttr(
      attrs["removePersonalInfoOnSave"],
      DEFAULT_REMOVE_PERSONAL_INFO_ON_SAVE
    ),
    compatMode: parseBooleanAttr(attrs["compatMode"], DEFAULT_COMPAT_MODE),
    strictFirstAndLastChars: parseBooleanAttr(
      attrs["strictFirstAndLastChars"],
      DEFAULT_STRICT_FIRST_AND_LAST_CHARS
    ),
    embedTrueTypeFonts: parseBooleanAttr(attrs["embedTrueTypeFonts"], DEFAULT_EMBED_TRUETYPE_FONTS),
    saveSubsetFonts: parseBooleanAttr(attrs["saveSubsetFonts"], DEFAULT_SAVE_SUBSET_FONTS),
    autoCompressPictures: parseBooleanAttr(
      attrs["autoCompressPictures"],
      DEFAULT_AUTO_COMPRESS_PICTURES
    ),
    bookmarkIdSeed: parseIntAttr(attrs["bookmarkIdSeed"], DEFAULT_BOOKMARK_ID_SEED),
  };
}

function resolveSlideSize(sldSzEl: XmlElement | undefined): SlideSize {
  if (sldSzEl !== undefined) {
    return sldSzToSlideSize(parseSldSz(sldSzEl));
  }
  // Default 16:9 slide size
  return { width: px(960), height: px(540) };
}
