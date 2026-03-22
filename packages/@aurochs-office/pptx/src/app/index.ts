/**
 * @file Presentation reader entry point
 * Main entry point for reading PPTX files
 */

export { openPresentation } from "./open-presentation";
export type { Presentation, Slide, SlideInfo, ListOptions, PresentationOptions } from "./types";
// NOTE: For createRenderContext and getLayoutNonPlaceholderShapes, import directly from @aurochs-renderer/pptx
export { loadPptxFromBuffer, loadPptxFromFile, loadPptxFromUrl } from "./pptx-loader";
export type { LoadedPresentation } from "./pptx-loader";
export { convertToPresentationDocument, createResourceResolverFromMaps } from "./presentation-converter";
export { buildSlideLayoutOptions, buildSlideLayoutEntries, loadSlideLayoutBundle } from "./slide-layouts";
export type { SlideLayoutOption, SlideLayoutEntry, SlideLayoutBundle } from "./slide-layouts";
export type { PresentationDocument, SlideWithId, SlideId } from "./presentation-document";
export { extractThemeFromBuffer } from "./theme-extractor";
export type { ThemeExtractionResult } from "./theme-extractor";
// ExtractedTheme: import from @aurochs-office/pptx/domain (SoT)
