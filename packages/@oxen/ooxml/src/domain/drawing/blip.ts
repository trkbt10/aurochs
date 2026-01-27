/**
 * Blip (image reference), cropping, and tiling types shared across OOXML formats.
 */

import type { EMU } from "../units";
import type { RelationshipId } from "./relationship";

/**
 * Source rectangle for cropping.
 * Values are in percentage (0-100000 = 0-100%).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.55 (srcRect)
 */
export type DrawingSourceRect = {
  readonly l?: number;
  readonly t?: number;
  readonly r?: number;
  readonly b?: number;
};

/**
 * Blip compression state.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.13 (blip, cstate attribute)
 */
export type BlipCompression = "email" | "hqprint" | "print" | "screen" | "none";

/**
 * Blip reference to an image.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.13 (blip)
 */
export type DrawingBlip = {
  /** Relationship ID to the embedded image file */
  readonly rEmbed?: RelationshipId;
  /** Relationship ID to linked image */
  readonly rLink?: RelationshipId;
  /** Compression state */
  readonly cstate?: BlipCompression;
};

/**
 * Tile flip mode for tiled fills.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.66 (ST_TileFlipMode)
 */
export type TileFlipMode = "none" | "x" | "y" | "xy";

/**
 * Tile fill configuration.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.58 (tile)
 */
export type DrawingTileFill = {
  /** Horizontal offset in EMUs */
  readonly tx?: EMU;
  /** Vertical offset in EMUs */
  readonly ty?: EMU;
  /** Horizontal scale percentage (100000 = 100%) */
  readonly sx?: number;
  /** Vertical scale percentage (100000 = 100%) */
  readonly sy?: number;
  /** Tile flip mode */
  readonly flip?: TileFlipMode;
  /** Alignment */
  readonly algn?: string;
};

/**
 * Blip fill for an image.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type DrawingBlipFill = {
  /** Blip reference */
  readonly blip?: DrawingBlip;
  /** Stretch fill mode (true if stretch element present) */
  readonly stretch?: boolean;
  /** Tile fill configuration */
  readonly tile?: DrawingTileFill;
  /** Source rectangle (for cropping) */
  readonly srcRect?: DrawingSourceRect;
};

