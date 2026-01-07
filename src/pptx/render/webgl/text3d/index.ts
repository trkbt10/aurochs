/**
 * @file WebGL 3D Text Rendering Module
 *
 * Provides true 3D text rendering using Three.js WebGL.
 *
 * ## Structure
 *
 * - scene/    - Three.js scene setup (camera, lighting, materials)
 * - geometry/ - 3D geometry construction from glyphs
 * - renderer/ - Integration layer and React component
 *
 * Glyph extraction is in the separate `render/glyph` module (general-purpose).
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

// React component
export { Text3DRenderer, shouldRender3DText } from "./renderer/Text3DRenderer";
export type { Text3DRendererProps, Text3DRunConfig } from "./renderer/Text3DRenderer";

// Renderer core
export {
  createText3DRendererAsync,
  shouldUseWebGL3D,
} from "./renderer/core";
export type {
  Text3DRenderer as IText3DRenderer,
  Text3DRenderConfig,
  Text3DRunConfig as Text3DRunConfigCore,
} from "./renderer/core";

// Scene - Camera
export { createCameraConfig, createCamera } from "./scene/camera";
export type { CameraConfig } from "./scene/camera";

// Scene - Lighting
export { createLightingConfig, addLightsToScene } from "./scene/lighting";
export type { LightConfig } from "./scene/lighting";

// Scene - Materials
export {
  createMaterialConfig,
  createMaterial,
  createExtrusionMaterial,
  createBevelMaterial,
  parseColor,
  rgbToHex,
  createGradientMaterial,
  createPatternMaterial,
  createImageMaterial,
  createMaterialFromFill,
} from "./scene/materials";
export type { MaterialConfig, Material3DFill, Material3DPatternFill, Material3DImageFill, ResolvedMaterialGradientStop } from "./scene/materials";

// Scene - Pattern Textures
export {
  createPatternTextureFromResolved,
  clearPatternTextureCache,
} from "./scene/pattern-texture";
export type { PatternPreset } from "./scene/pattern-texture";

// Scene - Image Textures
export {
  createImageTextureFromUrl,
  createImageTextureFromImageData,
  createImageTextureFromElement,
  clearImageTextureCache,
  getCachedImageTexture,
} from "./scene/image-texture";
export type { ImageFillMode, SourceRect } from "./scene/image-texture";

// Scene - Gradient Textures (internal resolved types)
export {
  createLinearGradientTextureFromResolved,
  createRadialGradientTextureFromResolved,
  clearGradientTextureCache,
} from "./scene/gradient-texture";

// Scene - Backdrop
export {
  createBackdropMesh,
  createDefaultBackdrop,
  createGradientBackdrop,
  createBackdropFromDomain,
  updateBackdropColor,
  updateBackdropOpacity,
  updateBackdropPosition,
  disposeBackdrop,
  addBackdropToScene,
} from "./scene/backdrop";
export type { BackdropConfig, BackdropState } from "./scene/backdrop";

// Geometry - Bevel config
export { getBevelConfig } from "./geometry/bevel";
export type { BevelConfig } from "./geometry/bevel";

// Geometry - Custom Bevel (ECMA-376 compliant)
// High-level Three.js API
export { createCustomBevelGeometry } from "./geometry/custom-bevel";

// Re-exports from Three.js independent bevel module
export {
  getBevelProfile,
  BEVEL_PROFILES,
} from "./geometry/custom-bevel";
export type { BevelProfile, BevelProfilePoint } from "./geometry/custom-bevel";

// Three.js independent bevel types (for advanced usage)
// Import from bevel/index to get the Three.js independent module
export type {
  BevelPath,
  BevelPathPoint,
  BevelGeometryData,
  BevelMeshConfig,
  ShapeInput,
} from "./geometry/bevel/index";
export {
  extractBevelPathsFromShape,
  generateBevelMesh,
  mergeBevelGeometries,
} from "./geometry/bevel/index";

// Geometry - Text Warp
export {
  applyTextWarp,
  isTextWarpSupported,
  getSupportedTextWarps,
} from "./geometry/text-warp";

// Geometry - From contours
export { createTextGeometryAsync, mergeExtrudeGeometries, scaleGeometryToFit } from "./geometry/from-contours-async";
export type { TextGeometryConfig } from "./geometry/from-contours-async";

// Geometry - Unified merge (NEW)
export { mergeBufferGeometries, mergeExtrudeGeometriesLegacy } from "./geometry/merge-geometries";
export type { MergeGeometriesOptions } from "./geometry/merge-geometries";

// Effects
export {
  // Outline
  createOutlineMesh,
  createBackFaceOutline,
  createShaderOutline,
  addOutlineToGroup,
  updateOutlineColor,
  updateOutlineVisibility,
  disposeOutline,
  // Shadow
  enableShadowMapping,
  createShadowLight,
  createDropShadowMesh,
  createInnerShadowMesh,
  createInnerShadowShader,
  enableMeshShadows,
  enableGroupShadows,
  createShadowPlane,
  disposeShadow,
  // Glow
  createGlowMesh,
  createLayeredGlow,
  createGlowSprite,
  addGlowToGroup,
  updateGlowColor,
  updateGlowIntensity,
  disposeGlow,
  // Reflection
  createReflectionMesh,
  createGradientReflection,
  createReflectiveFloor,
  addReflectionToGroup,
  updateReflectionOpacity,
  disposeReflection,
  // Soft Edge
  createSoftEdgeMesh,
  createLayeredSoftEdge,
  applySoftEdgeToMesh,
  createBlurPassConfig,
  addSoftEdgeToGroup,
  updateSoftEdgeRadius,
  removeSoftEdge,
  disposeSoftEdge,
  // Soft Edge Post-Processing
  createSoftEdgeComposer,
  applySoftEdgePostProcess,
  updateSoftEdgePostProcessRadius,
  resizeSoftEdgePostProcess,
  createMeshSoftEdgeEffect,
  isSoftEdgePostProcessSupported,
  // Contour
  createContourMesh,
  createContourMeshExpanded,
  updateContourColor,
  disposeContour,
} from "./effects";
export type {
  OutlineConfig,
  ShadowConfig,
  ShadowState,
  GlowConfig,
  ReflectionConfig,
  SoftEdgeConfig,
  BlurPassConfig,
  SoftEdgePostProcessConfig,
  SoftEdgeComposerState,
  ContourConfig,
} from "./effects";

// Re-export glyph module types for convenience
export type {
  ContourPath,
  GlyphContour,
  GlyphMetrics,
  GlyphStyleKey,
  PositionedGlyph,
  TextLayoutConfig,
  TextLayoutResult,
} from "../../glyph";
