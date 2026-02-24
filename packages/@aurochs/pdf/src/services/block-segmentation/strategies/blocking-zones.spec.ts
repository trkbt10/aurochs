/**
 * @file Tests for blocking zone extraction from page elements.
 */

import { createDefaultGraphicsState } from "../../../domain/graphics-state";
import type { PdfImage } from "../../../domain/image";
import type { PdfPath } from "../../../domain/path";
import { buildBlockingZonesFromPageElements } from "./blocking-zones";

describe("buildBlockingZonesFromPageElements", () => {
  const makePath = (overrides: Partial<PdfPath> = {}): PdfPath => ({
    type: "path",
    paintOp: "stroke",
    operations: [{ type: "rect", x: 10, y: 20, width: 100, height: 2 }],
    graphicsState: createDefaultGraphicsState(),
    ...overrides,
  });

  it("includes stroked paths and thin filled paths, excludes large filled containers", () => {
    const zones = buildBlockingZonesFromPageElements({
      paths: [
        makePath({ paintOp: "stroke", operations: [{ type: "rect", x: 10, y: 20, width: 100, height: 2 }] }),
        makePath({ paintOp: "fill", operations: [{ type: "rect", x: 10, y: 40, width: 100, height: 2 }] }), // thin fill
        makePath({ paintOp: "fill", operations: [{ type: "rect", x: 0, y: 0, width: 300, height: 200 }] }), // container
      ],
    });

    expect(zones.length).toBe(2);
    expect(zones.some((zone) => zone.y === 20)).toBe(true);
    expect(zones.some((zone) => zone.y === 40)).toBe(true);
    expect(zones.some((zone) => zone.width === 300 && zone.height === 200)).toBe(false);
  });

  it("adds image bounds from CTM as blocking zones", () => {
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([0, 0, 0, 255]),
      width: 1,
      height: 1,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState: {
        ...createDefaultGraphicsState(),
        ctm: [20, 0, 0, 10, 30, 40],
      },
    };

    const zones = buildBlockingZonesFromPageElements({
      paths: [],
      images: [image],
    });

    expect(zones).toHaveLength(1);
    expect(zones[0]).toEqual({
      x: 30,
      y: 40,
      width: 20,
      height: 10,
    });
  });
});
