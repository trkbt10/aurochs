/**
 * @file WebGL Rendering Module
 *
 * Provides WebGL-based rendering capabilities for complex 3D effects.
 */

// 3D Text rendering
export { Text3DRenderer, shouldRender3DText } from "./text3d/renderer/Text3DRenderer";
export type { Text3DRendererProps, Text3DRunConfig } from "./text3d/renderer/Text3DRenderer";

// Renderer core
export { createText3DRendererAsync, shouldUseWebGL3D } from "./text3d/renderer/core";
export type {
  Text3DRenderer as IText3DRenderer,
  Text3DRenderConfig,
  Text3DRunConfig as Text3DRunConfigCore,
} from "./text3d/renderer/core";

// Scene - Camera
export { createCameraConfig, createCamera } from "./text3d/scene/camera";
export type { CameraConfig } from "./text3d/scene/camera";

// Scene - Lighting
export { createLightingConfig, addLightsToScene } from "./text3d/scene/lighting";
export type { LightConfig } from "./text3d/scene/lighting";

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
} from "./text3d/scene/materials";
export type {
  MaterialConfig,
  Material3DFill,
  Material3DPatternFill,
  Material3DImageFill,
  ResolvedMaterialGradientStop,
} from "./text3d/scene/materials";

// Scene - Pattern Textures
export { createPatternTextureFromResolved, clearPatternTextureCache } from "./text3d/scene/pattern-texture";
export type { PatternPreset } from "./text3d/scene/pattern-texture";

// Scene - Image Textures
export {
  createImageTextureFromUrl,
  createImageTextureFromImageData,
  createImageTextureFromElement,
  clearImageTextureCache,
  getCachedImageTexture,
} from "./text3d/scene/image-texture";
export type { ImageFillMode, SourceRect } from "./text3d/scene/image-texture";

// Scene - Gradient Textures (internal resolved types)
export {
  createLinearGradientTextureFromResolved,
  createRadialGradientTextureFromResolved,
  clearGradientTextureCache,
} from "./text3d/scene/gradient-texture";

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
} from "./text3d/scene/backdrop";
export type { BackdropConfig, BackdropState } from "./text3d/scene/backdrop";

// Geometry - Bevel config
export { getBevelConfig } from "./text3d/geometry/bevel";
export type { BevelConfig } from "./text3d/geometry/bevel";

// Geometry - Custom Bevel (ECMA-376 compliant)
// High-level Three.js API
export { createCustomBevelGeometry } from "./text3d/geometry/custom-bevel";

// Re-exports from Three.js independent bevel module
export { getBevelProfile, BEVEL_PROFILES } from "./text3d/geometry/custom-bevel";
export type { BevelProfile, BevelProfilePoint } from "./text3d/geometry/custom-bevel";

// Three.js independent bevel types (for advanced usage)
// Import from bevel/index to get the Three.js independent module
export type {
  BevelPath,
  BevelPathPoint,
  BevelGeometryData,
  BevelMeshConfig,
  ShapeInput,
} from "./text3d/geometry/bevel/index";
export { extractBevelPathsFromShape, generateBevelMesh, mergeBevelGeometries } from "./text3d/geometry/bevel/index";

// Geometry - Text Warp
export { applyTextWarp, isTextWarpSupported, getSupportedTextWarps } from "./text3d/geometry/text-warp";

// Geometry - From contours
export { createTextGeometryAsync, mergeExtrudeGeometries, scaleGeometryToFit } from "./text3d/geometry/from-contours-async";
export type { TextGeometryConfig } from "./text3d/geometry/from-contours-async";

// Geometry - Unified merge (NEW)
export { mergeBufferGeometries, mergeExtrudeGeometriesLegacy } from "./text3d/geometry/merge-geometries";
export type { MergeGeometriesOptions } from "./text3d/geometry/merge-geometries";

// Effects
export {
  createOutlineMesh,
  createBackFaceOutline,
  createShaderOutline,
  addOutlineToGroup,
  updateOutlineColor,
  updateOutlineVisibility,
  disposeOutline,
  enableShadowMapping,
  createShadowLight,
  createDropShadowMesh,
  createInnerShadowMesh,
  createInnerShadowShader,
  enableMeshShadows,
  enableGroupShadows,
  createShadowPlane,
  disposeShadow,
  createGlowMesh,
  createLayeredGlow,
  createGlowSprite,
  addGlowToGroup,
  updateGlowColor,
  updateGlowIntensity,
  disposeGlow,
  createReflectionMesh,
  createGradientReflection,
  createReflectiveFloor,
  addReflectionToGroup,
  updateReflectionOpacity,
  disposeReflection,
  createSoftEdgeMesh,
  createLayeredSoftEdge,
  applySoftEdgeToMesh,
  createBlurPassConfig,
  addSoftEdgeToGroup,
  updateSoftEdgeRadius,
  removeSoftEdge,
  disposeSoftEdge,
  createSoftEdgeComposer,
  applySoftEdgePostProcess,
  updateSoftEdgePostProcessRadius,
  resizeSoftEdgePostProcess,
  createMeshSoftEdgeEffect,
  isSoftEdgePostProcessSupported,
  createContourMesh,
  createContourMeshExpanded,
  updateContourColor,
  disposeContour,
} from "./text3d/effects";
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
} from "./text3d/effects";
