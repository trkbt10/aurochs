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
  createText3DRenderer,
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
} from "./scene/materials";
export type { MaterialConfig } from "./scene/materials";

// Geometry - Bevel config
export { getBevelConfig } from "./geometry/bevel";
export type { BevelConfig } from "./geometry/bevel";

// Geometry - From contours
export { createTextGeometryFromCanvas, scaleGeometryToFit } from "./geometry/from-contours";
export { createTextGeometryAsync } from "./geometry/from-contours-async";
export type { TextGeometryConfig } from "./geometry/from-contours";

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
