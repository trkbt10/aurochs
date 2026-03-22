/**
 * @file Background blur effect builder
 */

import type { BlurEffectData } from "./types";
import { EFFECT_TYPE_VALUES } from "../../constants";

/** Background blur builder instance */
export type BackgroundBlurBuilder = {
  radius: (r: number) => BackgroundBlurBuilder;
  visible: (v: boolean) => BackgroundBlurBuilder;
  build: () => BlurEffectData;
};

/** Create a background blur builder */
function createBackgroundBlurBuilder(): BackgroundBlurBuilder {
  const state = { radius: 10, visible: true };

  const builder: BackgroundBlurBuilder = {
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
        type: { value: EFFECT_TYPE_VALUES.BACKGROUND_BLUR, name: "BACKGROUND_BLUR" },
        visible: state.visible,
        radius: state.radius,
      };
    },
  };

  return builder;
}

/**
 * Create a background blur effect
 */
export function backgroundBlur(): BackgroundBlurBuilder {
  return createBackgroundBlurBuilder();
}
