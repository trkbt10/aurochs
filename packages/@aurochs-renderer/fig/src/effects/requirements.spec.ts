/** @file Effect coverage registry tests. */

import {
  EFFECT_RENDERER_CAPABILITIES,
  FIG_EFFECT_REQUIREMENTS,
  collectEffectCoverageGaps,
} from "./requirements";

describe("effect rendering requirements", () => {
  it("declares every Fig effect type as a renderer requirement", () => {
    expect(FIG_EFFECT_REQUIREMENTS.map((requirement) => requirement.figType)).toEqual([
      "DROP_SHADOW",
      "INNER_SHADOW",
      "FOREGROUND_BLUR",
      "LAYER_BLUR",
      "BACKGROUND_BLUR",
    ]);
  });

  it("requires every renderer to cover every Fig effect key", () => {
    expect(collectEffectCoverageGaps(EFFECT_RENDERER_CAPABILITIES)).toEqual([]);
  });
});
