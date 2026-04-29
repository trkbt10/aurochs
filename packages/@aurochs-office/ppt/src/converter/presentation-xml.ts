/**
 * @file PPTX presentation-level XML generation
 *
 * Adapters around the @aurochs-office/pptx/builders SoT — every byte
 * of output is constructed via the canonical builders. This file
 * remains in the .ppt converter so the rest of the converter can keep
 * its `string`-based contract; it does not author XML directly.
 */

import { serializeDocument, type XmlDocument, type XmlElement, createElement, isXmlElement } from "@aurochs/xml";
import {
  OFFICE_RELATIONSHIP_TYPES,
  PRESENTATIONML_RELATIONSHIP_TYPES,
  DRAWINGML_CONTENT_TYPES,
  serializeRelationships,
  type OpcRelationship,
} from "@aurochs-office/opc";
import {
  buildContentTypes as buildContentTypesDoc,
  buildPresentation,
  buildPresentationRels,
  buildLayoutRels,
  buildMasterRels,
  buildSlideRels,
  buildNotesSlide,
  buildNotesSlideRels,
} from "@aurochs-office/pptx/builders";
import type { PptSlideSize } from "../domain/types";

const RT_SLIDE = PRESENTATIONML_RELATIONSHIP_TYPES.slide;
const RT_THEME = OFFICE_RELATIONSHIP_TYPES.theme;
const RT_IMAGE = OFFICE_RELATIONSHIP_TYPES.image;
const RT_HYPERLINK = OFFICE_RELATIONSHIP_TYPES.hyperlink;
const RT_NOTES = PRESENTATIONML_RELATIONSHIP_TYPES.notesSlide;

const SERIALIZE_OPTS = { declaration: true, standalone: true } as const;

export type SlideRelationship = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly targetMode?: string;
};

/**
 * Build [Content_Types].xml for the PPTX package.
 *
 * @param slideCount - number of slides (>=1)
 * @param options.hasNotes - parallel array; element[i] true → register notesSlide{i+1}.xml override
 * @param options.imageExtensions - file extensions used by embedded images (png, jpeg, ...)
 * @param options.hasCharts - 1-based chart indices for which to register chart{N}.xml
 */
export function buildContentTypesXml(
  slideCount: number,
  options?: {
    hasNotes?: readonly boolean[];
    imageExtensions?: readonly string[];
    hasCharts?: readonly number[];
  },
): string {
  const notesSlideCount = countTrues(options?.hasNotes ?? []);
  const extensionDefaults = imageExtensionsToDefaults(options?.imageExtensions ?? []);

  const doc = buildContentTypesDoc({
    slideCount,
    layoutCount: 1,
    notesSlideCount,
    extensionDefaults,
  });

  const chartIndices = options?.hasCharts ?? [];
  const result = chartIndices.length > 0
    ? appendChartOverrides(doc, chartIndices)
    : doc;

  return serializeDocument(result, SERIALIZE_OPTS);
}

/**
 * Build the main presentation.xml.
 *
 * @see ECMA-376 Part 1, §19.2.1.26 (CT_Presentation)
 */
export function buildPresentationXml(slideCount: number, slideSize: PptSlideSize): string {
  const doc = buildPresentation({
    slideCount,
    slideSize: { widthEmu: slideSize.widthEmu, heightEmu: slideSize.heightEmu },
  });
  return serializeDocument(doc, SERIALIZE_OPTS);
}

/** Build the presentation relationships XML. */
export function buildPresentationRelsXml(slideCount: number): string {
  // .ppt converter historically did NOT include the theme rel here;
  // theme is reachable through the master. We omit it to preserve
  // byte-level compatibility with the existing converter contract.
  const doc = buildPresentationRels({ slideCount, includeTheme: false });
  return serializeDocument(doc, SERIALIZE_OPTS);
}

/**
 * Build slide relationships XML.
 *
 * The .ppt converter appends per-slide image / hyperlink / notes
 * relationships beyond the canonical layout edge. Build the layout
 * rel via the SoT, then merge `extraRels`.
 */
export function buildSlideRelsXml(extraRels?: readonly SlideRelationship[]): string {
  const baseDoc = buildSlideRels(1);
  if (!extraRels || extraRels.length === 0) {
    return serializeDocument(baseDoc, SERIALIZE_OPTS);
  }

  const merged = appendRelationshipsToDoc(baseDoc, extraRels);
  return serializeDocument(merged, SERIALIZE_OPTS);
}

/** Build slide-layout relationships XML (single edge to slideMaster1). */
export function buildLayoutRelsXml(): string {
  return serializeDocument(buildLayoutRels(), SERIALIZE_OPTS);
}

/** Build slide-master relationships XML (single edge to theme1). */
export function buildMasterRelsXml(): string {
  // Historically the .ppt converter master rels has only the theme
  // edge — no slide-layout edge — and rId1 binds to the theme. The
  // generic SoT produces (rId1: layout, rId2: theme); emit a custom
  // single-edge document here to preserve the existing wire format.
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RT_THEME, target: "../theme/theme1.xml" },
  ];
  const doc: XmlDocument = { children: [serializeRelationships(rels)] };
  return serializeDocument(doc, SERIALIZE_OPTS);
}

/** Build a notes-slide XML containing a single body paragraph. */
export function buildNotesSlideXml(text: string): string {
  return serializeDocument(buildNotesSlide(text), SERIALIZE_OPTS);
}

/** Build notes-slide relationships XML referencing the source slide. */
export function buildNotesRelsXml(slideIndex: number): string {
  // The .ppt converter only emits the slide back-reference (no
  // notesMaster edge — there is no notesMaster in the deck).
  return serializeDocument(buildNotesSlideRels(slideIndex, false), SERIALIZE_OPTS);
}

export {
  RT_IMAGE, RT_HYPERLINK, RT_NOTES, RT_SLIDE,
};

// =============================================================================
// Helpers
// =============================================================================

function countTrues(arr: readonly boolean[]): number {
  // eslint-disable-next-line no-restricted-syntax -- simple accumulator over a small fixed array
  let n = 0;
  for (const v of arr) {
    if (v) {n++;}
  }
  return n;
}

function imageExtensionsToDefaults(
  exts: readonly string[],
): readonly { readonly extension: string; readonly contentType: string }[] {
  const seen = new Set<string>(exts);
  const out: { readonly extension: string; readonly contentType: string }[] = [];
  if (seen.has("png")) {out.push({ extension: "png", contentType: "image/png" });}
  if (seen.has("jpeg") || seen.has("jpg")) {out.push({ extension: "jpeg", contentType: "image/jpeg" });}
  if (seen.has("emf")) {out.push({ extension: "emf", contentType: "image/x-emf" });}
  if (seen.has("wmf")) {out.push({ extension: "wmf", contentType: "image/x-wmf" });}
  if (seen.has("bmp")) {out.push({ extension: "bmp", contentType: "image/bmp" });}
  if (seen.has("tiff")) {out.push({ extension: "tiff", contentType: "image/tiff" });}
  return out;
}

function appendChartOverrides(doc: XmlDocument, chartIndices: readonly number[]): XmlDocument {
  const root = doc.children.find(isXmlElement);
  if (!root) {return doc;}
  const overrideElements = chartIndices.map((idx) =>
    createElement("Override", {
      PartName: `/ppt/charts/chart${idx}.xml`,
      ContentType: DRAWINGML_CONTENT_TYPES.chart,
    }),
  );
  const newRoot: XmlElement = {
    ...root,
    children: [...root.children, ...overrideElements],
  };
  return { ...doc, children: doc.children.map((c) => (c === root ? newRoot : c)) };
}

function appendRelationshipsToDoc(doc: XmlDocument, extras: readonly SlideRelationship[]): XmlDocument {
  const root = doc.children.find(isXmlElement);
  if (!root) {return doc;}
  const elements = extras.map((rel) => {
    const attrs: Record<string, string> = {
      Id: rel.id,
      Type: rel.type,
      Target: rel.target,
    };
    if (rel.targetMode !== undefined) {
      attrs.TargetMode = rel.targetMode;
    }
    return createElement("Relationship", attrs);
  });
  const newRoot: XmlElement = {
    ...root,
    children: [...root.children, ...elements],
  };
  return { ...doc, children: doc.children.map((c) => (c === root ? newRoot : c)) };
}

