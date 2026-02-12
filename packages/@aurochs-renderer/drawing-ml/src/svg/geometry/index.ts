/**
 * @file Geometry SVG renderer module
 *
 * Provides SVG path rendering for DrawingML geometry.
 * Used by PPTX, XLSX, and DOCX renderers.
 *
 * @see ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 */

// Path command rendering
export { renderGeometryPathData, scaleCommand, commandToPath } from "./path-commands";

// Preset shape rendering
export { renderPresetGeometryData } from "./preset-shapes";

// Main geometry rendering
export { renderCustomGeometryData, renderGeometryData } from "./render";

// Transform utilities
export { buildTransformAttr } from "./transform";
