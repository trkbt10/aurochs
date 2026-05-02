/** @file WebGL bridge for backend-neutral effect stacks. */

import type {
  AffineMatrix,
  BackgroundBlurEffect,
  Color,
  Effect,
  Fill,
  PathContour,
} from "../scene-graph/types";
import { buildEffectStack, renderShapeEffectStack } from "../scene-graph/render/effect-stack";
import { drawSolidFill, type GLContext } from "./fill-renderer";
import type { EffectsRendererInstance } from "./effects-renderer";
import { tessellateContours } from "./tessellation";
import type { Bounds } from "./stencil-fill";

type DrawStencilFillParams = {
  readonly fanVertices: Float32Array;
  readonly coverQuad: Float32Array;
  readonly transform: AffineMatrix;
  readonly opacity: number;
  readonly elementSize: { readonly width: number; readonly height: number };
  readonly fills: readonly Fill[];
};

export type WebGLEffectRenderingParams = {
  readonly getGlContext: () => GLContext;
  readonly effectsRenderer: EffectsRendererInstance;
  readonly pixelRatio: () => number;
  readonly canvasWidth: () => number;
  readonly canvasHeight: () => number;
  readonly isClipStencilRequired: () => boolean;
  readonly drawStencilFill: (params: DrawStencilFillParams) => void;
};

export type VertexShapeEffectParams = {
  readonly effects: readonly Effect[];
  readonly hasVisibleContent: boolean;
  readonly vertices: Float32Array;
  readonly transform: AffineMatrix;
  readonly opacity: number;
  readonly renderContent: () => void;
  readonly renderStroke: () => void;
};

export type WebGLEffectRendering = {
  readonly renderBackgroundBlurMask: (params: {
    readonly effect: BackgroundBlurEffect;
    readonly vertices: Float32Array;
    readonly transform: AffineMatrix;
  }) => void;
  readonly renderVertexShapeEffectStack: (params: VertexShapeEffectParams) => void;
  readonly renderDropShadows: (params: {
    readonly effects: readonly Effect[];
    readonly vertices: Float32Array;
    readonly transform: AffineMatrix;
    readonly opacity: number;
  }) => void;
  readonly renderInnerShadows: (params: {
    readonly effects: readonly Effect[];
    readonly vertices: Float32Array;
    readonly transform: AffineMatrix;
  }) => void;
  readonly renderDropShadowsStencil: (params: {
    readonly effects: readonly Effect[];
    readonly fanVertices: Float32Array;
    readonly coverQuad: Float32Array;
    readonly bounds: Bounds;
    readonly contours: readonly PathContour[];
    readonly transform: AffineMatrix;
    readonly opacity: number;
  }) => void;
};

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };

/** Create WebGL effect operations that consume the shared effect-stack schema. */
export function createWebGLEffectRendering(params: WebGLEffectRenderingParams): WebGLEffectRendering {
  function renderBackgroundBlurMask(
    { effect, vertices, transform }: {
      readonly effect: BackgroundBlurEffect;
      readonly vertices: Float32Array;
      readonly transform: AffineMatrix;
    },
  ): void {
    params.effectsRenderer.renderBackgroundBlur({
      canvasWidth: params.canvasWidth(),
      canvasHeight: params.canvasHeight(),
      effect,
      pixelRatio: params.pixelRatio(),
      requireClipStencil: params.isClipStencilRequired(),
      renderMask: () => {
        drawSolidFill({
          ctx: params.getGlContext(),
          vertices,
          color: WHITE,
          transform,
          opacity: 1,
        });
      },
    });
  }

  function renderDropShadows(
    { effects, vertices, transform, opacity }: {
      readonly effects: readonly Effect[];
      readonly vertices: Float32Array;
      readonly transform: AffineMatrix;
      readonly opacity: number;
    },
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
        drawSolidFill({ ctx: params.getGlContext(), vertices, color: effect.color, transform: offsetTransform, opacity: opacity * effect.color.a });
        continue;
      }

      params.effectsRenderer.renderDropShadow({
        canvasWidth: params.canvasWidth(),
        canvasHeight: params.canvasHeight(),
        effect,
        pixelRatio: params.pixelRatio(),
        renderSilhouette: () => {
          drawSolidFill({ ctx: params.getGlContext(), vertices, color: WHITE, transform, opacity: 1 });
        },
      });
    }
  }

  function renderInnerShadows(
    { effects, vertices, transform }: {
      readonly effects: readonly Effect[];
      readonly vertices: Float32Array;
      readonly transform: AffineMatrix;
    },
  ): void {
    for (const effect of effects) {
      if (effect.type !== "inner-shadow") { continue; }

      params.effectsRenderer.renderInnerShadow({
        canvasWidth: params.canvasWidth(),
        canvasHeight: params.canvasHeight(),
        effect,
        pixelRatio: params.pixelRatio(),
        renderSilhouette: () => {
          drawSolidFill({ ctx: params.getGlContext(), vertices, color: WHITE, transform, opacity: 1 });
        },
      });
    }
  }

  function renderDropShadowsStencil(
    { effects, fanVertices, coverQuad, bounds, contours, transform, opacity }: {
      readonly effects: readonly Effect[];
      readonly fanVertices: Float32Array;
      readonly coverQuad: Float32Array;
      readonly bounds: Bounds;
      readonly contours: readonly PathContour[];
      readonly transform: AffineMatrix;
      readonly opacity: number;
    },
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
        params.drawStencilFill({
          fanVertices,
          coverQuad,
          transform: offsetTransform,
          opacity: opacity * effect.color.a,
          elementSize,
          fills: [{ type: "solid", color: effect.color, opacity: 1 }],
        });
        continue;
      }

      const earcutVertices = tessellateContours(contours, 0.25, false);
      if (earcutVertices.length > 0) {
        params.effectsRenderer.renderDropShadow({
          canvasWidth: params.canvasWidth(),
          canvasHeight: params.canvasHeight(),
          effect,
          pixelRatio: params.pixelRatio(),
          renderSilhouette: () => {
            drawSolidFill({ ctx: params.getGlContext(), vertices: earcutVertices, color: WHITE, transform, opacity: 1 });
          },
        });
      }
    }
  }

  function renderVertexShapeEffectStack(
    { effects, hasVisibleContent, vertices, transform, opacity, renderContent, renderStroke }: VertexShapeEffectParams,
  ): void {
    renderShapeEffectStack({
      stack: buildEffectStack(effects),
      hasVisibleContent,
      renderBackgroundBlur: (effect) => {
        renderBackgroundBlurMask({ effect, vertices, transform });
      },
      renderDropShadows: (sourceEffects) => {
        renderDropShadows({ effects: sourceEffects, vertices, transform, opacity });
      },
      renderContent,
      renderInnerShadows: (sourceEffects) => {
        renderInnerShadows({ effects: sourceEffects, vertices, transform });
      },
      renderStroke,
    });
  }

  return {
    renderBackgroundBlurMask,
    renderVertexShapeEffectStack,
    renderDropShadows,
    renderInnerShadows,
    renderDropShadowsStencil,
  };
}
