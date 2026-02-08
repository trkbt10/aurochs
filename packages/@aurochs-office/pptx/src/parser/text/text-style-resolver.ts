/**
 * @file Text style resolution with inheritance
 *
 * Resolves text styles (font size, color, font family) using ECMA-376 inheritance chain:
 * 1. Direct run properties (a:rPr)
 * 2. Local list style (a:lstStyle in shape's txBody)
 * 3. Layout placeholder style
 * 4. Master placeholder style
 * 5. Master text styles (p:txStyles)
 * 6. Default text style
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (Text)
 */

// Constants
export { TYPE_TO_MASTER_STYLE } from "./resolver/constants";

// Placeholder lookup
export { lookupPlaceholder } from "./resolver/placeholder";

// Font size resolution
export {
  resolveFontSize,
  resolveDefRPr,
  getFontSizeFromRPr,
  getFontSizeFromLstStyle,
} from "./resolver/font-size";

// Alignment resolution
export { resolveAlignment } from "./resolver/alignment";
export type { TextAlignment } from "./resolver/alignment";

// Text color resolution
export { resolveTextColor } from "./resolver/color";

// Font family resolution
export { resolveFontFamily } from "./resolver/font-family";
export type { FontFamilyResult } from "./resolver/font-family";

// Bullet style resolution
export { resolveBulletStyle } from "./resolver/bullet";
export type { BulletProperties } from "./resolver/bullet";

// Spacing resolution
export {
  resolveSpaceBefore,
  resolveSpaceAfter,
  resolveLineSpacing,
} from "./resolver/spacing";

// Margin resolution
export {
  resolveMarginLeft,
  resolveMarginRight,
  resolveIndent,
} from "./resolver/margin";
