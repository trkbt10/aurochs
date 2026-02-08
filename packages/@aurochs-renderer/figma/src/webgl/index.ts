/**
 * @file WebGL renderer module
 *
 * Provides GPU-accelerated rendering of Figma scene graphs.
 */

// Main renderer
export { WebGLFigmaRenderer, type WebGLRendererOptions } from "./renderer";

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
export { ShaderCache, type ShaderProgramName } from "./shaders";

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
export { TextureCache, type TextureEntry } from "./texture-cache";

// Framebuffer
export {
  createFramebuffer,
  deleteFramebuffer,
  bindFramebuffer,
  type Framebuffer,
} from "./framebuffer";

// Effects
export { EffectsRenderer } from "./effects-renderer";

// Clipping & masking
export { beginStencilClip, endStencilClip, drawEvenOddFill } from "./clip-mask";

// Stroke tessellation
export {
  tessellateRectStroke,
  tessellateEllipseStroke,
  tessellatePathStroke,
} from "./stroke-tessellation";

// Scene state (incremental updates)
export { SceneState, type NodeGPUState } from "./scene-state";
