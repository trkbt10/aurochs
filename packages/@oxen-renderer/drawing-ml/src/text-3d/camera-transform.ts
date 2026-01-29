/**
 * @file Camera transform calculations for 3D text
 *
 * Calculates SVG transform strings from camera presets.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.2 (camera)
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Camera transform result
 */
export type CameraTransformResult = {
  readonly transform: string;
  readonly perspective?: number;
};

// =============================================================================
// Camera Transform Handlers
// =============================================================================

/**
 * Camera preset to transform mapping.
 *
 * Uses handler pattern for O(1) lookup.
 */
const CAMERA_TRANSFORM_HANDLERS: Record<string, (fov?: number) => CameraTransformResult> = {
  // Orthographic (no perspective)
  orthographicFront: () => ({ transform: "" }),

  // Isometric views
  isometricTopUp: () => ({ transform: "matrix(0.866, 0.5, -0.866, 0.5, 0, 0)" }),
  isometricTopDown: () => ({ transform: "matrix(0.866, -0.5, -0.866, -0.5, 0, 0)" }),
  isometricBottomUp: () => ({ transform: "matrix(0.866, -0.5, 0.866, 0.5, 0, 0)" }),
  isometricBottomDown: () => ({ transform: "matrix(0.866, 0.5, 0.866, -0.5, 0, 0)" }),
  isometricLeftUp: () => ({ transform: "matrix(0.866, -0.5, 0, 1, 0, 0)" }),
  isometricLeftDown: () => ({ transform: "matrix(0.866, 0.5, 0, 1, 0, 0)" }),
  isometricRightUp: () => ({ transform: "matrix(0.866, 0.5, 0, 1, 0, 0)" }),
  isometricRightDown: () => ({ transform: "matrix(0.866, -0.5, 0, 1, 0, 0)" }),

  // Oblique views (simple skew transforms)
  obliqueTop: () => ({ transform: "skewX(-15)" }),
  obliqueBottom: () => ({ transform: "skewX(15)" }),
  obliqueLeft: () => ({ transform: "skewY(-15)" }),
  obliqueRight: () => ({ transform: "skewY(15)" }),
  obliqueTopLeft: () => ({ transform: "skewX(-15) skewY(-15)" }),
  obliqueTopRight: () => ({ transform: "skewX(15) skewY(-15)" }),
  obliqueBottomLeft: () => ({ transform: "skewX(-15) skewY(15)" }),
  obliqueBottomRight: () => ({ transform: "skewX(15) skewY(15)" }),

  // Perspective views (approximated with scale transforms)
  perspectiveFront: (fov) => ({ transform: "", perspective: fov ?? 45 }),
  perspectiveAbove: () => ({ transform: "scaleY(0.9) translateY(5%)" }),
  perspectiveBelow: () => ({ transform: "scaleY(0.9) translateY(-5%)" }),
  perspectiveLeft: () => ({ transform: "scaleX(0.95) translateX(2%)" }),
  perspectiveRight: () => ({ transform: "scaleX(0.95) translateX(-2%)" }),
  perspectiveAboveLeftFacing: () => ({ transform: "scaleY(0.9) skewX(-10)" }),
  perspectiveAboveRightFacing: () => ({ transform: "scaleY(0.9) skewX(10)" }),
  perspectiveRelaxed: () => ({ transform: "scaleY(0.95)" }),
  perspectiveRelaxedModerately: () => ({ transform: "scaleY(0.97)" }),
};

/**
 * Calculate camera transform from preset.
 *
 * @param preset - Camera preset name
 * @param fov - Field of view (optional)
 * @returns Camera transform result
 */
export function calculateCameraTransform(preset: string, fov?: number): CameraTransformResult {
  const handler = CAMERA_TRANSFORM_HANDLERS[preset];

  if (handler) {
    return handler(fov);
  }

  // Default: no transform
  return { transform: "" };
}
