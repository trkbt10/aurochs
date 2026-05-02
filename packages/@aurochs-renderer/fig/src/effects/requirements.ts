/** @file First-class Figma effect rendering requirements. */

import type { FigEffectType } from "@aurochs/fig/types";

export type EffectRequirementKey =
  | "type"
  | "visible"
  | "color"
  | "offset"
  | "radius"
  | "spread"
  | "blendMode"
  | "showShadowBehindNode";

export type EffectRequirement = {
  readonly figType: FigEffectType;
  readonly sceneType: "drop-shadow" | "inner-shadow" | "layer-blur" | "background-blur";
  readonly keys: readonly EffectRequirementKey[];
};

export type EffectRendererCapability = {
  readonly renderer: "svg" | "react" | "webgl";
  readonly figType: FigEffectType;
  readonly keys: readonly EffectRequirementKey[];
};

export type EffectCoverageGap = {
  readonly renderer: EffectRendererCapability["renderer"];
  readonly figType: FigEffectType;
  readonly key: EffectRequirementKey;
};

const SHADOW_KEYS = [
  "type",
  "visible",
  "color",
  "offset",
  "radius",
  "spread",
  "blendMode",
  "showShadowBehindNode",
] as const;

const INNER_SHADOW_KEYS = [
  "type",
  "visible",
  "color",
  "offset",
  "radius",
  "spread",
  "blendMode",
] as const;

const BLUR_KEYS = ["type", "visible", "radius"] as const;

export const FIG_EFFECT_REQUIREMENTS: readonly EffectRequirement[] = [
  { figType: "DROP_SHADOW", sceneType: "drop-shadow", keys: SHADOW_KEYS },
  { figType: "INNER_SHADOW", sceneType: "inner-shadow", keys: INNER_SHADOW_KEYS },
  { figType: "FOREGROUND_BLUR", sceneType: "layer-blur", keys: BLUR_KEYS },
  { figType: "LAYER_BLUR", sceneType: "layer-blur", keys: BLUR_KEYS },
  { figType: "BACKGROUND_BLUR", sceneType: "background-blur", keys: BLUR_KEYS },
];

export const EFFECT_RENDERER_CAPABILITIES: readonly EffectRendererCapability[] = [
  ...FIG_EFFECT_REQUIREMENTS.map((requirement) => ({ renderer: "svg" as const, figType: requirement.figType, keys: requirement.keys })),
  ...FIG_EFFECT_REQUIREMENTS.map((requirement) => ({ renderer: "react" as const, figType: requirement.figType, keys: requirement.keys })),
  ...FIG_EFFECT_REQUIREMENTS.map((requirement) => ({ renderer: "webgl" as const, figType: requirement.figType, keys: requirement.keys })),
];

/** Return coverage gaps between Figma effect requirements and renderer declarations. */
export function collectEffectCoverageGaps(capabilities: readonly EffectRendererCapability[]): readonly EffectCoverageGap[] {
  return capabilities.flatMap((capability) => {
    const requirement = FIG_EFFECT_REQUIREMENTS.find((candidate) => candidate.figType === capability.figType);
    if (!requirement) {
      throw new Error(`Unknown effect capability figType: ${capability.figType}`);
    }
    const supported = new Set(capability.keys);
    return requirement.keys
      .filter((key) => !supported.has(key))
      .map((key) => ({ renderer: capability.renderer, figType: capability.figType, key }));
  });
}
