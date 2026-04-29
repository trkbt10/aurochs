/**
 * @file Slide XML generation
 *
 * Composes a slide document by taking the canonical blank-slide skeleton
 * from `@aurochs-office/pptx/builders` and injecting shape XML emitted
 * by the converter's existing `buildShapeXml`.
 *
 * Shape XML is still produced as raw strings here because the .ppt
 * converter's shape pipeline has not been ported to typed XmlElement
 * yet. The skeleton portion that wraps those shapes is no longer
 * hand-rolled — it goes through the SoT.
 */

import { serializeDocument } from "@aurochs/xml";
import { buildBlankSlide } from "@aurochs-office/pptx/builders";
import type { PptSlide } from "../domain/types";
import { buildShapeXml, resetShapeIdCounter } from "./shape-xml";

const SERIALIZE_OPTS = { declaration: true, standalone: true } as const;

const SP_TREE_CLOSE_TAG = "</p:spTree>";

/**
 * Generate a complete slide XML document.
 *
 * The canonical blank slide is serialized via the SoT, then shape XML
 * fragments are spliced in just before the closing `</p:spTree>` tag.
 */
export function buildSlideXml(
  slide: PptSlide,
  imageRefs?: Map<number, string>,
  hyperlinks?: Map<string, string>,
): string {
  resetShapeIdCounter();

  const blank = serializeDocument(buildBlankSlide(), SERIALIZE_OPTS);
  const shapesXml = slide.shapes.map((s) => buildShapeXml(s, imageRefs, hyperlinks)).join("");
  if (shapesXml.length === 0) {
    return blank;
  }

  const insertAt = blank.lastIndexOf(SP_TREE_CLOSE_TAG);
  if (insertAt === -1) {
    throw new Error("buildSlideXml: blank slide template missing </p:spTree>");
  }
  return blank.slice(0, insertAt) + shapesXml + blank.slice(insertAt);
}
