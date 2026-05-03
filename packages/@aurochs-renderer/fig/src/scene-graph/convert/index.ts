/**
 * @file Scene graph converters
 *
 * Convert Figma node properties to format-agnostic scene graph types.
 */

export { figColorToSceneColor, convertPaintToFill, convertPaintsToFills } from "./fill";
export { convertStrokeToSceneStroke } from "./stroke";
export { convertEffectsToScene } from "./effects";
export { parseSvgPathD, decodeGeometryToContours, convertVectorPathsToContours } from "./path";
export {
  generateEllipseContour,
  generateLineContour,
  generatePolygonContour,
  generateRectContour,
  generateStarContour,
} from "./shape-geometry";
export { convertTextNode, type TextConversionResult } from "./text";
export { convertFigmaBlendMode } from "./blend-mode";
