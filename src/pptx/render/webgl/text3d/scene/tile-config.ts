/**
 * @file Tile Configuration Utilities for 3D Material Textures
 *
 * Provides THREE.js texture configuration utilities for ECMA-376 tile settings.
 * Types are imported from domain layer - this file only contains render utilities.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.58 (tile)
 * @see ECMA-376 Part 1, Section 20.1.10.66 (ST_TileFlipMode)
 */

import * as THREE from "three";
import type { TileFlipMode, TileFill, GradientFill } from "../../../../domain/color/types";
import type { Percent, Pixels } from "../../../../domain/types";

// =============================================================================
// Re-export Domain Types for Convenience
// =============================================================================

// Note: Consumers should import directly from domain when possible.
// These are re-exported only for internal render layer use.

/**
 * Tile rectangle from domain (GradientFill.tileRect)
 */
export type TileRect = NonNullable<GradientFill["tileRect"]>;

// =============================================================================
// Flip Mode Implementation
// =============================================================================

/**
 * Apply tile flip mode to a texture.
 *
 * ECMA-376 flip modes create mirror effects at tile boundaries:
 * - "x": Uses MirroredRepeatWrapping for horizontal axis
 * - "y": Uses MirroredRepeatWrapping for vertical axis
 * - "xy": Uses MirroredRepeatWrapping for both axes
 *
 * @param texture - Three.js texture to configure
 * @param flipMode - ECMA-376 flip mode
 */
export function applyTileFlipMode(texture: THREE.Texture, flipMode: TileFlipMode): void {
  switch (flipMode) {
    case "none":
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      break;

    case "x":
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      break;

    case "y":
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.MirroredRepeatWrapping;
      break;

    case "xy":
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.wrapT = THREE.MirroredRepeatWrapping;
      break;
  }
}

// =============================================================================
// Tile Rectangle Calculations
// =============================================================================

/**
 * Calculate texture repeat and offset from tileRect.
 *
 * ECMA-376 tileRect defines the region where gradient/fill is rendered:
 * - Negative values expand beyond the shape
 * - Positive values shrink into the shape
 * - The rendered region is then tiled to fill the shape
 *
 * @param tileRect - ECMA-376 tileRect configuration
 * @returns Texture repeat and offset values
 */
export function calculateTileRectTransform(tileRect: TileRect): {
  repeatX: number;
  repeatY: number;
  offsetX: number;
  offsetY: number;
} {
  // Calculate the tile region size (as fraction of 1.0)
  // tileRect values are Percent branded: -50 means 50% outside, +50 means 50% inward
  const left = (tileRect.left as number) / 100;
  const right = (tileRect.right as number) / 100;
  const top = (tileRect.top as number) / 100;
  const bottom = (tileRect.bottom as number) / 100;

  // Width and height of the tile region
  const tileWidth = 1 - left - right;
  const tileHeight = 1 - top - bottom;

  // Repeat is inverse of tile size (smaller tile = more repeats)
  const repeatX = tileWidth > 0 ? 1 / tileWidth : 1;
  const repeatY = tileHeight > 0 ? 1 / tileHeight : 1;

  // Offset based on left/bottom (Three.js uses bottom-left origin)
  const offsetX = -left * repeatX;
  const offsetY = -bottom * repeatY;

  return { repeatX, repeatY, offsetX, offsetY };
}

/**
 * Apply tileRect configuration to a texture.
 *
 * @param texture - Three.js texture to configure
 * @param tileRect - ECMA-376 tileRect configuration
 */
export function applyTileRect(texture: THREE.Texture, tileRect: TileRect): void {
  const { repeatX, repeatY, offsetX, offsetY } = calculateTileRectTransform(tileRect);

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(offsetX, offsetY);
}

// =============================================================================
// Tile Fill Configuration
// =============================================================================

/**
 * Calculate texture transform from TileFill (domain type).
 *
 * @param config - ECMA-376 tile fill configuration from domain
 * @param geometryWidth - Width of the geometry in pixels
 * @param geometryHeight - Height of the geometry in pixels
 * @param textureWidth - Original texture width
 * @param textureHeight - Original texture height
 */
export function calculateTileFillTransform(
  config: TileFill,
  geometryWidth: number,
  geometryHeight: number,
  textureWidth: number,
  textureHeight: number,
): {
  repeatX: number;
  repeatY: number;
  offsetX: number;
  offsetY: number;
} {
  // Scale factors (Percent to decimal)
  const scaleX = (config.sx as number) / 100;
  const scaleY = (config.sy as number) / 100;

  // Scaled tile size
  const tileWidth = textureWidth * scaleX;
  const tileHeight = textureHeight * scaleY;

  // How many tiles fit in the geometry
  const repeatX = tileWidth > 0 ? geometryWidth / tileWidth : 1;
  const repeatY = tileHeight > 0 ? geometryHeight / tileHeight : 1;

  // Calculate offset based on alignment and tx/ty
  const { alignOffsetX, alignOffsetY } = getAlignmentOffset(
    config.alignment,
    geometryWidth,
    geometryHeight,
    tileWidth,
    tileHeight,
  );

  const offsetX = ((config.tx as number) + alignOffsetX) / geometryWidth;
  const offsetY = ((config.ty as number) + alignOffsetY) / geometryHeight;

  return { repeatX, repeatY, offsetX, offsetY };
}

/**
 * Get alignment offset based on RectAlignment.
 */
function getAlignmentOffset(
  alignment: TileFill["alignment"],
  geoWidth: number,
  geoHeight: number,
  tileWidth: number,
  tileHeight: number,
): { alignOffsetX: number; alignOffsetY: number } {
  const alignmentOffsets: Record<TileFill["alignment"], { x: number; y: number }> = {
    tl: { x: 0, y: 0 },
    t: { x: (geoWidth - tileWidth) / 2, y: 0 },
    tr: { x: geoWidth - tileWidth, y: 0 },
    l: { x: 0, y: (geoHeight - tileHeight) / 2 },
    ctr: { x: (geoWidth - tileWidth) / 2, y: (geoHeight - tileHeight) / 2 },
    r: { x: geoWidth - tileWidth, y: (geoHeight - tileHeight) / 2 },
    bl: { x: 0, y: geoHeight - tileHeight },
    b: { x: (geoWidth - tileWidth) / 2, y: geoHeight - tileHeight },
    br: { x: geoWidth - tileWidth, y: geoHeight - tileHeight },
  };

  const offset = alignmentOffsets[alignment];
  return { alignOffsetX: offset.x, alignOffsetY: offset.y };
}

/**
 * Apply tile fill configuration to a texture.
 *
 * @param texture - Three.js texture to configure
 * @param config - ECMA-376 tile fill configuration from domain
 * @param geometryWidth - Width of the geometry
 * @param geometryHeight - Height of the geometry
 * @param textureWidth - Original texture width
 * @param textureHeight - Original texture height
 */
export function applyTileFillConfig(
  texture: THREE.Texture,
  config: TileFill,
  geometryWidth: number,
  geometryHeight: number,
  textureWidth: number,
  textureHeight: number,
): void {
  // Apply flip mode
  applyTileFlipMode(texture, config.flip);

  // Calculate and apply transform
  const { repeatX, repeatY, offsetX, offsetY } = calculateTileFillTransform(
    config,
    geometryWidth,
    geometryHeight,
    textureWidth,
    textureHeight,
  );

  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(offsetX, offsetY);
}

// =============================================================================
// Default Values (matching domain defaults)
// =============================================================================

/**
 * Create default TileFill configuration.
 * Uses domain branded types.
 */
export function createDefaultTileFill(): TileFill {
  return {
    tx: 0 as Pixels,
    ty: 0 as Pixels,
    sx: 100 as Percent,
    sy: 100 as Percent,
    flip: "none",
    alignment: "tl",
  };
}

/**
 * Create default TileRect configuration (no tiling).
 * Uses domain branded types.
 */
export function createDefaultTileRect(): TileRect {
  return {
    left: 0 as Percent,
    top: 0 as Percent,
    right: 0 as Percent,
    bottom: 0 as Percent,
  };
}

/**
 * Check if tileRect is the default (no tiling).
 */
export function isTileRectDefault(tileRect: TileRect): boolean {
  return (
    (tileRect.left as number) === 0 &&
    (tileRect.top as number) === 0 &&
    (tileRect.right as number) === 0 &&
    (tileRect.bottom as number) === 0
  );
}
