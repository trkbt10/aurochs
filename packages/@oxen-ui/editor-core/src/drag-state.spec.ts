/**
 * @file Drag state tests
 */

import { createIdleDragState, isDragIdle } from "./drag-state";

type DemoDrag = { readonly type: "idle" } | { readonly type: "move"; readonly dx: number };

describe("drag-state", () => {
  it("creates idle drag state", () => {
    const s = createIdleDragState();
    expect(s).toEqual({ type: "idle" });
  });

  it("narrows drag state with isDragIdle", () => {
    const s: DemoDrag = { type: "idle" };
    if (!isDragIdle(s)) {
      throw new Error("expected idle");
    }
    expect(s.type).toBe("idle");
  });
});

