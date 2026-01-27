/**
 * Transform types shared across OOXML formats.
 */

import type { EMU } from "../units";

/**
 * Transform for a shape or picture.
 *
 * @see ECMA-376 Part 1, Section 20.1.7.6 (xfrm)
 */
export type DrawingTransform = {
  /** X offset in EMUs */
  readonly offX?: EMU;
  /** Y offset in EMUs */
  readonly offY?: EMU;
  /** Width in EMUs */
  readonly extCx?: EMU;
  /** Height in EMUs */
  readonly extCy?: EMU;
  /** Rotation in 60000ths of a degree */
  readonly rot?: number;
  /** Flip horizontal */
  readonly flipH?: boolean;
  /** Flip vertical */
  readonly flipV?: boolean;
};

