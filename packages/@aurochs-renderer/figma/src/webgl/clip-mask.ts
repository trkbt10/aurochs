/**
 * @file Stencil-based clipping and masking for WebGL
 *
 * Uses stencil bit 7 (0x80) for frame clipping.
 * Bits 0-6 (0x7F) are reserved for stencil-based path fill (see stencil-fill.ts).
 */

import type { ClipShape } from "../scene-graph/types";
import { generateRectVertices, tessellateContours } from "./tessellation";
import { CLIP_STENCIL_BIT } from "./stencil-fill";

/**
 * Begin a stencil clip region
 *
 * Draws the clip shape into stencil bit 7, then enables stencil testing
 * so only pixels inside the clip shape are rendered.
 */
export function beginStencilClip(
  gl: WebGLRenderingContext,
  clip: ClipShape,
  positionBuffer: WebGLBuffer,
  drawVertices: (vertices: Float32Array) => void
): void {
  gl.enable(gl.STENCIL_TEST);
  gl.clear(gl.STENCIL_BUFFER_BIT);

  // Draw clip shape into stencil bit 7
  gl.stencilMask(CLIP_STENCIL_BIT);
  gl.stencilFunc(gl.ALWAYS, CLIP_STENCIL_BIT, 0xff);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

  gl.colorMask(false, false, false, false);

  let vertices: Float32Array;
  if (clip.type === "rect") {
    vertices = generateRectVertices(clip.width, clip.height, clip.cornerRadius);
  } else {
    vertices = tessellateContours(clip.contours);
  }

  drawVertices(vertices);

  gl.colorMask(true, true, true, true);
  gl.stencilMask(0xff);

  // Set stencil test to only pass where bit 7 is set
  gl.stencilFunc(gl.EQUAL, CLIP_STENCIL_BIT, CLIP_STENCIL_BIT);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
}

/**
 * End a stencil clip region
 */
export function endStencilClip(gl: WebGLRenderingContext): void {
  gl.disable(gl.STENCIL_TEST);
}
