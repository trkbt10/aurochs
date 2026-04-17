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

    // 33-tap integer-spaced Gaussian kernel. applyGaussianBlur splits large
    // radii into smaller sigma passes, so this covers the useful tail while
    // staying close to SVG feGaussianBlur output.
    //
    // Blur in premultiplied-alpha space to prevent dark halos at transparent
    // edges. SVG feGaussianBlur operates on premultiplied color channels.
    for (float i = -16.0; i <= 16.0; i += 1.0) {
      float d = i;
      float weight = exp(invTwoSigmaSq * d * d);
      vec2 offset = u_direction * u_texelSize * d;
      vec4 s = texture2D(u_texture, v_texCoord + offset);
      // Premultiply: prevent transparent-black from darkening the blur
      s.rgb *= s.a;
      color += s * weight;
      totalWeight += weight;
    }

    color /= totalWeight;
    // Un-premultiply
    if (color.a > 0.001) {
      color.rgb /= color.a;
    }
    gl_FragColor = color;
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
    // Apply opacity to alpha channel only — RGB stays unchanged.
    // This matches SVG's <g opacity="X"> which reduces layer visibility
    // without darkening the colors.
    gl_FragColor = vec4(texel.rgb, texel.a * u_opacity);
  }
`;

/** Effects renderer instance */
export type EffectsRendererInstance = {
  renderDropShadow(params: { canvasWidth: number; canvasHeight: number; effect: DropShadowEffect; pixelRatio: number; renderSilhouette: () => void }): void;
  renderInnerShadow(params: { canvasWidth: number; canvasHeight: number; effect: InnerShadowEffect; pixelRatio: number; renderSilhouette: () => void }): void;
  beginLayerCapture(canvasWidth: number, canvasHeight: number): Framebuffer;
  endLayerCaptureAndBlur(params: { canvasWidth: number; canvasHeight: number; effect: LayerBlurEffect; pixelRatio: number }): void;
  /** Blit the captured layer FBO to screen with the given opacity (no blur). Returns false if blit shader unavailable. */
  blitLayerWithOpacity(params: { canvasWidth: number; canvasHeight: number; opacity: number }): boolean;
  /** Check if the blit shader is available (can be compiled in this GL context). */
  isBlitAvailable(): boolean;
  applyGaussianBlur(source: Framebuffer, radius: number): Framebuffer;
  dispose(): void;
};

/**
 * Create an effects renderer for WebGL drop shadow, inner shadow, and layer blur
 */
export function createEffectsRenderer(gl: WebGLRenderingContext): EffectsRendererInstance {
  const blurProgram = { value: null as WebGLProgram | null };
  const compositeProgram = { value: null as WebGLProgram | null };
  const innerShadowProgram = { value: null as WebGLProgram | null };
  const blitProgram = { value: null as WebGLProgram | null };
  const fullscreenQuad = { value: null as WebGLBuffer | null };
  const tempFBO1 = { value: null as Framebuffer | null };
  const tempFBO2 = { value: null as Framebuffer | null };
  const shapeFBO = { value: null as Framebuffer | null };
  const layerFBO = { value: null as Framebuffer | null };

  function compileProgram(vertexSrc: string, fragmentSrc: string): WebGLProgram | null {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) { return null; }
    gl.shaderSource(vs, vertexSrc);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.warn("Vertex shader compile error:", gl.getShaderInfoLog(vs));
      gl.deleteShader(vs);
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) { gl.deleteShader(vs); return null; }
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.warn("Fragment shader compile error:", gl.getShaderInfoLog(fs));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const program = gl.createProgram();
    if (!program) { gl.deleteShader(vs); gl.deleteShader(fs); return null; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Program link error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  function ensureResources(width: number, height: number): void {
    if (!blurProgram.value) {
      blurProgram.value = compileProgram(gaussianBlurVertexShader, gaussianBlurFragmentShader);
    }

    if (!compositeProgram.value) {
      compositeProgram.value = compileProgram(compositeVertexShader, compositeFragmentShader);
    }

    if (!fullscreenQuad.value) {
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      fullscreenQuad.value = buffer;
    }

    // Recreate FBOs if size changed
    if (!tempFBO1.value || tempFBO1.value.width !== width || tempFBO1.value.height !== height) {
      if (tempFBO1.value) {deleteFramebuffer(gl, tempFBO1.value);}
      if (tempFBO2.value) {deleteFramebuffer(gl, tempFBO2.value);}
      tempFBO1.value = createFramebuffer(gl, width, height);
      tempFBO2.value = createFramebuffer(gl, width, height);
    }
  }

  function ensureShapeFBO(width: number, height: number): void {
    if (!shapeFBO.value || shapeFBO.value.width !== width || shapeFBO.value.height !== height) {
      if (shapeFBO.value) {deleteFramebuffer(gl, shapeFBO.value);}
      shapeFBO.value = createFramebuffer(gl, width, height);
    }
  }

  function ensureInnerShadowProgram(): void {
    if (!innerShadowProgram.value) {
      innerShadowProgram.value = compileProgram(compositeVertexShader, innerShadowFragmentShader);
    }
  }

  function ensureLayerFBO(width: number, height: number): void {
    if (!layerFBO.value || layerFBO.value.width !== width || layerFBO.value.height !== height) {
      if (layerFBO.value) {deleteFramebuffer(gl, layerFBO.value);}
      layerFBO.value = createFramebufferWithStencil(gl, width, height);
    }
  }

  function ensureBlitProgram(): void {
    if (!blitProgram.value) {
      blitProgram.value = compileProgram(compositeVertexShader, blitFragmentShader);
    }
  }

  function drawFullscreenQuad(program: WebGLProgram): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuad.value!);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function withStencilDisabled<T>(operation: () => T): T {
    const wasStencilEnabled = gl.isEnabled(gl.STENCIL_TEST);
    gl.disable(gl.STENCIL_TEST);
    try {
      return operation();
    } finally {
      if (wasStencilEnabled) {
        gl.enable(gl.STENCIL_TEST);
      }
    }
  }

  function drawBlurPass(
    { sourceTexture, width, height, dirX, dirY, radius }: { sourceTexture: WebGLTexture; width: number; height: number; dirX: number; dirY: number; radius: number }
  ): void {
    const program = blurProgram.value;
    if (!program) { return; }
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

    gl.uniform2f(gl.getUniformLocation(program, "u_direction"), dirX, dirY);
    gl.uniform2f(gl.getUniformLocation(program, "u_texelSize"), 1.0 / width, 1.0 / height);
    gl.uniform1f(gl.getUniformLocation(program, "u_radius"), radius);

    drawFullscreenQuad(program);
  }

  function applyGaussianBlur(source: Framebuffer, radius: number): Framebuffer {
    ensureResources(source.width, source.height);

    const sigmaTotal = radius / 2;
    const maxSigmaPerPass = 3;
    const numPasses = Math.max(1, Math.ceil(sigmaTotal / maxSigmaPerPass));
    const sigmaPerPass = sigmaTotal / Math.sqrt(numPasses);

    const width = source.width;
    const height = source.height;
    const currentSourceRef = { value: source as Framebuffer };

    withStencilDisabled(() => {
      for (let p = 0; p < numPasses; p++) {
        bindFramebuffer(gl, tempFBO1.value!);
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawBlurPass({ sourceTexture: currentSourceRef.value.texture, width, height, dirX: 1, dirY: 0, radius: sigmaPerPass });

        bindFramebuffer(gl, tempFBO2.value!);
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawBlurPass({ sourceTexture: tempFBO1.value!.texture, width, height, dirX: 0, dirY: 1, radius: sigmaPerPass });

        currentSourceRef.value = tempFBO2.value!;
      }
    });

    bindFramebuffer(gl, null);

    return tempFBO2.value!;
  }

  return {
    renderDropShadow(
      { canvasWidth, canvasHeight, effect, pixelRatio, renderSilhouette }: { canvasWidth: number; canvasHeight: number; effect: DropShadowEffect; pixelRatio: number; renderSilhouette: () => void }
    ): void {
      ensureResources(canvasWidth, canvasHeight);
      ensureShapeFBO(canvasWidth, canvasHeight);

      bindFramebuffer(gl, shapeFBO.value!);
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      renderSilhouette();

      const resultFBORef = { value: undefined as Framebuffer | undefined };
      if (effect.radius > 0) {
        resultFBORef.value = applyGaussianBlur(shapeFBO.value!, effect.radius * pixelRatio);
      } else {
        resultFBORef.value = shapeFBO.value!;
      }

      bindFramebuffer(gl, null);
      gl.viewport(0, 0, canvasWidth, canvasHeight);

      const program = compositeProgram.value;
      if (!program) { bindFramebuffer(gl, null); gl.viewport(0, 0, canvasWidth, canvasHeight); return; }
      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, resultFBORef.value.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

      gl.uniform4f(
        gl.getUniformLocation(program, "u_color"),
        effect.color.r, effect.color.g, effect.color.b, effect.color.a
      );

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
      drawFullscreenQuad(program);
    },

    renderInnerShadow(
      { canvasWidth, canvasHeight, effect, pixelRatio, renderSilhouette }: { canvasWidth: number; canvasHeight: number; effect: InnerShadowEffect; pixelRatio: number; renderSilhouette: () => void }
    ): void {
      ensureResources(canvasWidth, canvasHeight);
      ensureShapeFBO(canvasWidth, canvasHeight);
      ensureInnerShadowProgram();

      bindFramebuffer(gl, shapeFBO.value!);
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      renderSilhouette();

      const blurredFBORef = { value: undefined as Framebuffer | undefined };
      if (effect.radius > 0) {
        blurredFBORef.value = applyGaussianBlur(shapeFBO.value!, effect.radius * pixelRatio);
      } else {
        blurredFBORef.value = shapeFBO.value!;
      }

      bindFramebuffer(gl, null);
      gl.viewport(0, 0, canvasWidth, canvasHeight);

      const program = innerShadowProgram.value;
      if (!program) { bindFramebuffer(gl, null); gl.viewport(0, 0, canvasWidth, canvasHeight); return; }
      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, shapeFBO.value!.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_shapeTexture"), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, blurredFBORef.value.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_blurredTexture"), 1);

      gl.uniform4f(
        gl.getUniformLocation(program, "u_color"),
        effect.color.r, effect.color.g, effect.color.b, effect.color.a
      );

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
      drawFullscreenQuad(program);

      gl.activeTexture(gl.TEXTURE0);
    },

    beginLayerCapture(canvasWidth: number, canvasHeight: number): Framebuffer {
      ensureLayerFBO(canvasWidth, canvasHeight);

      bindFramebuffer(gl, layerFBO.value!);
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.disable(gl.STENCIL_TEST);
      gl.colorMask(true, true, true, true);
      gl.stencilMask(0xff);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

      return layerFBO.value!;
    },

    endLayerCaptureAndBlur(
      { canvasWidth, canvasHeight, effect, pixelRatio }: { canvasWidth: number; canvasHeight: number; effect: LayerBlurEffect; pixelRatio: number }
    ): void {
      ensureResources(canvasWidth, canvasHeight);
      ensureBlitProgram();

      const blurred = applyGaussianBlur(layerFBO.value!, effect.radius * pixelRatio);

      bindFramebuffer(gl, null);
      gl.viewport(0, 0, canvasWidth, canvasHeight);

      const program = blitProgram.value;
      if (!program) { bindFramebuffer(gl, null); gl.viewport(0, 0, canvasWidth, canvasHeight); return; }
      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, blurred.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "u_opacity"), 1.0);

      // Use premultiplied alpha blending for the blit.
      // The blur pass samples non-premultiplied RGBA from the FBO, so the
      // blurred edge pixels have color darkened by alpha (e.g. transparent
      // black (0,0,0,0) mixed with red (0.9,0.2,0.2,1) produces dark edges).
      // Using ONE instead of SRC_ALPHA for the source factor treats the
      // texture as premultiplied, which matches SVG filter compositing.
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.ONE, gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE, gl.ONE_MINUS_SRC_ALPHA
      );
      drawFullscreenQuad(program);

      // Restore standard non-premultiplied blending for subsequent draws
      gl.blendFuncSeparate(
        gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE, gl.ONE_MINUS_SRC_ALPHA
      );
    },

    blitLayerWithOpacity(
      { canvasWidth, canvasHeight, opacity }: { canvasWidth: number; canvasHeight: number; opacity: number }
    ): boolean {
      ensureResources(canvasWidth, canvasHeight);
      ensureBlitProgram();

      // Use the same path as endLayerCaptureAndBlur: route through
      // applyGaussianBlur (radius=0 = identity copy) so that the texture
      // is read from tempFBO2 instead of directly from layerFBO.
      // This avoids a subtle issue where layerFBO's texture cannot be
      // reliably sampled in some WebGL implementations after being used
      // as a render target in the same draw sequence.
      const copied = applyGaussianBlur(layerFBO.value!, 0);

      bindFramebuffer(gl, null);
      gl.viewport(0, 0, canvasWidth, canvasHeight);

      const program = blitProgram.value;
      if (!program) { return false; }
      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, copied.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "u_opacity"), opacity);

      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE, gl.ONE_MINUS_SRC_ALPHA
      );
      drawFullscreenQuad(program);

      // Restore standard blending
      gl.blendFuncSeparate(
        gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE, gl.ONE_MINUS_SRC_ALPHA
      );
      return true;
    },

    isBlitAvailable(): boolean {
      ensureBlitProgram();
      return blitProgram.value !== null;
    },

    applyGaussianBlur,

    dispose(): void {
      if (blurProgram.value) {gl.deleteProgram(blurProgram.value);}
      if (compositeProgram.value) {gl.deleteProgram(compositeProgram.value);}
      if (innerShadowProgram.value) {gl.deleteProgram(innerShadowProgram.value);}
      if (blitProgram.value) {gl.deleteProgram(blitProgram.value);}
      if (fullscreenQuad.value) {gl.deleteBuffer(fullscreenQuad.value);}
      if (tempFBO1.value) {deleteFramebuffer(gl, tempFBO1.value);}
      if (tempFBO2.value) {deleteFramebuffer(gl, tempFBO2.value);}
      if (shapeFBO.value) {deleteFramebuffer(gl, shapeFBO.value);}
      if (layerFBO.value) {deleteFramebuffer(gl, layerFBO.value);}
    },
  };
}
