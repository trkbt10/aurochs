/**
 * @file DrawingML parser functions
 *
 * OOXML element parsing for DrawingML color, fill, and theme processing.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

// Types
export type { GradientFill, FillResult, FillType } from "./types";
export type { BackgroundElement, BackgroundParseResult } from "../render/background";

// Color parsing
export { getSchemeColor, getSolidFill } from "./color";

// Fill parsing
export {
  getFillType,
  getGradientFill,
  getPicFillFromContext,
  getPatternFill,
  getLinearGradient,
  getFillHandler,
  formatFillResult,
} from "./fill";

// Background parsing (re-exported from render/background.ts)
export {
  xmlElementToFillElements,
  xmlElementToBlipFill,
  getBackgroundElement,
  getBgPrFromElement,
  getBgRefFromElement,
  resolveBgRefToFillElements,
  extractPhClrFromBgRef,
  parseBackgroundProperties,
  findBackgroundRef,
  hasOwnBackground,
} from "../render/background";

// Theme parsing
export {
  parseFontScheme,
  parseColorScheme,
  parseColorMap,
  parseFormatScheme,
  parseObjectDefaults,
  parseCustomColorList,
  parseExtraColorSchemes,
  parseTheme,
  parseMasterTextStyles,
} from "./theme";
