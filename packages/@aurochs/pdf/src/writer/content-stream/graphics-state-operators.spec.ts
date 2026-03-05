/**
 * @file Graphics State Operators Tests
 */

import {
  serializeColor,
  serializeLineWidth,
  serializeLineCap,
  serializeLineJoin,
  serializeMiterLimit,
  serializeDashPattern,
  serializeTransform,
  serializeGraphicsState,
  wrapInGraphicsState,
} from "./graphics-state-operators";
import type { PdfColor } from "../../domain/color";
import type { PdfGraphicsState } from "../../domain/graphics-state";

describe("serializeColor", () => {
  it("serializes DeviceGray fill", () => {
    const color: PdfColor = { colorSpace: "DeviceGray", components: [0.5] };
    expect(serializeColor(color, false)).toBe("0.5 g");
  });

  it("serializes DeviceGray stroke", () => {
    const color: PdfColor = { colorSpace: "DeviceGray", components: [0.5] };
    expect(serializeColor(color, true)).toBe("0.5 G");
  });

  it("serializes DeviceRGB fill", () => {
    const color: PdfColor = { colorSpace: "DeviceRGB", components: [1, 0, 0] };
    expect(serializeColor(color, false)).toBe("1 0 0 rg");
  });

  it("serializes DeviceRGB stroke", () => {
    const color: PdfColor = { colorSpace: "DeviceRGB", components: [0, 1, 0] };
    expect(serializeColor(color, true)).toBe("0 1 0 RG");
  });

  it("serializes DeviceCMYK fill", () => {
    const color: PdfColor = {
      colorSpace: "DeviceCMYK",
      components: [1, 0, 0, 0],
    };
    expect(serializeColor(color, false)).toBe("1 0 0 0 k");
  });

  it("serializes DeviceCMYK stroke", () => {
    const color: PdfColor = {
      colorSpace: "DeviceCMYK",
      components: [0, 1, 0, 0],
    };
    expect(serializeColor(color, true)).toBe("0 1 0 0 K");
  });

  it("uses alternate color space for ICCBased", () => {
    const color: PdfColor = {
      colorSpace: "ICCBased",
      components: [1, 0, 0],
      alternateColorSpace: "DeviceRGB",
    };
    expect(serializeColor(color, false)).toBe("1 0 0 rg");
  });

  it("formats decimal components correctly", () => {
    const color: PdfColor = {
      colorSpace: "DeviceRGB",
      components: [0.333333, 0.666666, 1],
    };
    const result = serializeColor(color, false);
    expect(result).toContain("0.333333");
    expect(result).toContain("0.666666");
    expect(result).toContain("1 rg");
  });
});

describe("serializeLineWidth", () => {
  it("serializes integer width", () => {
    expect(serializeLineWidth(2)).toBe("2 w");
  });

  it("serializes decimal width", () => {
    expect(serializeLineWidth(0.5)).toBe("0.5 w");
  });
});

describe("serializeLineCap", () => {
  it("serializes butt cap (0)", () => {
    expect(serializeLineCap(0)).toBe("0 J");
  });

  it("serializes round cap (1)", () => {
    expect(serializeLineCap(1)).toBe("1 J");
  });

  it("serializes square cap (2)", () => {
    expect(serializeLineCap(2)).toBe("2 J");
  });
});

describe("serializeLineJoin", () => {
  it("serializes miter join (0)", () => {
    expect(serializeLineJoin(0)).toBe("0 j");
  });

  it("serializes round join (1)", () => {
    expect(serializeLineJoin(1)).toBe("1 j");
  });

  it("serializes bevel join (2)", () => {
    expect(serializeLineJoin(2)).toBe("2 j");
  });
});

describe("serializeMiterLimit", () => {
  it("serializes miter limit", () => {
    expect(serializeMiterLimit(10)).toBe("10 M");
  });
});

describe("serializeDashPattern", () => {
  it("serializes solid line (empty array)", () => {
    expect(serializeDashPattern([], 0)).toBe("[] 0 d");
  });

  it("serializes simple dash", () => {
    expect(serializeDashPattern([3, 2], 0)).toBe("[3 2] 0 d");
  });

  it("serializes dash with phase", () => {
    expect(serializeDashPattern([4, 2], 2)).toBe("[4 2] 2 d");
  });

  it("serializes complex dash pattern", () => {
    expect(serializeDashPattern([1, 2, 3, 4], 0)).toBe("[1 2 3 4] 0 d");
  });
});

describe("serializeTransform", () => {
  it("serializes identity matrix", () => {
    expect(serializeTransform([1, 0, 0, 1, 0, 0])).toBe("1 0 0 1 0 0 cm");
  });

  it("serializes translation", () => {
    expect(serializeTransform([1, 0, 0, 1, 100, 200])).toBe("1 0 0 1 100 200 cm");
  });

  it("serializes scale", () => {
    expect(serializeTransform([2, 0, 0, 2, 0, 0])).toBe("2 0 0 2 0 0 cm");
  });

  it("serializes rotation (45 degrees)", () => {
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    const result = serializeTransform([cos45, sin45, -sin45, cos45, 0, 0]);
    expect(result).toContain("cm");
    expect(result).toContain("0.707107"); // cos(45°) ≈ 0.707107
  });
});

describe("serializeGraphicsState", () => {
  const state: PdfGraphicsState = {
    ctm: [1, 0, 0, 1, 50, 100],
    fillColor: { colorSpace: "DeviceRGB", components: [1, 0, 0] },
    strokeColor: { colorSpace: "DeviceRGB", components: [0, 0, 1] },
    lineWidth: 2,
    lineJoin: 1,
    lineCap: 1,
    miterLimit: 10,
    dashArray: [3, 2],
    dashPhase: 1,
    fillAlpha: 1,
    strokeAlpha: 1,
    charSpacing: 0,
    wordSpacing: 0,
    horizontalScaling: 100,
    textLeading: 0,
    textRenderingMode: 0,
    textRise: 0,
  };

  it("includes colors by default", () => {
    const result = serializeGraphicsState(state);
    expect(result).toContain("1 0 0 rg");
    expect(result).toContain("0 0 1 RG");
  });

  it("includes line style by default", () => {
    const result = serializeGraphicsState(state);
    expect(result).toContain("2 w");
    expect(result).toContain("1 J");
    expect(result).toContain("1 j");
    expect(result).toContain("10 M");
    expect(result).toContain("[3 2] 1 d");
  });

  it("excludes transform by default", () => {
    const result = serializeGraphicsState(state);
    expect(result).not.toContain("cm");
  });

  it("includes transform when requested", () => {
    const result = serializeGraphicsState(state, { includeTransform: true });
    expect(result).toContain("1 0 0 1 50 100 cm");
  });

  it("excludes colors when requested", () => {
    const result = serializeGraphicsState(state, { includeColors: false });
    expect(result).not.toContain("rg");
    expect(result).not.toContain("RG");
  });

  it("excludes line style when requested", () => {
    const result = serializeGraphicsState(state, { includeLineStyle: false });
    expect(result).not.toContain("w");
    expect(result).not.toContain("J");
    expect(result).not.toContain("j");
  });

  it("skips dash pattern when array is empty", () => {
    const stateNoDash: PdfGraphicsState = { ...state, dashArray: [], dashPhase: 0 };
    const result = serializeGraphicsState(stateNoDash);
    expect(result).not.toContain("d");
  });
});

describe("wrapInGraphicsState", () => {
  it("wraps content in q/Q", () => {
    const result = wrapInGraphicsState("1 0 0 rg\n100 100 50 50 re\nf");
    expect(result).toBe("q\n1 0 0 rg\n100 100 50 50 re\nf\nQ");
  });
});
