/**
 * @file WebGL Figma Renderer
 *
 * Renders a SceneGraph to a WebGL canvas via the RenderTree intermediate
 * representation. The RenderTree provides structural decisions (visibility,
 * composition, clipping); the WebGL renderer performs GL-specific operations
 * (tessellation, shader programs, stencil clipping, framebuffer effects).
 *
 * ## Architecture
 *
 * ```
 * SceneGraph
 *     ↓ resolveRenderTree()
 * RenderTree (structural decisions resolved)
 *     ↓ WebGL renderer [this file]
 * GL draw calls (tessellation, shaders, stencil, framebuffer)
 * ```
 */

import type {
  SceneGraph,
  SceneNode,
  SceneNodeBase,
  GroupNode,
  FrameNode,
  RectNode,
  EllipseNode,
  PathNode,
  TextNode,
  ImageNode,
  AffineMatrix,
  Fill,
  Color,
  LayerBlurEffect,
} from "../scene-graph/types";

import {
  resolveRenderTree,
  type RenderTree,
  type RenderNode,
  type RenderGroupNode,
  type RenderFrameNode,
  type RenderRectNode,
  type RenderEllipseNode,
  type RenderPathNode,
  type RenderTextNode,
  type RenderImageNode,
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
  // Image preloading (walks source SceneNodes via RenderTree)
  // =========================================================================

  async function walkForImages(node: RenderNode): Promise<void> {
    const src = node.source;

    if (src.type === "image") {
      const imgNode = src as ImageNode;
      await textureCache.getOrCreate(imgNode.imageRef, imgNode.data, imgNode.mimeType);
    }

    if ("fills" in src) {
      const fills = (src as FrameNode | RectNode | EllipseNode | PathNode).fills;
      for (const fill of fills) {
        if (fill.type === "image") {
          await textureCache.getOrCreate(fill.imageRef, fill.data, fill.mimeType);
        }
      }
    }

    if ("children" in node) {
      const containerNode = node as RenderGroupNode | RenderFrameNode;
      for (const child of containerNode.children) {
        await walkForImages(child);
      }
    }
  }

  // =========================================================================
  // Effect helpers
  // =========================================================================

  function findLayerBlur(node: SceneNode): LayerBlurEffect | null {
    if (!("effects" in node)) {return null;}
    for (const effect of node.effects) {
      if (effect.type === "layer-blur" && effect.radius > 0) {return effect;}
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
        drawSolidFill({ ctx: ctx, vertices: vertices, color: fill.color, transform: transform, opacity: opacity * fill.opacity });
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
            options: { imageWidth: entry.width, imageHeight: entry.height, scaleMode: fill.scaleMode },
          });
        }
        break;
      }

      case "angular-gradient": {
        // Angular (conic) gradient: WebGL fallback — render as radial gradient
        // using the same stops. True conic rendering requires a dedicated shader.
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

    drawSolidFill({ ctx: getGlContext(), vertices: fanVertices, color: white, transform: transform, opacity: 1 });

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

    drawSolidFill({ ctx: getGlContext(), vertices: coverQuad, color: white, transform: transform, opacity: 1 });

    gl.colorMask(true, true, true, true);
    gl.stencilMask(0xff);

    if (useClipAwareMode) {
      gl.stencilFunc(gl.EQUAL, CLIP_STENCIL_BIT, CLIP_STENCIL_BIT);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    } else {
      gl.disable(gl.STENCIL_TEST);
    }
  }

  function renderDropShadows(
    { node, vertices, transform, opacity }: {
      node: SceneNodeBase; vertices: Float32Array; transform: AffineMatrix; opacity: number;
    }
  ): void {
    if (node.effects.length === 0) {return;}

    for (const effect of node.effects) {
      if (effect.type !== "drop-shadow") {continue;}

      if (effect.radius <= 0) {
        const offsetTransform: AffineMatrix = {
          m00: transform.m00,
          m01: transform.m01,
          m02: transform.m02 + effect.offset.x,
          m10: transform.m10,
          m11: transform.m11,
          m12: transform.m12 + effect.offset.y,
        };
        drawSolidFill({ ctx: getGlContext(), vertices: vertices, color: effect.color, transform: offsetTransform, opacity: opacity * effect.color.a });
      } else {
        const canvasW = width.value * pixelRatio;
        const canvasH = height.value * pixelRatio;
        effectsRenderer.renderDropShadow({
          canvasWidth: canvasW,
          canvasHeight: canvasH,
          effect,
          pixelRatio,
          renderSilhouette: () => {
            drawSolidFill({ ctx: getGlContext(), vertices: vertices, color: { r: 1, g: 1, b: 1, a: 1 }, transform: transform, opacity: 1 });
          },
        });
      }
    }
  }

  function renderInnerShadows(
    { node, vertices, transform }: {
      node: SceneNodeBase; vertices: Float32Array; transform: AffineMatrix; opacity: number;
    }
  ): void {
    if (node.effects.length === 0) {return;}

    for (const effect of node.effects) {
      if (effect.type !== "inner-shadow") {continue;}

      const canvasW = width.value * pixelRatio;
      const canvasH = height.value * pixelRatio;
      effectsRenderer.renderInnerShadow({
        canvasWidth: canvasW,
        canvasHeight: canvasH,
        effect,
        pixelRatio,
        renderSilhouette: () => {
          drawSolidFill({ ctx: getGlContext(), vertices: vertices, color: { r: 1, g: 1, b: 1, a: 1 }, transform: transform, opacity: 1 });
        },
      });
    }
  }

  function renderDropShadowsStencil(
    { node, fanVertices, coverQuad, bounds, transform, opacity }: {
      node: SceneNodeBase; fanVertices: Float32Array; coverQuad: Float32Array;
      bounds: Bounds; transform: AffineMatrix; opacity: number;
    }
  ): void {
    if (node.effects.length === 0) {return;}

    const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };

    for (const effect of node.effects) {
      if (effect.type !== "drop-shadow") {continue;}

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
        const earcutVertices = tessellateContours(
          (node as unknown as PathNode).contours ?? [],
          0.25,
          false
        );
        if (earcutVertices.length > 0) {
          const canvasW = width.value * pixelRatio;
          const canvasH = height.value * pixelRatio;
          effectsRenderer.renderDropShadow({
            canvasWidth: canvasW,
            canvasHeight: canvasH,
            effect,
            pixelRatio,
            renderSilhouette: () => {
              drawSolidFill({ ctx: getGlContext(), vertices: earcutVertices, color: { r: 1, g: 1, b: 1, a: 1 }, transform: transform, opacity: 1 });
            },
          });
        }
      }
    }
  }

  // =========================================================================
  // RenderTree traversal — uses RenderNode for structure, source for GL data
  // =========================================================================

  function renderRenderNode(
    node: RenderNode,
    parentTransform: AffineMatrix,
    parentOpacity: number
  ): void {
    // RenderTree already excludes invisible nodes, so no visibility check needed

    const worldTransform = multiplyMatrices(parentTransform, node.source.transform);
    const worldOpacity = parentOpacity * node.source.opacity;

    const layerBlur = findLayerBlur(node.source);
    if (layerBlur) {
      renderWithLayerBlur({ node, worldTransform, worldOpacity, effect: layerBlur });
      return;
    }

    renderRenderNodeDirect(node, worldTransform, worldOpacity);
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

    if (wasClipActive) {
      gl.enable(gl.STENCIL_TEST);
    }

    effectsRenderer.endLayerCaptureAndBlur({ canvasWidth: canvasW, canvasHeight: canvasH, effect, pixelRatio });
  }

  // =========================================================================
  // Node-type renderers (read source SceneNode for GL-specific data)
  // =========================================================================

  function renderGroupFromTree(node: RenderGroupNode, transform: AffineMatrix, opacity: number): void {
    for (const child of node.children) {
      renderRenderNode(child, transform, opacity);
    }
  }

  function renderFrameFromTree(node: RenderFrameNode, transform: AffineMatrix, opacity: number): void {
    const src = node.source as FrameNode;
    const elementSize = { width: src.width, height: src.height };
    const uniformCR = uniformRadiusForGL(src.cornerRadius);
    const vertices = generateRectVertices(src.width, src.height, uniformCR);

    renderDropShadows({ node: src, vertices, transform, opacity });

    if (src.fills.length > 0) {
      for (const fill of src.fills) {
        drawFill({ vertices, fill, transform, opacity, elementSize });
      }
    }

    renderInnerShadows({ node: src, vertices, transform, opacity });

    if (src.stroke && src.stroke.width > 0) {
      const strokeVerts = tessellateRectStroke({ w: src.width, h: src.height, cornerRadius: uniformCR ?? 0, strokeWidth: src.stroke.width });
      if (strokeVerts.length > 0) {
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color: src.stroke.color, transform: transform, opacity: opacity * src.stroke.opacity });
      }
    }

    const wasClipActive = clipActive.value;
    const wasClipStencilValid = clipStencilValid.value;
    if (src.clipsContent) {
      const clipShape = src.clip ?? {
        type: "rect" as const,
        width: src.width,
        height: src.height,
        cornerRadius: src.cornerRadius,
      };
      beginStencilClip({ gl, clip: clipShape, _positionBuffer: positionBuffer, drawVertices: (verts) => {
        drawSolidFill({ ctx: getGlContext(), vertices: verts, color: { r: 0, g: 0, b: 0, a: 1 }, transform: transform, opacity: 1 });
      } });
      clipActive.value = true;
      clipStencilValid.value = true;
    }

    for (const child of node.children) {
      renderRenderNode(child, transform, opacity);
    }

    if (src.clipsContent) {
      endStencilClip(gl);
      clipActive.value = wasClipActive;
      clipStencilValid.value = wasClipActive ? false : wasClipStencilValid;
    }
  }

  function renderRectFromTree(node: RenderRectNode, transform: AffineMatrix, opacity: number): void {
    const src = node.source as RectNode;
    const elementSize = { width: src.width, height: src.height };
    const uniformCR = uniformRadiusForGL(src.cornerRadius);
    const vertices = generateRectVertices(src.width, src.height, uniformCR);

    renderDropShadows({ node: src, vertices, transform, opacity });

    if (src.fills.length > 0) {
      for (const fill of src.fills) {
        drawFill({ vertices, fill, transform, opacity, elementSize });
      }
    }

    renderInnerShadows({ node: src, vertices, transform, opacity });

    if (src.stroke && src.stroke.width > 0) {
      const strokeVerts = tessellateRectStroke({ w: src.width, h: src.height, cornerRadius: uniformCR ?? 0, strokeWidth: src.stroke.width });
      if (strokeVerts.length > 0) {
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color: src.stroke.color, transform: transform, opacity: opacity * src.stroke.opacity });
      }
    }
  }

  function renderEllipseFromTree(node: RenderEllipseNode, transform: AffineMatrix, opacity: number): void {
    const src = node.source as EllipseNode;
    const elementSize = { width: src.rx * 2, height: src.ry * 2 };
    const vertices = generateEllipseVertices({ cx: src.cx, cy: src.cy, rx: src.rx, ry: src.ry });

    renderDropShadows({ node: src, vertices, transform, opacity });

    if (src.fills.length > 0) {
      for (const fill of src.fills) {
        drawFill({ vertices, fill, transform, opacity, elementSize });
      }
    }

    renderInnerShadows({ node: src, vertices, transform, opacity });

    if (src.stroke && src.stroke.width > 0) {
      const strokeVerts = tessellateEllipseStroke({ cx: src.cx, cy: src.cy, rx: src.rx, ry: src.ry, strokeWidth: src.stroke.width });
      if (strokeVerts.length > 0) {
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color: src.stroke.color, transform: transform, opacity: opacity * src.stroke.opacity });
      }
    }
  }

  function renderPathFromTree(node: RenderPathNode, transform: AffineMatrix, opacity: number): void {
    const src = node.source as PathNode;
    if (src.contours.length === 0) {return;}

    const didDropShadowsRef = { value: false };

    for (const contour of src.contours) {
      const needsStencil = contour.windingRule === "evenodd";

      if (needsStencil) {
        const prepared = prepareFanTriangles([contour]);
        if (prepared) {
          const { fanVertices, bounds } = prepared;
          const coverQuad = generateCoverQuad(bounds);
          const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
          if (!didDropShadowsRef.value) {
            renderDropShadowsStencil({ node: src, fanVertices, coverQuad, bounds, transform, opacity });
            didDropShadowsRef.value = true;
          }
          if (src.fills.length > 0) {
            drawStencilFill({ fanVertices, coverQuad, transform, opacity, elementSize, fills: src.fills });
          }
        }
      } else {
        const vertices = tessellateContours([contour], 0.25);
        if (vertices.length > 0) {
          if (!didDropShadowsRef.value) {
            renderDropShadows({ node: src, vertices, transform, opacity });
            didDropShadowsRef.value = true;
          }
          if (src.fills.length > 0) {
            const elementSize = computeBoundingBox(vertices);
            for (const fill of src.fills) {
              drawFill({ vertices, fill, transform, opacity, elementSize });
            }
          }
        }
      }
    }

    if (src.stroke && src.stroke.width > 0) {
      const strokeVerts = tessellatePathStroke(src.contours, src.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color: src.stroke.color, transform: transform, opacity: opacity * src.stroke.opacity });
      }
    }
  }

  function renderTextFromTree(node: RenderTextNode, transform: AffineMatrix, opacity: number): void {
    const src = node.source as TextNode;
    const ctx = getGlContext();
    const color = src.fill.color;
    const fillOpacity = src.fill.opacity;

    if (src.glyphContours && src.glyphContours.length > 0) {
      const vertices = tessellateContours(src.glyphContours, 0.1, true);
      if (vertices.length > 0) {
        drawSolidFill({ ctx: ctx, vertices: vertices, color: color, transform: transform, opacity: opacity * fillOpacity });
      } else {
        const prepared = prepareFanTriangles(src.glyphContours, 0.1);
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

      if (src.decorationContours && src.decorationContours.length > 0) {
        const decVertices = tessellateContours(src.decorationContours, 0.1, true);
        if (decVertices.length > 0) {
          drawSolidFill({ ctx: ctx, vertices: decVertices, color: color, transform: transform, opacity: opacity * fillOpacity });
        }
      }
      return;
    }

    if (src.textLineLayout) {
      const textureKey = `__text_${src.id}`;
      const entryRef = { value: textureCache.getIfCached(textureKey) };

      if (!entryRef.value) {
        const canvas = renderFallbackTextToCanvas(src);
        if (canvas) {
          entryRef.value = textureCache.createFromCanvas(textureKey, canvas);
        }
      }

      if (entryRef.value) {
        const w = src.width > 0 ? src.width : entryRef.value.width;
        const h = src.height > 0 ? src.height : entryRef.value.height;
        const vertices = generateRectVertices(w, h);
        const elementSize = { width: w, height: h };
        drawImageFill({ ctx, vertices, texture: entryRef.value.texture, transform, opacity: opacity * fillOpacity, elementSize });
      }
    }
  }

  function renderImageFromTree(node: RenderImageNode, transform: AffineMatrix, opacity: number): void {
    const src = node.source as ImageNode;
    const entry = textureCache.getIfCached(src.imageRef);
    if (!entry) {return;}

    const vertices = generateRectVertices(src.width, src.height);
    const elementSize = { width: src.width, height: src.height };
    drawImageFill({
      ctx: getGlContext(), vertices, texture: entry.texture, transform, opacity, elementSize,
      options: { imageWidth: entry.width, imageHeight: entry.height, scaleMode: src.scaleMode },
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

function computeBoundingBox(vertices: Float32Array): { width: number; height: number } {
  if (vertices.length === 0) {return { width: 0, height: 0 };}

  const minXRef = { value: Infinity };
  const minYRef = { value: Infinity };
  const maxXRef = { value: -Infinity };
  const maxYRef = { value: -Infinity };

  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i];
    const y = vertices[i + 1];
    if (x < minXRef.value) {minXRef.value = x;}
    if (x > maxXRef.value) {maxXRef.value = x;}
    if (y < minYRef.value) {minYRef.value = y;}
    if (y > maxYRef.value) {maxYRef.value = y;}
  }

  return {
    width: maxXRef.value - minXRef.value,
    height: maxYRef.value - minYRef.value,
  };
}
