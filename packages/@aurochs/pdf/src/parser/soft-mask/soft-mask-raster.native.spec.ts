/**
 * @file src/pdf/parser/soft-mask-raster.native.spec.ts
 */

import { createDefaultGraphicsState, type PdfSoftMask } from "../../domain";
import type { PdfImage } from "../../domain";
import type { ParsedPath } from "../operator";
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

  it("honors nonzero vs even-odd fill rules when rasterizing soft-masked filled paths", () => {
    const softMask: PdfSoftMask = {
      kind: "Alpha",
      width: 3,
      height: 3,
      alpha: new Uint8Array(9).fill(255),
      bbox: [0, 0, 3, 3],
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

    const ops: ParsedPath["operations"] = [
      { type: "rect", x: 0, y: 0, width: 3, height: 3 },
      { type: "rect", x: 1, y: 1, width: 1, height: 1 },
    ];

    const evenOdd: ParsedPath = {
      type: "path",
      paintOp: "fill",
      fillRule: "evenodd",
      operations: ops,
      graphicsState: gs,
    };
    const nonZero: ParsedPath = {
      type: "path",
      paintOp: "fill",
      fillRule: "nonzero",
      operations: ops,
      graphicsState: gs,
    };

    const evenOddImg = rasterizeSoftMaskedFillPath(evenOdd);
    const nonZeroImg = rasterizeSoftMaskedFillPath(nonZero);

    expect(evenOddImg).not.toBeNull();
    expect(nonZeroImg).not.toBeNull();
    if (!evenOddImg || evenOddImg.type !== "image") {throw new Error("Expected even-odd image");}
    if (!nonZeroImg || nonZeroImg.type !== "image") {throw new Error("Expected nonzero image");}

    // Center pixel (x=1.5,y=1.5) is inside both rects: even-odd => hole, nonzero => filled.
    expect(evenOddImg.alpha?.[4]).toBe(0);
    expect(nonZeroImg.alpha?.[4]).toBe(255);
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

  it("rasterizes soft-masked strokes into images", () => {
    const softMask: PdfSoftMask = {
      kind: "Alpha",
      width: 3,
      height: 1,
      alpha: new Uint8Array([0, 128, 255]),
      bbox: [0, 0, 3, 1],
      matrix: [1, 0, 0, 1, 0, 0] as const,
    };

    const gs = {
      ...createDefaultGraphicsState(),
      ctm: [1, 0, 0, 1, 0, 0] as const,
      strokeColor: { colorSpace: "DeviceRGB", components: [0, 1, 0] } as const,
      strokeAlpha: 1,
      softMaskAlpha: 1,
      softMask,
    };

    const parsed: ParsedPath = {
      type: "path",
      paintOp: "stroke",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0.5 } },
        { type: "lineTo", point: { x: 3, y: 0.5 } },
      ],
      graphicsState: gs,
    };

    const image = rasterizeSoftMaskedFillPath(parsed);
    expect(image).not.toBeNull();
    if (!image || image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(3);
    expect(image.height).toBe(1);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 128, 255]);
    expect(Array.from(image.data)).toEqual([0, 255, 0, 0, 255, 0, 0, 255, 0]);
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
