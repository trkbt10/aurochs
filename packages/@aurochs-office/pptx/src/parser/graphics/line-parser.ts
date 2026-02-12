/**
 * @file Line parser (shared)
 *
 * Delegates DrawingML line parsing to the shared OOXML implementation and
 * adapts the result to PPTX domain types.
 */

import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import {
  parseLine as parseOoxmlLine,
  getLineFromProperties as getOoxmlLineFromProperties,
} from "@aurochs-office/drawing-ml/parser";
import type { Fill, Line } from "../../domain/index";
import type { XmlElement } from "@aurochs/xml";

function convertBaseLineToPptxLine(line: BaseLine): Line | undefined {
  // Skip if fill is blipFill type (not typically used in lines)
  if (line.fill.type === "blipFill") {
    return undefined;
  }
  return {
    width: line.width,
    cap: line.cap,
    compound: line.compound,
    alignment: line.alignment,
    fill: line.fill as Fill,
    dash: line.dash,
    headEnd: line.headEnd,
    tailEnd: line.tailEnd,
    join: line.join,
    miterLimit: line.miterLimit,
  };
}

/** Parse line properties from XML element */
export function parseLine(element: XmlElement | undefined): Line | undefined {
  const parsed = parseOoxmlLine(element);
  if (!parsed) {
    return undefined;
  }
  return convertBaseLineToPptxLine(parsed);
}

/** Get line properties from shape properties element */
export function getLineFromProperties(spPr: XmlElement | undefined): Line | undefined {
  const parsed = getOoxmlLineFromProperties(spPr);
  if (!parsed) {
    return undefined;
  }
  return convertBaseLineToPptxLine(parsed);
}
