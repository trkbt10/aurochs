/**
 * @file Slide XML generation
 */

import type { PptSlide, PptShape } from "../domain/types";
import { buildShapeXml, resetShapeIdCounter } from "./shape-xml";

/**
 * Generate a complete slide XML document.
 */
export function buildSlideXml(
  slide: PptSlide,
  imageRefs?: Map<number, string>,
  hyperlinks?: Map<string, string>,
): string {
  resetShapeIdCounter();

  const shapes = slide.shapes.map(s => buildShapeXml(s, imageRefs, hyperlinks)).join("");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:sld ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<p:cSld><p:spTree>` +
    `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    `<p:grpSpPr/>` +
    shapes +
    `</p:spTree></p:cSld>` +
    `</p:sld>`
  );
}
