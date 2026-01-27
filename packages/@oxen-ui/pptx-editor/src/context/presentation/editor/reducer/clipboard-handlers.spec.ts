/**
 * @file Clipboard handlers tests
 */

import { px, deg } from "@oxen/ooxml/domain/units";
import type { Shape, SpShape } from "@oxen/pptx/domain";
import { createPresentationEditorState } from "./reducer";
import { createTestDocument } from "./test-fixtures";
import { createSingleSelection } from "../../../slide/state";
import { CLIPBOARD_HANDLERS } from "./clipboard-handlers";
import type { PresentationEditorAction } from "../types";

const createTestShape = (id: string): SpShape => ({
  type: "sp",
  nonVisual: {
    id,
    name: `Shape ${id}`,
  },
  properties: {
    transform: {
      x: px(0),
      y: px(0),
      width: px(100),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    fill: undefined,
  },
  textBody: undefined,
});

describe("CLIPBOARD_HANDLERS", () => {
  it("COPY stores selected shapes in clipboard", () => {
    const originalShape = createTestShape("1");
    const baseDoc = createTestDocument();
    const docWithShape = {
      ...baseDoc,
      slides: [
        {
          ...baseDoc.slides[0],
          slide: { ...baseDoc.slides[0].slide, shapes: [originalShape] },
        },
      ],
    };

    const state = createPresentationEditorState(docWithShape);
    const stateWithSelection = {
      ...state,
      shapeSelection: createSingleSelection(originalShape.nonVisual.id),
    };

    const action: Extract<PresentationEditorAction, { type: "COPY" }> = {
      type: "COPY",
    };
    const handler = CLIPBOARD_HANDLERS.COPY;
    if (!handler) {
      throw new Error("Missing handler: COPY");
    }
    const next = handler(stateWithSelection, action);

    expect(next.clipboard?.shapes).toHaveLength(1);
    expect(next.clipboard?.pasteCount).toBe(0);
  });

  it("PASTE clones shapes and offsets their position", () => {
    const originalShape = createTestShape("1");
    const baseDoc = createTestDocument();
    const docWithShape = {
      ...baseDoc,
      slides: [
        {
          ...baseDoc.slides[0],
          slide: { ...baseDoc.slides[0].slide, shapes: [originalShape] },
        },
      ],
    };

    const state = createPresentationEditorState(docWithShape);
    const copiedState = {
      ...state,
      clipboard: { shapes: [originalShape], pasteCount: 0 },
    };

    const action: Extract<PresentationEditorAction, { type: "PASTE" }> = {
      type: "PASTE",
    };
    const handler = CLIPBOARD_HANDLERS.PASTE;
    if (!handler) {
      throw new Error("Missing handler: PASTE");
    }
    const next = handler(copiedState, action);

    const shapes = next.documentHistory.present.slides[0].slide.shapes;
    expect(shapes).toHaveLength(2);

    const pastedShape: Shape = shapes[1];
    expect(pastedShape.type).toBe("sp");
    if (pastedShape.type !== "sp") {
      throw new Error("Expected pasted shape to be a standard shape (sp)");
    }
    if (!pastedShape.properties.transform) {
      throw new Error("Expected pasted shape to have a transform");
    }

    expect(pastedShape.nonVisual.id).not.toBe(originalShape.nonVisual.id);
    expect(pastedShape.properties.transform.x).toBe(px(20));
    expect(pastedShape.properties.transform.y).toBe(px(20));
    expect(next.clipboard?.pasteCount).toBe(1);
  });
});
