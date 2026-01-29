/**
 * @file src/pdf/converter/color-converter.spec.ts
 */

import type { PdfColor, PdfGraphicsState } from "@oxen/pdf/domain";
import { createDefaultGraphicsState } from "@oxen/pdf/domain";
import { pct, px } from "@oxen-office/ooxml/domain/units";
import { convertColor, convertFill, convertGraphicsStateToStyle, convertLine, noFill } from "./color-converter";

describe("convertColor", () => {
  it("converts DeviceGray to srgb", () => {
    const pdfColor: PdfColor = { colorSpace: "DeviceGray", components: [0.5] as const };
    expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "808080" } });
  });

  it("converts DeviceRGB to srgb", () => {
    const pdfColor: PdfColor = { colorSpace: "DeviceRGB", components: [1, 0, 0] as const };
    expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "FF0000" } });
  });

  it("converts DeviceCMYK to srgb", () => {
    const pdfColor: PdfColor = { colorSpace: "DeviceCMYK", components: [0, 1, 0, 0] as const };
    expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "FF00FF" } });
  });

  it("falls back to black for Pattern colorspace", () => {
    const pdfColor: PdfColor = { colorSpace: "Pattern", components: [1] as const };
    expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "000000" } });
  });

  describe("ICCBased color space", () => {
    it("converts ICCBased with DeviceGray alternate", () => {
      const pdfColor: PdfColor = {
        colorSpace: "ICCBased",
        components: [0.5] as const,
        alternateColorSpace: "DeviceGray",
      };
      expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "808080" } });
    });

    it("converts ICCBased with DeviceRGB alternate", () => {
      const pdfColor: PdfColor = {
        colorSpace: "ICCBased",
        components: [1, 0, 0] as const,
        alternateColorSpace: "DeviceRGB",
      };
      expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "FF0000" } });
    });

    it("converts ICCBased with DeviceCMYK alternate", () => {
      const pdfColor: PdfColor = {
        colorSpace: "ICCBased",
        components: [1, 0, 0, 0] as const,
        alternateColorSpace: "DeviceCMYK",
      };
      expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "00FFFF" } });
    });

    it("infers gray from 1 component when no alternate specified", () => {
      const pdfColor: PdfColor = {
        colorSpace: "ICCBased",
        components: [0.75] as const,
      };
      expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "BFBFBF" } });
    });

    it("infers RGB from 3 components when no alternate specified", () => {
      const pdfColor: PdfColor = {
        colorSpace: "ICCBased",
        components: [0, 1, 0] as const,
      };
      expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "00FF00" } });
    });

    it("infers CMYK from 4 components when no alternate specified", () => {
      const pdfColor: PdfColor = {
        colorSpace: "ICCBased",
        components: [0, 0, 1, 0] as const,
      };
      expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "FFFF00" } });
    });

    it("falls back to black for unsupported component count", () => {
      const pdfColor: PdfColor = {
        colorSpace: "ICCBased",
        components: [1, 2] as const, // 2 components is not valid
      };
      expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "000000" } });
    });
  });

  it("clamps and rounds out-of-range components", () => {
    const pdfColor: PdfColor = { colorSpace: "DeviceRGB", components: [-1, 2, 0.5] as const };
    expect(convertColor(pdfColor)).toEqual({ spec: { type: "srgb", value: "00FF80" } });
  });
});

describe("convertFill", () => {
  it("applies alpha via color transform", () => {
    const pdfColor: PdfColor = { colorSpace: "DeviceRGB", components: [1, 0, 0] as const };
    expect(convertFill(pdfColor, 0.5)).toEqual({
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" }, transform: { alpha: pct(50) } },
    });
  });

  it("returns noFill for empty fill", () => {
    expect(noFill()).toEqual({ type: "noFill" });
  });

  it("clamps invalid alpha to 0..1", () => {
    const pdfColor: PdfColor = { colorSpace: "DeviceRGB", components: [1, 0, 0] as const };
    expect(convertFill(pdfColor, -1)).toEqual({
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" }, transform: { alpha: pct(0) } },
    });
    expect(convertFill(pdfColor, 2)).toEqual({
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" } },
    });
    expect(convertFill(pdfColor, Number.NaN)).toEqual({
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" }, transform: { alpha: pct(0) } },
    });
  });
});

describe("convertLine", () => {
  it("converts line style fields", () => {
    const strokeColor: PdfColor = { colorSpace: "DeviceRGB", components: [0, 0, 1] as const };
    const line = convertLine(strokeColor, 2, 1, 2, [] as const, 0, 1);

    expect(line).toEqual({
      width: px(2),
      cap: "round",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "0000FF" } } },
      dash: "solid",
      join: "bevel",
    });
  });

  it("converts dash patterns to preset dash styles", () => {
    const strokeColor: PdfColor = { colorSpace: "DeviceGray", components: [0] as const };

    expect(convertLine(strokeColor, 1, 0, 0, [3] as const, 0, 1).dash).toBe("dot");
    expect(convertLine(strokeColor, 1, 0, 0, [3, 3] as const, 0, 1).dash).toBe("dash");
    expect(convertLine(strokeColor, 1, 0, 0, [6, 3] as const, 0, 1).dash).toBe("lgDash");
  });
});

describe("convertGraphicsStateToStyle", () => {
  it("creates fill and line based on paintOp", () => {
    const graphicsState: PdfGraphicsState = {
      ...createDefaultGraphicsState(),
      ctm: [1, 0, 0, 1, 0, 0] as const,
      fillColor: { colorSpace: "DeviceGray", components: [0.5] as const },
      strokeColor: { colorSpace: "DeviceRGB", components: [0, 1, 0] as const },
      lineWidth: 3,
      lineJoin: 1,
      lineCap: 2,
      miterLimit: 10,
      dashArray: [3, 3] as const,
      dashPhase: 0,
      fillAlpha: 0.25,
      strokeAlpha: 0.75,
      softMaskAlpha: 0.5,
    };

    expect(convertGraphicsStateToStyle(graphicsState, "fill")).toEqual({
      fill: {
        type: "solidFill",
        color: { spec: { type: "srgb", value: "808080" }, transform: { alpha: pct(12.5) } },
      },
      line: undefined,
    });

    expect(convertGraphicsStateToStyle(graphicsState, "stroke")).toEqual({
      fill: { type: "noFill" }, // Explicit noFill prevents PPTX theme default fills
      line: {
        width: px(3),
        cap: "square",
        compound: "sng",
        alignment: "ctr",
        fill: {
          type: "solidFill",
          color: { spec: { type: "srgb", value: "00FF00" }, transform: { alpha: pct(37.5) } },
        },
        dash: "dash",
        join: "round",
      },
    });
  });

  it("supports fillStroke", () => {
    const graphicsState: PdfGraphicsState = {
      ...createDefaultGraphicsState(),
      ctm: [1, 0, 0, 1, 0, 0] as const,
      fillColor: { colorSpace: "DeviceGray", components: [0] as const },
      strokeColor: { colorSpace: "DeviceGray", components: [0] as const },
      lineWidth: 1,
      lineJoin: 0,
      lineCap: 0,
      miterLimit: 10,
      dashArray: [] as const,
      dashPhase: 0,
      fillAlpha: 1,
      strokeAlpha: 1,
    };

    const result = convertGraphicsStateToStyle(graphicsState, "fillStroke");
    expect(result.fill?.type).toBe("solidFill");
    expect(result.line?.dash).toBe("solid");
  });
});
