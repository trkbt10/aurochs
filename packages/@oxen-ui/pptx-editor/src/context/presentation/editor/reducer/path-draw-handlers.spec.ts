/**
 * @file Path draw handlers tests
 */

import { px } from "@oxen/ooxml/domain/units";
import { createPresentationEditorState } from "./reducer";
import { createTestDocument } from "./test-fixtures";
import { PATH_DRAW_HANDLERS } from "./path-draw-handlers";
import type { PresentationEditorAction } from "../types";

describe("PATH_DRAW_HANDLERS", () => {
  it("START_PEN_DRAW enters drawing state", () => {
    const state = createPresentationEditorState(createTestDocument());
    const action: Extract<PresentationEditorAction, { type: "START_PEN_DRAW" }> = {
      type: "START_PEN_DRAW",
    };

    const handler = PATH_DRAW_HANDLERS.START_PEN_DRAW;
    if (!handler) {
      throw new Error("Missing handler: START_PEN_DRAW");
    }
    const next = handler(state, action);
    expect(next.pathDraw.type).toBe("drawing");
  });

  it("ADD_PEN_POINT appends a point when drawing", () => {
    const state = createPresentationEditorState(createTestDocument());
    const startAction: Extract<PresentationEditorAction, { type: "START_PEN_DRAW" }> = {
      type: "START_PEN_DRAW",
    };
    const startHandler = PATH_DRAW_HANDLERS.START_PEN_DRAW;
    if (!startHandler) {
      throw new Error("Missing handler: START_PEN_DRAW");
    }
    const started = startHandler(state, startAction);

    const addAction: Extract<PresentationEditorAction, { type: "ADD_PEN_POINT" }> = {
      type: "ADD_PEN_POINT",
      x: px(10),
      y: px(20),
      pointType: "corner",
    };
    const handler = PATH_DRAW_HANDLERS.ADD_PEN_POINT;
    if (!handler) {
      throw new Error("Missing handler: ADD_PEN_POINT");
    }
    const next = handler(started, addAction);

    expect(next.pathDraw.type).toBe("drawing");
    if (next.pathDraw.type === "drawing") {
      expect(next.pathDraw.path.points).toHaveLength(1);
      expect(next.pathDraw.path.points[0].x).toBe(px(10));
      expect(next.pathDraw.path.points[0].y).toBe(px(20));
    }
  });
});
