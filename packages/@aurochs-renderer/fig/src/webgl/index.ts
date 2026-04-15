/**
 * @file WebGL renderer module
 *
 * Provides GPU-accelerated rendering of Figma scene graphs.
 */

// Main renderer
export { createWebGLFigmaRenderer, type WebGLFigmaRendererInstance, type WebGLRendererOptions } from "./renderer";

// Tessellation
export {
  flattenPathCommands,
  triangulate,
  tessellateContour,
  tessellateContours,
  generateRectVertices,
  generateEllipseVertices,
} from "./tessellation";

// Shaders
export { createShaderCache, type ShaderCache, type ShaderProgramName } from "./shaders";

// Fill rendering
export {
  drawSolidFill,
  drawLinearGradientFill,
  drawRadialGradientFill,
  drawImageFill,
  type GLContext,
} from "./fill-renderer";

// Text rendering
export {
  tessellateTextNode,
  renderFallbackTextToCanvas,
  type TessellatedText,
} from "./text-renderer";

// Texture cache
export { createTextureCache, type TextureCache, type TextureEntry } from "./texture-cache";

// Framebuffer
export {
  createFramebuffer,
  deleteFramebuffer,
  bindFramebuffer,
  type Framebuffer,
} from "./framebuffer";

// Effects
export { createEffectsRenderer, type EffectsRendererInstance } from "./effects-renderer";

// Clipping & masking
export { beginStencilClip, endStencilClip } from "./clip-mask";

// Stroke tessellation
export {
  tessellateRectStroke,
  tessellateEllipseStroke,
  tessellatePathStroke,
} from "./stroke-tessellation";

// Scene state (incremental updates)
export { createSceneState, type SceneStateInstance, type NodeGPUState } from "./scene-state";
