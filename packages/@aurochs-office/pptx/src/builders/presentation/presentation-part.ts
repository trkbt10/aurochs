/**
 * @file presentation.xml builder
 *
 * Authoritative builder for the PresentationML "main" part
 * (`ppt/presentation.xml`).
 *
 * @see ECMA-376 Part 1, §19.2.1.26 (CT_Presentation)
 */

import { createElement, type XmlDocument, type XmlElement } from "@aurochs/xml";
import {
  EMU_PER_PIXEL,
  DEFAULT_SLIDE_WIDTH_EMU,
  DEFAULT_SLIDE_HEIGHT_EMU,
} from "@aurochs-office/ooxml/domain/ooxml-units";
import { PRESENTATIONML_ROOT_XMLNS } from "./common";

/**
 * ST_SlideMasterId minimum value — Office uses exactly 2^31.
 *
 * @see ECMA-376 Part 1, §19.7.4 (ST_SlideMasterId)
 */
const SLIDE_MASTER_ID_DEFAULT = "2147483648";

/**
 * ST_SlideId minimum value — slide IDs start at 256.
 *
 * @see ECMA-376 Part 1, §19.7.4 (ST_SlideId)
 */
const SLIDE_ID_BASE = 256;

/**
 * Default notes-page size in EMUs.
 *
 * `notesSz` is REQUIRED by `CT_Presentation`. Office's stock notes
 * page is the portrait counterpart of the standard slide: width is
 * the slide's height (7.5") and height is 10" (the standard PowerPoint
 * notes default).
 */
const NOTES_HEIGHT_EMU = 9144000;
const DEFAULT_NOTES_SIZE_EMU = {
  cx: String(DEFAULT_SLIDE_HEIGHT_EMU),
  cy: String(NOTES_HEIGHT_EMU),
} as const;

/** Default 16:9 widescreen slide size in EMUs, sourced from the SoT. */
const DEFAULT_SLIDE_SIZE_EMU = {
  cx: String(DEFAULT_SLIDE_WIDTH_EMU),
  cy: String(DEFAULT_SLIDE_HEIGHT_EMU),
} as const;

export type BuildPresentationOptions = {
  /** Slide size; either pixel dimensions OR raw EMU values. Defaults to 16:9. */
  readonly slideSize?:
    | { readonly width: number; readonly height: number }
    | { readonly widthEmu: number; readonly heightEmu: number };
  /** Notes-page size (in EMUs); defaults to 7.5"×10" portrait. */
  readonly notesSize?: { readonly cx: number; readonly cy: number };
  /** Total number of slides referenced by the presentation. Defaults to 1. */
  readonly slideCount?: number;
  /** Default font size for the document in hundredths of a point. Defaults to 1800 (18pt). */
  readonly defaultFontSize?: number;
};

/**
 * Build `ppt/presentation.xml`.
 *
 * Element order matches the schema sequence so PowerPoint accepts the
 * file without repair: `sldMasterIdLst`, `sldIdLst`, `sldSz`, `notesSz`,
 * `defaultTextStyle`. `notesSz` is REQUIRED by the schema; omitting it
 * triggers PowerPoint's recovery flow.
 */
export function buildPresentation(options: BuildPresentationOptions = {}): XmlDocument {
  const slideCount = options.slideCount ?? 1;
  if (!Number.isInteger(slideCount) || slideCount < 1) {
    throw new Error(`buildPresentation: slideCount must be a positive integer, got ${slideCount}`);
  }

  const sldIds: XmlElement[] = [];
  for (let i = 0; i < slideCount; i++) {
    sldIds.push(createElement("p:sldId", {
      id: String(SLIDE_ID_BASE + i),
      "r:id": `rId${i + 2}`,
    }));
  }

  const sldSz = createElement("p:sldSz", resolveSlideSize(options.slideSize));
  const notesSz = createElement("p:notesSz", resolveNotesSize(options.notesSize));
  const defaultFontSize = options.defaultFontSize ?? 1800;

  return {
    children: [
      createElement("p:presentation", PRESENTATIONML_ROOT_XMLNS, [
        createElement("p:sldMasterIdLst", {}, [
          createElement("p:sldMasterId", { id: SLIDE_MASTER_ID_DEFAULT, "r:id": "rId1" }),
        ]),
        createElement("p:sldIdLst", {}, sldIds),
        sldSz,
        notesSz,
        createElement("p:defaultTextStyle", {}, [
          createElement("a:defPPr", {}, [createElement("a:defRPr", { sz: String(defaultFontSize) })]),
        ]),
      ]),
    ],
  };
}

function resolveSlideSize(input?: BuildPresentationOptions["slideSize"]): Record<string, string> {
  if (!input) {return { ...DEFAULT_SLIDE_SIZE_EMU };}
  if ("widthEmu" in input) {
    return { cx: String(Math.round(input.widthEmu)), cy: String(Math.round(input.heightEmu)) };
  }
  return {
    cx: String(Math.round(input.width * EMU_PER_PIXEL)),
    cy: String(Math.round(input.height * EMU_PER_PIXEL)),
  };
}

function resolveNotesSize(input?: BuildPresentationOptions["notesSize"]): Record<string, string> {
  if (!input) {return { ...DEFAULT_NOTES_SIZE_EMU };}
  return { cx: String(Math.round(input.cx)), cy: String(Math.round(input.cy)) };
}
