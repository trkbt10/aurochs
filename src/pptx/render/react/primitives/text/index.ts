/**
 * @file Text module exports
 *
 * React components and utilities for rendering DrawingML text.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

export { TextRenderer, type TextRendererProps } from "./TextRenderer";
export { extractText3DRuns } from "./extract-3d-runs";
export { renderLayoutResult } from "./layout-render";
export { renderBullet } from "./bullet-render";
export { renderSpan, renderLine } from "./span-render";
export {
  buildFontFamily,
  applyTextTransform,
  applyVerticalAlign,
  toSvgDominantBaseline,
} from "./text-utils";
