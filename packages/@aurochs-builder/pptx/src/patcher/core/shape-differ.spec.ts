/** @file Shape differ tests */

import type {
  Shape,
  SpShape,
  PicShape,
  GrpShape,
  CxnShape,
  GraphicFrame,
  GroupShapeProperties,
  ContentPartShape,
} from "@aurochs-office/pptx/domain/shape";
import type { Slide } from "@aurochs-office/pptx/domain/slide/types";
import type { Transform, GroupTransform } from "@aurochs-office/pptx/domain/geometry";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { Fill, Line } from "@aurochs-office/pptx/domain/color/types";
import type { TextBody, Paragraph, TextRun } from "@aurochs-office/pptx/domain/text";
import type { Effects } from "@aurochs-office/pptx/domain/effects";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import {
  detectSlideChanges,
  detectShapePropertyChanges,
  getShapeId,
  isTransformEqual,
  isFillEqual,
  isLineEqual,
  isTextBodyEqual,
  isEffectsEqual,
  isGeometryEqual,
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

function createTransform(
  overrides: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
  }> = {},
): Transform {
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

function createGroupTransform(
  overrides: Partial<{
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
  }> = {},
): GroupTransform {
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

function createLine(width: number, colorValue: string): Line {
  return {
    width: px(width),
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: createSolidFill(colorValue),
  } as never;
}

function createEffects(hasShadow: boolean): Effects {
  if (hasShadow) {
    return {
      shadow: {
        type: "outerShadow",
        color: createColor("000000"),
        blurRadius: px(4),
        distance: px(2),
        direction: deg(45),
      },
    } as never;
  }
  return {} as never;
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

function createCxnShape(id: string, overrides: Partial<CxnShape> = {}): CxnShape {
  return {
    type: "cxnSp",
    nonVisual: {
      id,
      name: `Connector ${id}`,
    },
    properties: {
      transform: createTransform(),
    },
    ...overrides,
  };
}

function createGraphicFrame(id: string, overrides: Partial<GraphicFrame> = {}): GraphicFrame {
  return {
    type: "graphicFrame",
    nonVisual: {
      id,
      name: `Frame ${id}`,
    },
    transform: createTransform(),
    content: { type: "unknown", uri: "http://example.com" },
    ...overrides,
  };
}

function createContentPart(): ContentPartShape {
  return {
    type: "contentPart",
    contentPart: {} as never,
  };
}

function createSlide(shapes: readonly Shape[] = []): Slide {
  return {
    shapes,
  };
}

// =============================================================================
// detectSlideChanges
// =============================================================================

describe("detectSlideChanges", () => {
  it("returns empty array when slides are identical", () => {
    const shape = createSpShape("1");
    const original = createSlide([shape]);
    const modified = createSlide([shape]);

    const result = detectSlideChanges(original, modified);

    expect(result).toEqual([]);
  });

  it("returns empty array for empty slides", () => {
    const result = detectSlideChanges(createSlide([]), createSlide([]));
    expect(result).toEqual([]);
  });

  it("detects added shape with no afterId when no prior shape", () => {
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

  it("detects added shape with afterId when after existing shape", () => {
    const existing = createSpShape("1");
    const original = createSlide([existing]);
    const newShape = createSpShape("2");
    const modified = createSlide([existing, newShape]);

    const result = detectSlideChanges(original, modified);

    const added = getChangesByType(result, "added");
    expect(added).toHaveLength(1);
    expect(added[0].afterId).toBe("1");
  });

  it("detects added shape with afterId pointing to another added shape", () => {
    const original = createSlide([]);
    const shape1 = createSpShape("1");
    const shape2 = createSpShape("2");
    const modified = createSlide([shape1, shape2]);

    const result = detectSlideChanges(original, modified);

    const added = getChangesByType(result, "added");
    expect(added).toHaveLength(2);
    expect(added[0].afterId).toBeUndefined();
    expect(added[1].afterId).toBe("1");
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

  it("detects modified shape with transform change", () => {
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
    expect(change.shapeType).toBe("sp");
    expect(change.changes).toHaveLength(1);
    expect(change.changes[0].property).toBe("transform");
  });

  it("detects multiple changes: add + remove + modify", () => {
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

  it("skips contentPart shapes (no ID) in tree diff", () => {
    const sp = createSpShape("1");
    const cp = createContentPart();

    const original = createSlide([sp, cp]);
    const modified = createSlide([sp]);

    // contentPart has no ID so it should be silently skipped
    const result = detectSlideChanges(original, modified);
    // Only the shapes with IDs are tracked
    expect(getChangesByType(result, "removed")).toHaveLength(0);
  });

  it("skips contentPart in modified list during add detection", () => {
    const sp = createSpShape("1");
    const cp = createContentPart();

    const original = createSlide([sp]);
    const modified = createSlide([sp, cp]);

    const result = detectSlideChanges(original, modified);
    expect(getChangesByType(result, "added")).toHaveLength(0);
  });

  describe("group recursion", () => {
    it("detects modified shape inside group", () => {
      const innerShape = createSpShape("inner");
      const group = createGrpShape("group", [innerShape]);
      const original = createSlide([group]);

      const modifiedInner = createSpShape("inner", {
        properties: { transform: createTransform({ x: 50 }) },
      });
      const modifiedGroup = createGrpShape("group", [modifiedInner]);
      const modified = createSlide([modifiedGroup]);

      const result = detectSlideChanges(original, modified);

      const modifiedChanges = getChangesByType(result, "modified");
      expect(modifiedChanges.some((c) => c.shapeId === "inner")).toBe(true);
    });

    it("detects added shape inside group with parentId", () => {
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

    it("detects removed shape inside group with parentId", () => {
      const innerShape = createSpShape("inner");
      const originalGroup = createGrpShape("group", [innerShape]);
      const original = createSlide([originalGroup]);

      const modifiedGroup = createGrpShape("group", []);
      const modified = createSlide([modifiedGroup]);

      const result = detectSlideChanges(original, modified);
      const removed = getChangesByType(result, "removed");

      expect(removed).toHaveLength(1);
      expect(removed[0].shapeId).toBe("inner");
      expect(removed[0].parentId).toBe("group");
    });

    it("does not recurse into non-group shapes", () => {
      const sp = createSpShape("1");
      const original = createSlide([sp]);
      const modified = createSlide([sp]);

      const result = detectSlideChanges(original, modified);
      expect(result).toEqual([]);
    });
  });
});

// =============================================================================
// detectShapePropertyChanges
// =============================================================================

describe("detectShapePropertyChanges", () => {
  it("returns empty array when shapes are identical (same ref)", () => {
    const shape = createSpShape("1");
    const result = detectShapePropertyChanges(shape, shape);
    expect(result).toEqual([]);
  });

  it("returns empty array when types mismatch", () => {
    const sp = createSpShape("1");
    const pic = createPicShape("1");
    const result = detectShapePropertyChanges(sp, pic);
    expect(result).toEqual([]);
  });

  describe("SpShape changes", () => {
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

    it("detects line change", () => {
      const original = createSpShape("1", {
        properties: {
          transform: createTransform(),
          line: createLine(1, "000000"),
        },
      });
      const modified = createSpShape("1", {
        properties: {
          transform: createTransform(),
          line: createLine(2, "FF0000"),
        },
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("line");
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

    it("detects effects change", () => {
      const original = createSpShape("1", {
        properties: {
          transform: createTransform(),
          effects: createEffects(false),
        },
      });
      const modified = createSpShape("1", {
        properties: {
          transform: createTransform(),
          effects: createEffects(true),
        },
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("effects");
    });

    it("detects geometry change", () => {
      const original = createSpShape("1", {
        properties: {
          transform: createTransform(),
          geometry: { type: "preset", preset: "rect", adjustValues: [] },
        },
      });
      const modified = createSpShape("1", {
        properties: {
          transform: createTransform(),
          geometry: { type: "preset", preset: "ellipse", adjustValues: [] },
        },
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("geometry");
    });

    it("detects multiple property changes simultaneously", () => {
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

    it("returns empty when all sp properties are equal", () => {
      const fill = createSolidFill("FF0000");
      const line = createLine(1, "000000");
      const effects = createEffects(true);
      const textBody = createTextBody("Hello");
      const geometry = { type: "preset" as const, preset: "rect", adjustValues: [] };
      const transform = createTransform({ x: 10 });

      const original = createSpShape("1", {
        properties: { transform, fill, line, effects, geometry },
        textBody,
      });
      const modified = createSpShape("1", {
        properties: { transform, fill, line, effects, geometry },
        textBody,
      });

      const result = detectShapePropertyChanges(original, modified);
      expect(result).toEqual([]);
    });
  });

  describe("PicShape changes", () => {
    it("detects transform change", () => {
      const original = createPicShape("1", {
        properties: { transform: createTransform({ x: 0 }) },
      });
      const modified = createPicShape("1", {
        properties: { transform: createTransform({ x: 50 }) },
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("transform");
    });

    it("detects blipFill change", () => {
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

    it("detects effects change", () => {
      const original = createPicShape("1", {
        properties: {
          transform: createTransform(),
          effects: createEffects(false),
        },
      });
      const modified = createPicShape("1", {
        properties: {
          transform: createTransform(),
          effects: createEffects(true),
        },
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("effects");
    });

    it("returns empty when pic properties are identical", () => {
      const pic = createPicShape("1");
      const result = detectShapePropertyChanges(pic, { ...pic });
      expect(result).toEqual([]);
    });
  });

  describe("GrpShape changes", () => {
    it("detects transform change", () => {
      const original = createGrpShape("1");
      const modified: GrpShape = {
        ...original,
        properties: {
          transform: createGroupTransform({ x: 50 }),
        } as GroupShapeProperties,
      };

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("transform");
    });

    it("detects fill change", () => {
      const original: GrpShape = {
        ...createGrpShape("1"),
        properties: {
          transform: createGroupTransform(),
          fill: createSolidFill("FF0000"),
        } as GroupShapeProperties,
      };
      const modified: GrpShape = {
        ...createGrpShape("1"),
        properties: {
          transform: createGroupTransform(),
          fill: createSolidFill("00FF00"),
        } as GroupShapeProperties,
      };

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("fill");
    });

    it("detects effects change", () => {
      const original: GrpShape = {
        ...createGrpShape("1"),
        properties: {
          transform: createGroupTransform(),
          effects: createEffects(false),
        } as GroupShapeProperties,
      };
      const modified: GrpShape = {
        ...createGrpShape("1"),
        properties: {
          transform: createGroupTransform(),
          effects: createEffects(true),
        } as GroupShapeProperties,
      };

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("effects");
    });

    it("returns empty when group properties are identical", () => {
      const grp = createGrpShape("1");
      const result = detectShapePropertyChanges(grp, { ...grp });
      expect(result).toEqual([]);
    });
  });

  describe("CxnShape changes", () => {
    it("detects transform change", () => {
      const original = createCxnShape("1", {
        properties: { transform: createTransform({ x: 0 }) },
      });
      const modified = createCxnShape("1", {
        properties: { transform: createTransform({ x: 50 }) },
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("transform");
    });

    it("detects fill change", () => {
      const original = createCxnShape("1", {
        properties: {
          transform: createTransform(),
          fill: createSolidFill("FF0000"),
        },
      });
      const modified = createCxnShape("1", {
        properties: {
          transform: createTransform(),
          fill: createSolidFill("00FF00"),
        },
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("fill");
    });

    it("detects line change", () => {
      const original = createCxnShape("1", {
        properties: {
          transform: createTransform(),
          line: createLine(1, "000000"),
        },
      });
      const modified = createCxnShape("1", {
        properties: {
          transform: createTransform(),
          line: createLine(2, "FF0000"),
        },
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("line");
    });

    it("returns empty when connector properties are identical", () => {
      const cxn = createCxnShape("1");
      const result = detectShapePropertyChanges(cxn, { ...cxn });
      expect(result).toEqual([]);
    });
  });

  describe("GraphicFrame changes", () => {
    it("detects transform change", () => {
      const original = createGraphicFrame("1", {
        transform: createTransform({ x: 0 }),
      });
      const modified = createGraphicFrame("1", {
        transform: createTransform({ x: 50 }),
      });

      const result = detectShapePropertyChanges(original, modified);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("transform");
    });

    it("returns empty when frame transform is identical", () => {
      const frame = createGraphicFrame("1");
      const result = detectShapePropertyChanges(frame, { ...frame });
      expect(result).toEqual([]);
    });
  });

  describe("contentPart", () => {
    it("returns empty for contentPart shapes (no switch branch)", () => {
      const cp = createContentPart();
      const result = detectShapePropertyChanges(cp, cp);
      expect(result).toEqual([]);
    });
  });
});

// =============================================================================
// getShapeId
// =============================================================================

describe("getShapeId", () => {
  it("returns id for SpShape", () => {
    expect(getShapeId(createSpShape("123"))).toBe("123");
  });

  it("returns id for PicShape", () => {
    expect(getShapeId(createPicShape("456"))).toBe("456");
  });

  it("returns id for GrpShape", () => {
    expect(getShapeId(createGrpShape("789"))).toBe("789");
  });

  it("returns id for CxnShape", () => {
    expect(getShapeId(createCxnShape("101"))).toBe("101");
  });

  it("returns id for GraphicFrame", () => {
    expect(getShapeId(createGraphicFrame("202"))).toBe("202");
  });

  it("returns undefined for contentPart", () => {
    expect(getShapeId(createContentPart())).toBeUndefined();
  });
});

// =============================================================================
// isTransformEqual
// =============================================================================

describe("isTransformEqual", () => {
  it("returns true for same reference", () => {
    const a = createTransform();
    expect(isTransformEqual(a, a)).toBe(true);
  });

  it("returns true for both undefined", () => {
    expect(isTransformEqual(undefined, undefined)).toBe(true);
  });

  it("returns false when first is undefined", () => {
    expect(isTransformEqual(undefined, createTransform())).toBe(false);
  });

  it("returns false when second is undefined", () => {
    expect(isTransformEqual(createTransform(), undefined)).toBe(false);
  });

  it("returns true for identical field values", () => {
    const a = createTransform({ x: 10, y: 20, width: 30, height: 40, rotation: 45, flipH: true, flipV: false });
    const b = createTransform({ x: 10, y: 20, width: 30, height: 40, rotation: 45, flipH: true, flipV: false });
    expect(isTransformEqual(a, b)).toBe(true);
  });

  it("returns false when x differs", () => {
    expect(isTransformEqual(createTransform({ x: 10 }), createTransform({ x: 20 }))).toBe(false);
  });

  it("returns false when y differs", () => {
    expect(isTransformEqual(createTransform({ y: 10 }), createTransform({ y: 20 }))).toBe(false);
  });

  it("returns false when width differs", () => {
    expect(isTransformEqual(createTransform({ width: 10 }), createTransform({ width: 20 }))).toBe(false);
  });

  it("returns false when height differs", () => {
    expect(isTransformEqual(createTransform({ height: 10 }), createTransform({ height: 20 }))).toBe(false);
  });

  it("returns false when rotation differs", () => {
    expect(isTransformEqual(createTransform({ rotation: 0 }), createTransform({ rotation: 90 }))).toBe(false);
  });

  it("returns false when flipH differs", () => {
    expect(isTransformEqual(createTransform({ flipH: false }), createTransform({ flipH: true }))).toBe(false);
  });

  it("returns false when flipV differs", () => {
    expect(isTransformEqual(createTransform({ flipV: false }), createTransform({ flipV: true }))).toBe(false);
  });
});

// =============================================================================
// isFillEqual
// =============================================================================

describe("isFillEqual", () => {
  it("returns true for same reference", () => {
    const a = createSolidFill("FF0000");
    expect(isFillEqual(a, a)).toBe(true);
  });

  it("returns true for both undefined", () => {
    expect(isFillEqual(undefined, undefined)).toBe(true);
  });

  it("returns false when first is undefined", () => {
    expect(isFillEqual(undefined, createSolidFill("FF0000"))).toBe(false);
  });

  it("returns false when second is undefined", () => {
    expect(isFillEqual(createSolidFill("FF0000"), undefined)).toBe(false);
  });

  it("returns true for identical solid fills", () => {
    expect(isFillEqual(createSolidFill("FF0000"), createSolidFill("FF0000"))).toBe(true);
  });

  it("returns false for different colors", () => {
    expect(isFillEqual(createSolidFill("FF0000"), createSolidFill("00FF00"))).toBe(false);
  });

  it("returns false for different fill types", () => {
    const a: Fill = createSolidFill("FF0000");
    const b: Fill = { type: "noFill" };
    expect(isFillEqual(a, b)).toBe(false);
  });
});

// =============================================================================
// isLineEqual
// =============================================================================

describe("isLineEqual", () => {
  it("returns true for same reference", () => {
    const a = createLine(1, "000000");
    expect(isLineEqual(a, a)).toBe(true);
  });

  it("returns true for both undefined", () => {
    expect(isLineEqual(undefined, undefined)).toBe(true);
  });

  it("returns false when first is undefined", () => {
    expect(isLineEqual(undefined, createLine(1, "000000"))).toBe(false);
  });

  it("returns false when second is undefined", () => {
    expect(isLineEqual(createLine(1, "000000"), undefined)).toBe(false);
  });

  it("returns true for identical lines", () => {
    expect(isLineEqual(createLine(1, "000000"), createLine(1, "000000"))).toBe(true);
  });

  it("returns false for different line width", () => {
    expect(isLineEqual(createLine(1, "000000"), createLine(2, "000000"))).toBe(false);
  });

  it("returns false for different line color", () => {
    expect(isLineEqual(createLine(1, "000000"), createLine(1, "FF0000"))).toBe(false);
  });
});

// =============================================================================
// isTextBodyEqual
// =============================================================================

describe("isTextBodyEqual", () => {
  it("returns true for same reference", () => {
    const a = createTextBody("Hello");
    expect(isTextBodyEqual(a, a)).toBe(true);
  });

  it("returns true for both undefined", () => {
    expect(isTextBodyEqual(undefined, undefined)).toBe(true);
  });

  it("returns false when first is undefined", () => {
    expect(isTextBodyEqual(undefined, createTextBody("Hello"))).toBe(false);
  });

  it("returns false when second is undefined", () => {
    expect(isTextBodyEqual(createTextBody("Hello"), undefined)).toBe(false);
  });

  it("returns true for identical text bodies", () => {
    expect(isTextBodyEqual(createTextBody("Hello"), createTextBody("Hello"))).toBe(true);
  });

  it("returns false for different text", () => {
    expect(isTextBodyEqual(createTextBody("Hello"), createTextBody("World"))).toBe(false);
  });
});

// =============================================================================
// isEffectsEqual
// =============================================================================

describe("isEffectsEqual", () => {
  it("returns true for same reference", () => {
    const a = createEffects(true);
    expect(isEffectsEqual(a, a)).toBe(true);
  });

  it("returns true for both undefined", () => {
    expect(isEffectsEqual(undefined, undefined)).toBe(true);
  });

  it("returns false when first is undefined", () => {
    expect(isEffectsEqual(undefined, createEffects(true))).toBe(false);
  });

  it("returns false when second is undefined", () => {
    expect(isEffectsEqual(createEffects(true), undefined)).toBe(false);
  });

  it("returns true for identical effects", () => {
    expect(isEffectsEqual(createEffects(true), createEffects(true))).toBe(true);
  });

  it("returns false for different effects", () => {
    expect(isEffectsEqual(createEffects(false), createEffects(true))).toBe(false);
  });
});

// =============================================================================
// isGeometryEqual
// =============================================================================

describe("isGeometryEqual", () => {
  it("returns true for same values", () => {
    const a = { type: "preset", preset: "rect", adjustValues: [] };
    const b = { type: "preset", preset: "rect", adjustValues: [] };
    expect(isGeometryEqual(a, b)).toBe(true);
  });

  it("returns false for different presets", () => {
    const a = { type: "preset", preset: "rect", adjustValues: [] };
    const b = { type: "preset", preset: "ellipse", adjustValues: [] };
    expect(isGeometryEqual(a, b)).toBe(false);
  });

  it("returns true for both undefined", () => {
    expect(isGeometryEqual(undefined, undefined)).toBe(true);
  });

  it("returns true for same reference", () => {
    const a = { type: "preset", preset: "rect" };
    expect(isGeometryEqual(a, a)).toBe(true);
  });
});

// =============================================================================
// deepEqual
// =============================================================================

describe("deepEqual", () => {
  it("returns true for same reference", () => {
    const a = { x: 1 };
    expect(deepEqual(a, a)).toBe(true);
  });

  it("returns true for equal primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });

  it("returns false for unequal primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
  });

  it("returns false for different types", () => {
    expect(deepEqual(1, "1")).toBe(false);
    expect(deepEqual(true, 1)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it("returns false for null vs object", () => {
    expect(deepEqual({}, null)).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });

  it("returns false for array vs non-array", () => {
    expect(deepEqual([1], { 0: 1 })).toBe(false);
    expect(deepEqual({ 0: 1 }, [1])).toBe(false);
  });

  it("returns true for equal arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("returns false for arrays with different length", () => {
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
  });

  it("returns false for arrays with different elements", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("returns true for equal objects", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("returns false for objects with different key count", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("returns false for objects with missing key", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
  });

  it("returns false for objects with different values", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it("returns true for nested structures", () => {
    const a = { arr: [1, { x: 2 }], obj: { y: [3, 4] } };
    const b = { arr: [1, { x: 2 }], obj: { y: [3, 4] } };
    expect(deepEqual(a, b)).toBe(true);
  });

  it("returns false for nested structures with differences", () => {
    const a = { arr: [1, { x: 2 }], obj: { y: [3, 4] } };
    const c = { arr: [1, { x: 9 }], obj: { y: [3, 4] } };
    expect(deepEqual(a, c)).toBe(false);
  });

  it("returns true for empty arrays", () => {
    expect(deepEqual([], [])).toBe(true);
  });

  it("returns true for empty objects", () => {
    expect(deepEqual({}, {})).toBe(true);
  });

  it("handles arrays of objects", () => {
    expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(deepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
  });
});

// =============================================================================
// Utility Functions
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

    expect(getChangesByType(changes, "added")).toHaveLength(2);
    expect(getChangesByType(changes, "removed")).toHaveLength(1);
    expect(getChangesByType(changes, "modified")).toHaveLength(0);
  });

  it("returns empty array when no matches", () => {
    const changes: ShapeChange[] = [{ type: "removed", shapeId: "1" }];
    expect(getChangesByType(changes, "added")).toHaveLength(0);
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
    expect(getModifiedByProperty(change, "fill")).toBeUndefined();
    expect(getModifiedByProperty(change, "line")).toBeUndefined();
    expect(getModifiedByProperty(change, "textBody")).toBeUndefined();
    expect(getModifiedByProperty(change, "effects")).toBeUndefined();
    expect(getModifiedByProperty(change, "geometry")).toBeUndefined();
    expect(getModifiedByProperty(change, "blipFill")).toBeUndefined();
  });
});
