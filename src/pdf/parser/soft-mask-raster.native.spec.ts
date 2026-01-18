/**
 * @file src/pdf/parser/soft-mask-raster.native.spec.ts
 */

import { createDefaultGraphicsState, type PdfSoftMask } from "../domain";
import type { PdfImage } from "../domain";
import type { ParsedPath } from "./operator";
import { rasterizeSoftMaskedFillPath } from "./soft-mask-raster.native";
import { applyGraphicsSoftMaskToPdfImage } from "./soft-mask-apply.native";

describe("soft mask rasterization (native)", () => {
  it("rasterizes a partial filled path into an image and preserves top-down soft mask alpha mapping", () => {
    const softMask: PdfSoftMask = {
      kind: "Luminosity",
      width: 4,
      height: 2,
      // top row (y near ury): 10,20,30,40; bottom row: 50,60,70,80
      alpha: new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]),
      bbox: [0, 0, 4, 2],
      matrix: [1, 0, 0, 1, 0, 0] as const,
    };

    const gs = {
      ...createDefaultGraphicsState(),
      ctm: [1, 0, 0, 1, 0, 0] as const,
      fillColor: { colorSpace: "DeviceRGB", components: [1, 0, 0] } as const,
      fillAlpha: 1,
      softMaskAlpha: 1,
      softMask,
    };

    const parsed: ParsedPath = {
      type: "path",
      paintOp: "fill",
      // Fill only the top half of the bbox.
      operations: [{ type: "rect", x: 0, y: 1, width: 4, height: 1 }],
      graphicsState: gs,
    };

    const image = rasterizeSoftMaskedFillPath(parsed);
    expect(image).not.toBeNull();
    if (!image || image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(4);
    expect(image.height).toBe(2);
    expect(Array.from(image.alpha ?? [])).toEqual([10, 20, 30, 40, 0, 0, 0, 0]);
    expect(Array.from(image.data.slice(0, 6))).toEqual([255, 0, 0, 255, 0, 0]);
  });

  it("rasterizes filled paths with non-identity CTM by sampling the mask in page space", () => {
    const softMask: PdfSoftMask = {
      kind: "Luminosity",
      width: 2,
      height: 1,
      alpha: new Uint8Array([0, 255]),
      bbox: [0, 0, 2, 1],
      matrix: [1, 0, 0, 1, 0, 0] as const,
    };

    const gs = {
      ...createDefaultGraphicsState(),
      // Scale user space by 10× in both directions.
      ctm: [10, 0, 0, 10, 0, 0] as const,
      fillColor: { colorSpace: "DeviceRGB", components: [1, 0, 0] } as const,
      fillAlpha: 1,
      softMaskAlpha: 1,
      softMask,
    };

    const parsed: ParsedPath = {
      type: "path",
      paintOp: "fill",
      operations: [{ type: "rect", x: 0, y: 0, width: 2, height: 1 }],
      graphicsState: gs,
    };

    const image = rasterizeSoftMaskedFillPath(parsed);
    expect(image).not.toBeNull();
    if (!image || image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
    expect(image.graphicsState.ctm).toEqual([20, 0, 0, 10, 0, 0]);
  });

  it("applies ExtGState soft mask (per-pixel + constant) to PdfImage alpha", () => {
    const gs = {
      ...createDefaultGraphicsState(),
      ctm: [1, 0, 0, 1, 0, 0] as const,
      softMaskAlpha: 0.5,
      softMask: {
        kind: "Alpha" as const,
        width: 2,
        height: 1,
        alpha: new Uint8Array([0, 255]),
        bbox: [0, 0, 2, 1] as const,
        // Mask space is scaled down by 0.5 in X, so page→mask uses ×2 and samples both columns.
        matrix: [0.5, 0, 0, 1, 0, 0] as const,
      },
    };

    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([255, 0, 0, 0, 255, 0]),
      width: 2,
      height: 1,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState: gs,
    };

    const masked = applyGraphicsSoftMaskToPdfImage(image);
    expect(Array.from(masked.alpha ?? [])).toEqual([0, 128]);
    expect(masked.graphicsState.softMask).toBeUndefined();
    expect(masked.graphicsState.softMaskAlpha).toBe(1);
  });
});
