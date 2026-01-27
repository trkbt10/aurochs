/**
 * @file Creation handlers tests
 *
 * Tests for SET_CREATION_MODE, CREATE_SHAPE actions and shape factory.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, custom/no-as-outside-guard, no-restricted-syntax -- Test file uses flexible typing for mock data */
import { presentationEditorReducer, createPresentationEditorState } from "./reducer";
import type { PresentationEditorState, CreationMode } from "../types";
import type { SpShape } from "@oxen/pptx/domain/shape";
import { px } from "@oxen/ooxml/domain/units";
import { createShapeFromMode, getDefaultBoundsForMode } from "../../../../shape/factory";
import { createTestDocument } from "./test-fixtures";

describe("SET_CREATION_MODE", () => {
  let initialState: PresentationEditorState;

  beforeEach(() => {
    initialState = createPresentationEditorState(createTestDocument());
  });

  it("should update creation mode to shape", () => {
    const shapeMode: CreationMode = { type: "shape", preset: "rect" };
    const newState = presentationEditorReducer(initialState, {
      type: "SET_CREATION_MODE",
      mode: shapeMode,
    });

    expect(newState.creationMode).toEqual(shapeMode);
  });

  it("should clear selection when entering creation mode", () => {
    const stateWithSelection = {
      ...initialState,
      shapeSelection: {
        selectedIds: ["shape-1" as any],
        primaryId: "shape-1" as any,
      },
    };

    const shapeMode: CreationMode = { type: "shape", preset: "rect" };
    const newState = presentationEditorReducer(stateWithSelection, {
      type: "SET_CREATION_MODE",
      mode: shapeMode,
    });

    expect(newState.shapeSelection.selectedIds).toHaveLength(0);
  });

  it("should preserve selection when returning to select mode", () => {
    const stateWithSelection = {
      ...initialState,
      shapeSelection: {
        selectedIds: ["shape-1" as any],
        primaryId: "shape-1" as any,
      },
    };

    const selectMode: CreationMode = { type: "select" };
    const newState = presentationEditorReducer(stateWithSelection, {
      type: "SET_CREATION_MODE",
      mode: selectMode,
    });

    expect(newState.shapeSelection.selectedIds).toHaveLength(1);
  });
});

describe("CREATE_SHAPE", () => {
  let initialState: PresentationEditorState;

  beforeEach(() => {
    initialState = createPresentationEditorState(createTestDocument());
  });

  it("should add a shape to the active slide", () => {
    const mode: CreationMode = { type: "shape", preset: "rect" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeDefined();

    const newState = presentationEditorReducer(initialState, {
      type: "CREATE_SHAPE",
      shape: shape!,
    });

    const activeSlide = newState.documentHistory.present.slides.find(
      (s) => s.id === newState.activeSlideId
    );
    expect(activeSlide?.slide.shapes).toHaveLength(1);
  });

  it("should select the created shape", () => {
    const mode: CreationMode = { type: "shape", preset: "rect" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();

    const newState = presentationEditorReducer(initialState, {
      type: "CREATE_SHAPE",
      shape,
    });

    expect(newState.shapeSelection.selectedIds).toHaveLength(1);
    expect(newState.shapeSelection.primaryId).toBe(shape.nonVisual.id);
  });

  it("should return to select mode after creating shape", () => {
    const shapeMode: CreationMode = { type: "shape", preset: "rect" };
    let state = presentationEditorReducer(initialState, {
      type: "SET_CREATION_MODE",
      mode: shapeMode,
    });

    expect(state.creationMode.type).toBe("shape");

    const bounds = getDefaultBoundsForMode(shapeMode, px(100), px(100));
    const shape = createShapeFromMode(shapeMode, bounds)!;

    state = presentationEditorReducer(state, {
      type: "CREATE_SHAPE",
      shape,
    });

    expect(state.creationMode.type).toBe("select");
  });
});

describe("createShapeFromMode", () => {
  it("should create a rectangle shape", () => {
    const mode: CreationMode = { type: "shape", preset: "rect" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();
    expect(shape.type).toBe("sp");
    const geometry = shape.properties.geometry;
    expect(geometry?.type).toBe("preset");
    if (geometry?.type === "preset") {
      expect(geometry.preset).toBe("rect");
    }
    expect(shape.nonVisual.id).toBeTruthy();
  });

  it("should create an ellipse shape", () => {
    const mode: CreationMode = { type: "shape", preset: "ellipse" };
    const bounds = getDefaultBoundsForMode(mode, px(200), px(200));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();
    expect(shape.type).toBe("sp");
    const geometry = shape.properties.geometry;
    expect(geometry?.type).toBe("preset");
    if (geometry?.type === "preset") {
      expect(geometry.preset).toBe("ellipse");
    }
  });

  it("should create a right arrow shape", () => {
    const mode: CreationMode = { type: "shape", preset: "rightArrow" };
    const bounds = getDefaultBoundsForMode(mode, px(300), px(300));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();
    expect(shape.type).toBe("sp");
    const geometry = shape.properties.geometry;
    expect(geometry?.type).toBe("preset");
    if (geometry?.type === "preset") {
      expect(geometry.preset).toBe("rightArrow");
    }
  });

  it("should create a text box", () => {
    const mode: CreationMode = { type: "textbox" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();
    expect(shape.type).toBe("sp");
    expect(shape.nonVisual.textBox).toBe(true);
    expect(shape.textBody).toBeDefined();
  });

  it("should create a connector", () => {
    const mode: CreationMode = { type: "connector" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeDefined();
    expect(shape?.type).toBe("cxnSp");
  });

  it("should return undefined for select mode", () => {
    const mode: CreationMode = { type: "select" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeUndefined();
  });

  it("should return undefined for picture mode", () => {
    const mode: CreationMode = { type: "picture" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeUndefined();
  });

  it("should create a table", () => {
    const mode: CreationMode = { type: "table", rows: 3, cols: 4 };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeDefined();
    expect(shape?.type).toBe("graphicFrame");
  });

  it("should create a chart graphic frame", () => {
    const mode: CreationMode = { type: "chart", chartType: "bar" };
    const bounds = getDefaultBoundsForMode(mode, px(120), px(120));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeDefined();
    expect(shape?.type).toBe("graphicFrame");
    if (shape?.type === "graphicFrame") {
      expect(shape.content.type).toBe("chart");
    }
  });

  it("should create a diagram graphic frame", () => {
    const mode: CreationMode = { type: "diagram", diagramType: "process" };
    const bounds = getDefaultBoundsForMode(mode, px(140), px(140));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeDefined();
    expect(shape?.type).toBe("graphicFrame");
    if (shape?.type === "graphicFrame") {
      expect(shape.content.type).toBe("diagram");
    }
  });
});
