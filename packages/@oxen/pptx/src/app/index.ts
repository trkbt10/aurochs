/**
 * @file Presentation reader entry point
 * Main entry point for reading PPTX files
 */

export { openPresentation } from "./open-presentation";
export type { Presentation, Slide, SlideInfo, ListOptions, PresentationOptions } from "./types";
export { createRenderContext, getLayoutNonPlaceholderShapes } from "./render-context";
export { loadPptxFromBuffer, loadPptxFromFile, loadPptxFromUrl } from "./pptx-loader";
export type { LoadedPresentation } from "./pptx-loader";
export { convertToPresentationDocument } from "./presentation-converter";
export { buildSlideLayoutOptions, loadSlideLayoutBundle } from "./slide-layouts";
export type { SlideLayoutOption, SlideLayoutBundle } from "./slide-layouts";
export type { PresentationDocument, SlideWithId, SlideId } from "./presentation-document";
