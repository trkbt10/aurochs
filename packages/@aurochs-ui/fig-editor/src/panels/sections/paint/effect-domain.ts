/** @file Effect editing domain consumed by the effect property section. */
/* eslint-disable jsdoc/require-jsdoc -- Exported operation names form the effect mutation contract and are covered by colocated specs. */

import type { BlendMode, FigColor, FigEffect, FigEffectType } from "@aurochs/fig/types";

export type EffectOperation =
  | { readonly type: "set-visible"; readonly visible: boolean }
  | { readonly type: "set-type"; readonly effectType: FigEffectType }
  | { readonly type: "set-radius"; readonly radius: number }
  | { readonly type: "set-blend-mode"; readonly blendMode: BlendMode }
  | { readonly type: "set-offset-x"; readonly x: number }
  | { readonly type: "set-offset-y"; readonly y: number }
  | { readonly type: "set-spread"; readonly spread: number }
  | { readonly type: "set-color"; readonly hex: string }
  | { readonly type: "set-opacity"; readonly opacity: number }
  | { readonly type: "set-shadow-behind-node"; readonly showShadowBehindNode: boolean };

export type EffectListOperation =
  | { readonly type: "add"; readonly effectType: FigEffectType }
  | { readonly type: "remove"; readonly index: number }
  | { readonly type: "update"; readonly index: number; readonly operation: EffectOperation };

export function getEffectTypeName(effect: FigEffect): FigEffectType {
  const type = effect.type;
  if (typeof type === "string") { return type; }
  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: FigEffectType }).name;
  }
  return "DROP_SHADOW";
}

export function formatEffectLabel(typeName: string): string {
  switch (typeName) {
    case "DROP_SHADOW": return "Drop Shadow";
    case "INNER_SHADOW": return "Inner Shadow";
    case "LAYER_BLUR": return "Layer Blur";
    case "FOREGROUND_BLUR": return "Layer Blur";
    case "BACKGROUND_BLUR": return "Background Blur";
    default: return typeName;
  }
}

export function effectColorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

export function createDefaultEffect(type: FigEffectType): FigEffect {
  const effectType = createEffectTypeEnum(type);
  if (type === "DROP_SHADOW" || type === "INNER_SHADOW") {
    return {
      type: effectType,
      visible: true,
      offset: { x: 0, y: 4 },
      radius: 8,
      spread: 0,
      color: { r: 0, g: 0, b: 0, a: 0.25 },
    };
  }
  return {
    type: effectType,
    visible: true,
    radius: 8,
  };
}

export function applyEffectListOperation(
  effects: readonly FigEffect[],
  operation: EffectListOperation,
): readonly FigEffect[] {
  switch (operation.type) {
    case "add":
      return [...effects, createDefaultEffect(operation.effectType)];
    case "remove":
      return effects.filter((_effect, index) => index !== operation.index);
    case "update":
      return effects.map((effect, index) => {
        return index === operation.index ? applyEffectOperation(effect, operation.operation) : effect;
      });
  }
}

export function applyEffectOperation(effect: FigEffect, operation: EffectOperation): FigEffect {
  switch (operation.type) {
    case "set-visible":
      return { ...effect, visible: operation.visible };
    case "set-type":
      return createDefaultEffect(operation.effectType);
    case "set-radius":
      return { ...effect, radius: operation.radius };
    case "set-blend-mode":
      return { ...effect, blendMode: operation.blendMode };
    case "set-offset-x":
      return { ...effect, offset: { x: operation.x, y: effect.offset?.y ?? 0 } };
    case "set-offset-y":
      return { ...effect, offset: { x: effect.offset?.x ?? 0, y: operation.y } };
    case "set-spread":
      return { ...effect, spread: operation.spread };
    case "set-color":
      return { ...effect, color: hexToColor(operation.hex, effect.color?.a ?? 0.25) };
    case "set-opacity":
      return { ...effect, color: { ...(effect.color ?? defaultShadowColor), a: operation.opacity } };
    case "set-shadow-behind-node":
      return { ...effect, showShadowBehindNode: operation.showShadowBehindNode };
  }
}

const defaultShadowColor: FigColor = { r: 0, g: 0, b: 0, a: 0.25 };

function createEffectTypeEnum(type: FigEffectType): FigEffect["type"] {
  switch (type) {
    case "INNER_SHADOW":
      return { value: 0, name: "INNER_SHADOW" };
    case "DROP_SHADOW":
      return { value: 1, name: "DROP_SHADOW" };
    case "LAYER_BLUR":
    case "FOREGROUND_BLUR":
      return { value: 2, name: "FOREGROUND_BLUR" };
    case "BACKGROUND_BLUR":
      return { value: 3, name: "BACKGROUND_BLUR" };
  }
}

function hexToColor(hex: string, alpha = 1): FigColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: alpha,
  };
}
