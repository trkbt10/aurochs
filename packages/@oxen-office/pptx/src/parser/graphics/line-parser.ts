/**
 * @file Line parser (shared)
 *
 * Delegates DrawingML line parsing to the shared OOXML implementation and
 * adapts the result to PPTX domain types.
 */

import type { BaseLine } from "@oxen-office/ooxml/domain/line";
import {
  parseLine as parseOoxmlLine,
  getLineFromProperties as getOoxmlLineFromProperties,
} from "@oxen-office/ooxml/parser";
import type { Line } from "../../domain/index";
import type { XmlElement } from "@oxen/xml";

function convertBaseLineToPptxLine(line: BaseLine): Line {
  return {
    width: line.width,
    cap: line.cap,
    compound: line.compound,
    alignment: line.alignment,
    fill: line.fill,
    dash: line.dash,
    headEnd: line.headEnd,
    tailEnd: line.tailEnd,
    join: line.join,
    miterLimit: line.miterLimit,
  };
}






export function parseLine(element: XmlElement | undefined): Line | undefined {
  const parsed = parseOoxmlLine(element);
  if (!parsed) {return undefined;}
  return convertBaseLineToPptxLine(parsed);
}






export function getLineFromProperties(spPr: XmlElement | undefined): Line | undefined {
  const parsed = getOoxmlLineFromProperties(spPr);
  if (!parsed) {return undefined;}
  return convertBaseLineToPptxLine(parsed);
}
