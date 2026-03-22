/**
 * @file Text node builder exports
 */

// Types
export type { TextNodeData, DerivedTextNodeData, DerivedGlyphData, DerivedBaselineData } from "./types";

// Builder
export {
  type TextNodeBuilder,
  textNode,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LETTER_SPACING,
  DEFAULT_AUTO_RESIZE,
} from "./text";
