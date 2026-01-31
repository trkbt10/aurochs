/**
 * @file Diagram style definition parser (PPTX wrapper)
 *
 * Delegates to the format-agnostic implementation in @oxen-office/diagram.
 * PPTX-specific parsing of text/style payloads is injected explicitly.
 */

import type { XmlDocument } from "@oxen/xml";
import {
  parseDiagramStyleDefinition as parseDiagramStyleDefinitionBase,
  parseDiagramStyleDefinitionHeader as parseDiagramStyleDefinitionHeaderBase,
  parseDiagramStyleDefinitionHeaderList as parseDiagramStyleDefinitionHeaderListBase,
} from "@oxen-office/diagram/parser/diagram/style-parser";
import { parseTextBody } from "../text/text-parser";
import { parseShapeStyle } from "../shape-parser/style";


























/** Parse diagram style definition from XML document */
export function parseDiagramStyleDefinition(doc: XmlDocument) {
  return parseDiagramStyleDefinitionBase(doc, { parseTextBody, parseShapeStyle });
}


























/** Parse diagram style definition header from XML */
export function parseDiagramStyleDefinitionHeader(...args: Parameters<typeof parseDiagramStyleDefinitionHeaderBase>) {
  return parseDiagramStyleDefinitionHeaderBase(...args);
}


























/** Parse list of diagram style definition headers from XML */
export function parseDiagramStyleDefinitionHeaderList(...args: Parameters<typeof parseDiagramStyleDefinitionHeaderListBase>) {
  return parseDiagramStyleDefinitionHeaderListBase(...args);
}
