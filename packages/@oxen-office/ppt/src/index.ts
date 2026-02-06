/**
 * @file @oxen-office/ppt public API
 */

export { parsePpt, parsePptWithReport, type ParsePptOptions, type ParsePptResult } from "./parser";
export { convertPptToPptx } from "./converter";
export { extractPptPresentation } from "./extractor";
export type { PptPresentation, PptSlide, PptShape, PptSlideSize, PptEmbeddedImage } from "./domain/types";
