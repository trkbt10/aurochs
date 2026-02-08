/**
 * @file Shape parser - exports
 *
 * @see ECMA-376 Part 1, Section 19.3.1 - Presentation ML Shapes
 */

// Main shape parsers
export { parseShapeElement, parseShapeTree } from "./parse-element";

// Submodule exports
export type { ResolvedPlaceholders } from "./placeholder";
export { getPlaceholderTypeFromNode, resolveLayoutAndMasterNodes, resolvePlaceholderType } from "./placeholder";
export { parseNonVisualMedia, parseNonVisualProperties, parsePlaceholder } from "./non-visual";
export { parseFontReference, parseShapeStyle, parseStyleReference } from "./style";
export {
  findFirstDefined,
  parseGroupShapeProperties,
  parseShapeProperties,
  parseShapePropertiesWithInheritance,
} from "./properties";
export { getBlipFillElement, getOleObjElement, isChoiceSupported, processAlternateContent } from "./alternate-content";
export { parseContentPartShape } from "./content-part";
export { parseSpShape } from "./sp";
export { parsePicShape, parseBlipFillProperties } from "./pic";
export { parseCxnShape } from "./cxn";
export { parseGraphicFrame } from "./graphic-frame";
