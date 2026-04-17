/**
 * @file WebGL Figma Renderer
 *
 * Renders a SceneGraph to a WebGL canvas via the RenderTree intermediate
 * representation. The RenderTree provides ALL rendering decisions (visibility,
 * fill/stroke resolution, effect resolution, clipping, composition).
 *
 * The WebGL renderer uses:
 * - RenderTree structure for traversal and composition decisions
 * - RenderNode geometry fields (width, height, cx, cy, etc.) for tessellation
 * - RenderNode source* fields (sourceFills, sourceStroke, sourceContours) for
 *   GPU-specific data (Fill objects contain gradient stops, image refs, etc.
 *   needed for shader uniforms)
 * - node.source.effects for WebGL effect rendering (drop shadow, inner shadow,
 *   layer blur require raw effect params for FBO-based GPU rendering — the
 *   RenderTree's resolved filter defs are SVG-specific)
 * - node.source.transform for affine matrix math
 * - node.wrapper.opacity for resolved opacity (excludes invisible nodes)
 *
 * ## Architecture
 *
 * ```
 * SceneGraph
 *     ↓ resolveRenderTree()
 * RenderTree (fully resolved)
 *     ↓ WebGL renderer [this file]
 * GL draw calls (tessellation, shaders, stencil, framebuffer)
 * ```
 */

import type {
  SceneGraph,
  AffineMatrix,
  Fill,
  Color,
  LayerBlurEffect,
  Effect,
  PathContour,
  ClipShape,
} from "../scene-graph/types";

import {
  resolveRenderTree,
  type RenderNode,
  type RenderGroupNode,
  type RenderFrameNode,
  type RenderRectNode,
  type RenderEllipseNode,
  type RenderPathNode,
  type RenderTextNode,
  type RenderImageNode,
  type RenderNodeBase,
  type StrokeRendering,
} from "../scene-graph/render-tree";

import { createShaderCache } from "./shaders";
import {
  generateRectVertices,
  generateEllipseVertices,
  tessellateContours,
} from "./tessellation";
import {
  drawSolidFill,
  drawLinearGradientFill,
  drawRadialGradientFill,
  drawImageFill,
  type GLContext,
} from "./fill-renderer";
import { createTextureCache } from "./texture-cache";
import { IDENTITY_MATRIX, multiplyMatrices } from "@aurochs/fig/matrix";
import { beginStencilClip, endStencilClip } from "./clip-mask";
import {
  tessellateRectStroke,
  tessellateRectAlignedStroke,
  tessellateEllipseStroke,
  tessellatePathStroke,
} from "./stroke-tessellation";
import { renderFallbackTextToCanvas } from "./text-renderer";
import { createEffectsRenderer } from "./effects-renderer";
import {
  prepareFanTriangles,
  generateCoverQuad,
  CLIP_STENCIL_BIT,
  FILL_STENCIL_MASK,
  type Bounds,
} from "./stencil-fill";
import type { CornerRadius } from "../scene-graph/types";
import { svgPathDToContours } from "./path-contours";

/** Extract uniform radius from CornerRadius (per-corner → average for WebGL) */
function uniformRadiusForGL(cr: CornerRadius | undefined): number | undefined {
  if (cr === undefined) { return undefined; }
  if (typeof cr === "number") { return cr; }
  const avg = (cr[0] + cr[1] + cr[2] + cr[3]) / 4;
  return avg || undefined;
}

// =============================================================================
// Types
// =============================================================================

export type WebGLRendererOptions = {
  /** WebGL canvas element or rendering context */
  readonly canvas: HTMLCanvasElement;
  /** Device pixel ratio (default: window.devicePixelRatio) */
  readonly pixelRatio?: number;
  /** Antialias (default: true) */
  readonly antialias?: boolean;
  /** Background color (default: white) */
  readonly backgroundColor?: Color;
};

// =============================================================================
// WebGL Renderer
// =============================================================================

/** WebGL renderer instance for Figma scene graphs */
export type WebGLFigmaRendererInstance = {
  prepareScene(scene: SceneGraph): Promise<void>;
  render(scene: SceneGraph): void;
  dispose(): void;
};

/** Create a WebGL renderer for Figma scene graphs */
export function createWebGLFigmaRenderer(options: WebGLRendererOptions): WebGLFigmaRendererInstance {
  const glOrNull = options.canvas.getContext("webgl", {
    antialias: options.antialias ?? true,
    alpha: true,
    premultipliedAlpha: false,
    stencil: true,
    preserveDrawingBuffer: true,
  });

  if (!glOrNull) {
    throw new Error("WebGL not supported");
  }

  // Reassign after null guard so TypeScript narrows correctly in closures
  const gl: WebGLRenderingContext = glOrNull;

  const pixelRatio = options.pixelRatio ?? (typeof window !== "undefined" ? window.devicePixelRatio : 1);
  const shaders = createShaderCache(gl);
  const backgroundColor = options.backgroundColor ?? { r: 1, g: 1, b: 1, a: 1 };
  const textureCache = createTextureCache(gl);
  const effectsRenderer = createEffectsRenderer(gl);
  const width = { value: 0 };
  const height = { value: 0 };
  const clipActive = { value: false };
  const clipStencilValid = { value: false };

  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("Failed to create buffer");
  }
  const positionBuffer = buffer;

  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE, gl.ONE_MINUS_SRC_ALPHA
  );

  function getGlContext(): GLContext {
    return {
      gl,
      shaders,
      positionBuffer,
      width: width.value,
      height: height.value,
      pixelRatio,
    };
  }

  // =========================================================================
  // Image preloading — walk RenderTree, use source* fields for image data
  // =========================================================================

  async function walkForImages(node: RenderNode): Promise<void> {
    // Image nodes carry source data for texture creation
    if (node.type === "image") {
      await textureCache.getOrCreate(node.sourceImageRef, node.sourceData, node.sourceMimeType);
    }

    // Shape nodes may have image fills in their sourceFills
    if ("sourceFills" in node) {
      const fills = (node as RenderRectNode | RenderEllipseNode | RenderPathNode).sourceFills;
      for (const fill of fills) {
        if (fill.type === "image") {
          await textureCache.getOrCreate(fill.imageRef, fill.data, fill.mimeType);
        }
      }
    }

    // Frame backgrounds may have image fills. RenderFrameNode exposes
    // `sourceFills` directly (same shape as RenderRectNode.sourceFills),
    // so backends don't need to peek into the source SceneNode.
    if (node.type === "frame") {
      for (const fill of node.sourceFills) {
        if (fill.type === "image") {
          await textureCache.getOrCreate(fill.imageRef, fill.data, fill.mimeType);
        }
      }
    }

    // Recurse into children
    if ("children" in node) {
      const containerNode = node as RenderGroupNode | RenderFrameNode;
      for (const child of containerNode.children) {
        await walkForImages(child);
      }
    }
  }

  // =========================================================================
  // Effect helpers — use source effects for GPU-native rendering
  // =========================================================================

  /**
   * Extract effects from a RenderNode's source.
   * WebGL renders effects (drop shadow, inner shadow, layer blur) using
   * GPU-native FBO operations, not SVG filters. SceneNodeBase guarantees
   * an `effects` field on every SceneNode variant, so no cast is needed.
   */
  function getSourceEffects(node: RenderNodeBase): readonly Effect[] {
    return node.source.effects;
  }

  function findLayerBlur(node: RenderNodeBase): LayerBlurEffect | null {
    for (const effect of getSourceEffects(node)) {
      if (effect.type === "layer-blur" && effect.radius > 0) { return effect; }
    }
    return null;
  }

  function drawFill(
    { vertices, fill, transform, opacity, elementSize }: {
      vertices: Float32Array; fill: Fill; transform: AffineMatrix;
      opacity: number; elementSize: { width: number; height: number };
    }
  ): void {
    const ctx = getGlContext();

    switch (fill.type) {
      case "solid":
        drawSolidFill({ ctx, vertices, color: fill.color, transform, opacity: opacity * fill.opacity });
        break;

      case "linear-gradient":
        drawLinearGradientFill({ ctx, vertices, fill, transform, opacity, elementSize });
        break;

      case "radial-gradient":
        drawRadialGradientFill({ ctx, vertices, fill, transform, opacity, elementSize });
        break;

      case "image": {
        const entry = textureCache.getIfCached(fill.imageRef);
        if (entry) {
          drawImageFill({
            ctx, vertices, texture: entry.texture, transform,
            opacity: opacity * fill.opacity, elementSize,
            options: {
              imageWidth: entry.width,
              imageHeight: entry.height,
              scaleMode: fill.scaleMode,
              scalingFactor: fill.scalingFactor,
            },
          });
        }
        break;
      }

      case "angular-gradient": {
        // Angular (conic) gradient: WebGL fallback — render as radial gradient.
        // True conic rendering requires a dedicated shader.
        const fallbackFill: Fill = {
          type: "radial-gradient",
          center: fill.center,
          radius: 0.5,
          stops: fill.stops,
          opacity: fill.opacity,
        };
        drawRadialGradientFill({ ctx, vertices, fill: fallbackFill, transform, opacity, elementSize });
        break;
      }

      case "diamond-gradient": {
        // Diamond gradient: WebGL fallback — render as radial gradient.
        // True diamond rendering requires a dedicated shader.
        const fallbackFill: Fill = {
          type: "radial-gradient",
          center: fill.center,
          radius: 0.5,
          stops: fill.stops,
          opacity: fill.opacity,
        };
        drawRadialGradientFill({ ctx, vertices, fill: fallbackFill, transform, opacity, elementSize });
        break;
      }
    }
  }

  /**
   * Draw all fills for a shape node using source fill data.
   * Always draws ALL fills (multi-paint), not just the top fill.
   */
  function drawAllFills(
    { vertices, fills, transform, opacity, elementSize }: {
      vertices: Float32Array; fills: readonly Fill[]; transform: AffineMatrix;
      opacity: number; elementSize: { width: number; height: number };
    }
  ): void {
    for (const fill of fills) {
      drawFill({ vertices, fill, transform, opacity, elementSize });
    }
  }

  function drawStencilFill(
    { fanVertices, coverQuad, transform, opacity, elementSize, fills }: {
      fanVertices: Float32Array; coverQuad: Float32Array; transform: AffineMatrix;
      opacity: number; elementSize: { width: number; height: number }; fills: readonly Fill[];
    }
  ): void {
    const useClipAwareMode = clipActive.value && clipStencilValid.value;
    const white: Color = { r: 1, g: 1, b: 1, a: 1 };

    gl.enable(gl.STENCIL_TEST);
    gl.colorMask(false, false, false, false);
    gl.stencilMask(FILL_STENCIL_MASK);

    if (!useClipAwareMode) {
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
    }

    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);

    drawSolidFill({ ctx: getGlContext(), vertices: fanVertices, color: white, transform, opacity: 1 });

    gl.colorMask(true, true, true, true);
    gl.stencilMask(0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

    if (useClipAwareMode) {
      gl.stencilFunc(gl.LESS, CLIP_STENCIL_BIT, 0xff);
    } else {
      gl.stencilFunc(gl.NOTEQUAL, 0, FILL_STENCIL_MASK);
    }

    for (const fill of fills) {
      drawFill({ vertices: coverQuad, fill, transform, opacity, elementSize });
    }

    gl.colorMask(false, false, false, false);
    gl.stencilMask(FILL_STENCIL_MASK);
    gl.stencilFunc(gl.ALWAYS, 0, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);

    drawSolidFill({ ctx: getGlContext(), vertices: coverQuad, color: white, transform, opacity: 1 });

    gl.colorMask(true, true, true, true);
    gl.stencilMask(0xff);

    if (useClipAwareMode) {
      gl.stencilFunc(gl.EQUAL, CLIP_STENCIL_BIT, CLIP_STENCIL_BIT);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    } else {
      gl.disable(gl.STENCIL_TEST);
    }
  }

  // =========================================================================
  // Effect rendering — reads raw effects from source for GPU rendering
  // =========================================================================

  function renderDropShadows(
    { effects, vertices, transform, opacity }: {
      effects: readonly Effect[]; vertices: Float32Array; transform: AffineMatrix; opacity: number;
    }
  ): void {
    for (const effect of effects) {
      if (effect.type !== "drop-shadow") { continue; }

      if (effect.radius <= 0) {
        const offsetTransform: AffineMatrix = {
          m00: transform.m00,
          m01: transform.m01,
          m02: transform.m02 + effect.offset.x,
          m10: transform.m10,
          m11: transform.m11,
          m12: transform.m12 + effect.offset.y,
        };
        drawSolidFill({ ctx: getGlContext(), vertices, color: effect.color, transform: offsetTransform, opacity: opacity * effect.color.a });
      } else {
        const canvasW = width.value * pixelRatio;
        const canvasH = height.value * pixelRatio;
        effectsRenderer.renderDropShadow({
          canvasWidth: canvasW,
          canvasHeight: canvasH,
          effect,
          pixelRatio,
          renderSilhouette: () => {
            drawSolidFill({ ctx: getGlContext(), vertices, color: { r: 1, g: 1, b: 1, a: 1 }, transform, opacity: 1 });
          },
        });
      }
    }
  }

  function renderInnerShadows(
    { effects, vertices, transform }: {
      effects: readonly Effect[]; vertices: Float32Array; transform: AffineMatrix;
    }
  ): void {
    for (const effect of effects) {
      if (effect.type !== "inner-shadow") { continue; }

      const canvasW = width.value * pixelRatio;
      const canvasH = height.value * pixelRatio;
      effectsRenderer.renderInnerShadow({
        canvasWidth: canvasW,
        canvasHeight: canvasH,
        effect,
        pixelRatio,
        renderSilhouette: () => {
          drawSolidFill({ ctx: getGlContext(), vertices, color: { r: 1, g: 1, b: 1, a: 1 }, transform, opacity: 1 });
        },
      });
    }
  }

  function renderDropShadowsStencil(
    { effects, fanVertices, coverQuad, bounds, contours, transform, opacity }: {
      effects: readonly Effect[]; fanVertices: Float32Array; coverQuad: Float32Array;
      bounds: Bounds; contours: readonly PathContour[]; transform: AffineMatrix; opacity: number;
    }
  ): void {
    const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };

    for (const effect of effects) {
      if (effect.type !== "drop-shadow") { continue; }

      const offsetTransform: AffineMatrix = {
        m00: transform.m00,
        m01: transform.m01,
        m02: transform.m02 + effect.offset.x,
        m10: transform.m10,
        m11: transform.m11,
        m12: transform.m12 + effect.offset.y,
      };

      if (effect.radius <= 0) {
        drawStencilFill({
          fanVertices,
          coverQuad,
          transform: offsetTransform,
          opacity: opacity * effect.color.a,
          elementSize,
          fills: [{ type: "solid", color: effect.color, opacity: 1 }],
        });
      } else {
        const earcutVertices = tessellateContours(contours, 0.25, false);
        if (earcutVertices.length > 0) {
          const canvasW = width.value * pixelRatio;
          const canvasH = height.value * pixelRatio;
          effectsRenderer.renderDropShadow({
            canvasWidth: canvasW,
            canvasHeight: canvasH,
            effect,
            pixelRatio,
            renderSilhouette: () => {
              drawSolidFill({ ctx: getGlContext(), vertices: earcutVertices, color: { r: 1, g: 1, b: 1, a: 1 }, transform, opacity: 1 });
            },
          });
        }
      }
    }
  }

  // =========================================================================
  // Stroke rendering — uses StrokeRendering discriminated union from RenderTree
  // =========================================================================

  /**
   * Parse a hex color string (#RRGGBB or #RRGGBBAA) to a Color object.
   * Used to convert resolved stroke colors back to GPU-compatible Color.
   */
  function hexToColor(hex: string): Color {
    if (hex === "none") { return { r: 0, g: 0, b: 0, a: 0 }; }
    const h = hex.startsWith("#") ? hex.slice(1) : hex;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  function parseStrokeDasharray(dasharray: string | undefined): readonly number[] | undefined {
    if (!dasharray) { return undefined; }
    const pattern = dasharray
      .split(/[\s,]+/)
      .map((part) => Number(part))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (pattern.length === 0) { return undefined; }
    return pattern;
  }

  /**
   * Render strokes from the StrokeRendering discriminated union.
   * This is the single stroke rendering path for all node types.
   */
  function renderStrokeRendering(
    sr: StrokeRendering,
    transform: AffineMatrix,
    opacity: number,
  ): void {
    switch (sr.mode) {
      case "uniform":
        // Uniform strokes are rendered inline by each node renderer (which knows
        // the shape geometry for tessellation). This function is not called for
        // uniform mode — callers handle it directly with renderUniformStroke().
        break;

      case "masked": {
        // Stroke with INSIDE/OUTSIDE alignment.
        // SVG renders this as: stroke-width=2× + mask clips to the correct half.
        // WebGL uses stencil: draw fill shape to stencil, then draw 2× stroke
        // with stencil test (INSIDE=inside only, OUTSIDE=outside only).
        const color = hexToColor(sr.attrs.stroke);
        const doubledWidth = sr.attrs.strokeWidth ?? 1;
        const strokeOpacity = sr.attrs.strokeOpacity ?? 1;
        if (doubledWidth <= 0) { return; }

        const isInside = sr.attrs.strokeAlign === "INSIDE";
        if (sr.shape.kind === "rect") {
          const alignedStrokeVerts = tessellateRectAlignedStroke({
            w: sr.shape.width,
            h: sr.shape.height,
            cornerRadius: uniformRadiusForGL(sr.shape.cornerRadius) ?? 0,
            strokeWidth: doubledWidth / 2,
            align: isInside ? "INSIDE" : "OUTSIDE",
          });
          drawSolidFill({ ctx: getGlContext(), vertices: alignedStrokeVerts, color, transform, opacity: opacity * strokeOpacity });
          break;
        }

        // Tessellate the doubled-width stroke
        const strokeVerts = tessellateStrokeShapeFromSR(
          sr.shape,
          doubledWidth,
          parseStrokeDasharray(sr.attrs.strokeDasharray),
        );
        if (strokeVerts.length === 0) { break; }

        // Tessellate the fill shape for stencil mask
        const fillVerts = tessellateShapeForStencil(sr.shape);
        if (fillVerts.length === 0) {
          // No fill shape — draw stroke without masking
          drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color, transform, opacity: opacity * strokeOpacity });
          break;
        }

        const white: Color = { r: 1, g: 1, b: 1, a: 1 };

        // Save current stencil state
        const wasStencilEnabled = gl.isEnabled(gl.STENCIL_TEST);

        // Step 1: Write fill shape to stencil (use FILL_STENCIL_MASK bits)
        gl.enable(gl.STENCIL_TEST);
        gl.colorMask(false, false, false, false);
        gl.stencilMask(FILL_STENCIL_MASK);
        gl.stencilFunc(gl.ALWAYS, FILL_STENCIL_MASK, FILL_STENCIL_MASK);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        drawSolidFill({ ctx: getGlContext(), vertices: fillVerts, color: white, transform, opacity: 1 });

        // Step 2: Draw doubled stroke, stencil-tested
        // Must respect both fill mask (FILL_STENCIL_MASK) and clip stencil (CLIP_STENCIL_BIT)
        gl.colorMask(true, true, true, true);
        gl.stencilMask(0x00);
        if (isInside) {
          // INSIDE: draw where fill stencil is set (inside shape)
          // If clip is active, also require CLIP_STENCIL_BIT
          const ref = clipActive.value ? (CLIP_STENCIL_BIT | FILL_STENCIL_MASK) : FILL_STENCIL_MASK;
          const mask = clipActive.value ? 0xff : FILL_STENCIL_MASK;
          gl.stencilFunc(gl.EQUAL, ref, mask);
        } else {
          // OUTSIDE: draw where fill stencil is NOT set (outside shape)
          // If clip is active, require CLIP_STENCIL_BIT but NOT FILL_STENCIL_MASK
          const ref = clipActive.value ? CLIP_STENCIL_BIT : 0;
          const mask = clipActive.value ? 0xff : FILL_STENCIL_MASK;
          gl.stencilFunc(gl.EQUAL, ref, mask);
        }
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color, transform, opacity: opacity * strokeOpacity });

        // Step 3: Clear stencil bits
        gl.colorMask(false, false, false, false);
        gl.stencilMask(FILL_STENCIL_MASK);
        gl.stencilFunc(gl.ALWAYS, 0, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);
        drawSolidFill({ ctx: getGlContext(), vertices: fillVerts, color: white, transform, opacity: 1 });

        // Restore stencil state
        gl.colorMask(true, true, true, true);
        gl.stencilMask(0xff);
        if (!wasStencilEnabled) {
          gl.disable(gl.STENCIL_TEST);
        } else {
          // Restore clip stencil if active
          gl.stencilFunc(gl.EQUAL, CLIP_STENCIL_BIT, CLIP_STENCIL_BIT);
          gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        }
        break;
      }

      case "layers": {
        // Multi-paint stroke layers: draw each layer's stroke
        for (const layer of sr.layers) {
          const color = hexToColor(layer.attrs.stroke);
          const strokeWidth = layer.attrs.strokeWidth ?? 1;
          const strokeOpacity = layer.attrs.strokeOpacity ?? 1;
          if (strokeWidth <= 0) { continue; }

          const strokeVerts = tessellateStrokeShapeFromSR(
            sr.shape,
            strokeWidth,
            parseStrokeDasharray(layer.attrs.strokeDasharray),
          );
          if (strokeVerts.length > 0) {
            drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color, transform, opacity: opacity * strokeOpacity });
          }
        }
        break;
      }

      case "individual": {
        // Per-side stroke weights: draw each side separately
        const color = hexToColor(sr.color);
        const strokeOpacity = sr.opacity ?? 1;
        const { top, right, bottom, left } = sr.sides;
        const w = sr.width;
        const h = sr.height;

        // Top border
        if (top > 0) {
          const verts = generateRectVertices(w, top);
          drawSolidFill({ ctx: getGlContext(), vertices: verts, color, transform, opacity: opacity * strokeOpacity });
        }
        // Bottom border
        if (bottom > 0) {
          const offsetTransform: AffineMatrix = {
            m00: transform.m00, m01: transform.m01, m02: transform.m02,
            m10: transform.m10, m11: transform.m11, m12: transform.m12 + (h - bottom),
          };
          const verts = generateRectVertices(w, bottom);
          drawSolidFill({ ctx: getGlContext(), vertices: verts, color, transform: offsetTransform, opacity: opacity * strokeOpacity });
        }
        // Left border
        if (left > 0) {
          const verts = generateRectVertices(left, h);
          drawSolidFill({ ctx: getGlContext(), vertices: verts, color, transform, opacity: opacity * strokeOpacity });
        }
        // Right border
        if (right > 0) {
          const offsetTransform: AffineMatrix = {
            m00: transform.m00, m01: transform.m01, m02: transform.m02 + (w - right),
            m10: transform.m10, m11: transform.m11, m12: transform.m12,
          };
          const verts = generateRectVertices(right, h);
          drawSolidFill({ ctx: getGlContext(), vertices: verts, color, transform: offsetTransform, opacity: opacity * strokeOpacity });
        }
        break;
      }
    }
  }

  /**
   * Tessellate a stroke from its StrokeShape descriptor.
   * Used for non-path shapes (rect, ellipse). Path strokes are handled
   * by the node renderer using sourceContours directly.
   */
  function tessellateShapeForStencil(
    shape: import("../scene-graph/render-tree/types").StrokeShape,
  ): Float32Array {
    switch (shape.kind) {
      case "rect": {
        return generateRectVertices(shape.width, shape.height, shape.cornerRadius);
      }
      case "ellipse":
        return generateEllipseVertices({ cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry });
      case "path": {
        const contours: PathContour[] = shape.paths.flatMap((p) => svgPathDToContours({
          d: p.d,
          windingRule: p.fillRule ?? "nonzero",
        }));
        return tessellateContours(contours, 0.25, true);
      }
    }
  }

  function tessellateStrokeShapeFromSR(
    shape: import("../scene-graph/render-tree/types").StrokeShape,
    strokeWidth: number,
    dashPattern?: readonly number[],
  ): Float32Array {
    switch (shape.kind) {
      case "rect": {
        const cr = uniformRadiusForGL(shape.cornerRadius);
        return tessellateRectStroke({ w: shape.width, h: shape.height, cornerRadius: cr ?? 0, strokeWidth, dashPattern });
      }
      case "ellipse":
        return tessellateEllipseStroke({ cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry, strokeWidth, dashPattern });
      case "path":
        // Path strokes need the original contours for tessellation.
        // StrokeShape.path carries SVG d strings; we need PathContour objects.
        // Path strokes are handled by the node renderer using sourceContours directly.
        return new Float32Array(0);
    }
  }

  /**
   * Render a uniform stroke for a shape node. Used when strokeRendering.mode === "uniform"
   * and the caller knows the shape geometry.
   */
  function renderUniformStroke(
    { sr, sourceStroke, shapeVerticesFactory, transform, opacity }: {
      sr: StrokeRendering & { mode: "uniform" };
      sourceStroke: { width: number; color: Color; opacity: number; dashPattern?: readonly number[] } | undefined;
      shapeVerticesFactory: (strokeWidth: number, dashPattern?: readonly number[]) => Float32Array;
      transform: AffineMatrix;
      opacity: number;
    },
  ): void {
    if (!sourceStroke || sourceStroke.width <= 0) { return; }
    const dashPattern = sourceStroke.dashPattern ?? parseStrokeDasharray(sr.attrs.strokeDasharray);
    const strokeVerts = shapeVerticesFactory(sourceStroke.width, dashPattern);
    if (strokeVerts.length > 0) {
      drawSolidFill({
        ctx: getGlContext(), vertices: strokeVerts,
        color: sourceStroke.color, transform,
        opacity: opacity * sourceStroke.opacity,
      });
    }
  }

  // =========================================================================
  // RenderTree traversal
  // =========================================================================

  function renderRenderNode(
    node: RenderNode,
    parentTransform: AffineMatrix,
    parentOpacity: number
  ): void {
    // RenderTree already excludes invisible nodes, so no visibility check needed

    const worldTransform = multiplyMatrices(parentTransform, node.source.transform);
    // Use wrapper opacity (resolved by RenderTree) — falls back to 1 if undefined
    const nodeOpacity = node.wrapper.opacity ?? 1;
    const worldOpacity = parentOpacity * nodeOpacity;

    const layerBlur = findLayerBlur(node);
    if (layerBlur) {
      renderWithLayerBlur({ node, worldTransform, worldOpacity, effect: layerBlur });
      return;
    }

    if ((node.type === "group" || node.type === "frame") && nodeOpacity < 1) {
      const didRender = tryRenderWithGroupOpacity({ node, worldTransform, parentOpacity, nodeOpacity });
      if (didRender) { return; }
    }

    renderRenderNodeDirect(node, worldTransform, worldOpacity);
  }

  function restoreOuterClipStencil(wasClipActive: boolean): void {
    gl.colorMask(true, true, true, true);
    gl.stencilMask(0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

    if (wasClipActive) {
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.EQUAL, CLIP_STENCIL_BIT, CLIP_STENCIL_BIT);
      return;
    }

    gl.disable(gl.STENCIL_TEST);
  }

  /**
   * Try to render a container node with isolated group opacity via FBO.
   * Returns true if FBO rendering succeeded, false if unavailable.
   */
  function tryRenderWithGroupOpacity(
    { node, worldTransform, parentOpacity, nodeOpacity }: {
      node: RenderNode; worldTransform: AffineMatrix; parentOpacity: number; nodeOpacity: number;
    }
  ): boolean {
    const canvasW = width.value * pixelRatio;
    const canvasH = height.value * pixelRatio;

    // Pre-check: blit shader must be available to composite FBO content
    if (!effectsRenderer.isBlitAvailable()) {
      return false;
    }

    let fboCreated = true;
    try {
      effectsRenderer.beginLayerCapture(canvasW, canvasH);
    } catch {
      fboCreated = false;
    }

    if (!fboCreated) {
      return false;
    }

    const wasClipActive = clipActive.value;
    clipActive.value = false;

    // Render children at full parent opacity (no node opacity yet)
    renderRenderNodeDirect(node, worldTransform, parentOpacity);

    clipActive.value = wasClipActive;

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );

    restoreOuterClipStencil(wasClipActive);

    // Blit captured FBO with group opacity
    const blitSuccess = effectsRenderer.blitLayerWithOpacity({
      canvasWidth: canvasW, canvasHeight: canvasH,
      opacity: nodeOpacity,
    });

    if (!blitSuccess) {
      // Blit shader unavailable — need to re-render without FBO isolation.
      // The FBO captured content is lost, so re-render directly.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvasW, canvasH);
      restoreOuterClipStencil(wasClipActive);
      renderRenderNodeDirect(node, worldTransform, parentOpacity * nodeOpacity);
    }
    return true;
  }

  function renderRenderNodeDirect(
    node: RenderNode,
    worldTransform: AffineMatrix,
    worldOpacity: number
  ): void {
    switch (node.type) {
      case "group":
        renderGroupFromTree(node, worldTransform, worldOpacity);
        break;
      case "frame":
        renderFrameFromTree(node, worldTransform, worldOpacity);
        break;
      case "rect":
        renderRectFromTree(node, worldTransform, worldOpacity);
        break;
      case "ellipse":
        renderEllipseFromTree(node, worldTransform, worldOpacity);
        break;
      case "path":
        renderPathFromTree(node, worldTransform, worldOpacity);
        break;
      case "text":
        renderTextFromTree(node, worldTransform, worldOpacity);
        break;
      case "image":
        renderImageFromTree(node, worldTransform, worldOpacity);
        break;
    }
  }

  function renderWithLayerBlur(
    { node, worldTransform, worldOpacity, effect }: {
      node: RenderNode; worldTransform: AffineMatrix; worldOpacity: number; effect: LayerBlurEffect;
    }
  ): void {
    const canvasW = width.value * pixelRatio;
    const canvasH = height.value * pixelRatio;

    let fboCreated = true;
    try {
      effectsRenderer.beginLayerCapture(canvasW, canvasH);
    } catch {
      // FBO creation failed — fall back to direct rendering without blur
      fboCreated = false;
    }

    if (!fboCreated) {
      renderRenderNodeDirect(node, worldTransform, worldOpacity);
      return;
    }

    const wasClipActive = clipActive.value;
    clipActive.value = false;

    renderRenderNodeDirect(node, worldTransform, worldOpacity);

    clipActive.value = wasClipActive;

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );

    restoreOuterClipStencil(wasClipActive);

    effectsRenderer.endLayerCaptureAndBlur({ canvasWidth: canvasW, canvasHeight: canvasH, effect, pixelRatio });
  }

  // =========================================================================
  // Node-type renderers — use RenderTree fields for dimensions/geometry,
  // source* fields for GPU data, StrokeRendering for stroke dispatch
  // =========================================================================

  function renderGroupFromTree(node: RenderGroupNode, transform: AffineMatrix, opacity: number): void {
    for (const child of node.children) {
      renderRenderNode(child, transform, opacity);
    }
  }

  function getFrameClipData(
    { clipDef, node, transform }: {
      clipDef: import("../scene-graph/render-tree/types").RenderClipPathDef | undefined;
      node: RenderFrameNode;
      transform: AffineMatrix;
    },
  ): { clip: ClipShape; transform: AffineMatrix } {
    if (clipDef?.shape.kind === "path") {
      return {
        clip: { type: "path", contours: svgPathDToContours({ d: clipDef.shape.d }) },
        transform,
      };
    }

    if (clipDef?.shape.kind === "rect") {
      const clipTransform: AffineMatrix = {
        m00: transform.m00,
        m01: transform.m01,
        m02: transform.m02 + clipDef.shape.x,
        m10: transform.m10,
        m11: transform.m11,
        m12: transform.m12 + clipDef.shape.y,
      };
      return {
        clip: {
          type: "rect",
          width: clipDef.shape.width,
          height: clipDef.shape.height,
          cornerRadius: clipDef.shape.rx,
        },
        transform: clipTransform,
      };
    }

    return {
      clip: {
        type: "rect",
        width: node.width,
        height: node.height,
        cornerRadius: node.cornerRadius,
      },
      transform,
    };
  }

  function renderFrameFromTree(node: RenderFrameNode, transform: AffineMatrix, opacity: number): void {
    // Use RenderTree fields for dimensions and corner radius
    const elementSize = { width: node.width, height: node.height };
    const uniformCR = uniformRadiusForGL(node.cornerRadius);
    const vertices = generateRectVertices(node.width, node.height, node.cornerRadius);
    const effects = getSourceEffects(node);

    // Check if node has visible content — SVG filters operate on rendered content,
    // so fill=none + no stroke produces an empty shadow silhouette
    const hasFills = node.background !== null;
    const hasStroke = !!node.background?.strokeRendering;
    const hasVisibleContent = hasFills || hasStroke;

    // Drop shadows (before fills) — only if node has visible content
    if (hasVisibleContent) {
      renderDropShadows({ effects, vertices, transform, opacity });
    }

    // Background fills — use source fills for GPU draw data.
    if (node.background) {
      drawAllFills({ vertices, fills: node.sourceFills, transform, opacity, elementSize });
    }

    // Inner shadows (after fills, before strokes) — only if visible content
    if (hasVisibleContent) {
      renderInnerShadows({ effects, vertices, transform });
    }

    // Stroke — use StrokeRendering from RenderTree
    if (node.background?.strokeRendering) {
      const sr = node.background.strokeRendering;
      if (sr.mode === "uniform") {
        // Uniform stroke: tessellate rect stroke using RenderFrameNode.sourceStroke.
        const sourceStroke = node.sourceStroke;
        if (sourceStroke && sourceStroke.width > 0) {
          renderUniformStroke({
            sr,
            sourceStroke,
            shapeVerticesFactory: (sw, dashPattern) => tessellateRectStroke({
              w: node.width,
              h: node.height,
              cornerRadius: uniformCR ?? 0,
              strokeWidth: sw,
              dashPattern,
            }),
            transform,
            opacity,
          });
        }
      } else {
        renderStrokeRendering(sr, transform, opacity);
      }
    }

    // Children with clip — use RenderTree's clip-path def (which may be expanded
    // by child stroke overhang to prevent stroke clipping at frame edges)
    const wasClipActive = clipActive.value;
    const wasClipStencilValid = clipStencilValid.value;
    if (node.childClipId) {
      // Find the clip-path def for this child clip
      const clipDef = node.defs.find(
        (d): d is import("../scene-graph/render-tree/types").RenderClipPathDef =>
          d.type === "clip-path" && d.id === node.childClipId
      );
      const clipData = getFrameClipData({ clipDef, node, transform });
      beginStencilClip({ gl, clip: clipData.clip, _positionBuffer: positionBuffer, drawVertices: (verts) => {
        drawSolidFill({ ctx: getGlContext(), vertices: verts, color: { r: 0, g: 0, b: 0, a: 1 }, transform: clipData.transform, opacity: 1 });
      } });
      clipActive.value = true;
      clipStencilValid.value = true;
    }

    for (const child of node.children) {
      renderRenderNode(child, transform, opacity);
    }

    if (node.childClipId) {
      endStencilClip(gl);
      clipActive.value = wasClipActive;
      clipStencilValid.value = wasClipActive ? false : wasClipStencilValid;
    }
  }

  function renderRectFromTree(node: RenderRectNode, transform: AffineMatrix, opacity: number): void {
    // Use RenderTree fields for dimensions
    const elementSize = { width: node.width, height: node.height };
    const uniformCR = uniformRadiusForGL(node.cornerRadius);
    const vertices = generateRectVertices(node.width, node.height, node.cornerRadius);
    const effects = getSourceEffects(node);

    // Skip effects when node has no visible content (fill=none + no stroke → empty silhouette)
    const hasVisibleContent = node.sourceFills.length > 0 || !!node.strokeRendering;

    if (hasVisibleContent) {
      renderDropShadows({ effects, vertices, transform, opacity });
    }

    // Draw all fills (multi-paint) using sourceFills
    if (node.sourceFills.length > 0) {
      drawAllFills({ vertices, fills: node.sourceFills, transform, opacity, elementSize });
    }

    if (hasVisibleContent) {
      renderInnerShadows({ effects, vertices, transform });
    }

    // Stroke from StrokeRendering
    if (node.strokeRendering) {
      const sr = node.strokeRendering;
      if (sr.mode === "uniform") {
        renderUniformStroke({
          sr,
          sourceStroke: node.sourceStroke,
          shapeVerticesFactory: (sw, dashPattern) => tessellateRectStroke({
            w: node.width,
            h: node.height,
            cornerRadius: uniformCR ?? 0,
            strokeWidth: sw,
            dashPattern,
          }),
          transform,
          opacity,
        });
      } else {
        renderStrokeRendering(sr, transform, opacity);
      }
    }
  }

  function renderEllipseFromTree(node: RenderEllipseNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.rx * 2, height: node.ry * 2 };
    const vertices = generateEllipseVertices({ cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry });
    const effects = getSourceEffects(node);

    const hasVisibleContent = node.sourceFills.length > 0 || !!node.strokeRendering;

    if (hasVisibleContent) {
      renderDropShadows({ effects, vertices, transform, opacity });
    }

    if (node.sourceFills.length > 0) {
      drawAllFills({ vertices, fills: node.sourceFills, transform, opacity, elementSize });
    }

    if (hasVisibleContent) {
      renderInnerShadows({ effects, vertices, transform });
    }

    if (node.strokeRendering) {
      const sr = node.strokeRendering;
      if (sr.mode === "uniform") {
        renderUniformStroke({
          sr,
          sourceStroke: node.sourceStroke,
          shapeVerticesFactory: (sw, dashPattern) => tessellateEllipseStroke({
            cx: node.cx,
            cy: node.cy,
            rx: node.rx,
            ry: node.ry,
            strokeWidth: sw,
            dashPattern,
          }),
          transform,
          opacity,
        });
      } else {
        renderStrokeRendering(sr, transform, opacity);
      }
    }
  }

  function renderPathFromTree(node: RenderPathNode, transform: AffineMatrix, opacity: number): void {
    // Use RenderTree's paths[].d (SVG path strings) as the single source of truth.
    // This ensures WebGL renders the exact same geometry as SVG — including
    // shapes generated by the resolver (ellipse arcs, donut rings, etc.)
    // that have no sourceContours.
    if (node.paths.length === 0) { return; }
    const effects = getSourceEffects(node);

    // Parse RenderTree SVG paths to PathContours for tessellation
    const parsedContours: PathContour[] = node.paths.flatMap((rp) => svgPathDToContours({
      d: rp.d,
      windingRule: rp.fillRule ?? "nonzero",
    }));

    const hasVisibleContent = node.sourceFills.length > 0 || !!node.strokeRendering;

    if (parsedContours.some((contour) => contour.windingRule === "evenodd")) {
      const prepared = prepareFanTriangles(parsedContours);
      if (prepared) {
        const { fanVertices, bounds } = prepared;
        const coverQuad = generateCoverQuad(bounds);
        const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
        if (hasVisibleContent) {
          renderDropShadowsStencil({ effects, fanVertices, coverQuad, bounds, contours: parsedContours, transform, opacity });
        }
        if (node.sourceFills.length > 0) {
          drawStencilFill({ fanVertices, coverQuad, transform, opacity, elementSize, fills: node.sourceFills });
        }
      }
    } else {
      // autoDetectWinding=true: paths may use either CW or CCW convention.
      const vertices = tessellateContours(parsedContours, 0.25, true);
      if (vertices.length > 0) {
        if (hasVisibleContent) {
          renderDropShadows({ effects, vertices, transform, opacity });
        }
        if (node.sourceFills.length > 0) {
          const elementSize = computeBoundingBox(vertices);
          drawAllFills({ vertices, fills: node.sourceFills, transform, opacity, elementSize });
        }
      }
    }

    // Path stroke: tessellate from parsed contours (same SoT as fill)
    if (node.strokeRendering) {
      const sr = node.strokeRendering;
      if (sr.mode === "uniform" && node.sourceStroke && node.sourceStroke.width > 0) {
        const strokeVerts = tessellatePathStroke(parsedContours, node.sourceStroke.width, {
          dashPattern: node.sourceStroke.dashPattern,
        });
        if (strokeVerts.length > 0) {
          drawSolidFill({
            ctx: getGlContext(), vertices: strokeVerts,
            color: node.sourceStroke.color, transform,
            opacity: opacity * node.sourceStroke.opacity,
          });
        }
      } else if (sr.mode === "layers") {
        for (const layer of sr.layers) {
          const strokeWidth = layer.attrs.strokeWidth ?? 1;
          if (strokeWidth <= 0) { continue; }
          const strokeVerts = tessellatePathStroke(parsedContours, strokeWidth, {
            dashPattern: parseStrokeDasharray(layer.attrs.strokeDasharray),
          });
          if (strokeVerts.length > 0) {
            const color = hexToColor(layer.attrs.stroke);
            drawSolidFill({
              ctx: getGlContext(), vertices: strokeVerts,
              color, transform,
              opacity: opacity * (layer.attrs.strokeOpacity ?? 1),
            });
          }
        }
      } else if (sr.mode === "masked" && node.sourceStroke && node.sourceStroke.width > 0) {
        const strokeVerts = tessellatePathStroke(parsedContours, node.sourceStroke.width, {
          dashPattern: node.sourceStroke.dashPattern,
        });
        if (strokeVerts.length > 0) {
          drawSolidFill({
            ctx: getGlContext(), vertices: strokeVerts,
            color: node.sourceStroke.color, transform,
            opacity: opacity * node.sourceStroke.opacity,
          });
        }
      }
    }
  }

  function renderTextFromTree(node: RenderTextNode, transform: AffineMatrix, opacity: number): void {
    const ctx = getGlContext();
    const color = node.sourceFillColor;
    const fillOpacity = node.sourceFillOpacity;

    // Use RenderTree content as the single source of truth.
    // Both SVG and WebGL consume the same content representation.
    if (node.content.mode === "glyphs") {
      // Glyph path: parse the SVG path d string (SoT) and tessellate
      if (node.content.d.length === 0) { return; }

      const glyphContours = svgPathDToContours({ d: node.content.d });

      const vertices = tessellateContours(glyphContours, 0.1, true);
      if (vertices.length > 0) {
        drawSolidFill({ ctx, vertices, color, transform, opacity: opacity * fillOpacity });
      } else {
        // Fallback to stencil fill for complex glyph paths
        const prepared = prepareFanTriangles(glyphContours, 0.1);
        if (prepared) {
          const { fanVertices, bounds } = prepared;
          const coverQuad = generateCoverQuad(bounds);
          const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
          drawStencilFill({
            fanVertices, coverQuad, transform, opacity: opacity * fillOpacity,
            elementSize, fills: [{ type: "solid", color, opacity: 1 }],
          });
        }
      }
      return;
    }

    // Lines mode: render text via Canvas 2D texture fallback
    if (node.content.mode === "lines") {
      const textureKey = `__text_${node.id}`;
      const entryRef = { value: textureCache.getIfCached(textureKey) };

      if (!entryRef.value && node.sourceTextLineLayout) {
        // RenderTextNode.sourceTextLineLayout is already resolved by the
        // scene-graph pipeline; the Canvas fallback renderer consumes the
        // same TextNode shape, so we can hand the source through directly.
        const canvas = renderFallbackTextToCanvas(node.source);
        if (canvas) {
          entryRef.value = textureCache.createFromCanvas(textureKey, canvas);
        }
      }

      if (entryRef.value) {
        const w = node.width > 0 ? node.width : entryRef.value.width;
        const h = node.height > 0 ? node.height : entryRef.value.height;
        const vertices = generateRectVertices(w, h);
        const elementSize = { width: w, height: h };
        drawImageFill({ ctx, vertices, texture: entryRef.value.texture, transform, opacity: opacity * fillOpacity, elementSize });
      }
    }
  }

  function renderImageFromTree(node: RenderImageNode, transform: AffineMatrix, opacity: number): void {
    const entry = textureCache.getIfCached(node.sourceImageRef);
    if (!entry) { return; }

    const vertices = generateRectVertices(node.width, node.height);
    const elementSize = { width: node.width, height: node.height };
    drawImageFill({
      ctx: getGlContext(), vertices, texture: entry.texture, transform, opacity, elementSize,
      options: { imageWidth: entry.width, imageHeight: entry.height, scaleMode: node.sourceScaleMode },
    });
  }

  return {
    async prepareScene(scene: SceneGraph): Promise<void> {
      const renderTree = resolveRenderTree(scene);
      for (const child of renderTree.children) {
        await walkForImages(child);
      }
    },

    render(scene: SceneGraph): void {
      width.value = scene.width;
      height.value = scene.height;
      const canvas = gl.canvas as HTMLCanvasElement;
      canvas.width = scene.width * pixelRatio;
      canvas.height = scene.height * pixelRatio;
      canvas.style.width = `${scene.width}px`;
      canvas.style.height = `${scene.height}px`;

      gl.viewport(0, 0, canvas.width, canvas.height);

      const bg = backgroundColor;
      gl.clearColor(bg.r, bg.g, bg.b, bg.a);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

      clipActive.value = false;
      clipStencilValid.value = false;

      const renderTree = resolveRenderTree(scene);
      for (const child of renderTree.children) {
        renderRenderNode(child, IDENTITY_MATRIX, 1);
      }
    },

    dispose(): void {
      shaders.dispose();
      textureCache.dispose();
      effectsRenderer.dispose();
      gl.deleteBuffer(positionBuffer);
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function computeBoundingBox(vertices: Float32Array): { x: number; y: number; width: number; height: number } {
  if (vertices.length === 0) { return { x: 0, y: 0, width: 0, height: 0 }; }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i];
    const y = vertices[i + 1];
    if (x < minX) { minX = x; }
    if (x > maxX) { maxX = x; }
    if (y < minY) { minY = y; }
    if (y > maxY) { maxY = y; }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
