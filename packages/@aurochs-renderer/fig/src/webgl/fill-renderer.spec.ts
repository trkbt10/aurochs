/**
 * @file Tests for WebGL fill UV calculations
 */

import { computeImageUV } from "./fill-renderer";

describe("computeImageUV", () => {
  it("marks FIT letterbox regions as transparent", () => {
    const uv = computeImageUV({
      elementW: 100,
      elementH: 100,
      imageW: 200,
      imageH: 100,
      scaleMode: "FIT",
    });

    expect(uv.texScale).toEqual({ x: 0.01, y: 0.02 });
    expect(uv.texOffset).toEqual({ x: 0, y: -0.5 });
    expect(uv.repeat).toBe(false);
    expect(uv.clipTransparent).toBe(true);
  });

  it("uses repeating image-space UVs for TILE", () => {
    const uv = computeImageUV({
      elementW: 100,
      elementH: 100,
      imageW: 200,
      imageH: 100,
      scaleMode: "TILE",
      scalingFactor: 0.5,
    });

    expect(uv.texScale).toEqual({ x: 0.01, y: 0.02 });
    expect(uv.texOffset).toEqual({ x: 0, y: 0 });
    expect(uv.repeat).toBe(true);
    expect(uv.clipTransparent).toBe(false);
  });
});
