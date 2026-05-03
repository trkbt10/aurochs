/** @file Tests for fig editor user intent resolution. */

import { createIdleDragState, type DragState } from "@aurochs-ui/editor-core/drag-state";
import type { FigNodeId } from "@aurochs/fig/domain";
import type { FigCreationMode } from "./types";
import { isCreationIntent, isSelectionTransformIntent, resolveFigUserIntent } from "./user-intent";

function resolveIntent({
  mode,
  textEdit = { type: "inactive" },
  drag = createIdleDragState(),
}: {
  readonly mode: FigCreationMode;
  readonly textEdit?: { readonly type: "inactive" } | { readonly type: "active"; readonly nodeId: FigNodeId };
  readonly drag?: DragState<FigNodeId>;
}) {
  return resolveFigUserIntent({ creationMode: mode, textEdit, drag });
}

describe("resolveFigUserIntent", () => {
  it("treats text edit as the highest-priority user intent", () => {
    const intent = resolveIntent({
      mode: { type: "pen" },
      textEdit: { type: "active", nodeId: "text-1" as FigNodeId },
      drag: { type: "move", startX: 0, startY: 0, shapeIds: [], initialBounds: new Map(), previewDelta: { dx: 0, dy: 0 } },
    });

    expect(intent).toEqual({ kind: "text-edit", source: "text-edit" });
  });

  it("uses active drag intent before the selected toolbar tool", () => {
    const intent = resolveIntent({
      mode: { type: "rectangle" },
      drag: { type: "marquee", startX: 0, startY: 0, currentX: 10, currentY: 10, additive: false, confirmed: true },
    });

    expect(intent).toEqual({ kind: "marquee", source: "drag" });
  });

  it("maps create drag to a distinct user intent instead of overloading creation tools", () => {
    const intent = resolveIntent({
      mode: { type: "rectangle" },
      drag: { type: "create", startX: 0, startY: 0, currentX: 20, currentY: 20, confirmed: true },
    });

    expect(intent).toEqual({ kind: "create-drag", source: "drag" });
  });

  it.each<[FigCreationMode, string]>([
    [{ type: "select" }, "select"],
    [{ type: "pen" }, "path-edit"],
    [{ type: "frame" }, "create-frame"],
    [{ type: "rectangle" }, "create-rectangle"],
    [{ type: "ellipse" }, "create-ellipse"],
    [{ type: "line" }, "create-line"],
    [{ type: "star" }, "create-star"],
    [{ type: "polygon" }, "create-polygon"],
    [{ type: "text" }, "create-text"],
  ])("maps toolbar mode %s to intent %s", (mode, kind) => {
    expect(resolveIntent({ mode })).toEqual({ kind, source: "tool" });
  });
});

describe("fig user intent classification", () => {
  it("classifies creation and transform intents without inspecting UI components", () => {
    expect(isCreationIntent({ kind: "create-text", source: "tool" })).toBe(true);
    expect(isCreationIntent({ kind: "path-edit", source: "tool" })).toBe(false);
    expect(isSelectionTransformIntent({ kind: "resize", source: "drag" })).toBe(true);
    expect(isSelectionTransformIntent({ kind: "text-edit", source: "text-edit" })).toBe(false);
  });
});
