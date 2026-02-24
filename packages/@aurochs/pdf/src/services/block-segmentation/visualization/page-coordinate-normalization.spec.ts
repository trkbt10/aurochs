/**
 * @file Unit tests for page coordinate normalization helpers.
 */

import {
  mapPointToDisplay,
  mapRectToDisplay,
  transformPathsToDisplay,
  transformTextRunsToDisplay,
  type PageViewportTransform,
} from "./page-coordinate-normalization";
import { createDefaultGraphicsState } from "../../../domain/graphics-state/defaults";

describe("page-coordinate-normalization", () => {
  const viewport: PageViewportTransform = {
    rotation: 90,
    cropBox: [10, 20, 210, 320],
  };

  it("maps points from crop-space to displayed page space", () => {
    const mapped = mapPointToDisplay({ x: 30, y: 70, viewport });
    expect(mapped.x).toBeCloseTo(50, 6);
    expect(mapped.y).toBeCloseTo(180, 6);
  });

  it("maps axis-aligned rectangles via corner projection", () => {
    const mapped = mapRectToDisplay({
      x: 30,
      y: 70,
      width: 40,
      height: 30,
      viewport,
    });
    expect(mapped.x).toBeCloseTo(50, 6);
    expect(mapped.y).toBeCloseTo(140, 6);
    expect(mapped.width).toBeCloseTo(30, 6);
    expect(mapped.height).toBeCloseTo(40, 6);
  });

  it("transforms text and path elements consistently", () => {
    const texts = transformTextRunsToDisplay({
      viewport,
      texts: [
        {
          type: "text",
          text: "abc",
          x: 30,
          y: 70,
          width: 40,
          height: 30,
          fontName: "F1",
          fontSize: 12,
          graphicsState: createDefaultGraphicsState(),
        },
      ],
    });

    const paths = transformPathsToDisplay({
      viewport,
      paths: [
        {
          type: "path",
          operations: [{ type: "rect", x: 30, y: 70, width: 40, height: 30 }],
          paintOp: "stroke",
          graphicsState: createDefaultGraphicsState(),
        },
      ],
    });

    expect(texts[0]?.x).toBeCloseTo(50, 6);
    expect(texts[0]?.y).toBeCloseTo(140, 6);
    expect(texts[0]?.width).toBeCloseTo(30, 6);
    expect(texts[0]?.height).toBeCloseTo(40, 6);

    const rect = paths[0]?.operations[0];
    if (!rect || rect.type !== "rect") {
      throw new Error("Expected transformed rect operation");
    }
    expect(rect.x).toBeCloseTo(50, 6);
    expect(rect.y).toBeCloseTo(140, 6);
    expect(rect.width).toBeCloseTo(30, 6);
    expect(rect.height).toBeCloseTo(40, 6);
  });
});
