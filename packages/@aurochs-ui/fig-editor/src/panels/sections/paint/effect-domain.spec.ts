/** @file Effect editing domain tests. */

import { applyEffectListOperation, applyEffectOperation, createDefaultEffect, getEffectTypeName } from "./effect-domain";

describe("effect-domain", () => {
  it("normalizes legacy and enum effect type values through one contract", () => {
    expect(getEffectTypeName({ ...createDefaultEffect("DROP_SHADOW"), type: "INNER_SHADOW" })).toBe("INNER_SHADOW");
    expect(getEffectTypeName(createDefaultEffect("BACKGROUND_BLUR"))).toBe("BACKGROUND_BLUR");
  });

  it("updates shadow color and opacity without replacing unrelated fields", () => {
    const effect = createDefaultEffect("DROP_SHADOW");
    const colored = applyEffectOperation(effect, { type: "set-color", hex: "#336699" });
    const transparent = applyEffectOperation(colored, { type: "set-opacity", opacity: 0.5 });

    expect(transparent).toMatchObject({
      radius: 8,
      offset: { x: 0, y: 4 },
      color: { r: 0.2, g: 0.4, b: 0.6, a: 0.5 },
    });
  });

  it("applies effect list mutations by index", () => {
    const effects = applyEffectListOperation([], { type: "add", effectType: "DROP_SHADOW" });
    const updated = applyEffectListOperation(effects, {
      type: "update",
      index: 0,
      operation: { type: "set-radius", radius: 16 },
    });

    expect(updated[0]).toMatchObject({ radius: 16 });
    expect(applyEffectListOperation(updated, { type: "remove", index: 0 })).toEqual([]);
  });
});
