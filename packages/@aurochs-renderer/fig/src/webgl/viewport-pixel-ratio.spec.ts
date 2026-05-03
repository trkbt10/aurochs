/** @file WebGL viewport pixel ratio policy tests. */

import { resolveWebGLViewportPixelRatio } from "./viewport-pixel-ratio";

describe("resolveWebGLViewportPixelRatio", () => {
  it("uses DPR as the baseline at 100% zoom", () => {
    expect(resolveWebGLViewportPixelRatio({ devicePixelRatio: 2, viewportScale: 1, surfaceWidth: 100, surfaceHeight: 100 })).toBe(2);
  });

  it("quantizes zoom changes so small wheel deltas do not resize every frame", () => {
    const first = resolveWebGLViewportPixelRatio({ devicePixelRatio: 2, viewportScale: 1.05, surfaceWidth: 100, surfaceHeight: 100 });
    const second = resolveWebGLViewportPixelRatio({ devicePixelRatio: 2, viewportScale: 1.12, surfaceWidth: 100, surfaceHeight: 100 });

    expect(first).toBe(2.5);
    expect(second).toBe(2.5);
  });

  it("caps high zoom backing stores", () => {
    expect(resolveWebGLViewportPixelRatio({ devicePixelRatio: 2, viewportScale: 9, surfaceWidth: 100, surfaceHeight: 100 })).toBe(3);
  });

  it("caps the ratio by the visible surface pixel budget", () => {
    expect(resolveWebGLViewportPixelRatio({
      devicePixelRatio: 2,
      viewportScale: 1,
      surfaceWidth: 2000,
      surfaceHeight: 2000,
      maxBackingStorePixels: 1_000_000,
    })).toBe(0.5);
  });

  it("throws when visible surface dimensions are missing", () => {
    expect(() => resolveWebGLViewportPixelRatio({
      devicePixelRatio: 2,
      viewportScale: 1,
      surfaceWidth: 0,
      surfaceHeight: 100,
    })).toThrow("surfaceWidth");
  });
});
