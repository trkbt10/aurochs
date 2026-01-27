/**
 * @file DrawingML parser functions
 *
 * OOXML element parsing for DrawingML color, fill, theme, and background processing.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

// Parser-specific fill types (not domain types)
export type { FillType, FillResult, GradientFill } from "./fill";

// Background types: import directly from "@/pptx/domain/drawing-ml/background"

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
  detectImageFillMode,
} from "./fill";

// Background parsing
export {
  getBackgroundElement,
  getBgPrFromElement,
  getBgRefFromElement,
  resolveBgRefToXmlElement,
  extractPhClrFromBgRef,
  parseBackgroundProperties,
  findBackgroundRef,
  hasOwnBackground,
  getBackgroundFillData,
} from "./background";

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

// Text fill resolution
export type { ResourceResolver } from "./text-fill";
export { resolveTextFill } from "./text-fill";

// Text effects resolution
export { resolveTextEffects } from "./text-effects";
