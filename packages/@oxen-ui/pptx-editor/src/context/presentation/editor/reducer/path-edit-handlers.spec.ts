/**
 * @file Path edit handlers tests
 */

import { px } from "@oxen/ooxml/domain/units";
import type { CustomGeometry } from "@oxen/pptx/domain";
import { createPresentationEditorState } from "./reducer";
import { createTestDocument } from "./test-fixtures";
import { PATH_EDIT_HANDLERS } from "./path-edit-handlers";
import { createActivePathEditState } from "../../../slide/state";
import type { PresentationEditorAction } from "../types";

const createMinimalGeometry = (): CustomGeometry => ({
  type: "custom",
  paths: [
    {
      width: px(1),
      height: px(1),
      fill: "none",
      stroke: false,
      extrusionOk: false,
      commands: [],
    },
  ],
});

describe("PATH_EDIT_HANDLERS", () => {
  it("ENTER_PATH_EDIT returns state when shape is missing", () => {
    const state = createPresentationEditorState(createTestDocument());
    const action: Extract<PresentationEditorAction, { type: "ENTER_PATH_EDIT" }> = {
      type: "ENTER_PATH_EDIT",
      shapeId: "missing-shape",
    };

    const handler = PATH_EDIT_HANDLERS.ENTER_PATH_EDIT;
    if (!handler) {
      throw new Error("Missing handler: ENTER_PATH_EDIT");
    }
    const next = handler(state, action);
    expect(next).toBe(state);
  });

  it("EXIT_PATH_EDIT exits path edit mode", () => {
    const base = createPresentationEditorState(createTestDocument());
    const geometry = createMinimalGeometry();
    const state = {
      ...base,
      creationMode: { type: "path-edit" } as const,
      pathEdit: createActivePathEditState("shape-1", 0, geometry),
    };

    const action: Extract<PresentationEditorAction, { type: "EXIT_PATH_EDIT" }> = {
      type: "EXIT_PATH_EDIT",
      commit: false,
    };

    const handler = PATH_EDIT_HANDLERS.EXIT_PATH_EDIT;
    if (!handler) {
      throw new Error("Missing handler: EXIT_PATH_EDIT");
    }
    const next = handler(state, action);
    expect(next.pathEdit.type).toBe("inactive");
    expect(next.creationMode.type).toBe("select");
  });
});
