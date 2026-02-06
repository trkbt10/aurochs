/**
 * @file Fill rendering for WebGL
 *
 * Handles solid, linear gradient, radial gradient, and image fills.
 */

import type { Fill, Color, AffineMatrix } from "../scene-graph/types";
import type { ShaderCache } from "./shaders";

// =============================================================================
// Types
// =============================================================================

export type GLContext = {
  readonly gl: WebGLRenderingContext;
  readonly shaders: ShaderCache;
  readonly positionBuffer: WebGLBuffer;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
};

// =============================================================================
// Matrix Utilities
// =============================================================================

function matrixToGLUniform(m: AffineMatrix, pixelRatio: number): Float32Array {
  return new Float32Array([
    m.m00 * pixelRatio, m.m10 * pixelRatio, 0,
    m.m01 * pixelRatio, m.m11 * pixelRatio, 0,
    m.m02 * pixelRatio, m.m12 * pixelRatio, 1,
  ]);
}

// =============================================================================
// Solid Color
// =============================================================================

export function drawSolidFill(
  ctx: GLContext,
  vertices: Float32Array,
  color: Color,
  transform: AffineMatrix,
  opacity: number
): void {
  if (vertices.length === 0 || opacity <= 0) return;

  const { gl, shaders, positionBuffer, width, height, pixelRatio } = ctx;
  const program = shaders.get("flat");
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix3fv(
    gl.getUniformLocation(program, "u_transform"),
    false,
    matrixToGLUniform(transform, pixelRatio)
  );
  gl.uniform2f(
    gl.getUniformLocation(program, "u_resolution"),
    width * pixelRatio,
    height * pixelRatio
  );
  gl.uniform4f(
    gl.getUniformLocation(program, "u_color"),
    color.r,
    color.g,
    color.b,
    color.a * opacity
  );

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

// =============================================================================
// Linear Gradient
// =============================================================================

export function drawLinearGradientFill(
  ctx: GLContext,
  vertices: Float32Array,
  fill: Extract<Fill, { type: "linear-gradient" }>,
  transform: AffineMatrix,
  opacity: number,
  elementSize: { width: number; height: number }
): void {
  if (vertices.length === 0 || opacity <= 0) return;

  const { gl, shaders, positionBuffer, width, height, pixelRatio } = ctx;
  const program = shaders.get("linearGradient");
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix3fv(
    gl.getUniformLocation(program, "u_transform"),
    false,
    matrixToGLUniform(transform, pixelRatio)
  );
  gl.uniform2f(
    gl.getUniformLocation(program, "u_resolution"),
    width * pixelRatio,
    height * pixelRatio
  );

  // Gradient parameters
  gl.uniform2f(
    gl.getUniformLocation(program, "u_gradientStart"),
    fill.start.x,
    fill.start.y
  );
  gl.uniform2f(
    gl.getUniformLocation(program, "u_gradientEnd"),
    fill.end.x,
    fill.end.y
  );
  gl.uniform2f(
    gl.getUniformLocation(program, "u_elementSize"),
    elementSize.width * pixelRatio,
    elementSize.height * pixelRatio
  );
  gl.uniform1f(gl.getUniformLocation(program, "u_opacity"), opacity * fill.opacity);

  // Set gradient stops (up to 8)
  const stopCount = Math.min(fill.stops.length, 8);
  gl.uniform1i(gl.getUniformLocation(program, "u_stopCount"), stopCount);

  for (let i = 0; i < stopCount; i++) {
    const s = fill.stops[i];
    gl.uniform4f(
      gl.getUniformLocation(program, `u_stops[${i}]`),
      s.position,
      s.color.r,
      s.color.g,
      s.color.b
    );
    gl.uniform4f(
      gl.getUniformLocation(program, `u_stopAlphas[${i}]`),
      s.color.a,
      0,
      0,
      0
    );
  }

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

// =============================================================================
// Radial Gradient
// =============================================================================

export function drawRadialGradientFill(
  ctx: GLContext,
  vertices: Float32Array,
  fill: Extract<Fill, { type: "radial-gradient" }>,
  transform: AffineMatrix,
  opacity: number,
  elementSize: { width: number; height: number }
): void {
  if (vertices.length === 0 || opacity <= 0) return;

  const { gl, shaders, positionBuffer, width, height, pixelRatio } = ctx;
  const program = shaders.get("radialGradient");
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix3fv(
    gl.getUniformLocation(program, "u_transform"),
    false,
    matrixToGLUniform(transform, pixelRatio)
  );
  gl.uniform2f(
    gl.getUniformLocation(program, "u_resolution"),
    width * pixelRatio,
    height * pixelRatio
  );

  gl.uniform2f(gl.getUniformLocation(program, "u_center"), fill.center.x, fill.center.y);
  gl.uniform1f(gl.getUniformLocation(program, "u_radius"), fill.radius);
  gl.uniform2f(gl.getUniformLocation(program, "u_elementSize"), elementSize.width * pixelRatio, elementSize.height * pixelRatio);
  gl.uniform1f(gl.getUniformLocation(program, "u_opacity"), opacity * fill.opacity);

  const stopCount = Math.min(fill.stops.length, 8);
  gl.uniform1i(gl.getUniformLocation(program, "u_stopCount"), stopCount);

  for (let i = 0; i < stopCount; i++) {
    const s = fill.stops[i];
    gl.uniform4f(gl.getUniformLocation(program, `u_stops[${i}]`), s.position, s.color.r, s.color.g, s.color.b);
    gl.uniform4f(gl.getUniformLocation(program, `u_stopAlphas[${i}]`), s.color.a, 0, 0, 0);
  }

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

// =============================================================================
// Image Fill
// =============================================================================

export type ImageFillOptions = {
  /** Image natural width in pixels */
  readonly imageWidth?: number;
  /** Image natural height in pixels */
  readonly imageHeight?: number;
  /** Figma scale mode: FILL (cover+crop), FIT (contain), STRETCH (default) */
  readonly scaleMode?: string;
};

export function drawImageFill(
  ctx: GLContext,
  vertices: Float32Array,
  texture: WebGLTexture,
  transform: AffineMatrix,
  opacity: number,
  elementSize: { width: number; height: number },
  options?: ImageFillOptions
): void {
  if (vertices.length === 0 || opacity <= 0) return;

  const { gl, shaders, positionBuffer, width, height, pixelRatio } = ctx;
  const program = shaders.get("textured");
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix3fv(
    gl.getUniformLocation(program, "u_transform"),
    false,
    matrixToGLUniform(transform, pixelRatio)
  );
  gl.uniform2f(
    gl.getUniformLocation(program, "u_resolution"),
    width * pixelRatio,
    height * pixelRatio
  );

  // Bind texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

  // Compute UV scale/offset based on scaleMode
  const { texScale, texOffset } = computeImageUV(
    elementSize.width,
    elementSize.height,
    options?.imageWidth ?? elementSize.width,
    options?.imageHeight ?? elementSize.height,
    options?.scaleMode ?? "STRETCH"
  );

  gl.uniform2f(
    gl.getUniformLocation(program, "u_texScale"),
    texScale.x,
    texScale.y
  );
  gl.uniform2f(
    gl.getUniformLocation(program, "u_texOffset"),
    texOffset.x,
    texOffset.y
  );
  gl.uniform1f(gl.getUniformLocation(program, "u_opacity"), opacity);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

/**
 * Compute UV scale and offset for image fills.
 *
 * Vertex positions go from (0,0) to (elementW, elementH).
 * The shader computes: uv = position * texScale + texOffset
 *
 * - STRETCH: image is distorted to fill element exactly
 * - FILL: image is scaled to cover element, maintaining aspect ratio, then center-cropped
 * - FIT: image is scaled to fit within element, maintaining aspect ratio, centered
 */
function computeImageUV(
  elementW: number,
  elementH: number,
  imageW: number,
  imageH: number,
  scaleMode: string
): { texScale: { x: number; y: number }; texOffset: { x: number; y: number } } {
  if (scaleMode === "FILL" && imageW > 0 && imageH > 0) {
    const imageAR = imageW / imageH;
    const elementAR = elementW / elementH;

    if (imageAR > elementAR) {
      // Image wider than element: full height, crop width
      const uvWidth = elementAR / imageAR;
      return {
        texScale: { x: uvWidth / elementW, y: 1 / elementH },
        texOffset: { x: (1 - uvWidth) / 2, y: 0 },
      };
    } else {
      // Image taller than element: full width, crop height
      const uvHeight = imageAR / elementAR;
      return {
        texScale: { x: 1 / elementW, y: uvHeight / elementH },
        texOffset: { x: 0, y: (1 - uvHeight) / 2 },
      };
    }
  }

  if (scaleMode === "FIT" && imageW > 0 && imageH > 0) {
    const imageAR = imageW / imageH;
    const elementAR = elementW / elementH;

    if (imageAR > elementAR) {
      // Image wider: fit width, letterbox height
      const visibleH = elementW / imageAR;
      const padding = (elementH - visibleH) / 2;
      return {
        texScale: { x: 1 / elementW, y: 1 / visibleH },
        texOffset: { x: 0, y: -padding / visibleH },
      };
    } else {
      // Image taller: fit height, pillarbox width
      const visibleW = elementH * imageAR;
      const padding = (elementW - visibleW) / 2;
      return {
        texScale: { x: 1 / visibleW, y: 1 / elementH },
        texOffset: { x: -padding / visibleW, y: 0 },
      };
    }
  }

  // STRETCH (default): map 0..w → 0..1
  return {
    texScale: { x: 1 / elementW, y: 1 / elementH },
    texOffset: { x: 0, y: 0 },
  };
}
