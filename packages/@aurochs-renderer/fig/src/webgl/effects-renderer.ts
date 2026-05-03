/**
 * @file WebGL effects rendering
 *
 * Implements drop shadow, inner shadow, and layer blur using FBOs
 * and multi-pass rendering.
 */

import type { BackgroundBlurEffect, BlendMode, DropShadowEffect, InnerShadowEffect, LayerBlurEffect } from "../scene-graph/types";
import type { Framebuffer } from "./framebuffer";
import { createFramebuffer, createFramebufferWithStencil, deleteFramebuffer, bindFramebuffer } from "./framebuffer";
import { CLIP_STENCIL_BIT, FILL_STENCIL_MASK } from "./stencil-fill";

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

export const alphaMorphologyFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform vec2 u_texelSize;
  uniform float u_radius;
  uniform float u_operator;

  varying vec2 v_texCoord;

  void main() {
    float resultAlpha = u_operator > 0.5 ? 0.0 : 1.0;
    vec3 resultColor = vec3(0.0);
    float radius = min(abs(u_radius), 16.0);

    for (float x = -16.0; x <= 16.0; x += 1.0) {
      for (float y = -16.0; y <= 16.0; y += 1.0) {
        if (abs(x) <= radius && abs(y) <= radius) {
          vec4 sampleColor = texture2D(u_texture, v_texCoord + vec2(x, y) * u_texelSize);
          if (u_operator > 0.5) {
            if (sampleColor.a > resultAlpha) {
              resultAlpha = sampleColor.a;
              resultColor = sampleColor.rgb;
            }
          } else {
            if (sampleColor.a < resultAlpha) {
              resultAlpha = sampleColor.a;
              resultColor = sampleColor.rgb;
            }
          }
        }
      }
    }

    gl_FragColor = vec4(resultColor, resultAlpha);
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
  uniform sampler2D u_shapeTexture;
  uniform vec4 u_color;
  uniform vec2 u_offset;
  uniform vec2 u_texelSize;
  uniform float u_clipInside;

  varying vec2 v_texCoord;

  void main() {
    float alpha = texture2D(u_texture, v_texCoord + u_offset * u_texelSize).a;
    if (u_clipInside > 0.5) {
      float shapeAlpha = texture2D(u_shapeTexture, v_texCoord).a;
      alpha = alpha * (1.0 - shapeAlpha);
    }
    gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
  }
`;

export const blendShadowFragmentShader = `
  precision mediump float;

  uniform sampler2D u_shadowTexture;
  uniform sampler2D u_shapeTexture;
  uniform sampler2D u_backdropTexture;
  uniform vec4 u_color;
  uniform vec2 u_offset;
  uniform vec2 u_texelSize;
  uniform float u_clipInside;
  uniform int u_blendMode;

  varying vec2 v_texCoord;

  float lum(vec3 c) {
    return dot(c, vec3(0.3, 0.59, 0.11));
  }

  vec3 clipColor(vec3 c) {
    float l = lum(c);
    float n = min(min(c.r, c.g), c.b);
    float x = max(max(c.r, c.g), c.b);
    if (n < 0.0) { c = l + ((c - l) * l) / (l - n); }
    if (x > 1.0) { c = l + ((c - l) * (1.0 - l)) / (x - l); }
    return c;
  }

  vec3 setLum(vec3 c, float l) {
    return clipColor(c + (l - lum(c)));
  }

  float sat(vec3 c) {
    return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
  }

  vec3 setSat(vec3 c, float s) {
    float minC = min(min(c.r, c.g), c.b);
    float maxC = max(max(c.r, c.g), c.b);
    if (maxC > minC) {
      return (c - minC) * s / (maxC - minC);
    }
    return vec3(0.0);
  }

  vec3 blendColor(vec3 backdrop, vec3 source) {
    if (u_blendMode == 1) { return backdrop * source; }
    if (u_blendMode == 2) { return backdrop + source - backdrop * source; }
    if (u_blendMode == 3) { return min(backdrop, source); }
    if (u_blendMode == 4) { return max(backdrop, source); }
    if (u_blendMode == 5) {
      return mix(2.0 * backdrop * source, 1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source), step(0.5, backdrop));
    }
    if (u_blendMode == 6) {
      return min(vec3(1.0), backdrop / max(vec3(0.001), 1.0 - source));
    }
    if (u_blendMode == 7) {
      return 1.0 - min(vec3(1.0), (1.0 - backdrop) / max(vec3(0.001), source));
    }
    if (u_blendMode == 8) {
      return mix(2.0 * backdrop * source, 1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source), step(0.5, source));
    }
    if (u_blendMode == 9) {
      return (1.0 - 2.0 * source) * backdrop * backdrop + 2.0 * source * backdrop;
    }
    if (u_blendMode == 10) { return abs(backdrop - source); }
    if (u_blendMode == 11) { return backdrop + source - 2.0 * backdrop * source; }
    if (u_blendMode == 12) { return setLum(setSat(source, sat(backdrop)), lum(backdrop)); }
    if (u_blendMode == 13) { return setLum(setSat(backdrop, sat(source)), lum(backdrop)); }
    if (u_blendMode == 14) { return setLum(source, lum(backdrop)); }
    if (u_blendMode == 15) { return setLum(backdrop, lum(source)); }
    if (u_blendMode == 16) { return max(vec3(0.0), backdrop + source - 1.0); }
    if (u_blendMode == 17) { return min(vec3(1.0), backdrop + source); }
    return source;
  }

  void main() {
    vec4 backdrop = texture2D(u_backdropTexture, v_texCoord);
    float alpha = texture2D(u_shadowTexture, v_texCoord + u_offset * u_texelSize).a;
    if (u_clipInside > 0.5) {
      float shapeAlpha = texture2D(u_shapeTexture, v_texCoord).a;
      alpha = alpha * (1.0 - shapeAlpha);
    }
    float sourceAlpha = alpha * u_color.a;
    vec3 blended = blendColor(backdrop.rgb, u_color.rgb);
    gl_FragColor = vec4(mix(backdrop.rgb, blended, sourceAlpha), max(backdrop.a, sourceAlpha));
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
  renderBackgroundBlur(params: { canvasWidth: number; canvasHeight: number; effect: BackgroundBlurEffect; pixelRatio: number; requireClipStencil: boolean; renderMask: () => void }): void;
  beginLayerCapture(canvasWidth: number, canvasHeight: number): Framebuffer;
  endLayerCaptureAndBlur(params: { canvasWidth: number; canvasHeight: number; effect: LayerBlurEffect; pixelRatio: number }): void;
  /** Blit the captured layer FBO to screen with the given opacity (no blur). */
  blitLayerWithOpacity(params: { canvasWidth: number; canvasHeight: number; opacity: number }): void;
  applyGaussianBlur(source: Framebuffer, radius: number): Framebuffer;
  dispose(): void;
};

function blendModeToShaderCode(blendMode: BlendMode | undefined): number {
  switch (blendMode) {
    case "multiply": return 1;
    case "screen": return 2;
    case "darken": return 3;
    case "lighten": return 4;
    case "overlay": return 5;
    case "color-dodge": return 6;
    case "color-burn": return 7;
    case "hard-light": return 8;
    case "soft-light": return 9;
    case "difference": return 10;
    case "exclusion": return 11;
    case "hue": return 12;
    case "saturation": return 13;
    case "color": return 14;
    case "luminosity": return 15;
    case "plus-darker": return 16;
    case "plus-lighter": return 17;
    default: return 0;
  }
}

/**
 * Create an effects renderer for WebGL drop shadow, inner shadow, and layer blur
 */
export function createEffectsRenderer(gl: WebGLRenderingContext): EffectsRendererInstance {
  const blurProgram = { value: null as WebGLProgram | null };
  const morphologyProgram = { value: null as WebGLProgram | null };
  const compositeProgram = { value: null as WebGLProgram | null };
  const blendShadowProgram = { value: null as WebGLProgram | null };
  const innerShadowProgram = { value: null as WebGLProgram | null };
  const blitProgram = { value: null as WebGLProgram | null };
  const fullscreenQuad = { value: null as WebGLBuffer | null };
  const tempFBO1 = { value: null as Framebuffer | null };
  const tempFBO2 = { value: null as Framebuffer | null };
  const shapeFBO = { value: null as Framebuffer | null };
  const layerFBO = { value: null as Framebuffer | null };

  function compileShader(label: string, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error(`WebGL effects renderer failed to allocate ${label} shader`);
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) ?? "unknown shader compile error";
      gl.deleteShader(shader);
      throw new Error(`WebGL effects renderer failed to compile ${label} shader: ${info}`);
    }
    return shader;
  }

  function compileProgram(label: string, vertexSrc: string, fragmentSrc: string): WebGLProgram {
    const vs = compileShader(`${label} vertex`, gl.VERTEX_SHADER, vertexSrc);
    const fs = compileShader(`${label} fragment`, gl.FRAGMENT_SHADER, fragmentSrc);

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      throw new Error(`WebGL effects renderer failed to allocate ${label} shader program`);
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program) ?? "unknown program link error";
      gl.deleteProgram(program);
      throw new Error(`WebGL effects renderer failed to link ${label} shader program: ${info}`);
    }

    return program;
  }

  function ensureResources(width: number, height: number): void {
    if (!blurProgram.value) {
      blurProgram.value = compileProgram("gaussian blur", gaussianBlurVertexShader, gaussianBlurFragmentShader);
    }

    if (!morphologyProgram.value) {
      morphologyProgram.value = compileProgram("alpha morphology", gaussianBlurVertexShader, alphaMorphologyFragmentShader);
    }

    if (!compositeProgram.value) {
      compositeProgram.value = compileProgram("drop shadow composite", compositeVertexShader, compositeFragmentShader);
    }

    if (!blendShadowProgram.value) {
      blendShadowProgram.value = compileProgram("shadow blend", compositeVertexShader, blendShadowFragmentShader);
    }

    if (!fullscreenQuad.value) {
      const buffer = gl.createBuffer();
      if (!buffer) {
        throw new Error("WebGL effects renderer failed to allocate fullscreen quad buffer");
      }
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
      innerShadowProgram.value = compileProgram("inner shadow", compositeVertexShader, innerShadowFragmentShader);
    }
  }

  function ensureLayerFBO(width: number, height: number): void {
    if (!layerFBO.value || layerFBO.value.width !== width || layerFBO.value.height !== height) {
      if (layerFBO.value) {deleteFramebuffer(gl, layerFBO.value);}
      layerFBO.value = createFramebufferWithStencil(gl, width, height);
    }
  }

  function copyDefaultFramebufferToLayer(canvasWidth: number, canvasHeight: number): Framebuffer {
    ensureLayerFBO(canvasWidth, canvasHeight);
    bindFramebuffer(gl, null);
    gl.bindTexture(gl.TEXTURE_2D, layerFBO.value!.texture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, canvasWidth, canvasHeight, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return layerFBO.value!;
  }

  function ensureBlitProgram(): void {
    if (!blitProgram.value) {
      blitProgram.value = compileProgram("blit", compositeVertexShader, blitFragmentShader);
    }
  }

  function requireProgram(program: WebGLProgram | null, label: string): WebGLProgram {
    if (!program) {
      throw new Error(`WebGL effects renderer failed to initialize ${label} shader program`);
    }
    return program;
  }

  function drawFullscreenQuad(program: WebGLProgram): void {
    if (!fullscreenQuad.value) {
      throw new Error("WebGL effects renderer fullscreen quad buffer is not initialized");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuad.value);
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
    const program = requireProgram(blurProgram.value, "gaussian blur");
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
        const horizontalTarget = currentSourceRef.value === tempFBO1.value ? tempFBO2.value! : tempFBO1.value!;
        const verticalTarget = horizontalTarget === tempFBO1.value ? tempFBO2.value! : tempFBO1.value!;

        bindFramebuffer(gl, horizontalTarget);
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawBlurPass({ sourceTexture: currentSourceRef.value.texture, width, height, dirX: 1, dirY: 0, radius: sigmaPerPass });

        bindFramebuffer(gl, verticalTarget);
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawBlurPass({ sourceTexture: horizontalTarget.texture, width, height, dirX: 0, dirY: 1, radius: sigmaPerPass });

        currentSourceRef.value = verticalTarget;
      }
    });

    bindFramebuffer(gl, null);

    return tempFBO2.value!;
  }

  function applyAlphaMorphology(source: Framebuffer, spread: number): Framebuffer {
    ensureResources(source.width, source.height);
    if (spread === 0) { return source; }
    const program = requireProgram(morphologyProgram.value, "alpha morphology");

    withStencilDisabled(() => {
      bindFramebuffer(gl, tempFBO1.value!);
      gl.colorMask(true, true, true, true);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, source.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
      gl.uniform2f(gl.getUniformLocation(program, "u_texelSize"), 1.0 / source.width, 1.0 / source.height);
      gl.uniform1f(gl.getUniformLocation(program, "u_radius"), Math.abs(spread));
      gl.uniform1f(gl.getUniformLocation(program, "u_operator"), spread > 0 ? 1 : 0);
      drawFullscreenQuad(program);
    });

    bindFramebuffer(gl, null);
    return tempFBO1.value!;
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

      const spreadSource = effect.spread ? applyAlphaMorphology(shapeFBO.value!, effect.spread * pixelRatio) : shapeFBO.value!;
      const resultFBORef = { value: undefined as Framebuffer | undefined };
      if (effect.radius > 0) {
        resultFBORef.value = applyGaussianBlur(spreadSource, effect.radius * pixelRatio);
      } else {
        resultFBORef.value = spreadSource;
      }

      bindFramebuffer(gl, null);
      gl.viewport(0, 0, canvasWidth, canvasHeight);

      const blendModeCode = blendModeToShaderCode(effect.blendMode);
      if (blendModeCode !== 0) {
        const backdrop = copyDefaultFramebufferToLayer(canvasWidth, canvasHeight);
        const programForBlend = requireProgram(blendShadowProgram.value, "drop shadow blend");
        gl.useProgram(programForBlend);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, resultFBORef.value.texture);
        gl.uniform1i(gl.getUniformLocation(programForBlend, "u_shadowTexture"), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, shapeFBO.value!.texture);
        gl.uniform1i(gl.getUniformLocation(programForBlend, "u_shapeTexture"), 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, backdrop.texture);
        gl.uniform1i(gl.getUniformLocation(programForBlend, "u_backdropTexture"), 2);

        gl.uniform4f(
          gl.getUniformLocation(programForBlend, "u_color"),
          effect.color.r, effect.color.g, effect.color.b, effect.color.a
        );
        gl.uniform2f(
          gl.getUniformLocation(programForBlend, "u_offset"),
          -effect.offset.x * pixelRatio,
          effect.offset.y * pixelRatio
        );
        gl.uniform2f(
          gl.getUniformLocation(programForBlend, "u_texelSize"),
          1.0 / canvasWidth,
          1.0 / canvasHeight
        );
        gl.uniform1f(gl.getUniformLocation(programForBlend, "u_clipInside"), 1);
        gl.uniform1i(gl.getUniformLocation(programForBlend, "u_blendMode"), blendModeCode);

        gl.disable(gl.BLEND);
        drawFullscreenQuad(programForBlend);
        gl.enable(gl.BLEND);
        gl.activeTexture(gl.TEXTURE0);
        return;
      }

      const program = requireProgram(compositeProgram.value, "drop shadow composite");
      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, resultFBORef.value.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, shapeFBO.value!.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_shapeTexture"), 1);

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
      gl.uniform1f(gl.getUniformLocation(program, "u_clipInside"), effect.showShadowBehindNode === false ? 1 : 0);

      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE, gl.ONE_MINUS_SRC_ALPHA
      );
      drawFullscreenQuad(program);
      gl.activeTexture(gl.TEXTURE0);
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

      const spreadSource = effect.spread ? applyAlphaMorphology(shapeFBO.value!, effect.spread * pixelRatio) : shapeFBO.value!;
      const blurredFBORef = { value: undefined as Framebuffer | undefined };
      if (effect.radius > 0) {
        blurredFBORef.value = applyGaussianBlur(spreadSource, effect.radius * pixelRatio);
      } else {
        blurredFBORef.value = spreadSource;
      }

      bindFramebuffer(gl, null);
      gl.viewport(0, 0, canvasWidth, canvasHeight);

      const program = requireProgram(innerShadowProgram.value, "inner shadow");

      const blendModeCode = blendModeToShaderCode(effect.blendMode);
      if (blendModeCode !== 0) {
        const maskTarget = blurredFBORef.value === tempFBO1.value ? tempFBO2.value! : tempFBO1.value!;
        bindFramebuffer(gl, maskTarget);
        gl.viewport(0, 0, canvasWidth, canvasHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, shapeFBO.value!.texture);
        gl.uniform1i(gl.getUniformLocation(program, "u_shapeTexture"), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, blurredFBORef.value.texture);
        gl.uniform1i(gl.getUniformLocation(program, "u_blurredTexture"), 1);

        gl.uniform4f(gl.getUniformLocation(program, "u_color"), 1, 1, 1, 1);
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
        drawFullscreenQuad(program);

        bindFramebuffer(gl, null);
        gl.viewport(0, 0, canvasWidth, canvasHeight);
        const backdrop = copyDefaultFramebufferToLayer(canvasWidth, canvasHeight);
        const blendProgram = requireProgram(blendShadowProgram.value, "inner shadow blend");
        gl.useProgram(blendProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, maskTarget.texture);
        gl.uniform1i(gl.getUniformLocation(blendProgram, "u_shadowTexture"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, shapeFBO.value!.texture);
        gl.uniform1i(gl.getUniformLocation(blendProgram, "u_shapeTexture"), 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, backdrop.texture);
        gl.uniform1i(gl.getUniformLocation(blendProgram, "u_backdropTexture"), 2);
        gl.uniform4f(gl.getUniformLocation(blendProgram, "u_color"), effect.color.r, effect.color.g, effect.color.b, effect.color.a);
        gl.uniform2f(gl.getUniformLocation(blendProgram, "u_offset"), 0, 0);
        gl.uniform2f(gl.getUniformLocation(blendProgram, "u_texelSize"), 1.0 / canvasWidth, 1.0 / canvasHeight);
        gl.uniform1f(gl.getUniformLocation(blendProgram, "u_clipInside"), 0);
        gl.uniform1i(gl.getUniformLocation(blendProgram, "u_blendMode"), blendModeCode);
        gl.disable(gl.BLEND);
        drawFullscreenQuad(blendProgram);
        gl.enable(gl.BLEND);
        gl.activeTexture(gl.TEXTURE0);
        return;
      }

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

    renderBackgroundBlur(
      { canvasWidth, canvasHeight, effect, pixelRatio, requireClipStencil, renderMask }: {
        canvasWidth: number; canvasHeight: number; effect: BackgroundBlurEffect; pixelRatio: number; requireClipStencil: boolean; renderMask: () => void;
      }
    ): void {
      ensureResources(canvasWidth, canvasHeight);
      ensureBlitProgram();

      const backdrop = copyDefaultFramebufferToLayer(canvasWidth, canvasHeight);
      const blurred = applyGaussianBlur(backdrop, effect.radius * pixelRatio);

      bindFramebuffer(gl, null);
      gl.viewport(0, 0, canvasWidth, canvasHeight);

      gl.enable(gl.STENCIL_TEST);
      gl.colorMask(false, false, false, false);
      gl.stencilMask(FILL_STENCIL_MASK);
      gl.stencilFunc(gl.ALWAYS, FILL_STENCIL_MASK, FILL_STENCIL_MASK);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      renderMask();

      gl.colorMask(true, true, true, true);
      gl.stencilMask(0x00);
      if (requireClipStencil) {
        gl.stencilFunc(gl.EQUAL, CLIP_STENCIL_BIT | FILL_STENCIL_MASK, 0xff);
      } else {
        gl.stencilFunc(gl.EQUAL, FILL_STENCIL_MASK, FILL_STENCIL_MASK);
      }
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

      const program = requireProgram(blitProgram.value, "background blur blit");
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, blurred.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "u_opacity"), 1.0);
      gl.disable(gl.BLEND);
      drawFullscreenQuad(program);
      gl.enable(gl.BLEND);

      gl.colorMask(false, false, false, false);
      gl.stencilMask(FILL_STENCIL_MASK);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);
      renderMask();

      gl.colorMask(true, true, true, true);
      gl.stencilMask(0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      if (requireClipStencil) {
        gl.stencilFunc(gl.EQUAL, CLIP_STENCIL_BIT, CLIP_STENCIL_BIT);
      } else {
        gl.disable(gl.STENCIL_TEST);
      }
      gl.blendFuncSeparate(
        gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE, gl.ONE_MINUS_SRC_ALPHA
      );
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

      const program = requireProgram(blitProgram.value, "layer blur blit");
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
    ): void {
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

      const program = requireProgram(blitProgram.value, "group opacity blit");
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
    },

    applyGaussianBlur,

    dispose(): void {
      if (blurProgram.value) {gl.deleteProgram(blurProgram.value);}
      if (morphologyProgram.value) {gl.deleteProgram(morphologyProgram.value);}
      if (compositeProgram.value) {gl.deleteProgram(compositeProgram.value);}
      if (blendShadowProgram.value) {gl.deleteProgram(blendShadowProgram.value);}
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
