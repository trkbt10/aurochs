/** @file Effect conversion tests */

import type { FigEffect } from "@aurochs/fig/types";
import { convertEffectsToScene } from "./effects";

function blurEffect(type: "FOREGROUND_BLUR" | "LAYER_BLUR" | "BACKGROUND_BLUR", radius: number): FigEffect {
  return {
    type,
    visible: true,
    radius,
  };
}

describe("convertEffectsToScene", () => {
  it("treats legacy LAYER_BLUR as layer blur", () => {
    expect(convertEffectsToScene([blurEffect("LAYER_BLUR", 6)])).toEqual([
      { type: "layer-blur", radius: 6 },
    ]);
  });

  it("treats FOREGROUND_BLUR as layer blur", () => {
    expect(convertEffectsToScene([blurEffect("FOREGROUND_BLUR", 8)])).toEqual([
      { type: "layer-blur", radius: 8 },
    ]);
  });

  it("converts BACKGROUND_BLUR separately", () => {
    expect(convertEffectsToScene([blurEffect("BACKGROUND_BLUR", 10)])).toEqual([
      { type: "background-blur", radius: 10 },
    ]);
  });

  it("preserves first-class drop shadow attributes", () => {
    expect(convertEffectsToScene([{
      type: "DROP_SHADOW",
      visible: true,
      color: { r: 1, g: 0, b: 0, a: 0.5 },
      offset: { x: 3, y: 4 },
      radius: 8,
      spread: 2,
      blendMode: "MULTIPLY",
      showShadowBehindNode: false,
    }])).toEqual([{
      type: "drop-shadow",
      color: { r: 1, g: 0, b: 0, a: 0.5 },
      offset: { x: 3, y: 4 },
      radius: 8,
      spread: 2,
      blendMode: "multiply",
      showShadowBehindNode: false,
    }]);
  });
});
