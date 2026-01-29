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

export function parseDiagramStyleDefinition(doc: XmlDocument) {
  return parseDiagramStyleDefinitionBase(doc, { parseTextBody, parseShapeStyle });
}

export function parseDiagramStyleDefinitionHeader(...args: Parameters<typeof parseDiagramStyleDefinitionHeaderBase>) {
  return parseDiagramStyleDefinitionHeaderBase(...args);
}

export function parseDiagramStyleDefinitionHeaderList(...args: Parameters<typeof parseDiagramStyleDefinitionHeaderListBase>) {
  return parseDiagramStyleDefinitionHeaderListBase(...args);
}
