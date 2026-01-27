/**
 * Extent (size) types shared across OOXML formats.
 */

import type { EMU } from "../units";

/**
 * Extent specifies the size of an object in EMUs.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.7 (extent)
 * @see ECMA-376 Part 1, Section 20.1.7.3 (ext)
 */
export type DrawingExtent = {
  /** Width in EMUs */
  readonly cx: EMU;
  /** Height in EMUs */
  readonly cy: EMU;
};

/**
 * Effect extent specifies additional space around an object for effects.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.6 (effectExtent)
 */
export type DrawingEffectExtent = {
  /** Left extent in EMUs */
  readonly l: EMU;
  /** Top extent in EMUs */
  readonly t: EMU;
  /** Right extent in EMUs */
  readonly r: EMU;
  /** Bottom extent in EMUs */
  readonly b: EMU;
};

