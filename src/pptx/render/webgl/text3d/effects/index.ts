/**
 * @file 3D Text Effects Module
 *
 * Provides visual effects for 3D text rendering:
 * - Outline (ln) - Edge/stroke rendering
 * - Shadow (outerShdw/innerShdw) - Drop shadows
 * - Glow - Bloom/glow effect
 * - Reflection - Mirror effect
 * - Soft Edge - Blur on edges
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */

// =============================================================================
// Outline
// =============================================================================

export {
  createOutlineMesh,
  createBackFaceOutline,
  createShaderOutline,
  addOutlineToGroup,
  updateOutlineColor,
  updateOutlineVisibility,
  disposeOutline,
} from "./outline";
export type { OutlineConfig } from "./outline";

// =============================================================================
// Shadow
// =============================================================================

export {
  enableShadowMapping,
  createShadowLight,
  createDropShadowMesh,
  createInnerShadowMesh,
  createInnerShadowShader,
  enableMeshShadows,
  enableGroupShadows,
  createShadowPlane,
  disposeShadow,
} from "./shadow";
export type { ShadowConfig, ShadowState } from "./shadow";

// =============================================================================
// Glow
// =============================================================================

export {
  createGlowMesh,
  createLayeredGlow,
  createGlowSprite,
  addGlowToGroup,
  updateGlowColor,
  updateGlowIntensity,
  disposeGlow,
} from "./glow";
export type { GlowConfig } from "./glow";

// =============================================================================
// Reflection
// =============================================================================

export {
  createReflectionMesh,
  createGradientReflection,
  createReflectiveFloor,
  addReflectionToGroup,
  updateReflectionOpacity,
  disposeReflection,
} from "./reflection";
export type { ReflectionConfig } from "./reflection";

// =============================================================================
// Soft Edge
// =============================================================================

export {
  createSoftEdgeMesh,
  createLayeredSoftEdge,
  applySoftEdgeToMesh,
  createBlurPassConfig,
  addSoftEdgeToGroup,
  updateSoftEdgeRadius,
  removeSoftEdge,
  disposeSoftEdge,
} from "./soft-edge";
export type { SoftEdgeConfig, BlurPassConfig } from "./soft-edge";

// =============================================================================
// Soft Edge Post-Processing
// =============================================================================

export {
  createSoftEdgeComposer,
  applySoftEdgePostProcess,
  updateSoftEdgePostProcessRadius,
  resizeSoftEdgePostProcess,
  createMeshSoftEdgeEffect,
  isSoftEdgePostProcessSupported,
} from "./soft-edge-postprocess";
export type {
  SoftEdgePostProcessConfig,
  SoftEdgeComposerState,
} from "./soft-edge-postprocess";

// =============================================================================
// Contour
// =============================================================================

export {
  createContourMesh,
  createContourMeshExpanded,
  createContourFromShapes,
  updateContourColor,
  disposeContour,
} from "./contour";
export type { ContourConfig, ContourFromShapesConfig } from "./contour";
