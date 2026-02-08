/**
 * @file Image paint builder unit tests
 */

import { imagePaint } from "./image";
import { PAINT_TYPE_VALUES, SCALE_MODE_VALUES } from "../../constants";

describe("ImagePaintBuilder", () => {
  it("creates image paint with reference", () => {
    const result = imagePaint("image-ref-123").build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.IMAGE, name: "IMAGE" });
    expect(result.imageRef).toBe("image-ref-123");
    expect(result.scaleMode).toEqual({ value: SCALE_MODE_VALUES.FILL, name: "FILL" });
  });

  it("sets scale mode", () => {
    const result = imagePaint("ref").scaleMode("FIT").build();

    expect(result.scaleMode).toEqual({ value: SCALE_MODE_VALUES.FIT, name: "FIT" });
  });

  it("sets scale mode to TILE", () => {
    const result = imagePaint("ref").scaleMode("TILE").build();

    expect(result.scaleMode).toEqual({ value: SCALE_MODE_VALUES.TILE, name: "TILE" });
  });

  it("sets rotation", () => {
    const result = imagePaint("ref").rotation(45).build();

    expect(result.rotation).toBe(45);
  });

  it("sets scale factor", () => {
    const result = imagePaint("ref").scale(2).build();

    expect(result.scalingFactor).toBe(2);
  });

  it("sets filters", () => {
    const result = imagePaint("ref")
      .filters({
        exposure: 0.5,
        contrast: 0.2,
        saturation: -0.3,
      })
      .build();

    expect(result.filters?.exposure).toBe(0.5);
    expect(result.filters?.contrast).toBe(0.2);
    expect(result.filters?.saturation).toBe(-0.3);
  });

  it("omits default rotation and scale", () => {
    const result = imagePaint("ref").build();

    expect(result.rotation).toBeUndefined();
    expect(result.scalingFactor).toBeUndefined();
  });
});
