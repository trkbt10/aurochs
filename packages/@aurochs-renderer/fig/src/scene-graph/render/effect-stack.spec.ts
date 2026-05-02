/** @file Shared effect stack tests */

import type { Effect } from "../types";
import { buildEffectStack, findLayerBlurEffect, renderShapeEffectStack } from "./effect-stack";

const DROP_SHADOW: Effect = {
  type: "drop-shadow",
  offset: { x: 0, y: 2 },
  radius: 4,
  color: { r: 0, g: 0, b: 0, a: 0.25 },
};

const INNER_SHADOW: Effect = {
  type: "inner-shadow",
  offset: { x: 0, y: 1 },
  radius: 2,
  color: { r: 0, g: 0, b: 0, a: 0.2 },
};

describe("findLayerBlurEffect", () => {
  it("returns the visible layer blur effect", () => {
    expect(findLayerBlurEffect([{ type: "layer-blur", radius: 3 }])).toEqual({
      type: "layer-blur",
      radius: 3,
    });
  });

  it("ignores zero-radius layer blur", () => {
    expect(findLayerBlurEffect([{ type: "layer-blur", radius: 0 }])).toBeNull();
  });
});

describe("renderShapeEffectStack", () => {
  it("uses one canonical shape effect order", () => {
    const calls: string[] = [];
    const stack = buildEffectStack([{ type: "background-blur", radius: 8 }, DROP_SHADOW, INNER_SHADOW]);

    renderShapeEffectStack({
      stack,
      hasVisibleContent: true,
      renderBackgroundBlur: () => calls.push("background-blur"),
      renderDropShadows: () => calls.push("drop-shadows"),
      renderContent: () => calls.push("content"),
      renderInnerShadows: () => calls.push("inner-shadows"),
      renderStroke: () => calls.push("stroke"),
    });

    expect(calls).toEqual([
      "background-blur",
      "drop-shadows",
      "content",
      "inner-shadows",
      "stroke",
    ]);
  });

  it("does not render shadow effects when the source has no visible content", () => {
    const calls: string[] = [];

    renderShapeEffectStack({
      stack: buildEffectStack([DROP_SHADOW, INNER_SHADOW]),
      hasVisibleContent: false,
      renderDropShadows: () => calls.push("drop-shadows"),
      renderContent: () => calls.push("content"),
      renderInnerShadows: () => calls.push("inner-shadows"),
      renderStroke: () => calls.push("stroke"),
    });

    expect(calls).toEqual(["content", "stroke"]);
  });
});

describe("buildEffectStack", () => {
  it("separates backdrop effects from foreground filter effects", () => {
    const backgroundBlur: Effect = { type: "background-blur", radius: 12 };
    const stack = buildEffectStack([backgroundBlur, DROP_SHADOW]);

    expect(stack.backgroundBlur).toBe(backgroundBlur);
    expect(stack.foregroundEffects).toEqual([DROP_SHADOW]);
    expect(stack.allEffects).toEqual([backgroundBlur, DROP_SHADOW]);
  });
});
