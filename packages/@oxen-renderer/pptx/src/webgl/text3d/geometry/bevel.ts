/**
 * @file 3D Bevel Configuration for WebGL rendering
 *
 * ECMA-376 bevel preset configuration mapping.
 * This module is Three.js-independent - it only provides configuration data.
 *
 * For geometry creation, use `./bevel/three-adapter.ts`:
 * - `createExtrudedGeometryWithBevel` for creating 3D geometry
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import type { Shape3d, Bevel3d } from "@oxen-office/pptx/domain/index";

// =============================================================================
// Geometry Configuration Types
// =============================================================================

export type TextGeometryConfig = {
  /** Text content */
  readonly text: string;
  /** Font size in pixels */
  readonly fontSize: number;
  /** Font family */
  readonly fontFamily: string;
  /** Font weight */
  readonly fontWeight: number;
  /** Font style */
  readonly fontStyle: "normal" | "italic";
  /** Extrusion depth in pixels */
  readonly extrusionDepth: number;
  /** Bevel configuration */
  readonly bevel: BevelConfig | undefined;
};

export type BevelConfig = {
  /** Bevel thickness */
  readonly thickness: number;
  /** Bevel size */
  readonly size: number;
  /** Bevel segments (smoothness) */
  readonly segments: number;
};

/**
 * Asymmetric bevel configuration for ECMA-376 compliant extrusion.
 * Supports separate top (front) and bottom (back) bevels.
 */
export type AsymmetricBevelConfig = {
  /** Front face bevel (bevelT) */
  readonly top?: BevelConfig;
  /** Back face bevel (bevelB) */
  readonly bottom?: BevelConfig;
};

// =============================================================================
// Bevel Preset Configurations
// =============================================================================

/**
 * Get bevel configuration from ECMA-376 preset
 *
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
 */
export function getBevelConfig(bevel: Bevel3d | undefined): BevelConfig | undefined {
  if (!bevel) {
    return undefined;
  }

  const width = bevel.width as number;
  const height = bevel.height as number;
  // Keep bevel in same pixel units as shape paths and extrusion depth
  // The scaleGroupToFit in core.ts handles final sizing
  const baseSize = Math.min(width, height);

  switch (bevel.preset) {
    case "angle":
      return { thickness: baseSize * 0.5, size: baseSize, segments: 1 };

    case "artDeco":
      return { thickness: baseSize * 0.8, size: baseSize * 0.6, segments: 3 };

    case "circle":
      return { thickness: baseSize, size: baseSize, segments: 8 };

    case "convex":
      return { thickness: baseSize * 1.2, size: baseSize * 0.8, segments: 6 };

    case "coolSlant":
      return { thickness: baseSize * 0.4, size: baseSize * 1.2, segments: 2 };

    case "cross":
      return { thickness: baseSize * 0.6, size: baseSize * 0.6, segments: 2 };

    case "divot":
      return { thickness: baseSize * 0.3, size: baseSize * 0.5, segments: 4 };

    case "hardEdge":
      return { thickness: baseSize * 0.2, size: baseSize * 0.3, segments: 1 };

    case "relaxedInset":
      return { thickness: baseSize * 0.7, size: baseSize * 0.9, segments: 4 };

    case "riblet":
      return { thickness: baseSize * 0.4, size: baseSize * 0.4, segments: 2 };

    case "slope":
      return { thickness: baseSize * 0.6, size: baseSize * 1.0, segments: 3 };

    case "softRound":
      return { thickness: baseSize * 0.9, size: baseSize * 0.9, segments: 6 };

    default:
      return { thickness: baseSize * 0.5, size: baseSize * 0.5, segments: 3 };
  }
}

/**
 * Get asymmetric bevel configuration from Shape3d.
 *
 * Returns separate top (front) and bottom (back) bevel configs
 * per ECMA-376 bevelT/bevelB specification.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export function getAsymmetricBevelConfig(shape3d: Shape3d | undefined): AsymmetricBevelConfig {
  if (!shape3d) {
    return { top: undefined, bottom: undefined };
  }

  return {
    top: getBevelConfig(shape3d.bevelTop),
    bottom: getBevelConfig(shape3d.bevelBottom),
  };
}
