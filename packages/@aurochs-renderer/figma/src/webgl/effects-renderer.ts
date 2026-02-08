/**
 * @file WebGL effects rendering
 *
 * Implements drop shadow, inner shadow, and layer blur using FBOs
 * and multi-pass rendering.
 */

import type { DropShadowEffect, InnerShadowEffect, LayerBlurEffect } from "../scene-graph/types";
import type { Framebuffer } from "./framebuffer";
import { createFramebuffer, createFramebufferWithStencil, deleteFramebuffer, bindFramebuffer } from "./framebuffer";

/**
 * Gaussian blur shader (separable 2-pass)
 */
export const gaussianBlurVertexShader = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
  }
`;

export const gaussianBlurFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform vec2 u_direction;
  uniform vec2 u_texelSize;
  uniform float u_radius;

  varying vec2 v_texCoord;

  void main() {
    vec4 color = vec4(0.0);
    float totalWeight = 0.0;

    // u_radius = per-pass sigma (in texels)
    float sigma = max(u_radius, 0.001);
    float invTwoSigmaSq = -0.5 / (sigma * sigma);
    // spacing: cover ±3σ with 13 taps → spacing = σ/2, clamped to ≥1 texel
    float spacing = max(sigma * 0.5, 1.0);

    // 13-tap Gaussian kernel (i = -6..6)
    for (float i = -6.0; i <= 6.0; i += 1.0) {
      float d = i * spacing;
      float weight = exp(invTwoSigmaSq * d * d);
      vec2 offset = u_direction * u_texelSize * d;
      color += texture2D(u_texture, v_texCoord + offset) * weight;
      totalWeight += weight;
    }

    gl_FragColor = color / totalWeight;
  }
`;

/**
 * Compositing shader for shadow overlay
 */
export const compositeVertexShader = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
  }
`;

export const compositeFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform vec4 u_color;
  uniform vec2 u_offset;
  uniform vec2 u_texelSize;

  varying vec2 v_texCoord;

  void main() {
    float alpha = texture2D(u_texture, v_texCoord + u_offset * u_texelSize).a;
    gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
  }
`;

/**
 * Inner shadow compositing shader.
 *
 * Uses two textures: the original shape silhouette and the blurred silhouette.
 * Shadow mask = shapeAlpha * (1 - blurredAlpha_at_offset).
 * This produces color only at the inner edges of the shape where the shifted
 * blurred silhouette doesn't fully cover.
 */
export const innerShadowFragmentShader = `
  precision mediump float;

  uniform sampler2D u_shapeTexture;
  uniform sampler2D u_blurredTexture;
  uniform vec4 u_color;
  uniform vec2 u_offset;
  uniform vec2 u_texelSize;

  varying vec2 v_texCoord;

  void main() {
    float shapeAlpha = texture2D(u_shapeTexture, v_texCoord).a;
    float blurredAlpha = texture2D(u_blurredTexture, v_texCoord + u_offset * u_texelSize).a;
    float shadowMask = shapeAlpha * (1.0 - blurredAlpha);
    gl_FragColor = vec4(u_color.rgb, u_color.a * shadowMask);
  }
`;

/**
 * Blit (copy) shader for compositing FBO texture to screen with opacity
 */
export const blitFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform float u_opacity;

  varying vec2 v_texCoord;

  void main() {
    vec4 texel = texture2D(u_texture, v_texCoord);
    gl_FragColor = texel * u_opacity;
  }
`;

/**
 * Effects renderer state
 */
export class EffectsRenderer {
  private gl: WebGLRenderingContext;
  private blurProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;
  private innerShadowProgram: WebGLProgram | null = null;
  private blitProgram: WebGLProgram | null = null;
  private fullscreenQuad: WebGLBuffer | null = null;
  private tempFBO1: Framebuffer | null = null;
  private tempFBO2: Framebuffer | null = null;
  private shapeFBO: Framebuffer | null = null;
  private layerFBO: Framebuffer | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  /**
   * Render a drop shadow effect.
   *
   * 1. Renders the shape silhouette to an off-screen FBO
   * 2. Applies Gaussian blur (if radius > 0)
   * 3. Composites the blurred shadow onto the current framebuffer
   *
   * @param canvasWidth - Canvas width in physical pixels
   * @param canvasHeight - Canvas height in physical pixels
   * @param effect - Drop shadow parameters
   * @param pixelRatio - Device pixel ratio
   * @param renderSilhouette - Callback that renders the shape as solid white
   *   to the currently bound framebuffer (should use the same projection as normal rendering)
   */
  renderDropShadow(
    canvasWidth: number,
    canvasHeight: number,
    effect: DropShadowEffect,
    pixelRatio: number,
    renderSilhouette: () => void
  ): void {
    const gl = this.gl;
    this.ensureResources(canvasWidth, canvasHeight);
    this.ensureShapeFBO(canvasWidth, canvasHeight);

    // 1. Render shape silhouette to shape FBO
    bindFramebuffer(gl, this.shapeFBO!);
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    renderSilhouette();

    // 2. Blur the silhouette (if radius > 0)
    let resultFBO: Framebuffer;
    if (effect.radius > 0) {
      resultFBO = this.applyGaussianBlur(this.shapeFBO!, effect.radius * pixelRatio);
    } else {
      resultFBO = this.shapeFBO!;
    }

    // 3. Composite shadow onto screen
    bindFramebuffer(gl, null);
    gl.viewport(0, 0, canvasWidth, canvasHeight);

    const program = this.compositeProgram!;
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resultFBO.texture);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

    gl.uniform4f(
      gl.getUniformLocation(program, "u_color"),
      effect.color.r, effect.color.g, effect.color.b, effect.color.a
    );

    // Offset: negate X because the shader adds to texCoord (sampling backwards)
    // Y: the shape shader flips Y (1.0 - 2*ny/H), so screen-down = texture-up.
    // Negate Y as well since adding to v_texCoord shifts the sample upward in
    // texture space, which corresponds to upward on screen.
    gl.uniform2f(
      gl.getUniformLocation(program, "u_offset"),
      -effect.offset.x * pixelRatio,
      effect.offset.y * pixelRatio
    );

    gl.uniform2f(
      gl.getUniformLocation(program, "u_texelSize"),
      1.0 / canvasWidth,
      1.0 / canvasHeight
    );

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );
    this.drawFullscreenQuad(program);
  }

  /**
   * Render an inner shadow effect.
   *
   * 1. Renders the shape silhouette to an off-screen FBO
   * 2. Applies Gaussian blur (if radius > 0)
   * 3. Composites the inner shadow using: shapeAlpha * (1 - blurredAlpha_at_offset)
   *
   * Must be called AFTER the shape fills have been drawn (inner shadow overlays fills).
   */
  renderInnerShadow(
    canvasWidth: number,
    canvasHeight: number,
    effect: InnerShadowEffect,
    pixelRatio: number,
    renderSilhouette: () => void
  ): void {
    const gl = this.gl;
    this.ensureResources(canvasWidth, canvasHeight);
    this.ensureShapeFBO(canvasWidth, canvasHeight);
    this.ensureInnerShadowProgram();

    // 1. Render shape silhouette to shape FBO
    bindFramebuffer(gl, this.shapeFBO!);
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    renderSilhouette();

    // 2. Blur the silhouette
    let blurredFBO: Framebuffer;
    if (effect.radius > 0) {
      blurredFBO = this.applyGaussianBlur(this.shapeFBO!, effect.radius * pixelRatio);
    } else {
      blurredFBO = this.shapeFBO!;
    }

    // 3. Composite inner shadow onto screen
    bindFramebuffer(gl, null);
    gl.viewport(0, 0, canvasWidth, canvasHeight);

    const program = this.innerShadowProgram!;
    gl.useProgram(program);

    // Bind original shape texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shapeFBO!.texture);
    gl.uniform1i(gl.getUniformLocation(program, "u_shapeTexture"), 0);

    // Bind blurred texture to unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blurredFBO.texture);
    gl.uniform1i(gl.getUniformLocation(program, "u_blurredTexture"), 1);

    gl.uniform4f(
      gl.getUniformLocation(program, "u_color"),
      effect.color.r, effect.color.g, effect.color.b, effect.color.a
    );

    // Offset: same convention as drop shadow
    gl.uniform2f(
      gl.getUniformLocation(program, "u_offset"),
      -effect.offset.x * pixelRatio,
      effect.offset.y * pixelRatio
    );

    gl.uniform2f(
      gl.getUniformLocation(program, "u_texelSize"),
      1.0 / canvasWidth,
      1.0 / canvasHeight
    );

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );
    this.drawFullscreenQuad(program);

    // Reset active texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
  }

  /**
   * Begin off-screen rendering for layer blur.
   *
   * Redirects rendering to a stencil-enabled FBO so the caller can render
   * the full node subtree (including clipping) into it.
   *
   * @returns The layer FBO that rendering is directed to
   */
  beginLayerCapture(canvasWidth: number, canvasHeight: number): Framebuffer {
    const gl = this.gl;
    this.ensureLayerFBO(canvasWidth, canvasHeight);

    bindFramebuffer(gl, this.layerFBO!);
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    return this.layerFBO!;
  }

  /**
   * End off-screen capture, blur the captured content, and composite to screen.
   *
   * @param canvasWidth - Canvas width in physical pixels
   * @param canvasHeight - Canvas height in physical pixels
   * @param effect - Layer blur effect parameters
   * @param pixelRatio - Device pixel ratio
   */
  endLayerCaptureAndBlur(
    canvasWidth: number,
    canvasHeight: number,
    effect: LayerBlurEffect,
    pixelRatio: number
  ): void {
    const gl = this.gl;
    this.ensureResources(canvasWidth, canvasHeight);
    this.ensureBlitProgram();

    // Blur the captured layer
    const blurred = this.applyGaussianBlur(this.layerFBO!, effect.radius * pixelRatio);

    // Composite blurred layer back to screen
    bindFramebuffer(gl, null);
    gl.viewport(0, 0, canvasWidth, canvasHeight);

    const program = this.blitProgram!;
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, blurred.texture);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_opacity"), 1.0);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );
    this.drawFullscreenQuad(program);
  }

  private ensureInnerShadowProgram(): void {
    if (!this.innerShadowProgram) {
      this.innerShadowProgram = this.compileProgram(compositeVertexShader, innerShadowFragmentShader);
    }
  }

  private ensureLayerFBO(width: number, height: number): void {
    const gl = this.gl;
    if (!this.layerFBO || this.layerFBO.width !== width || this.layerFBO.height !== height) {
      if (this.layerFBO) deleteFramebuffer(gl, this.layerFBO);
      this.layerFBO = createFramebufferWithStencil(gl, width, height);
    }
  }

  private ensureBlitProgram(): void {
    if (!this.blitProgram) {
      this.blitProgram = this.compileProgram(compositeVertexShader, blitFragmentShader);
    }
  }

  private ensureShapeFBO(width: number, height: number): void {
    const gl = this.gl;
    if (!this.shapeFBO || this.shapeFBO.width !== width || this.shapeFBO.height !== height) {
      if (this.shapeFBO) deleteFramebuffer(gl, this.shapeFBO);
      this.shapeFBO = createFramebuffer(gl, width, height);
    }
  }

  /**
   * Apply a Gaussian blur to a framebuffer texture.
   *
   * Uses a separable 2-pass (H+V) approach with multi-pass iteration
   * for larger radii to maintain quality. Matches SVG feGaussianBlur
   * convention: sigma = radius / 2.
   *
   * @param source - Source framebuffer to blur
   * @param radius - Blur radius in physical pixels (sigma = radius / 2)
   * @returns Blurred framebuffer (always tempFBO2; caller must not delete source)
   */
  applyGaussianBlur(source: Framebuffer, radius: number): Framebuffer {
    const gl = this.gl;
    this.ensureResources(source.width, source.height);

    // sigma = radius / 2 to match SVG feGaussianBlur stdDeviation convention
    const sigmaTotal = radius / 2;

    // Multi-pass: each pass can effectively blur sigma ≤ 3 texels with 13-tap kernel
    // (13 taps at spacing = max(sigma*0.5, 1) covers ±3σ without excessive aliasing)
    const maxSigmaPerPass = 3;
    const numPasses = Math.max(1, Math.ceil(sigmaTotal / maxSigmaPerPass));
    // Gaussian convolution: N passes of sigma_each → combined sigma = sigma_each * sqrt(N)
    const sigmaPerPass = sigmaTotal / Math.sqrt(numPasses);

    const width = source.width;
    const height = source.height;
    let currentSource: Framebuffer = source;

    for (let p = 0; p < numPasses; p++) {
      // H: read currentSource → write tempFBO1
      bindFramebuffer(gl, this.tempFBO1!);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawBlurPass(currentSource.texture, width, height, 1, 0, sigmaPerPass);

      // V: read tempFBO1 → write tempFBO2
      bindFramebuffer(gl, this.tempFBO2!);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawBlurPass(this.tempFBO1!.texture, width, height, 0, 1, sigmaPerPass);

      currentSource = this.tempFBO2!;
    }

    // Restore default framebuffer
    bindFramebuffer(gl, null);

    return this.tempFBO2!;
  }

  private drawBlurPass(
    sourceTexture: WebGLTexture,
    width: number,
    height: number,
    dirX: number,
    dirY: number,
    radius: number
  ): void {
    const gl = this.gl;
    const program = this.blurProgram!;
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

    gl.uniform2f(gl.getUniformLocation(program, "u_direction"), dirX, dirY);
    gl.uniform2f(gl.getUniformLocation(program, "u_texelSize"), 1.0 / width, 1.0 / height);
    gl.uniform1f(gl.getUniformLocation(program, "u_radius"), radius);

    this.drawFullscreenQuad(program);
  }

  private drawFullscreenQuad(program: WebGLProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenQuad!);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private ensureResources(width: number, height: number): void {
    const gl = this.gl;

    if (!this.blurProgram) {
      this.blurProgram = this.compileProgram(gaussianBlurVertexShader, gaussianBlurFragmentShader);
    }

    if (!this.compositeProgram) {
      this.compositeProgram = this.compileProgram(compositeVertexShader, compositeFragmentShader);
    }

    if (!this.fullscreenQuad) {
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      this.fullscreenQuad = buffer;
    }

    // Recreate FBOs if size changed
    if (!this.tempFBO1 || this.tempFBO1.width !== width || this.tempFBO1.height !== height) {
      if (this.tempFBO1) deleteFramebuffer(gl, this.tempFBO1);
      if (this.tempFBO2) deleteFramebuffer(gl, this.tempFBO2);
      this.tempFBO1 = createFramebuffer(gl, width, height);
      this.tempFBO2 = createFramebuffer(gl, width, height);
    }
  }

  private compileProgram(vertexSrc: string, fragmentSrc: string): WebGLProgram {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vertexSrc);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    return program;
  }

  /**
   * Dispose all GPU resources
   */
  dispose(): void {
    const gl = this.gl;
    if (this.blurProgram) gl.deleteProgram(this.blurProgram);
    if (this.compositeProgram) gl.deleteProgram(this.compositeProgram);
    if (this.innerShadowProgram) gl.deleteProgram(this.innerShadowProgram);
    if (this.blitProgram) gl.deleteProgram(this.blitProgram);
    if (this.fullscreenQuad) gl.deleteBuffer(this.fullscreenQuad);
    if (this.tempFBO1) deleteFramebuffer(gl, this.tempFBO1);
    if (this.tempFBO2) deleteFramebuffer(gl, this.tempFBO2);
    if (this.shapeFBO) deleteFramebuffer(gl, this.shapeFBO);
    if (this.layerFBO) deleteFramebuffer(gl, this.layerFBO);
  }
}
