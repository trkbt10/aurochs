/**
 * @file Diagram color definition parser (PPTX wrapper)
 *
 * Delegates to the format-agnostic implementation in @oxen-office/diagram.
 */

import {
  parseDiagramColorsDefinition as parseDiagramColorsDefinitionBase,
  parseDiagramColorsDefinitionHeader as parseDiagramColorsDefinitionHeaderBase,
  parseDiagramColorsDefinitionHeaderList as parseDiagramColorsDefinitionHeaderListBase,
} from "@oxen-office/diagram/parser/diagram/color-parser";


























/** Parse diagram colors definition from XML */
export function parseDiagramColorsDefinition(...args: Parameters<typeof parseDiagramColorsDefinitionBase>) {
  return parseDiagramColorsDefinitionBase(...args);
}


























/** Parse diagram colors definition header from XML */
export function parseDiagramColorsDefinitionHeader(...args: Parameters<typeof parseDiagramColorsDefinitionHeaderBase>) {
  return parseDiagramColorsDefinitionHeaderBase(...args);
}


























/** Parse list of diagram colors definition headers from XML */
export function parseDiagramColorsDefinitionHeaderList(
  ...args: Parameters<typeof parseDiagramColorsDefinitionHeaderListBase>
) {
  return parseDiagramColorsDefinitionHeaderListBase(...args);
}

