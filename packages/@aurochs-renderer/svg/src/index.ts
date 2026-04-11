/**
 * @file SVG renderer utilities
 *
 * Converts SVG strings produced by chart/table/diagram renderers into
 * React element trees so that format-specific renderers (PPTX, PDF, DOCX)
 * can embed SVG content without dangerouslySetInnerHTML.
 */

export {
  parseSvgString,
  parseSvgInnerContent,
  parseSvgFragment,
  normalizeSvgForScaling,
} from "./svg-parse";

export {
  svgElementToJsx,
  svgChildrenToJsx,
} from "./svg-to-jsx";
