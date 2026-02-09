/** @file Unit tests for fill builder */
import { buildFill, buildGradientFill, buildPatternFill } from "./index";

describe("buildFill", () => {
  it('returns undefined for "none"', () => {
    expect(buildFill("none")).toBeUndefined();
  });

  it("builds solid fill from hex string", () => {
    const fill = buildFill("FF0000");
    expect(fill).toBeDefined();
    expect(fill!.type).toBe("solidFill");
  });

  it("strips # prefix from hex string", () => {
    const fill = buildFill("#FF0000");
    expect(fill).toBeDefined();
    expect(fill!.type).toBe("solidFill");
    if (fill!.type === "solidFill") {
      expect(fill!.color.spec).toEqual({ type: "srgb", value: "FF0000" });
    }
  });

  it("builds gradient fill from spec", () => {
    const fill = buildFill({
      type: "gradient",
      gradientType: "linear",
      angle: 90,
      stops: [
        { position: 0, color: "FF0000" },
        { position: 100, color: "0000FF" },
      ],
    });
    expect(fill).toBeDefined();
    expect(fill!.type).toBe("gradientFill");
  });

  it("builds pattern fill from spec", () => {
    const fill = buildFill({
      type: "pattern",
      preset: "pct10",
      fgColor: "000000",
      bgColor: "FFFFFF",
    });
    expect(fill).toBeDefined();
    expect(fill!.type).toBe("patternFill");
  });

  it("builds theme fill from spec", () => {
    const fill = buildFill({
      type: "theme",
      theme: "accent1",
    });
    expect(fill).toBeDefined();
    expect(fill!.type).toBe("solidFill");
  });

  it("builds solid fill from solid spec object", () => {
    const fill = buildFill({ type: "solid", color: "FF0000" });
    expect(fill).toBeDefined();
    expect(fill!.type).toBe("solidFill");
  });

  it("builds solid fill from theme color in solid spec", () => {
    const fill = buildFill({ type: "solid", color: { theme: "accent2", lumMod: 75 } });
    expect(fill).toBeDefined();
    expect(fill!.type).toBe("solidFill");
  });

  it("returns undefined for unknown type", () => {
    const fill = buildFill({ type: "unknown" } as never);
    expect(fill).toBeUndefined();
  });
});

describe("buildGradientFill", () => {
  it("builds linear gradient with angle", () => {
    const fill = buildGradientFill({
      type: "gradient",
      gradientType: "linear",
      angle: 45,
      stops: [
        { position: 0, color: "FF0000" },
        { position: 100, color: "0000FF" },
      ],
    });
    expect(fill.type).toBe("gradientFill");
    expect(fill.linear?.angle).toBe(45);
    expect(fill.stops).toHaveLength(2);
    expect(fill.stops[0].position).toBe(0);
    expect(fill.stops[1].position).toBe(100000);
  });

  it("defaults linear angle to 0", () => {
    const fill = buildGradientFill({
      type: "gradient",
      gradientType: "linear",
      stops: [{ position: 0, color: "000000" }, { position: 100, color: "FFFFFF" }],
    });
    expect(fill.linear?.angle).toBe(0);
  });

  it("builds radial gradient", () => {
    const fill = buildGradientFill({
      type: "gradient",
      gradientType: "radial",
      stops: [
        { position: 0, color: "FFFFFF" },
        { position: 100, color: "000000" },
      ],
    });
    expect(fill.type).toBe("gradientFill");
    expect(fill.path?.path).toBe("circle");
    expect(fill.linear).toBeUndefined();
  });

  it("builds path gradient", () => {
    const fill = buildGradientFill({
      type: "gradient",
      gradientType: "path",
      stops: [
        { position: 0, color: "FFFFFF" },
        { position: 100, color: "000000" },
      ],
    });
    expect(fill.type).toBe("gradientFill");
    expect(fill.path?.path).toBe("rect");
  });
});

describe("buildPatternFill", () => {
  it("builds pattern fill with colors", () => {
    const fill = buildPatternFill({
      type: "pattern",
      preset: "ltDnDiag",
      fgColor: "FF0000",
      bgColor: "FFFFFF",
    });
    expect(fill.type).toBe("patternFill");
    expect(fill.preset).toBe("ltDnDiag");
    expect(fill.foregroundColor.spec).toEqual({ type: "srgb", value: "FF0000" });
    expect(fill.backgroundColor.spec).toEqual({ type: "srgb", value: "FFFFFF" });
  });
});
