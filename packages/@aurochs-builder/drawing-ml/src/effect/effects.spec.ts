/** @file Unit tests for effects builder */
import { buildEffects } from "./effects";

describe("buildEffects", () => {
  it("returns empty object when no effects", () => {
    const effects = buildEffects({});
    expect(effects).toEqual({});
  });

  it("builds shadow with defaults", () => {
    const effects = buildEffects({ shadow: { color: "000000" } });
    expect(effects.shadow).toBeDefined();
    expect(effects.shadow!.type).toBe("outer");
    expect(effects.shadow!.color.spec).toEqual({ type: "srgb", value: "000000" });
    expect(effects.shadow!.blurRadius).toBe(4);
    expect(effects.shadow!.distance).toBe(3);
    expect(effects.shadow!.direction).toBe(45);
  });

  it("builds shadow with custom values", () => {
    const effects = buildEffects({ shadow: { color: "FF0000", blur: 10, distance: 5, direction: 90 } });
    expect(effects.shadow!.blurRadius).toBe(10);
    expect(effects.shadow!.distance).toBe(5);
    expect(effects.shadow!.direction).toBe(90);
  });

  it("builds glow", () => {
    const effects = buildEffects({ glow: { color: "00FF00", radius: 12 } });
    expect(effects.glow).toBeDefined();
    expect(effects.glow!.color.spec).toEqual({ type: "srgb", value: "00FF00" });
    expect(effects.glow!.radius).toBe(12);
  });

  it("builds softEdge", () => {
    const effects = buildEffects({ softEdge: { radius: 8 } });
    expect(effects.softEdge).toBeDefined();
    expect(effects.softEdge!.radius).toBe(8);
  });

  it("builds reflection with defaults", () => {
    const effects = buildEffects({ reflection: {} });
    expect(effects.reflection).toBeDefined();
    expect(effects.reflection!.blurRadius).toBe(0);
    expect(effects.reflection!.startOpacity).toBe(100000);
    expect(effects.reflection!.endOpacity).toBe(0);
    expect(effects.reflection!.distance).toBe(0);
    expect(effects.reflection!.direction).toBe(0);
    expect(effects.reflection!.fadeDirection).toBe(90);
    expect(effects.reflection!.scaleX).toBe(100000);
    expect(effects.reflection!.scaleY).toBe(-100000);
  });

  it("builds reflection with custom values", () => {
    const effects = buildEffects({
      reflection: { blurRadius: 5, startOpacity: 80, endOpacity: 10, distance: 3, scaleY: -50 },
    });
    expect(effects.reflection!.blurRadius).toBe(5);
    expect(effects.reflection!.startOpacity).toBe(80000);
    expect(effects.reflection!.endOpacity).toBe(10000);
    expect(effects.reflection!.distance).toBe(3);
    expect(effects.reflection!.scaleY).toBe(-50000);
  });

  it("builds multiple effects at once", () => {
    const effects = buildEffects({
      shadow: { color: "000000" },
      glow: { color: "FF0000", radius: 5 },
      softEdge: { radius: 3 },
    });
    expect(effects.shadow).toBeDefined();
    expect(effects.glow).toBeDefined();
    expect(effects.softEdge).toBeDefined();
    expect(effects.reflection).toBeUndefined();
  });
});
