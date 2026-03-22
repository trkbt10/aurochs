/**
 * @file Layer blur effect builder
 */

import type { BlurEffectData } from "./types";
import { EFFECT_TYPE_VALUES } from "../../constants";

/** Layer blur builder instance */
export type LayerBlurBuilder = {
  radius: (r: number) => LayerBlurBuilder;
  visible: (v: boolean) => LayerBlurBuilder;
  build: () => BlurEffectData;
};

/** Create a layer blur builder */
function createLayerBlurBuilder(): LayerBlurBuilder {
  const state = { radius: 4, visible: true };

  const builder: LayerBlurBuilder = {
    /** Set blur radius */
    radius(r: number) {
      state.radius = Math.max(0, r);
      return builder;
    },

    /** Set visibility */
    visible(v: boolean) {
      state.visible = v;
      return builder;
    },

    build(): BlurEffectData {
      return {
        type: { value: EFFECT_TYPE_VALUES.FOREGROUND_BLUR, name: "FOREGROUND_BLUR" },
        visible: state.visible,
        radius: state.radius,
      };
    },
  };

  return builder;
}

/**
 * Create a layer blur effect
 */
export function layerBlur(): LayerBlurBuilder {
  return createLayerBlurBuilder();
}
