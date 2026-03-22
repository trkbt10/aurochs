/**
 * @file WebGL Figma Renderer
 *
 * Renders a SceneGraph to a WebGL canvas. Supports solid fills, gradients,
 * images, clipping, strokes, and glyph outlines through stencil-based
 * path rendering.
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
// Matrix Utilities
// =============================================================================

/**
 * Multiply two 3x3 affine matrices (stored as AffineMatrix)
 * Result = a * b
 */
function multiplyMatrices(a: AffineMatrix, b: AffineMatrix): AffineMatrix {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10,
    m01: a.m00 * b.m01 + a.m01 * b.m11,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02,
    m10: a.m10 * b.m00 + a.m11 * b.m10,
    m11: a.m10 * b.m01 + a.m11 * b.m11,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12,
  };
}

const IDENTITY_MATRIX: AffineMatrix = {
  m00: 1, m01: 0, m02: 0,
  m10: 0, m11: 1, m12: 0,
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
  const gl = options.canvas.getContext("webgl", {
    antialias: options.antialias ?? true,
    alpha: true,
    premultipliedAlpha: false,
    stencil: true,
  });

  if (!gl) {
    throw new Error("WebGL not supported");
  }

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

  async function walkForImages(node: SceneNode): Promise<void> {
    if (node.type === "image") {
      await textureCache.getOrCreate(node.imageRef, node.data, node.mimeType);
    }

    if ("fills" in node) {
      for (const fill of node.fills) {
        if (fill.type === "image") {
          await textureCache.getOrCreate(fill.imageRef, fill.data, fill.mimeType);
        }
      }
    }

    if ("children" in node) {
      for (const child of node.children) {
        await walkForImages(child);
      }
    }
  }

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
        const canvasW = width * pixelRatio;
        const canvasH = height * pixelRatio;
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

      const canvasW = width * pixelRatio;
      const canvasH = height * pixelRatio;
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
          (node as PathNode).contours ?? [],
          0.25,
          false
        );
        if (earcutVertices.length > 0) {
          const canvasW = width * pixelRatio;
          const canvasH = height * pixelRatio;
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

  function renderNode(
    node: SceneNode,
    parentTransform: AffineMatrix,
    parentOpacity: number
  ): void {
    if (!node.visible) {return;}

    const worldTransform = multiplyMatrices(parentTransform, node.transform);
    const worldOpacity = parentOpacity * node.opacity;

    const layerBlur = findLayerBlur(node);
    if (layerBlur) {
      renderWithLayerBlur({ node, worldTransform, worldOpacity, effect: layerBlur });
      return;
    }

    renderNodeDirect(node, worldTransform, worldOpacity);
  }

  function renderNodeDirect(
    node: SceneNode,
    worldTransform: AffineMatrix,
    worldOpacity: number
  ): void {
    switch (node.type) {
      case "group":
        renderGroup(node, worldTransform, worldOpacity);
        break;
      case "frame":
        renderFrame(node, worldTransform, worldOpacity);
        break;
      case "rect":
        renderRect(node, worldTransform, worldOpacity);
        break;
      case "ellipse":
        renderEllipse(node, worldTransform, worldOpacity);
        break;
      case "path":
        renderPath(node, worldTransform, worldOpacity);
        break;
      case "text":
        renderText(node, worldTransform, worldOpacity);
        break;
      case "image":
        renderImage(node, worldTransform, worldOpacity);
        break;
    }
  }

  function renderWithLayerBlur(
    { node, worldTransform, worldOpacity, effect }: {
      node: SceneNode; worldTransform: AffineMatrix; worldOpacity: number; effect: LayerBlurEffect;
    }
  ): void {
    const canvasW = width.value * pixelRatio;
    const canvasH = height.value * pixelRatio;

    effectsRenderer.beginLayerCapture(canvasW, canvasH);

    const wasClipActive = clipActive.value;
    clipActive.value = false;

    renderNodeDirect(node, worldTransform, worldOpacity);

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

  function renderGroup(node: GroupNode, transform: AffineMatrix, opacity: number): void {
    for (const child of node.children) {
      renderNode(child, transform, opacity);
    }
  }

  function renderFrame(node: FrameNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.width, height: node.height };
    const vertices = generateRectVertices(node.width, node.height, node.cornerRadius);

    renderDropShadows({ node, vertices, transform, opacity });

    if (node.fills.length > 0) {
      for (const fill of node.fills) {
        drawFill({ vertices, fill, transform, opacity, elementSize });
      }
    }

    renderInnerShadows({ node, vertices, transform, opacity });

    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateRectStroke({ w: node.width, h: node.height, cornerRadius: node.cornerRadius ?? 0, strokeWidth: node.stroke.width });
      if (strokeVerts.length > 0) {
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color: node.stroke.color, transform: transform, opacity: opacity * node.stroke.opacity });
      }
    }

    const wasClipActive = clipActive.value;
    const wasClipStencilValid = clipStencilValid.value;
    if (node.clipsContent) {
      const clipShape = node.clip ?? {
        type: "rect" as const,
        width: node.width,
        height: node.height,
        cornerRadius: node.cornerRadius,
      };
      beginStencilClip({ gl, clip: clipShape, _positionBuffer: positionBuffer, drawVertices: (verts) => {
        drawSolidFill({ ctx: getGlContext(), vertices: verts, color: { r: 0, g: 0, b: 0, a: 1 }, transform: transform, opacity: 1 });
      } });
      clipActive.value = true;
      clipStencilValid.value = true;
    }

    for (const child of node.children) {
      renderNode(child, transform, opacity);
    }

    if (node.clipsContent) {
      endStencilClip(gl);
      clipActive.value = wasClipActive;
      clipStencilValid.value = wasClipActive ? false : wasClipStencilValid;
    }
  }

  function renderRect(node: RectNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.width, height: node.height };
    const vertices = generateRectVertices(node.width, node.height, node.cornerRadius);

    renderDropShadows({ node, vertices, transform, opacity });

    if (node.fills.length > 0) {
      for (const fill of node.fills) {
        drawFill({ vertices, fill, transform, opacity, elementSize });
      }
    }

    renderInnerShadows({ node, vertices, transform, opacity });

    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateRectStroke({ w: node.width, h: node.height, cornerRadius: node.cornerRadius ?? 0, strokeWidth: node.stroke.width });
      if (strokeVerts.length > 0) {
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color: node.stroke.color, transform: transform, opacity: opacity * node.stroke.opacity });
      }
    }
  }

  function renderEllipse(node: EllipseNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.rx * 2, height: node.ry * 2 };
    const vertices = generateEllipseVertices({ cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry });

    renderDropShadows({ node, vertices, transform, opacity });

    if (node.fills.length > 0) {
      for (const fill of node.fills) {
        drawFill({ vertices, fill, transform, opacity, elementSize });
      }
    }

    renderInnerShadows({ node, vertices, transform, opacity });

    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateEllipseStroke({ cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry, strokeWidth: node.stroke.width });
      if (strokeVerts.length > 0) {
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color: node.stroke.color, transform: transform, opacity: opacity * node.stroke.opacity });
      }
    }
  }

  function renderPath(node: PathNode, transform: AffineMatrix, opacity: number): void {
    if (node.contours.length === 0) {return;}

    const didDropShadowsRef = { value: false };

    for (const contour of node.contours) {
      const needsStencil = contour.windingRule === "evenodd";

      if (needsStencil) {
        const prepared = prepareFanTriangles([contour]);
        if (prepared) {
          const { fanVertices, bounds } = prepared;
          const coverQuad = generateCoverQuad(bounds);
          const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
          if (!didDropShadowsRef.value) {
            renderDropShadowsStencil({ node, fanVertices, coverQuad, bounds, transform, opacity });
            didDropShadowsRef.value = true;
          }
          if (node.fills.length > 0) {
            drawStencilFill({ fanVertices, coverQuad, transform, opacity, elementSize, fills: node.fills });
          }
        }
      } else {
        const vertices = tessellateContours([contour], 0.25);
        if (vertices.length > 0) {
          if (!didDropShadowsRef.value) {
            renderDropShadows({ node, vertices, transform, opacity });
            didDropShadowsRef.value = true;
          }
          if (node.fills.length > 0) {
            const elementSize = computeBoundingBox(vertices);
            for (const fill of node.fills) {
              drawFill({ vertices, fill, transform, opacity, elementSize });
            }
          }
        }
      }
    }

    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellatePathStroke(node.contours, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill({ ctx: getGlContext(), vertices: strokeVerts, color: node.stroke.color, transform: transform, opacity: opacity * node.stroke.opacity });
      }
    }
  }

  function renderText(node: TextNode, transform: AffineMatrix, opacity: number): void {
    const ctx = getGlContext();
    const color = node.fill.color;
    const fillOpacity = node.fill.opacity;

    if (node.glyphContours && node.glyphContours.length > 0) {
      const vertices = tessellateContours(node.glyphContours, 0.1, true);
      if (vertices.length > 0) {
        drawSolidFill({ ctx: ctx, vertices: vertices, color: color, transform: transform, opacity: opacity * fillOpacity });
      } else {
        const prepared = prepareFanTriangles(node.glyphContours, 0.1);
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

      if (node.decorationContours && node.decorationContours.length > 0) {
        const decVertices = tessellateContours(node.decorationContours, 0.1, true);
        if (decVertices.length > 0) {
          drawSolidFill({ ctx: ctx, vertices: decVertices, color: color, transform: transform, opacity: opacity * fillOpacity });
        }
      }
      return;
    }

    if (node.fallbackText) {
      const textureKey = `__text_${node.id}`;
      const entryRef = { value: textureCache.getIfCached(textureKey) };

      if (!entryRef.value) {
        const canvas = renderFallbackTextToCanvas(node);
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

  function renderImage(node: ImageNode, transform: AffineMatrix, opacity: number): void {
    const entry = textureCache.getIfCached(node.imageRef);
    if (!entry) {return;}

    const vertices = generateRectVertices(node.width, node.height);
    const elementSize = { width: node.width, height: node.height };
    drawImageFill({
      ctx: getGlContext(), vertices, texture: entry.texture, transform, opacity, elementSize,
      options: { imageWidth: entry.width, imageHeight: entry.height, scaleMode: node.scaleMode },
    });
  }

  return {
    async prepareScene(scene: SceneGraph): Promise<void> {
      await walkForImages(scene.root);
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
      renderNode(scene.root, IDENTITY_MATRIX, 1);
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
