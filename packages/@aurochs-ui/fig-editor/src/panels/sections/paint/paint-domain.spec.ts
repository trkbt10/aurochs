/** @file Paint editing domain tests. */

import type { FigPaint } from "@aurochs/fig/types";
import { applyPaintListOperation, applyPaintOperation, createDefaultPaint, getPaintColor } from "./paint-domain";

describe("paint-domain", () => {
  it("applies image operations through one paint operation contract", () => {
    const paint = createDefaultPaint("fill", "IMAGE");
    const updated = applyPaintOperation(paint, { type: "set-image-scale-mode", scaleMode: "TILE" });
    const scaled = applyPaintOperation(updated, { type: "set-image-scale", scale: 1.5 });

    expect(scaled).toMatchObject({
      type: "IMAGE",
      scaleMode: "TILE",
      imageScaleMode: "TILE",
      scalingFactor: 1.5,
      scale: 1.5,
    });
  });

  it("keeps fill and stroke defaults distinct while sharing operation reducers", () => {
    const fill = createDefaultPaint("fill");
    const stroke = createDefaultPaint("stroke");

    expect(getPaintColor(fill)).toEqual({ r: 0.85, g: 0.85, b: 0.85, a: 1 });
    expect(getPaintColor(stroke)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it("updates a paint list by index without leaking fill or stroke UI details", () => {
    const paints: readonly FigPaint[] = [createDefaultPaint("fill"), createDefaultPaint("stroke")];
    const updated = applyPaintListOperation(paints, {
      type: "update",
      index: 1,
      operation: { type: "set-opacity", opacity: 0.4 },
    });

    expect(updated[0]).toBe(paints[0]);
    expect(updated[1]).toMatchObject({ opacity: 0.4 });
  });
});
