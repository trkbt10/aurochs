/**
 * @file color-value-adapter tests
 */
import { deg, pct } from "@aurochs-office/drawing-ml/domain/units";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { BaseFill, GradientFill } from "@aurochs-office/drawing-ml/domain/fill";
import {
  toReactHex,
  fromReactHex,
  colorToColorValue,
  colorValueToColor,
  gradientFillToGradientValue,
  gradientValueToGradientFill,
  baseFillToFillValue,
  fillValueToBaseFill,
} from "./color-value-adapter";

// =============================================================================
// Hex format bridge
// =============================================================================

describe("toReactHex", () => {
  it("converts bare uppercase hex to #-prefixed lowercase", () => {
    expect(toReactHex("FF0000")).toBe("#ff0000");
    expect(toReactHex("4472C4")).toBe("#4472c4");
    expect(toReactHex("000000")).toBe("#000000");
  });
});

describe("fromReactHex", () => {
  it("converts #-prefixed lowercase hex to bare uppercase", () => {
    expect(fromReactHex("#ff0000")).toBe("FF0000");
    expect(fromReactHex("#4472c4")).toBe("4472C4");
    expect(fromReactHex("#000000")).toBe("000000");
  });

  it("handles hex without # prefix", () => {
    expect(fromReactHex("ff0000")).toBe("FF0000");
  });
});

describe("toReactHex / fromReactHex roundtrip", () => {
  it("roundtrips correctly", () => {
    const original = "4472C4";
    expect(fromReactHex(toReactHex(original))).toBe(original);
  });
});

// =============================================================================
// Color ↔ ColorValue
// =============================================================================

describe("colorToColorValue", () => {
  it("converts sRGB color to ColorValue", () => {
    const color: Color = { spec: { type: "srgb", value: "FF0000" } };
    const cv = colorToColorValue(color);

    expect(cv.hex).toBe("#ff0000");
    expect(cv.opacity).toBe(100);
    expect(cv.visible).toBe(true);
  });

  it("maps alpha transform to opacity", () => {
    const color: Color = {
      spec: { type: "srgb", value: "00FF00" },
      transform: { alpha: pct(50) },
    };
    const cv = colorToColorValue(color);

    expect(cv.hex).toBe("#00ff00");
    expect(cv.opacity).toBe(50);
  });

  it("defaults to black for non-sRGB without context", () => {
    const color: Color = { spec: { type: "scheme", value: "accent1" } };
    const cv = colorToColorValue(color);

    // resolveColor without context returns undefined → fallback "000000"
    expect(cv.hex).toBe("#000000");
    expect(cv.opacity).toBe(100);
  });
});

describe("colorValueToColor", () => {
  it("converts ColorValue to sRGB Color", () => {
    const color = colorValueToColor({ hex: "#ff0000", opacity: 100, visible: true });

    expect(color.spec).toEqual({ type: "srgb", value: "FF0000" });
    expect(color.transform).toBeUndefined();
  });

  it("adds alpha transform when opacity < 100", () => {
    const color = colorValueToColor({ hex: "#00ff00", opacity: 50, visible: true });

    expect(color.spec).toEqual({ type: "srgb", value: "00FF00" });
    expect(color.transform).toEqual({ alpha: pct(50) });
  });

  it("no transform when opacity is 100", () => {
    const color = colorValueToColor({ hex: "#0000ff", opacity: 100, visible: true });

    expect(color.transform).toBeUndefined();
  });
});

describe("colorToColorValue / colorValueToColor roundtrip", () => {
  it("roundtrips sRGB color without transform", () => {
    const original: Color = { spec: { type: "srgb", value: "4472C4" } };
    const result = colorValueToColor(colorToColorValue(original));

    expect(result.spec).toEqual(original.spec);
  });

  it("roundtrips sRGB color with alpha", () => {
    const original: Color = {
      spec: { type: "srgb", value: "4472C4" },
      transform: { alpha: pct(75) },
    };
    const cv = colorToColorValue(original);
    const result = colorValueToColor(cv);

    expect(result.spec).toEqual({ type: "srgb", value: "4472C4" });
    expect(result.transform).toEqual({ alpha: pct(75) });
  });
});

// =============================================================================
// GradientFill ↔ GradientValue
// =============================================================================

const linearGradient: GradientFill = {
  type: "gradientFill",
  stops: [
    { position: pct(0), color: { spec: { type: "srgb", value: "000000" } } },
    { position: pct(100), color: { spec: { type: "srgb", value: "FFFFFF" } } },
  ],
  linear: { angle: deg(90), scaled: true },
  rotWithShape: true,
};

const pathGradient: GradientFill = {
  type: "gradientFill",
  stops: [
    { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
    { position: pct(50), color: { spec: { type: "srgb", value: "00FF00" } } },
    { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
  ],
  path: { path: "circle" },
  rotWithShape: false,
};

describe("gradientFillToGradientValue", () => {
  it("converts linear gradient", () => {
    const gv = gradientFillToGradientValue(linearGradient);

    expect(gv.type).toBe("linear");
    expect(gv.angle).toBe(90);
    expect(gv.stops).toHaveLength(2);
    expect(gv.stops[0].id).toBe("0");
    expect(gv.stops[0].position).toBe(0);
    expect(gv.stops[0].color.hex).toBe("#000000");
    expect(gv.stops[1].id).toBe("1");
    expect(gv.stops[1].position).toBe(100);
    expect(gv.stops[1].color.hex).toBe("#ffffff");
  });

  it("converts path gradient to radial", () => {
    const gv = gradientFillToGradientValue(pathGradient);

    expect(gv.type).toBe("radial");
    expect(gv.angle).toBe(0);
    expect(gv.stops).toHaveLength(3);
  });
});

describe("gradientValueToGradientFill", () => {
  it("converts linear GradientValue back", () => {
    const gv = gradientFillToGradientValue(linearGradient);
    const fill = gradientValueToGradientFill(gv, linearGradient);

    expect(fill.type).toBe("gradientFill");
    expect(fill.linear?.angle).toBe(deg(90));
    expect(fill.linear?.scaled).toBe(true);
    expect(fill.rotWithShape).toBe(true);
    expect(fill.stops).toHaveLength(2);
  });

  it("preserves rotWithShape from original", () => {
    const gv = gradientFillToGradientValue(pathGradient);
    const fill = gradientValueToGradientFill(gv, pathGradient);

    expect(fill.rotWithShape).toBe(false);
  });

  it("preserves path from original for radial", () => {
    const gv = gradientFillToGradientValue(pathGradient);
    const fill = gradientValueToGradientFill(gv, pathGradient);

    expect(fill.path).toEqual({ path: "circle" });
  });

  it("defaults rotWithShape to true without original", () => {
    const gv = gradientFillToGradientValue(linearGradient);
    const fill = gradientValueToGradientFill(gv);

    expect(fill.rotWithShape).toBe(true);
  });
});

// =============================================================================
// BaseFill ↔ FillValue
// =============================================================================

describe("baseFillToFillValue", () => {
  it("converts solidFill", () => {
    const fill: BaseFill = {
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" } },
    };
    const fv = baseFillToFillValue(fill);

    expect(fv.type).toBe("solid");
    if (fv.type === "solid") {
      expect(fv.color.hex).toBe("#ff0000");
    }
  });

  it("converts gradientFill", () => {
    const fv = baseFillToFillValue(linearGradient);

    expect(fv.type).toBe("gradient");
    if (fv.type === "gradient") {
      expect(fv.gradient.type).toBe("linear");
      expect(fv.gradient.stops).toHaveLength(2);
    }
  });

  it("falls back to solid black for noFill", () => {
    const fill: BaseFill = { type: "noFill" };
    const fv = baseFillToFillValue(fill);

    expect(fv.type).toBe("solid");
    if (fv.type === "solid") {
      expect(fv.color.hex).toBe("#000000");
    }
  });

  it("falls back to solid black for groupFill", () => {
    const fill: BaseFill = { type: "groupFill" };
    const fv = baseFillToFillValue(fill);

    expect(fv.type).toBe("solid");
  });
});

describe("fillValueToBaseFill", () => {
  it("converts solid FillValue to solidFill", () => {
    const fv = { type: "solid" as const, color: { hex: "#ff0000", opacity: 100, visible: true } };
    const fill = fillValueToBaseFill(fv);

    expect(fill.type).toBe("solidFill");
    if (fill.type === "solidFill") {
      expect(fill.color.spec).toEqual({ type: "srgb", value: "FF0000" });
    }
  });

  it("converts gradient FillValue to gradientFill", () => {
    const gv = gradientFillToGradientValue(linearGradient);
    const fv = { type: "gradient" as const, gradient: gv };
    const fill = fillValueToBaseFill(fv, linearGradient);

    expect(fill.type).toBe("gradientFill");
    if (fill.type === "gradientFill") {
      expect(fill.stops).toHaveLength(2);
      expect(fill.rotWithShape).toBe(true);
    }
  });

  it("returns original for image/pattern/video types", () => {
    const original: BaseFill = {
      type: "solidFill",
      color: { spec: { type: "srgb", value: "123456" } },
    };
    const fv = { type: "image" as const };
    const fill = fillValueToBaseFill(fv, original);

    expect(fill).toBe(original);
  });

  it("returns noFill for image/pattern/video without original", () => {
    const fv = { type: "pattern" as const };
    const fill = fillValueToBaseFill(fv);

    expect(fill.type).toBe("noFill");
  });
});
