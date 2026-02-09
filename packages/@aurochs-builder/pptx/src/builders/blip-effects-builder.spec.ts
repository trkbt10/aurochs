/** @file Unit tests for blip-effects-builder */
import { buildBlipEffectsFromSpec } from "./blip-effects-builder";

describe("buildBlipEffectsFromSpec", () => {
  it("returns empty object for empty spec", () => {
    const effects = buildBlipEffectsFromSpec({});
    expect(Object.keys(effects)).toHaveLength(0);
  });

  it("builds alphaBiLevel", () => {
    const effects = buildBlipEffectsFromSpec({ alphaBiLevel: { threshold: 50 } });
    expect(effects.alphaBiLevel?.threshold).toBe(50000);
  });

  it("builds alphaCeiling", () => {
    const effects = buildBlipEffectsFromSpec({ alphaCeiling: true });
    expect(effects.alphaCeiling).toBe(true);
  });

  it("builds alphaFloor", () => {
    const effects = buildBlipEffectsFromSpec({ alphaFloor: true });
    expect(effects.alphaFloor).toBe(true);
  });

  it("builds alphaInv", () => {
    const effects = buildBlipEffectsFromSpec({ alphaInv: true });
    expect(effects.alphaInv).toBe(true);
  });

  it("builds alphaRepl", () => {
    const effects = buildBlipEffectsFromSpec({ alphaRepl: { alpha: 75 } });
    expect(effects.alphaRepl?.alpha).toBe(75000);
  });

  it("builds biLevel", () => {
    const effects = buildBlipEffectsFromSpec({ biLevel: { threshold: 30 } });
    expect(effects.biLevel?.threshold).toBe(30000);
  });

  it("builds blur", () => {
    const effects = buildBlipEffectsFromSpec({ blur: { radius: 5 } });
    expect(effects.blur?.radius).toBe(5);
    expect(effects.blur?.grow).toBe(false);
  });

  it("builds colorChange", () => {
    const effects = buildBlipEffectsFromSpec({
      colorChange: { from: "FF0000", to: "0000FF" },
    });
    expect(effects.colorChange?.from.spec).toEqual({ type: "srgb", value: "FF0000" });
    expect(effects.colorChange?.to.spec).toEqual({ type: "srgb", value: "0000FF" });
    expect(effects.colorChange?.useAlpha).toBe(false);
  });

  it("builds colorChange with useAlpha", () => {
    const effects = buildBlipEffectsFromSpec({
      colorChange: { from: "FF0000", to: "0000FF", useAlpha: true },
    });
    expect(effects.colorChange?.useAlpha).toBe(true);
  });

  it("builds colorReplace", () => {
    const effects = buildBlipEffectsFromSpec({ colorReplace: { color: "00FF00" } });
    expect(effects.colorReplace?.color.spec).toEqual({ type: "srgb", value: "00FF00" });
  });

  it("builds duotone", () => {
    const effects = buildBlipEffectsFromSpec({ duotone: { colors: ["000000", "FFFFFF"] } });
    expect(effects.duotone?.colors).toHaveLength(2);
  });

  it("builds grayscale", () => {
    const effects = buildBlipEffectsFromSpec({ grayscale: true });
    expect(effects.grayscale).toBe(true);
  });

  it("builds hsl", () => {
    const effects = buildBlipEffectsFromSpec({ hsl: { hue: 180, saturation: 50, luminance: 75 } });
    expect(effects.hsl?.hue).toBe(180);
    expect(effects.hsl?.saturation).toBe(50000);
    expect(effects.hsl?.luminance).toBe(75000);
  });

  it("builds luminance", () => {
    const effects = buildBlipEffectsFromSpec({ luminance: { brightness: 40, contrast: 60 } });
    expect(effects.luminance?.brightness).toBe(40000);
    expect(effects.luminance?.contrast).toBe(60000);
  });

  it("builds tint", () => {
    const effects = buildBlipEffectsFromSpec({ tint: { hue: 90, amount: 80 } });
    expect(effects.tint?.hue).toBe(90);
    expect(effects.tint?.amount).toBe(80000);
  });

  it("builds alphaModFix", () => {
    const effects = buildBlipEffectsFromSpec({ alphaModFix: 50 });
    expect(effects.alphaModFix?.amount).toBe(50000);
  });

  it("builds multiple effects at once", () => {
    const effects = buildBlipEffectsFromSpec({
      grayscale: true,
      blur: { radius: 3 },
      luminance: { brightness: 20, contrast: 30 },
    });
    expect(effects.grayscale).toBe(true);
    expect(effects.blur?.radius).toBe(3);
    expect(effects.luminance?.brightness).toBe(20000);
  });
});
