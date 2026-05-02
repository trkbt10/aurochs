/** @file Shared effect stack schema */

import type {
  BackgroundBlurEffect,
  Effect,
  LayerBlurEffect,
} from "../types";

export type ShapeEffectStackParams = {
  readonly stack: ResolvedEffectStack;
  readonly hasVisibleContent: boolean;
  readonly renderBackgroundBlur?: (effect: BackgroundBlurEffect) => void;
  readonly renderDropShadows: (effects: readonly Effect[]) => void;
  readonly renderContent: () => void;
  readonly renderInnerShadows: (effects: readonly Effect[]) => void;
  readonly renderStroke: () => void;
};

export type ResolvedEffectStack = {
  readonly allEffects: readonly Effect[];
  readonly foregroundEffects: readonly Effect[];
  readonly backgroundBlur: BackgroundBlurEffect | null;
  readonly layerBlur: LayerBlurEffect | null;
};

/** Return the first active layer blur effect in declaration order. */
export function findLayerBlurEffect(effects: readonly Effect[]): LayerBlurEffect | null {
  for (const effect of effects) {
    if (effect.type === "layer-blur" && effect.radius > 0) {
      return effect;
    }
  }
  return null;
}

/** Return the first active background blur effect in declaration order. */
export function findBackgroundBlurEffect(effects: readonly Effect[]): BackgroundBlurEffect | null {
  for (const effect of effects) {
    if (effect.type === "background-blur" && effect.radius > 0) {
      return effect;
    }
  }
  return null;
}

/** Build the backend-neutral effect stack consumed by SVG, React, and WebGL renderers. */
export function buildEffectStack(effects: readonly Effect[]): ResolvedEffectStack {
  const backgroundBlur = findBackgroundBlurEffect(effects);
  return {
    allEffects: effects,
    foregroundEffects: effects.filter((effect) => effect.type !== "background-blur"),
    backgroundBlur,
    layerBlur: findLayerBlurEffect(effects),
  };
}

/** Dispatch a shape's effect phases in the canonical Figma rendering order. */
export function renderShapeEffectStack(params: ShapeEffectStackParams): void {
  if (params.stack.backgroundBlur && params.renderBackgroundBlur) {
    params.renderBackgroundBlur(params.stack.backgroundBlur);
  }

  if (params.hasVisibleContent) {
    params.renderDropShadows(params.stack.foregroundEffects);
  }

  params.renderContent();

  if (params.hasVisibleContent) {
    params.renderInnerShadows(params.stack.foregroundEffects);
  }

  params.renderStroke();
}
