/**
 * @file PDF font defaults
 *
 * Default values for font metrics when no font information is available.
 */

import type { FontMetrics } from "./types";

/**
 * Default font metrics when no font information is available
 *
 * PDF Reference 5.2.3, 5.7.1:
 * Font metrics are expressed in units of 1/1000 of the em-square.
 * The em-square is traditionally 1000 units for most fonts.
 *
 * Default values are based on common Latin font metrics:
 * - PDF standard 14 fonts (Helvetica, Times, Courier) have:
 *   - Helvetica: ascender ~718, descender ~-207
 *   - Times-Roman: ascender ~683, descender ~-217
 *   - Courier: ascender ~629, descender ~-157
 *
 * - We use slightly larger defaults (800/-200) to accommodate:
 *   - Fonts with taller ascenders (many display fonts)
 *   - CJK fonts which often extend higher
 *   - Conservative estimates that avoid clipping
 *
 * Total glyph height = ascender - descender = 800 - (-200) = 1000 units
 * This matches the standard em-square size.
 */
export const DEFAULT_FONT_METRICS: FontMetrics = {
  widths: new Map(),
  defaultWidth: 500, // PDF Reference 5.2.3: Common approximation (half em-width)
  ascender: 800,     // Conservative estimate for cap-height + ascender space
  descender: -200,   // Conservative estimate for descender depth
};
