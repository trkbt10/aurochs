/**
 * @file ASCII slide renderer - terminal visualization of slide shapes
 */

export type {
  AsciiRenderableShape,
  AsciiGraphicContent,
  AsciiTableContent,
  AsciiChartContent,
  AsciiDiagramContent,
  Bounds,
} from "./types";
export type { SlideRenderParams } from "./slide-renderer";
export { renderSlideAscii } from "./slide-renderer";
