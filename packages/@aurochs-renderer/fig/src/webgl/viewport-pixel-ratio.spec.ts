/** @file WebGL viewport pixel ratio policy tests. */

import { resolveWebGLViewportPixelRatio } from "./viewport-pixel-ratio";

describe("resolveWebGLViewportPixelRatio", () => {
  it("uses DPR as the baseline at 100% zoom", () => {
    expect(resolveWebGLViewportPixelRatio({ devicePixelRatio: 2, viewportScale: 1 })).toBe(2);
  });

  it("quantizes zoom changes so small wheel deltas do not resize every frame", () => {
    const first = resolveWebGLViewportPixelRatio({ devicePixelRatio: 2, viewportScale: 1.05 });
    const second = resolveWebGLViewportPixelRatio({ devicePixelRatio: 2, viewportScale: 1.12 });

    expect(first).toBe(2.5);
    expect(second).toBe(2.5);
  });

  it("caps high zoom backing stores", () => {
    expect(resolveWebGLViewportPixelRatio({ devicePixelRatio: 2, viewportScale: 9 })).toBe(3);
  });
});
