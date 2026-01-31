/**
 * @file Shape Differ Tests
 */

import type { Shape, SpShape, PicShape, GrpShape, GroupShapeProperties } from "@oxen-office/pptx/domain/shape";
import type { Slide } from "@oxen-office/pptx/domain/slide/types";
import type { Transform, GroupTransform } from "@oxen-office/pptx/domain/geometry";
import type { Color } from "@oxen-office/ooxml/domain/color";
import type { SolidFill } from "@oxen-office/ooxml/domain/fill";
import type { Fill } from "@oxen-office/pptx/domain/color/types";
import type { TextBody, Paragraph, TextRun } from "@oxen-office/pptx/domain/text";
import { px, deg } from "@oxen-office/ooxml/domain/units";
import {
  detectSlideChanges,
  detectShapePropertyChanges,
  getShapeId,
  isTransformEqual,
  isFillEqual,
  isTextBodyEqual,
  deepEqual,
  hasChanges,
  getChangesByType,
  getModifiedByProperty,
  type ShapeChange,
  type ShapeModified,
} from "./shape-differ";

// =============================================================================
// Test Helpers
// =============================================================================

function createColor(value: string): Color {
  return {
    spec: { type: "srgb", value },
  };
}

function createSolidFill(colorValue: string): SolidFill {
  return {
    type: "solidFill",
    color: createColor(colorValue),
  };
}

function createTransform(overrides: Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}> = {}): Transform {
  const defaults = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    ...overrides,
  };
  return {
    x: px(defaults.x),
    y: px(defaults.y),
    width: px(defaults.width),
    height: px(defaults.height),
    rotation: deg(defaults.rotation),
    flipH: defaults.flipH,
    flipV: defaults.flipV,
  };
}

function createGroupTransform(overrides: Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  childOffsetX: number;
  childOffsetY: number;
  childExtentWidth: number;
  childExtentHeight: number;
}> = {}): GroupTransform {
  const defaults = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    childOffsetX: 0,
    childOffsetY: 0,
    childExtentWidth: 100,
    childExtentHeight: 100,
    ...overrides,
  };
  return {
    x: px(defaults.x),
    y: px(defaults.y),
    width: px(defaults.width),
    height: px(defaults.height),
    rotation: deg(defaults.rotation),
    flipH: defaults.flipH,
    flipV: defaults.flipV,
    childOffsetX: px(defaults.childOffsetX),
    childOffsetY: px(defaults.childOffsetY),
    childExtentWidth: px(defaults.childExtentWidth),
    childExtentHeight: px(defaults.childExtentHeight),
  };
}

function createTextRun(text: string): TextRun {
  return {
    type: "text",
    text,
    properties: {},
  };
}

function createParagraph(text: string): Paragraph {
  return {
    runs: [createTextRun(text)],
    properties: {},
  };
}

function createTextBody(text: string): TextBody {
  return {
    bodyProperties: {},
    paragraphs: [createParagraph(text)],
  };
}

function createSpShape(id: string, overrides: Partial<SpShape> = {}): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id,
      name: `Shape ${id}`,
    },
    properties: {
      transform: createTransform(),
    },
    ...overrides,
  };
}

function createPicShape(id: string, overrides: Partial<PicShape> = {}): PicShape {
  return {
    type: "pic",
    nonVisual: {
      id,
      name: `Picture ${id}`,
    },
    blipFill: {
      resourceId: "rId1",
    },
    properties: {
      transform: createTransform(),
    },
    ...overrides,
  };
}

function createGrpShape(id: string, children: readonly Shape[] = []): GrpShape {
  return {
    type: "grpSp",
    nonVisual: {
      id,
      name: `Group ${id}`,
    },
    properties: {
      transform: createGroupTransform(),
    } as GroupShapeProperties,
    children,
  };
}

function createSlide(shapes: readonly Shape[] = []): Slide {
  return {
    shapes,
  };
}

// =============================================================================
// detectSlideChanges Tests
// =============================================================================

describe("detectSlideChanges", () => {
  it("returns empty array when slides are identical", () => {
    const shape = createSpShape("1");
    const original = createSlide([shape]);
    const modified = createSlide([shape]);

    const result = detectSlideChanges(original, modified);

    expect(result).toEqual([]);
  });

  it("detects added shape", () => {
    const original = createSlide([]);
    const newShape = createSpShape("1");
    const modified = createSlide([newShape]);

    const result = detectSlideChanges(original, modified);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("added");
    const added = result[0] as Extract<ShapeChange, { type: "added" }>;
    expect(added.shape).toBe(newShape);
    expect(added.parentId).toBeUndefined();
    expect(added.afterId).toBeUndefined();
  });

  it("detects removed shape", () => {
    const shape = createSpShape("1");
    const original = createSlide([shape]);
    const modified = createSlide([]);

    const result = detectSlideChanges(original, modified);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("removed");
    const removed = result[0] as Extract<ShapeChange, { type: "removed" }>;
    expect(removed.shapeId).toBe("1");
    expect(removed.parentId).toBeUndefined();
  });

  it("detects modified shape", () => {
    const originalShape = createSpShape("1", {
      properties: { transform: createTransform({ x: 0 }) },
    });
    const modifiedShape = createSpShape("1", {
      properties: { transform: createTransform({ x: 100 }) },
    });
    const original = createSlide([originalShape]);
    const modified = createSlide([modifiedShape]);

    const result = detectSlideChanges(original, modified);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("modified");
    const change = result[0] as ShapeModified;
    expect(change.shapeId).toBe("1");
    expect(change.changes).toHaveLength(1);
    expect(change.changes[0].property).toBe("transform");
  });

  it("detects multiple changes at once", () => {
    const shape1 = createSpShape("1");
    const shape2 = createSpShape("2");
    const shape3 = createSpShape("3");
    const shape4 = createSpShape("4");

    const original = createSlide([shape1, shape2]);
    const modified = createSlide([
      createSpShape("2", { properties: { transform: createTransform({ x: 999 }) } }),
      shape3,
      shape4,
    ]);

    const result = detectSlideChanges(original, modified);

    const removed = getChangesByType(result, "removed");
    const added = getChangesByType(result, "added");
    const modifiedChanges = getChangesByType(result, "modified");

    expect(removed).toHaveLength(1);
    expect(removed[0].shapeId).toBe("1");

    expect(added).toHaveLength(2);
    expect(added[0].afterId).toBe("2");
    expect(added[1].afterId).toBe("3");

    expect(modifiedChanges).toHaveLength(1);
    expect(modifiedChanges[0].shapeId).toBe("2");
  });

  it("handles shapes in nested groups", () => {
    const innerShape = createSpShape("inner");
    const group = createGrpShape("group", [innerShape]);
    const original = createSlide([group]);

    const modifiedInner = createSpShape("inner", {
      properties: { transform: createTransform({ x: 50 }) },
    });
    const modifiedGroup = createGrpShape("group", [modifiedInner]);
    const modified = createSlide([modifiedGroup]);

    const result = detectSlideChanges(original, modified);

    // Should detect change to the inner shape
    const modifiedChanges = getChangesByType(result, "modified");
    expect(modifiedChanges.some((c) => c.shapeId === "inner")).toBe(true);
  });

  it("detects added shapes inside groups with parentId", () => {
    const originalInner = createSpShape("2");
    const originalGroup = createGrpShape("group", [originalInner]);
    const original = createSlide([originalGroup]);

    const addedInner = createSpShape("3");
    const modifiedGroup = createGrpShape("group", [originalInner, addedInner]);
    const modified = createSlide([modifiedGroup]);

    const result = detectSlideChanges(original, modified);
    const added = getChangesByType(result, "added");

    expect(added).toHaveLength(1);
    expect(added[0].shape).toBe(addedInner);
    expect(added[0].parentId).toBe("group");
    expect(added[0].afterId).toBe("2");
  });
});

// =============================================================================
// detectShapePropertyChanges Tests
// =============================================================================

describe("detectShapePropertyChanges", () => {
  it("returns empty array when shapes are identical", () => {
    const shape = createSpShape("1");
    const result = detectShapePropertyChanges(shape, shape);
    expect(result).toEqual([]);
  });

  it("detects transform change", () => {
    const original = createSpShape("1", {
      properties: { transform: createTransform({ x: 0, y: 0 }) },
    });
    const modified = createSpShape("1", {
      properties: { transform: createTransform({ x: 100, y: 200 }) },
    });

    const result = detectShapePropertyChanges(original, modified);

    expect(result).toHaveLength(1);
    expect(result[0].property).toBe("transform");
    expect((result[0] as { newValue: Transform }).newValue.x).toBe(px(100));
  });

  it("detects fill change", () => {
    const original = createSpShape("1", {
      properties: {
        transform: createTransform(),
        fill: createSolidFill("FF0000"),
      },
    });
    const modified = createSpShape("1", {
      properties: {
        transform: createTransform(),
        fill: createSolidFill("00FF00"),
      },
    });

    const result = detectShapePropertyChanges(original, modified);

    expect(result).toHaveLength(1);
    expect(result[0].property).toBe("fill");
  });

  it("detects textBody change", () => {
    const original = createSpShape("1", {
      properties: { transform: createTransform() },
      textBody: createTextBody("Hello"),
    });
    const modified = createSpShape("1", {
      properties: { transform: createTransform() },
      textBody: createTextBody("World"),
    });

    const result = detectShapePropertyChanges(original, modified);

    expect(result).toHaveLength(1);
    expect(result[0].property).toBe("textBody");
  });

  it("detects multiple property changes", () => {
    const original = createSpShape("1", {
      properties: {
        transform: createTransform({ x: 0 }),
        fill: createSolidFill("FF0000"),
      },
    });
    const modified = createSpShape("1", {
      properties: {
        transform: createTransform({ x: 100 }),
        fill: createSolidFill("00FF00"),
      },
    });

    const result = detectShapePropertyChanges(original, modified);

    expect(result).toHaveLength(2);
    expect(result.some((c) => c.property === "transform")).toBe(true);
    expect(result.some((c) => c.property === "fill")).toBe(true);
  });

  it("detects blipFill change in pictures", () => {
    const original = createPicShape("1", {
      blipFill: { resourceId: "rId1" },
    });
    const modified = createPicShape("1", {
      blipFill: { resourceId: "rId2" },
    });

    const result = detectShapePropertyChanges(original, modified);

    expect(result).toHaveLength(1);
    expect(result[0].property).toBe("blipFill");
  });
});

// =============================================================================
// getShapeId Tests
// =============================================================================

describe("getShapeId", () => {
  it("returns id for SpShape", () => {
    const shape = createSpShape("123");
    expect(getShapeId(shape)).toBe("123");
  });

  it("returns id for PicShape", () => {
    const shape = createPicShape("456");
    expect(getShapeId(shape)).toBe("456");
  });

  it("returns id for GrpShape", () => {
    const shape = createGrpShape("789");
    expect(getShapeId(shape)).toBe("789");
  });

  it("returns undefined for contentPart", () => {
    const shape: Shape = {
      type: "contentPart",
      contentPart: {} as never,
    };
    expect(getShapeId(shape)).toBeUndefined();
  });
});

// =============================================================================
// Equality Comparison Tests
// =============================================================================

describe("isTransformEqual", () => {
  it("returns true for identical transforms", () => {
    const a = createTransform({ x: 10, y: 20, rotation: 45 });
    const b = createTransform({ x: 10, y: 20, rotation: 45 });
    expect(isTransformEqual(a, b)).toBe(true);
  });

  it("returns false when x differs", () => {
    const a = createTransform({ x: 10 });
    const b = createTransform({ x: 20 });
    expect(isTransformEqual(a, b)).toBe(false);
  });

  it("returns false when rotation differs", () => {
    const a = createTransform({ rotation: 0 });
    const b = createTransform({ rotation: 90 });
    expect(isTransformEqual(a, b)).toBe(false);
  });

  it("returns false when flipH differs", () => {
    const a = createTransform({ flipH: false });
    const b = createTransform({ flipH: true });
    expect(isTransformEqual(a, b)).toBe(false);
  });

  it("handles undefined values", () => {
    expect(isTransformEqual(undefined, undefined)).toBe(true);
    expect(isTransformEqual(createTransform(), undefined)).toBe(false);
    expect(isTransformEqual(undefined, createTransform())).toBe(false);
  });

  it("returns true for same reference", () => {
    const a = createTransform();
    expect(isTransformEqual(a, a)).toBe(true);
  });
});

describe("isFillEqual", () => {
  it("returns true for identical solid fills", () => {
    const a = createSolidFill("FF0000");
    const b = createSolidFill("FF0000");
    expect(isFillEqual(a, b)).toBe(true);
  });

  it("returns false for different colors", () => {
    const a = createSolidFill("FF0000");
    const b = createSolidFill("00FF00");
    expect(isFillEqual(a, b)).toBe(false);
  });

  it("returns false for different fill types", () => {
    const a: Fill = createSolidFill("FF0000");
    const b: Fill = { type: "noFill" };
    expect(isFillEqual(a, b)).toBe(false);
  });
});

describe("isTextBodyEqual", () => {
  it("returns true for identical text bodies", () => {
    const a = createTextBody("Hello");
    const b = createTextBody("Hello");
    expect(isTextBodyEqual(a, b)).toBe(true);
  });

  it("returns false for different text", () => {
    const a = createTextBody("Hello");
    const b = createTextBody("World");
    expect(isTextBodyEqual(a, b)).toBe(false);
  });
});

describe("deepEqual", () => {
  it("compares primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(true, false)).toBe(false);
  });

  it("compares arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
  });

  it("compares objects", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("compares nested structures", () => {
    const a = { arr: [1, { x: 2 }], obj: { y: [3, 4] } };
    const b = { arr: [1, { x: 2 }], obj: { y: [3, 4] } };
    const c = { arr: [1, { x: 9 }], obj: { y: [3, 4] } };
    expect(deepEqual(a, b)).toBe(true);
    expect(deepEqual(a, c)).toBe(false);
  });

  it("handles null and undefined", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe("hasChanges", () => {
  it("returns false for empty array", () => {
    expect(hasChanges([])).toBe(false);
  });

  it("returns true for non-empty array", () => {
    const changes: ShapeChange[] = [{ type: "removed", shapeId: "1" }];
    expect(hasChanges(changes)).toBe(true);
  });
});

describe("getChangesByType", () => {
  it("filters changes by type", () => {
    const changes: ShapeChange[] = [
      { type: "added", shape: createSpShape("1") },
      { type: "removed", shapeId: "2" },
      { type: "added", shape: createSpShape("3") },
    ];

    const added = getChangesByType(changes, "added");
    expect(added).toHaveLength(2);

    const removed = getChangesByType(changes, "removed");
    expect(removed).toHaveLength(1);
  });
});

describe("getModifiedByProperty", () => {
  it("finds property change by name", () => {
    const change: ShapeModified = {
      type: "modified",
      shapeId: "1",
      shapeType: "sp",
      changes: [
        {
          property: "transform",
          oldValue: createTransform({ x: 0 }),
          newValue: createTransform({ x: 100 }),
        },
        {
          property: "fill",
          oldValue: { type: "noFill" } as Fill,
          newValue: createSolidFill("FF0000"),
        },
      ],
    };

    const transformChange = getModifiedByProperty(change, "transform");
    expect(transformChange).toBeDefined();
    expect(transformChange?.newValue?.x).toBe(px(100));

    const fillChange = getModifiedByProperty(change, "fill");
    expect(fillChange).toBeDefined();
  });

  it("returns undefined when property not found", () => {
    const change: ShapeModified = {
      type: "modified",
      shapeId: "1",
      shapeType: "sp",
      changes: [],
    };

    expect(getModifiedByProperty(change, "transform")).toBeUndefined();
  });
});
