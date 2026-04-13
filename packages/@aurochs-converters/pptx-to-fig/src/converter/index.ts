/**
 * @file Converter module index for pptx-to-fig
 */

export { convertText } from "./text";
export { convertGeometry, type FigGeometryResult } from "./geometry";
export { convertShape, convertShapes, type NodeIdCounter, type ConvertContext } from "./shape";
export { convertDocument } from "./page";
