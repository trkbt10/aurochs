/**
 * @file SVG renderer module for DrawingML
 *
 * String-based SVG rendering utilities for DrawingML elements.
 * Provides geometry rendering that can be used by PPTX, XLSX, and DOCX renderers.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

// Export geometry rendering
export {
  renderGeometryPathData,
  renderPresetGeometryData,
  renderCustomGeometryData,
  renderGeometryData,
  buildTransformAttr,
  scaleCommand,
  commandToPath,
} from "./geometry";
