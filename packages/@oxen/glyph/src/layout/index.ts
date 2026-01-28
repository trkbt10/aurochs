/**
 * @file Text layout module
 *
 * Text layout engine using glyph contours.
 */

export {
  layoutText,
  getTextBounds,
  splitTextIntoLines,
  measureTextWidth,
  type GlyphExtractor,
  type LayoutDeps,
} from "./text";

export { layoutTextAsync, terminateWorker } from "./text-async";

export {
  setKerningTable,
  getKerningAdjustment,
  hasKerningTable,
  clearKerningTables,
} from "./kerning-table";

export {
  calculateOpticalAdvance,
  calculateOpticalKerningAdjustment,
} from "./kerning";
