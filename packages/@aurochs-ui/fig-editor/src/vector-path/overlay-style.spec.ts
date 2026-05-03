/** @file Tests for vector path overlay style constants. */

import {
  getVectorPathHandleCursor,
  orderVectorPathHandlesForHitTesting,
  screenDashToPageDash,
  screenPxToPagePx,
  VECTOR_PATH_OVERLAY_STYLE,
} from "./overlay-style";

describe("vector path overlay style", () => {
  it("keeps interactive sizes in screen pixels across zoom", () => {
    expect(screenPxToPagePx(VECTOR_PATH_OVERLAY_STYLE.anchorRadiusPx, 1)).toBe(5);
    expect(screenPxToPagePx(VECTOR_PATH_OVERLAY_STYLE.anchorRadiusPx, 2)).toBe(2.5);
    expect(screenPxToPagePx(VECTOR_PATH_OVERLAY_STYLE.segmentHitStrokeWidthPx, 0.5)).toBe(24);
  });

  it("uses the minimum viewport scale instead of dividing by zero", () => {
    expect(screenPxToPagePx(1, 0)).toBe(1 / VECTOR_PATH_OVERLAY_STYLE.minViewportScale);
  });

  it("converts dash patterns through the same screen-pixel scaling rule", () => {
    expect(screenDashToPageDash(VECTOR_PATH_OVERLAY_STYLE.controlLineDashPx, 2)).toBe("2 1.5");
  });

  it("orders controls below anchors for hit testing and exposes role cursors", () => {
    const ordered = orderVectorPathHandlesForHitTesting([
      { role: "anchor" as const, id: "start" },
      { role: "control" as const, id: "control" },
      { role: "anchor" as const, id: "end" },
    ]);

    expect(ordered.map((handle) => handle.id)).toEqual(["control", "start", "end"]);
    expect(getVectorPathHandleCursor({ role: "control" })).toBe("grab");
    expect(getVectorPathHandleCursor({ role: "anchor" })).toBe("pointer");
  });
});
