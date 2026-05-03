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
  type StrokeShape,
  type RenderClipPathDef,
} from "../scene-graph/render-tree";
import type { ResolvedFillDef } from "../scene-graph/render/fill";

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
  drawAngularGradientFill,
  drawDiamondGradientFill,
  drawImageFill,
  type GLContext,
} from "./fill-renderer";
import { createTextureCache } from "./texture-cache";
import { imageTextureResource } from "./texture-resource";
import { IDENTITY_MATRIX, multiplyMatrices } from "@aurochs/fig/matrix";
import { beginStencilClip, endStencilClip } from "./clip-mask";
import {
  tessellateRectStroke,
  tessellateRectAlignedStroke,
  tessellateEllipseStroke,
  tessellatePathStroke,
} from "./stroke-tessellation";
import { createEffectsRenderer } from "./effects-renderer";
import { buildEffectStack, renderShapeEffectStack } from "../scene-graph/render/effect-stack";
import { createWebGLEffectRendering } from "./effect-rendering";
import { shouldRenderVisualNode, type ViewportRect } from "./render-culling";
import { createWebGLRenderTreeCache } from "./render-tree-cache";
import {
  prepareFanTriangles,
  generateCoverQuad,
  CLIP_STENCIL_BIT,
  FILL_STENCIL_MASK,
} from "./stencil-fill";
import type { CornerRadius } from "../scene-graph/types";
import { svgPathDToContours } from "./path-contours";
import { flattenPathCommands } from "./tessellation";

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
  setPixelRatio(pixelRatio: number): void;
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

  const pixelRatioRef = { value: options.pixelRatio ?? (typeof window !== "undefined" ? window.devicePixelRatio : 1) };
  const shaders = createShaderCache(gl);
  const backgroundColor = options.backgroundColor ?? { r: 1, g: 1, b: 1, a: 1 };
  const textureCache = createTextureCache(gl);
  const effectsRenderer = createEffectsRenderer(gl);
  const width = { value: 0 };
  const height = { value: 0 };
  const clipActive = { value: false };
  const clipStencilValid = { value: false };
  const renderTreeCache = createWebGLRenderTreeCache();

  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("Failed to create buffer");
  }
  const positionBuffer = buffer;
  const geometryCache = {
    rectVertices: new Map<string, Float32Array>(),
    ellipseVertices: new Map<string, Float32Array>(),
    pathGeometry: new Map<string, PathGeometry>(),
    textGlyphGeometry: new Map<string, TextGlyphGeometry>(),
  };

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
      pixelRatio: pixelRatioRef.value,
    };
  }

  type PathGeometry = {
    readonly parsedContours: readonly PathContour[];
    readonly prepared: ReturnType<typeof prepareFanTriangles>;
    readonly pathVertices: Float32Array;
    readonly backgroundMaskVertices: Float32Array;
  };

  type TextGlyphGeometry = {
    readonly contours: readonly PathContour[];
    readonly vertices: Float32Array;
  };

  const maxGeometryCacheEntries = 2048;

  function getCachedGeometry<T>(cache: Map<string, T>, key: string, create: () => T): T {
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    const value = create();
    if (cache.size >= maxGeometryCacheEntries) {
      const firstKey = cache.keys().next().value;
      if (typeof firstKey === "string") {
        cache.delete(firstKey);
      }
    }
    cache.set(key, value);
    return value;
  }

  function cornerRadiusCacheKey(cornerRadius: CornerRadius | undefined): string {
    return Array.isArray(cornerRadius) ? cornerRadius.join(",") : `${cornerRadius ?? ""}`;
  }

  function getRectVertices(widthValue: number, heightValue: number, cornerRadius?: CornerRadius): Float32Array {
    return getCachedGeometry(
      geometryCache.rectVertices,
      `${widthValue}:${heightValue}:${cornerRadiusCacheKey(cornerRadius)}`,
      () => generateRectVertices(widthValue, heightValue, cornerRadius),
    );
  }

  function getEllipseVertices({ cx, cy, rx, ry }: { readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number }): Float32Array {
    return getCachedGeometry(
      geometryCache.ellipseVertices,
      `${cx}:${cy}:${rx}:${ry}`,
      () => generateEllipseVertices({ cx, cy, rx, ry }),
    );
  }

  function renderPathCacheKey(node: RenderPathNode): string {
    return node.paths.map((path) => `${path.fillRule ?? "nonzero"}:${path.d}`).join("\u001f");
  }

  function getPathGeometry(node: RenderPathNode): PathGeometry {
    return getCachedGeometry(geometryCache.pathGeometry, renderPathCacheKey(node), () => {
      const parsedContours = node.paths.flatMap((rp) => svgPathDToContours({
        d: rp.d,
        windingRule: rp.fillRule ?? "nonzero",
      }));
      const usesEvenOddFill = parsedContours.some((contour) => contour.windingRule === "evenodd");
      return {
        parsedContours,
        prepared: usesEvenOddFill ? prepareFanTriangles(parsedContours) : null,
        pathVertices: usesEvenOddFill ? new Float32Array(0) : tessellateContours(parsedContours, 0.25, true),
        backgroundMaskVertices: tessellateContours(parsedContours, 0.25, true),
      };
    });
  }

  function getTextGlyphGeometry(pathData: string): TextGlyphGeometry {
    return getCachedGeometry(geometryCache.textGlyphGeometry, pathData, () => {
      const contours = svgPathDToContours({ d: pathData });
      return {
        contours,
        vertices: tessellateContours(contours, 0.1, true),
      };
    });
  }

  // =========================================================================
  // Image preloading — walk RenderTree, use source* fields for image data
  // =========================================================================

  function currentViewportRect(): ViewportRect {
    return { x: 0, y: 0, width: width.value, height: height.value };
  }

  function viewportToSurfaceTransform(
    renderTree: { readonly width: number; readonly height: number; readonly viewport: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } },
  ): AffineMatrix {
    if (renderTree.viewport.width <= 0 || renderTree.viewport.height <= 0) {
      throw new Error("WebGL renderer requires a positive viewport size");
    }
    const scaleX = renderTree.width / renderTree.viewport.width;
    const scaleY = renderTree.height / renderTree.viewport.height;
    return {
      ...IDENTITY_MATRIX,
      m00: scaleX,
      m11: scaleY,
      m02: -renderTree.viewport.x * scaleX,
      m12: -renderTree.viewport.y * scaleY,
    };
  }

  function isVisualNodeInViewport(node: RenderNode, transform: AffineMatrix): boolean {
    return shouldRenderVisualNode({
      node,
      transform,
      viewport: currentViewportRect(),
    });
  }

  async function walkForImages(node: RenderNode, parentTransform: AffineMatrix): Promise<void> {
    const worldTransform = multiplyMatrices(parentTransform, node.source.transform);
    const visible = isVisualNodeInViewport(node, worldTransform);

    // Image nodes carry source data for texture creation
    if (node.type === "image" && visible) {
      await textureCache.getOrCreate(imageTextureResource(node.sourceImageRef), node.sourceData, node.sourceMimeType);
    }

    // Shape and frame nodes share `sourceFills`. Walk all variants that
    // expose that field uniformly so any image fill is registered.
    if (visible && (
      node.type === "rect" ||
      node.type === "ellipse" ||
      node.type === "path" ||
      node.type === "frame"
    )) {
      for (const fill of node.sourceFills) {
        if (fill.type === "image") {
          await textureCache.getOrCreate(imageTextureResource(fill.imageRef), fill.data, fill.mimeType);
        }
      }
    }

    // Recurse into children (group / frame are the only container variants).
    if (node.type === "group" || node.type === "frame") {
      for (const child of node.children) {
        await walkForImages(child, worldTransform);
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
        const entry = textureCache.getIfCached(imageTextureResource(fill.imageRef));
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

      case "angular-gradient":
        drawAngularGradientFill({ ctx, vertices, fill, transform, opacity, elementSize });
        break;

      case "diamond-gradient":
        drawDiamondGradientFill({ ctx, vertices, fill, transform, opacity, elementSize });
        break;
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

  const effectRendering = createWebGLEffectRendering({
    getGlContext,
    effectsRenderer,
    pixelRatio: () => pixelRatioRef.value,
    canvasWidth: () => width.value * pixelRatioRef.value,
    canvasHeight: () => height.value * pixelRatioRef.value,
    isClipStencilRequired: () => clipActive.value && clipStencilValid.value,
    drawStencilFill,
  });

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

  function parseSvgCoordinate(value: string | undefined, fallback: number): number {
    if (!value) { return fallback; }
    if (value.endsWith("%")) {
      const parsed = Number(value.slice(0, -1));
      return Number.isFinite(parsed) ? parsed / 100 : fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function parseStopOffset(value: string): number {
    return parseSvgCoordinate(value, 0);
  }

  function resolvedGradientDefToFill(def: ResolvedFillDef | undefined): Fill | undefined {
    if (!def) { return undefined; }
    switch (def.type) {
      case "linear-gradient":
        return {
          type: "linear-gradient",
          start: { x: parseSvgCoordinate(def.x1, 0), y: parseSvgCoordinate(def.y1, 0.5) },
          end: { x: parseSvgCoordinate(def.x2, 1), y: parseSvgCoordinate(def.y2, 0.5) },
          stops: def.stops.map((stop) => ({
            position: parseStopOffset(stop.offset),
            color: { ...hexToColor(stop.stopColor), a: stop.stopOpacity ?? 1 },
          })),
          opacity: 1,
        };
      case "radial-gradient":
        return {
          type: "radial-gradient",
          center: { x: parseSvgCoordinate(def.cx, 0.5), y: parseSvgCoordinate(def.cy, 0.5) },
          radius: parseSvgCoordinate(def.r, 0.5),
          stops: def.stops.map((stop) => ({
            position: parseStopOffset(stop.offset),
            color: { ...hexToColor(stop.stopColor), a: stop.stopOpacity ?? 1 },
          })),
          opacity: 1,
        };
      case "angular-gradient":
        return {
          type: "angular-gradient",
          center: { x: parseSvgCoordinate(def.cx, 0.5), y: parseSvgCoordinate(def.cy, 0.5) },
          rotation: def.rotation,
          stops: def.stops.map((stop) => ({
            position: parseStopOffset(stop.offset),
            color: { ...hexToColor(stop.stopColor), a: stop.stopOpacity ?? 1 },
          })),
          opacity: 1,
        };
      case "diamond-gradient":
        return {
          type: "diamond-gradient",
          center: { x: parseSvgCoordinate(def.cx, 0.5), y: parseSvgCoordinate(def.cy, 0.5) },
          stops: def.stops.map((stop) => ({
            position: parseStopOffset(stop.offset),
            color: { ...hexToColor(stop.stopColor), a: stop.stopOpacity ?? 1 },
          })),
          opacity: 1,
        };
      case "image":
        return undefined;
    }
  }

  function pathContoursElementSize(contours: readonly PathContour[]): { readonly width: number; readonly height: number } {
    const coordinates = contours.flatMap((contour) => flattenPathCommands(contour.commands));
    if (coordinates.length < 2) {
      return { width: 1, height: 1 };
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < coordinates.length - 1; i += 2) {
      const x = coordinates[i] ?? 0;
      const y = coordinates[i + 1] ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    return { width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  function strokeShapeElementSize(shape: StrokeShape): { readonly width: number; readonly height: number } {
    switch (shape.kind) {
      case "rect":
        return { width: shape.width, height: shape.height };
      case "ellipse":
        return { width: shape.rx * 2, height: shape.ry * 2 };
      case "path": {
        const contours = shape.paths.flatMap((path) => svgPathDToContours({
          d: path.d,
          windingRule: path.fillRule ?? "nonzero",
        }));
        return pathContoursElementSize(contours);
      }
    }
  }

  function drawStrokePaintLayer({
    vertices,
    layer,
    attrs,
    transform,
    opacity,
    elementSize,
  }: {
    readonly vertices: Float32Array;
    readonly layer?: { readonly gradientDef?: ResolvedFillDef; readonly attrs?: { readonly strokeOpacity?: number } };
    readonly attrs: { readonly stroke: string; readonly strokeOpacity?: number };
    readonly transform: AffineMatrix;
    readonly opacity: number;
    readonly elementSize: { readonly width: number; readonly height: number };
  }): void {
    const strokeOpacity = attrs.strokeOpacity ?? layer?.attrs?.strokeOpacity ?? 1;
    const gradientFill = resolvedGradientDefToFill(layer?.gradientDef);
    if (gradientFill) {
      drawFill({ vertices, fill: gradientFill, transform, opacity: opacity * strokeOpacity, elementSize });
      return;
    }
    drawSolidFill({
      ctx: getGlContext(),
      vertices,
      color: hexToColor(attrs.stroke),
      transform,
      opacity: opacity * strokeOpacity,
    });
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
        const doubledWidth = sr.attrs.strokeWidth ?? 1;
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
          drawStrokePaintLayer({
            vertices: alignedStrokeVerts,
            layer: sr.layer,
            attrs: sr.attrs,
            transform,
            opacity,
            elementSize: { width: sr.shape.width, height: sr.shape.height },
          });
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
          drawStrokePaintLayer({
            vertices: strokeVerts,
            layer: sr.layer,
            attrs: sr.attrs,
            transform,
            opacity,
            elementSize: strokeShapeElementSize(sr.shape),
          });
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
        drawStrokePaintLayer({
          vertices: strokeVerts,
          layer: sr.layer,
          attrs: sr.attrs,
          transform,
          opacity,
          elementSize: strokeShapeElementSize(sr.shape),
        });

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
          const strokeWidth = layer.attrs.strokeWidth ?? 1;
          if (strokeWidth <= 0) { continue; }

          const strokeVerts = tessellateStrokeShapeFromSR(
            sr.shape,
            strokeWidth,
            parseStrokeDasharray(layer.attrs.strokeDasharray),
          );
          if (strokeVerts.length > 0) {
            drawStrokePaintLayer({
              vertices: strokeVerts,
              layer,
              attrs: layer.attrs,
              transform,
              opacity,
              elementSize: strokeShapeElementSize(sr.shape),
            });
          }
        }
        break;
      }

      case "individual": {
        // Per-side stroke weights with strokeAlign-aware band placement.
        //
        // INSIDE  (sign=+1): bands stack inside the rect (top   y=0..top,
        //                                                 bottom y=h-bottom..h, ...)
        // OUTSIDE (sign=-1): bands stack outside     (top y=-top..0, bottom y=h..h+bottom, ...)
        // CENTER  (sign= 0): bands straddle the edge (top y=-top/2..+top/2, ...)
        //
        // Mirrors svg/scene-renderer.ts and react/primitives/stroke-rendering.tsx.
        const color = hexToColor(sr.color);
        const strokeOpacity = sr.opacity ?? 1;
        const { top, right, bottom, left } = sr.sides;
        const w = sr.width;
        const h = sr.height;
        const sign = sr.strokeAlign === "OUTSIDE" ? -1 : sr.strokeAlign === "INSIDE" ? 1 : 0;
        // Top-left of each side's band, in local node coords.
        const topY = sign === 1 ? 0 : sign === -1 ? -top : -top / 2;
        const bottomY = sign === 1 ? h - bottom : sign === -1 ? h : h - bottom / 2;
        const leftX = sign === 1 ? 0 : sign === -1 ? -left : -left / 2;
        const rightX = sign === 1 ? w - right : sign === -1 ? w : w - right / 2;

        // Top border
        if (top > 0) {
          const offsetTransform: AffineMatrix = {
            m00: transform.m00, m01: transform.m01, m02: transform.m02,
            m10: transform.m10, m11: transform.m11, m12: transform.m12 + topY,
          };
          const verts = generateRectVertices(w, top);
          drawSolidFill({ ctx: getGlContext(), vertices: verts, color, transform: offsetTransform, opacity: opacity * strokeOpacity });
        }
        // Bottom border
        if (bottom > 0) {
          const offsetTransform: AffineMatrix = {
            m00: transform.m00, m01: transform.m01, m02: transform.m02,
            m10: transform.m10, m11: transform.m11, m12: transform.m12 + bottomY,
          };
          const verts = generateRectVertices(w, bottom);
          drawSolidFill({ ctx: getGlContext(), vertices: verts, color, transform: offsetTransform, opacity: opacity * strokeOpacity });
        }
        // Left border
        if (left > 0) {
          const offsetTransform: AffineMatrix = {
            m00: transform.m00, m01: transform.m01, m02: transform.m02 + leftX,
            m10: transform.m10, m11: transform.m11, m12: transform.m12,
          };
          const verts = generateRectVertices(left, h);
          drawSolidFill({ ctx: getGlContext(), vertices: verts, color, transform: offsetTransform, opacity: opacity * strokeOpacity });
        }
        // Right border
        if (right > 0) {
          const offsetTransform: AffineMatrix = {
            m00: transform.m00, m01: transform.m01, m02: transform.m02 + rightX,
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
    shape: StrokeShape,
  ): Float32Array {
    switch (shape.kind) {
      case "rect": {
        return getRectVertices(shape.width, shape.height, shape.cornerRadius);
      }
      case "ellipse":
        return getEllipseVertices({ cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry });
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
    shape: StrokeShape,
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
    if (node.type !== "group" && node.type !== "frame" && !isVisualNodeInViewport(node, worldTransform)) {
      return;
    }
    // Use wrapper opacity (resolved by RenderTree) — falls back to 1 if undefined
    const nodeOpacity = node.wrapper.opacity ?? 1;
    const worldOpacity = parentOpacity * nodeOpacity;

    const effectStack = buildEffectStack(getSourceEffects(node));
    const layerBlur = effectStack.layerBlur;
    if (layerBlur) {
      renderWithLayerBlur({ node, worldTransform, worldOpacity, effect: layerBlur });
      return;
    }

    if ((node.type === "group" || node.type === "frame") && nodeOpacity < 1) {
      renderWithGroupOpacity({ node, worldTransform, parentOpacity, nodeOpacity });
      return;
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
   * Render a container node with isolated group opacity via FBO.
   */
  function renderWithGroupOpacity(
    { node, worldTransform, parentOpacity, nodeOpacity }: {
      node: RenderNode; worldTransform: AffineMatrix; parentOpacity: number; nodeOpacity: number;
    }
  ): void {
    const canvasW = width.value * pixelRatioRef.value;
    const canvasH = height.value * pixelRatioRef.value;

    effectsRenderer.beginLayerCapture(canvasW, canvasH);

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

    effectsRenderer.blitLayerWithOpacity({
      canvasWidth: canvasW, canvasHeight: canvasH,
      opacity: nodeOpacity,
    });
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
    const canvasW = width.value * pixelRatioRef.value;
    const canvasH = height.value * pixelRatioRef.value;

    effectsRenderer.beginLayerCapture(canvasW, canvasH);

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

    effectsRenderer.endLayerCaptureAndBlur({ canvasWidth: canvasW, canvasHeight: canvasH, effect, pixelRatio: pixelRatioRef.value });
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
      clipDef: RenderClipPathDef | undefined;
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
    const vertices = getRectVertices(node.width, node.height, node.cornerRadius);
    const effects = getSourceEffects(node);

    // Check if node has visible content — SVG filters operate on rendered content,
    // so fill=none + no stroke produces an empty shadow silhouette
    const hasFills = node.background !== null;
    const hasStroke = !!node.background?.strokeRendering;
    const hasVisibleContent = hasFills || hasStroke;

    if (isVisualNodeInViewport(node, transform)) {
      effectRendering.renderVertexShapeEffectStack({
        effects,
        hasVisibleContent,
        vertices,
        transform,
        opacity,
        renderContent: () => {
          if (node.background) {
            drawAllFills({ vertices, fills: node.sourceFills, transform, opacity, elementSize });
          }
        },
        renderStroke: () => {
          if (!node.background?.strokeRendering) { return; }
          const sr = node.background.strokeRendering;
          if (sr.mode === "uniform") {
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
            return;
          }
          renderStrokeRendering(sr, transform, opacity);
        },
      });
    }

    // Children with clip — use RenderTree's clip-path def (which may be expanded
    // by child stroke overhang to prevent stroke clipping at frame edges)
    const wasClipActive = clipActive.value;
    const wasClipStencilValid = clipStencilValid.value;
    if (node.childClipId) {
      // Find the clip-path def for this child clip
      const clipDef = node.defs.find(
        (d): d is RenderClipPathDef =>
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
    const vertices = getRectVertices(node.width, node.height, node.cornerRadius);
    const effects = getSourceEffects(node);

    // Skip effects when node has no visible content (fill=none + no stroke → empty silhouette)
    const hasVisibleContent = node.sourceFills.length > 0 || !!node.strokeRendering;

    effectRendering.renderVertexShapeEffectStack({
      effects,
      hasVisibleContent,
      vertices,
      transform,
      opacity,
      renderContent: () => {
        if (node.sourceFills.length > 0) {
          drawAllFills({ vertices, fills: node.sourceFills, transform, opacity, elementSize });
        }
      },
      renderStroke: () => {
        if (!node.strokeRendering) { return; }
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
          return;
        }
        renderStrokeRendering(sr, transform, opacity);
      },
    });
  }

  function renderEllipseFromTree(node: RenderEllipseNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.rx * 2, height: node.ry * 2 };
    const vertices = getEllipseVertices({ cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry });
    const effects = getSourceEffects(node);

    const hasVisibleContent = node.sourceFills.length > 0 || !!node.strokeRendering;

    effectRendering.renderVertexShapeEffectStack({
      effects,
      hasVisibleContent,
      vertices,
      transform,
      opacity,
      renderContent: () => {
        if (node.sourceFills.length > 0) {
          drawAllFills({ vertices, fills: node.sourceFills, transform, opacity, elementSize });
        }
      },
      renderStroke: () => {
        if (!node.strokeRendering) { return; }
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
          return;
        }
        renderStrokeRendering(sr, transform, opacity);
      },
    });
  }

  function renderPathStrokeFromTree(
    { node, contours, transform, opacity }: {
      node: RenderPathNode; contours: readonly PathContour[]; transform: AffineMatrix; opacity: number;
    },
  ): void {
    if (!node.strokeRendering) { return; }
    const sr = node.strokeRendering;
    if (sr.mode === "uniform" && node.sourceStroke && node.sourceStroke.width > 0) {
      const strokeVerts = tessellatePathStroke(contours, node.sourceStroke.width, {
        dashPattern: node.sourceStroke.dashPattern,
      });
      if (strokeVerts.length > 0) {
        drawSolidFill({
          ctx: getGlContext(), vertices: strokeVerts,
          color: node.sourceStroke.color, transform,
          opacity: opacity * node.sourceStroke.opacity,
        });
      }
      return;
    }
    if (sr.mode === "layers") {
      for (const layer of sr.layers) {
        const strokeWidth = layer.attrs.strokeWidth ?? 1;
        if (strokeWidth <= 0) { continue; }
        const strokeVerts = tessellatePathStroke(contours, strokeWidth, {
          dashPattern: parseStrokeDasharray(layer.attrs.strokeDasharray),
        });
        if (strokeVerts.length > 0) {
          drawStrokePaintLayer({
            vertices: strokeVerts,
            layer,
            attrs: layer.attrs,
            transform,
            opacity,
            elementSize: pathContoursElementSize(contours),
          });
        }
      }
      return;
    }
    if (sr.mode === "masked" && node.sourceStroke && node.sourceStroke.width > 0) {
      const strokeVerts = tessellatePathStroke(contours, node.sourceStroke.width, {
        dashPattern: node.sourceStroke.dashPattern,
      });
      if (strokeVerts.length > 0) {
        drawStrokePaintLayer({
          vertices: strokeVerts,
          layer: sr.layer,
          attrs: sr.attrs,
          transform,
          opacity,
          elementSize: pathContoursElementSize(contours),
        });
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
    const effectStack = buildEffectStack(effects);

    const hasVisibleContent = node.sourceFills.length > 0 || !!node.strokeRendering;
    const { parsedContours, prepared, pathVertices, backgroundMaskVertices } = getPathGeometry(node);

    renderShapeEffectStack({
      stack: effectStack,
      hasVisibleContent,
      renderBackgroundBlur: (effect) => {
        if (backgroundMaskVertices.length > 0) {
          effectRendering.renderBackgroundBlurMask({ effect, vertices: backgroundMaskVertices, transform });
        }
      },
      renderDropShadows: (sourceEffects) => {
        if (prepared) {
          const { fanVertices, bounds } = prepared;
          const coverQuad = generateCoverQuad(bounds);
          effectRendering.renderDropShadowsStencil({ effects: sourceEffects, fanVertices, coverQuad, bounds, contours: parsedContours, transform, opacity });
          return;
        }
        if (pathVertices.length > 0) {
          effectRendering.renderDropShadows({ effects: sourceEffects, vertices: pathVertices, transform, opacity });
        }
      },
      renderContent: () => {
        if (node.sourceFills.length === 0) { return; }
        if (prepared) {
          const { fanVertices, bounds } = prepared;
          const coverQuad = generateCoverQuad(bounds);
          const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
          drawStencilFill({ fanVertices, coverQuad, transform, opacity, elementSize, fills: node.sourceFills });
          return;
        }
        if (pathVertices.length > 0) {
          const elementSize = computeBoundingBox(pathVertices);
          drawAllFills({ vertices: pathVertices, fills: node.sourceFills, transform, opacity, elementSize });
        }
      },
      renderInnerShadows: (sourceEffects) => {
        if (backgroundMaskVertices.length > 0) {
          effectRendering.renderInnerShadows({ effects: sourceEffects, vertices: backgroundMaskVertices, transform });
        }
      },
      renderStroke: () => {
        renderPathStrokeFromTree({ node, contours: parsedContours, transform, opacity });
      },
    });
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

      const { contours: glyphContours, vertices } = getTextGlyphGeometry(node.content.d);
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

    // Lines mode is not a WebGL rendering contract. Text must arrive as
    // glyph contours for GPU rendering; Canvas2D texture substitution hides
    // missing glyph data and diverges from fig as the source of truth.
    if (node.content.mode === "lines") {
      throw new Error(`WebGL text renderer requires glyph contours for text node ${node.id}`);
    }
  }

  function renderImageFromTree(node: RenderImageNode, transform: AffineMatrix, opacity: number): void {
    const entry = textureCache.getIfCached(imageTextureResource(node.sourceImageRef));
    if (!entry) { return; }

    const vertices = getRectVertices(node.width, node.height);
    const elementSize = { width: node.width, height: node.height };
    drawImageFill({
      ctx: getGlContext(), vertices, texture: entry.texture, transform, opacity, elementSize,
      options: { imageWidth: entry.width, imageHeight: entry.height, scaleMode: node.sourceScaleMode },
    });
  }

  return {
    async prepareScene(scene: SceneGraph): Promise<void> {
      width.value = scene.width;
      height.value = scene.height;
      const renderTree = renderTreeCache.get(scene);
      const viewportTransform = viewportToSurfaceTransform(renderTree);
      for (const child of renderTree.children) {
        await walkForImages(child, viewportTransform);
      }
    },

    render(scene: SceneGraph): void {
      width.value = scene.width;
      height.value = scene.height;
      const canvas = gl.canvas;
      // The renderer's `style.width/height` calls below require the
      // DOM-attached `HTMLCanvasElement`. `WebGL{,2}RenderingContext.canvas`
      // is typed `HTMLCanvasElement | OffscreenCanvas`; a runtime check
      // narrows to the DOM variant without an `as` cast and surfaces a
      // clear error if the renderer is ever wired to an OffscreenCanvas
      // (which would silently lose the CSS sizing).
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("WebGL renderer: gl.canvas is not an HTMLCanvasElement (OffscreenCanvas not supported)");
      }
      canvas.width = Math.ceil(scene.width * pixelRatioRef.value);
      canvas.height = Math.ceil(scene.height * pixelRatioRef.value);
      canvas.style.width = `${scene.width}px`;
      canvas.style.height = `${scene.height}px`;

      gl.viewport(0, 0, canvas.width, canvas.height);

      const bg = backgroundColor;
      gl.clearColor(bg.r, bg.g, bg.b, bg.a);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

      clipActive.value = false;
      clipStencilValid.value = false;

      const renderTree = renderTreeCache.get(scene);
      const viewportTransform = viewportToSurfaceTransform(renderTree);
      for (const child of renderTree.children) {
        renderRenderNode(child, viewportTransform, 1);
      }
    },

    setPixelRatio(pixelRatio: number): void {
      if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
        throw new Error("WebGL renderer requires positive pixelRatio");
      }
      pixelRatioRef.value = pixelRatio;
    },

    dispose(): void {
      shaders.dispose();
      textureCache.dispose();
      effectsRenderer.dispose();
      renderTreeCache.clear();
      geometryCache.rectVertices.clear();
      geometryCache.ellipseVertices.clear();
      geometryCache.pathGeometry.clear();
      geometryCache.textGlyphGeometry.clear();
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
