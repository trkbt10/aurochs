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
} from "../scene-graph/types";
import { ShaderCache } from "./shaders";
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
import { TextureCache } from "./texture-cache";
import { beginStencilClip, endStencilClip } from "./clip-mask";
import {
  tessellateRectStroke,
  tessellateEllipseStroke,
  tessellatePathStroke,
} from "./stroke-tessellation";
import { renderFallbackTextToCanvas } from "./text-renderer";
import { EffectsRenderer } from "./effects-renderer";
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

export class WebGLFigmaRenderer {
  private gl: WebGLRenderingContext;
  private shaders: ShaderCache;
  private width: number = 0;
  private height: number = 0;
  private pixelRatio: number;
  private positionBuffer: WebGLBuffer;
  private backgroundColor: Color;
  private textureCache: TextureCache;
  private effectsRenderer: EffectsRenderer;
  private clipActive: boolean = false;

  constructor(options: WebGLRendererOptions) {
    const gl = options.canvas.getContext("webgl", {
      antialias: options.antialias ?? true,
      alpha: true,
      premultipliedAlpha: false,
      stencil: true,
    });

    if (!gl) {
      throw new Error("WebGL not supported");
    }

    this.gl = gl;
    this.pixelRatio = options.pixelRatio ?? (typeof window !== "undefined" ? window.devicePixelRatio : 1);
    this.shaders = new ShaderCache(gl);
    this.backgroundColor = options.backgroundColor ?? { r: 1, g: 1, b: 1, a: 1 };
    this.textureCache = new TextureCache(gl);
    this.effectsRenderer = new EffectsRenderer(gl);

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Failed to create buffer");
    }
    this.positionBuffer = buffer;

    // Enable blending for transparency
    // Use separate blend functions: standard source-over for color channels,
    // but ONE for alpha source factor to keep the canvas opaque.
    // Without this, drawing a semi-transparent element (alpha=0.5) over an opaque
    // background produces canvas alpha = 0.5*0.5 + 1.0*0.5 = 0.75 instead of 1.0.
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,  // color: standard source-over
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA          // alpha: keeps canvas opaque
    );
  }

  private get glContext(): GLContext {
    return {
      gl: this.gl,
      shaders: this.shaders,
      positionBuffer: this.positionBuffer,
      width: this.width,
      height: this.height,
      pixelRatio: this.pixelRatio,
    };
  }

  /**
   * Pre-load textures for all image fills in the scene graph.
   * Must be called before render() for image fills to display.
   */
  async prepareScene(scene: SceneGraph): Promise<void> {
    await this.walkForImages(scene.root);
  }

  private async walkForImages(node: SceneNode): Promise<void> {
    if (node.type === "image") {
      await this.textureCache.getOrCreate(node.imageRef, node.data, node.mimeType);
    }

    if ("fills" in node) {
      for (const fill of node.fills) {
        if (fill.type === "image") {
          await this.textureCache.getOrCreate(fill.imageRef, fill.data, fill.mimeType);
        }
      }
    }

    if ("children" in node) {
      for (const child of node.children) {
        await this.walkForImages(child);
      }
    }
  }

  /**
   * Render a scene graph to the WebGL canvas
   */
  render(scene: SceneGraph): void {
    const gl = this.gl;

    // Update canvas size
    this.width = scene.width;
    this.height = scene.height;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.width = scene.width * this.pixelRatio;
    canvas.height = scene.height * this.pixelRatio;
    canvas.style.width = `${scene.width}px`;
    canvas.style.height = `${scene.height}px`;

    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear
    const bg = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    // Render scene tree
    this.clipActive = false;
    this.renderNode(scene.root, IDENTITY_MATRIX, 1);
  }

  /**
   * Render a single node recursively
   */
  private renderNode(
    node: SceneNode,
    parentTransform: AffineMatrix,
    parentOpacity: number
  ): void {
    if (!node.visible) return;

    const worldTransform = multiplyMatrices(parentTransform, node.transform);
    const worldOpacity = parentOpacity * node.opacity;

    switch (node.type) {
      case "group":
        this.renderGroup(node, worldTransform, worldOpacity);
        break;
      case "frame":
        this.renderFrame(node, worldTransform, worldOpacity);
        break;
      case "rect":
        this.renderRect(node, worldTransform, worldOpacity);
        break;
      case "ellipse":
        this.renderEllipse(node, worldTransform, worldOpacity);
        break;
      case "path":
        this.renderPath(node, worldTransform, worldOpacity);
        break;
      case "text":
        this.renderText(node, worldTransform, worldOpacity);
        break;
      case "image":
        this.renderImage(node, worldTransform, worldOpacity);
        break;
    }
  }

  private renderGroup(node: GroupNode, transform: AffineMatrix, opacity: number): void {
    for (const child of node.children) {
      this.renderNode(child, transform, opacity);
    }
  }

  private renderFrame(node: FrameNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.width, height: node.height };
    const vertices = generateRectVertices(node.width, node.height, node.cornerRadius);

    // Drop shadows (behind fills)
    this.renderDropShadows(node, vertices, transform, opacity);

    // Render background fills (bottom to top)
    if (node.fills.length > 0) {
      for (const fill of node.fills) {
        this.drawFill(vertices, fill, transform, opacity, elementSize);
      }
    }

    // Inner shadows (after fills)
    this.renderInnerShadows(node, vertices, transform, opacity);

    // Render stroke
    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateRectStroke(node.width, node.height, node.cornerRadius ?? 0, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill(this.glContext, strokeVerts, node.stroke.color, transform, opacity * node.stroke.opacity);
      }
    }

    // Clipping
    const wasClipActive = this.clipActive;
    if (node.clipsContent) {
      const clipShape = node.clip ?? {
        type: "rect" as const,
        width: node.width,
        height: node.height,
        cornerRadius: node.cornerRadius,
      };
      beginStencilClip(this.gl, clipShape, this.positionBuffer, (vertices) => {
        drawSolidFill(this.glContext, vertices, { r: 0, g: 0, b: 0, a: 1 }, transform, 1);
      });
      this.clipActive = true;
    }

    // Render children
    for (const child of node.children) {
      this.renderNode(child, transform, opacity);
    }

    if (node.clipsContent) {
      endStencilClip(this.gl);
      this.clipActive = wasClipActive;
    }
  }

  private renderRect(node: RectNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.width, height: node.height };
    const vertices = generateRectVertices(node.width, node.height, node.cornerRadius);

    // Drop shadows (behind fills)
    this.renderDropShadows(node, vertices, transform, opacity);

    if (node.fills.length > 0) {
      for (const fill of node.fills) {
        this.drawFill(vertices, fill, transform, opacity, elementSize);
      }
    }

    // Inner shadows (after fills, before strokes)
    this.renderInnerShadows(node, vertices, transform, opacity);

    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateRectStroke(node.width, node.height, node.cornerRadius ?? 0, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill(this.glContext, strokeVerts, node.stroke.color, transform, opacity * node.stroke.opacity);
      }
    }
  }

  private renderEllipse(node: EllipseNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.rx * 2, height: node.ry * 2 };
    const vertices = generateEllipseVertices(node.cx, node.cy, node.rx, node.ry);

    // Drop shadows (behind fills)
    this.renderDropShadows(node, vertices, transform, opacity);

    if (node.fills.length > 0) {
      for (const fill of node.fills) {
        this.drawFill(vertices, fill, transform, opacity, elementSize);
      }
    }

    // Inner shadows (after fills, before strokes)
    this.renderInnerShadows(node, vertices, transform, opacity);

    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateEllipseStroke(node.cx, node.cy, node.rx, node.ry, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill(this.glContext, strokeVerts, node.stroke.color, transform, opacity * node.stroke.opacity);
      }
    }
  }

  /**
   * Render a path node.
   *
   * Strategy:
   * - Multi-contour paths → always stencil (earcut's hole detection unreliable)
   * - Single-contour paths → earcut first (fast), stencil fallback if empty
   */
  private renderPath(node: PathNode, transform: AffineMatrix, opacity: number): void {
    if (node.contours.length === 0) return;

    if (node.contours.length === 1) {
      // Single contour — try earcut first (fast, correct for simple shapes)
      const vertices = tessellateContours(node.contours);
      if (vertices.length > 0) {
        this.renderDropShadows(node, vertices, transform, opacity);
        if (node.fills.length > 0) {
          const elementSize = computeBoundingBox(vertices);
          for (const fill of node.fills) {
            this.drawFill(vertices, fill, transform, opacity, elementSize);
          }
        }
      } else {
        // Earcut failed — fall back to stencil
        this.renderPathStencil(node, transform, opacity);
      }
    } else {
      // Multiple contours — always use stencil for correct hole handling
      this.renderPathStencil(node, transform, opacity);
    }

    // Stroke (using polyline thickening)
    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellatePathStroke(node.contours, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill(this.glContext, strokeVerts, node.stroke.color, transform, opacity * node.stroke.opacity);
      }
    }
  }

  /** Render path fills using stencil-based even-odd fill */
  private renderPathStencil(node: PathNode, transform: AffineMatrix, opacity: number): void {
    const prepared = prepareFanTriangles(node.contours);
    if (!prepared) return;

    const { fanVertices, bounds } = prepared;
    const coverQuad = generateCoverQuad(bounds);
    const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
    this.renderDropShadowsStencil(node, fanVertices, coverQuad, bounds, transform, opacity);

    if (node.fills.length > 0) {
      this.drawStencilFill(fanVertices, coverQuad, transform, opacity, elementSize, node.fills);
    }
  }

  /**
   * Render text node.
   *
   * Always uses stencil-based fill for glyph outlines. Stencil + MSAA gives
   * per-sample precision at the actual contour outline, producing better
   * anti-aliasing than earcut's artificial triangle edges.
   *
   * Uses tolerance=0.1 (tighter than default 0.25) for smoother glyph curves.
   */
  private renderText(node: TextNode, transform: AffineMatrix, opacity: number): void {
    const ctx = this.glContext;
    const color = node.fill.color;
    const fillOpacity = node.fill.opacity;

    if (node.glyphContours && node.glyphContours.length > 0) {
      // Always use stencil for glyph outlines (tighter tolerance for smoother curves)
      const prepared = prepareFanTriangles(node.glyphContours, 0.1);
      if (prepared) {
        const { fanVertices, bounds } = prepared;
        const coverQuad = generateCoverQuad(bounds);
        const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
        this.drawStencilFill(
          fanVertices, coverQuad, transform, opacity * fillOpacity,
          elementSize, [{ type: "solid", color, opacity: 1 }]
        );
      }

      // Render decorations (underlines, strikethroughs) via stencil too
      if (node.decorationContours && node.decorationContours.length > 0) {
        const decPrepared = prepareFanTriangles(node.decorationContours, 0.1);
        if (decPrepared) {
          const { fanVertices, bounds } = decPrepared;
          const coverQuad = generateCoverQuad(bounds);
          const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
          this.drawStencilFill(
            fanVertices, coverQuad, transform, opacity * fillOpacity,
            elementSize, [{ type: "solid", color, opacity: 1 }]
          );
        }
      }
      return;
    }

    // Fallback: render text via Canvas 2D → texture
    if (node.fallbackText) {
      const textureKey = `__text_${node.id}`;
      let entry = this.textureCache.getIfCached(textureKey);

      if (!entry) {
        const canvas = renderFallbackTextToCanvas(node);
        if (canvas) {
          entry = this.textureCache.createFromCanvas(textureKey, canvas);
        }
      }

      if (entry) {
        const vertices = generateRectVertices(entry.width, entry.height);
        const elementSize = { width: entry.width, height: entry.height };
        drawImageFill(ctx, vertices, entry.texture, transform, opacity * fillOpacity, elementSize);
      }
    }
  }

  private renderImage(node: ImageNode, transform: AffineMatrix, opacity: number): void {
    const entry = this.textureCache.getIfCached(node.imageRef);
    if (!entry) return;

    const vertices = generateRectVertices(node.width, node.height);
    const elementSize = { width: node.width, height: node.height };
    drawImageFill(this.glContext, vertices, entry.texture, transform, opacity, elementSize, {
      imageWidth: entry.width,
      imageHeight: entry.height,
      scaleMode: node.scaleMode,
    });
  }

  // =============================================================================
  // Stencil-Based Path Fill
  // =============================================================================

  /**
   * Draw fills using stencil-based even-odd fill rule.
   *
   * 1. Write fan triangles to stencil via INVERT
   * 2. Draw covering quad with actual fill colors where stencil is set
   * 3. Clean up stencil fill bits
   *
   * Uses bits 0-6 (FILL_STENCIL_MASK = 0x7F) for fill, bit 7 (0x80) for clip.
   * Works correctly with frame clipping: fan triangles only write where clip passes.
   */
  private drawStencilFill(
    fanVertices: Float32Array,
    coverQuad: Float32Array,
    transform: AffineMatrix,
    opacity: number,
    elementSize: { width: number; height: number },
    fills: readonly Fill[]
  ): void {
    const gl = this.gl;
    const isClipActive = this.clipActive;
    const white: Color = { r: 1, g: 1, b: 1, a: 1 };

    // Step 1: Write fan triangles to stencil via INVERT
    gl.enable(gl.STENCIL_TEST);
    gl.colorMask(false, false, false, false);
    gl.stencilMask(FILL_STENCIL_MASK);

    if (!isClipActive) {
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
    }
    // If clip is active, keep existing stencilFunc (EQUAL, CLIP_BIT, CLIP_BIT)
    // — fan triangles only write where clip passes

    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);

    // Draw fan triangles (color doesn't matter — colorMask is false)
    drawSolidFill(this.glContext, fanVertices, white, transform, 1);

    // Step 2: Draw covering quad with actual fill(s), masked by stencil
    gl.colorMask(true, true, true, true);
    gl.stencilMask(0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

    if (isClipActive) {
      // Clip active: need bit 7 set AND any fill bit set
      gl.stencilFunc(gl.GREATER, CLIP_STENCIL_BIT, 0xff);
    } else {
      // Any fill bit set (bits 0-6)
      gl.stencilFunc(gl.NOTEQUAL, 0, FILL_STENCIL_MASK);
    }

    for (const fill of fills) {
      this.drawFill(coverQuad, fill, transform, opacity, elementSize);
    }

    // Step 3: Clean up fill bits (0-6)
    gl.colorMask(false, false, false, false);
    gl.stencilMask(FILL_STENCIL_MASK);
    gl.stencilFunc(gl.ALWAYS, 0, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);

    drawSolidFill(this.glContext, coverQuad, white, transform, 1);

    // Restore state
    gl.colorMask(true, true, true, true);
    gl.stencilMask(0xff);

    if (isClipActive) {
      gl.stencilFunc(gl.EQUAL, CLIP_STENCIL_BIT, CLIP_STENCIL_BIT);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    } else {
      gl.disable(gl.STENCIL_TEST);
    }
  }

  // =============================================================================
  // Effects
  // =============================================================================

  /**
   * Render drop shadow effects for simple shapes (rect, ellipse, frame).
   * Uses pre-tessellated vertices directly.
   */
  private renderDropShadows(
    node: SceneNodeBase,
    vertices: Float32Array,
    transform: AffineMatrix,
    opacity: number
  ): void {
    if (node.effects.length === 0) return;

    for (const effect of node.effects) {
      if (effect.type !== "drop-shadow") continue;

      if (effect.radius <= 0) {
        // Zero-blur: draw the shape at offset position with shadow color
        const offsetTransform: AffineMatrix = {
          m00: transform.m00,
          m01: transform.m01,
          m02: transform.m02 + effect.offset.x,
          m10: transform.m10,
          m11: transform.m11,
          m12: transform.m12 + effect.offset.y,
        };
        drawSolidFill(
          this.glContext,
          vertices,
          effect.color,
          offsetTransform,
          opacity * effect.color.a
        );
      } else {
        // Blurred shadow: FBO → Gaussian blur → composite
        const canvasW = this.width * this.pixelRatio;
        const canvasH = this.height * this.pixelRatio;
        this.effectsRenderer.renderDropShadow(
          canvasW,
          canvasH,
          effect,
          this.pixelRatio,
          () => {
            drawSolidFill(
              this.glContext,
              vertices,
              { r: 1, g: 1, b: 1, a: 1 },
              transform,
              1
            );
          }
        );
      }
    }
  }

  /**
   * Render inner shadow effects for simple shapes (rect, ellipse, frame).
   * Must be called AFTER fills have been drawn.
   */
  private renderInnerShadows(
    node: SceneNodeBase,
    vertices: Float32Array,
    transform: AffineMatrix,
    opacity: number
  ): void {
    if (node.effects.length === 0) return;

    for (const effect of node.effects) {
      if (effect.type !== "inner-shadow") continue;

      const canvasW = this.width * this.pixelRatio;
      const canvasH = this.height * this.pixelRatio;
      this.effectsRenderer.renderInnerShadow(
        canvasW,
        canvasH,
        effect,
        this.pixelRatio,
        () => {
          drawSolidFill(
            this.glContext,
            vertices,
            { r: 1, g: 1, b: 1, a: 1 },
            transform,
            1
          );
        }
      );
    }
  }

  /**
   * Render drop shadow effects for path nodes using stencil fill.
   * Handles complex paths that can't be directly drawn with earcut.
   */
  private renderDropShadowsStencil(
    node: SceneNodeBase,
    fanVertices: Float32Array,
    coverQuad: Float32Array,
    bounds: Bounds,
    transform: AffineMatrix,
    opacity: number
  ): void {
    if (node.effects.length === 0) return;

    const elementSize = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };

    for (const effect of node.effects) {
      if (effect.type !== "drop-shadow") continue;

      const offsetTransform: AffineMatrix = {
        m00: transform.m00,
        m01: transform.m01,
        m02: transform.m02 + effect.offset.x,
        m10: transform.m10,
        m11: transform.m11,
        m12: transform.m12 + effect.offset.y,
      };

      if (effect.radius <= 0) {
        // Zero-blur: use stencil fill with shadow color at offset
        this.drawStencilFill(
          fanVertices,
          coverQuad,
          offsetTransform,
          opacity * effect.color.a,
          elementSize,
          [{ type: "solid", color: effect.color, opacity: 1 }]
        );
      } else {
        // Blurred shadow: FBO pipeline
        // Use earcut for the silhouette (best effort — FBO doesn't have stencil)
        const earcutVertices = tessellateContours(
          (node as PathNode).contours ?? [],
          0.25,
          false
        );
        if (earcutVertices.length > 0) {
          const canvasW = this.width * this.pixelRatio;
          const canvasH = this.height * this.pixelRatio;
          this.effectsRenderer.renderDropShadow(
            canvasW,
            canvasH,
            effect,
            this.pixelRatio,
            () => {
              drawSolidFill(
                this.glContext,
                earcutVertices,
                { r: 1, g: 1, b: 1, a: 1 },
                transform,
                1
              );
            }
          );
        }
      }
    }
  }

  // =============================================================================
  // Drawing Primitives
  // =============================================================================

  /**
   * Draw filled triangles using the appropriate shader
   */
  private drawFill(
    vertices: Float32Array,
    fill: Fill,
    transform: AffineMatrix,
    opacity: number,
    elementSize: { width: number; height: number }
  ): void {
    const ctx = this.glContext;

    switch (fill.type) {
      case "solid":
        drawSolidFill(ctx, vertices, fill.color, transform, opacity * fill.opacity);
        break;

      case "linear-gradient":
        drawLinearGradientFill(ctx, vertices, fill, transform, opacity, elementSize);
        break;

      case "radial-gradient":
        drawRadialGradientFill(ctx, vertices, fill, transform, opacity, elementSize);
        break;

      case "image": {
        const entry = this.textureCache.getIfCached(fill.imageRef);
        if (entry) {
          drawImageFill(ctx, vertices, entry.texture, transform, opacity * fill.opacity, elementSize, {
            imageWidth: entry.width,
            imageHeight: entry.height,
            scaleMode: fill.scaleMode,
          });
        }
        break;
      }
    }
  }

  /**
   * Dispose all WebGL resources
   */
  dispose(): void {
    this.shaders.dispose();
    this.textureCache.dispose();
    this.effectsRenderer.dispose();
    this.gl.deleteBuffer(this.positionBuffer);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function computeBoundingBox(vertices: Float32Array): { width: number; height: number } {
  if (vertices.length === 0) return { width: 0, height: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i];
    const y = vertices[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}
