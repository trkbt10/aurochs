/**
 * @file Converter module index for fig-to-pptx
 */

export { convertText } from "./text";
export { convertGeometry } from "./geometry";
export { convertNode, convertNodes, type ShapeIdCounter } from "./shape";
export { convertDocument, type FigToPptxSlideOptions } from "./slide";
