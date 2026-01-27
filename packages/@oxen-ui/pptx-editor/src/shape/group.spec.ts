/**
 * @file Unit tests for shape/group.ts
 */

import { describe, expect, it } from "vitest";
import type { SpShape, GrpShape, Shape, GroupTransform, Transform } from "@oxen/pptx/domain";
import { px, deg } from "@oxen/ooxml/domain/units";
import {
  getScaleFactor,
  transformChildToSlideCoords,
  transformSlideToChildCoords,
  transformGroupToSlideCoords,
  transformGroupToChildCoords,
  findGroupById,
  getTransformedChildren,
  extractChildIds,
  ungroupShape,
  collectShapesToGroup,
  createGroupTransform,
  createGroupShape,
  groupShapes,
} from "./group";

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestShape = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): SpShape =>
  ({
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    properties: {
      transform: {
        x: px(x),
        y: px(y),
        width: px(width),
        height: px(height),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
    },
  }) as SpShape;

const createTestGroup = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  children: Shape[]
): GrpShape => ({
  type: "grpSp",
  nonVisual: { id, name: `Group ${id}` },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(x),
      childOffsetY: px(y),
      childExtentWidth: px(width),
      childExtentHeight: px(height),
    },
  },
  children,
});

// =============================================================================
// getScaleFactor Tests
// =============================================================================

describe("getScaleFactor", () => {
  it("returns correct scale factor for non-zero extent", () => {
    expect(getScaleFactor(100, 200)).toBe(2);
    expect(getScaleFactor(200, 100)).toBe(0.5);
    expect(getScaleFactor(100, 100)).toBe(1);
  });

  it("returns 1 for zero extent (avoids division by zero)", () => {
    expect(getScaleFactor(0, 100)).toBe(1);
    expect(getScaleFactor(0, 0)).toBe(1);
  });
});

// =============================================================================
// transformChildToSlideCoords Tests
// =============================================================================

describe("transformChildToSlideCoords", () => {
  it("transforms child coordinates to slide coordinates with 1:1 mapping", () => {
    const childTransform: Transform = {
      x: px(50),
      y: px(50),
      width: px(100),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    };
    const groupTransform: GroupTransform = {
      x: px(50),
      y: px(50),
      width: px(200),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(50),
      childOffsetY: px(50),
      childExtentWidth: px(200),
      childExtentHeight: px(200),
    };

    const result = transformChildToSlideCoords(childTransform, groupTransform);

    // With 1:1 mapping (childExtent == group size, childOffset == group position)
    // child position relative to group should be preserved
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  it("transforms with scaling when child extent differs from group size", () => {
    const childTransform: Transform = {
      x: px(0),
      y: px(0),
      width: px(50),
      height: px(50),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    };
    const groupTransform: GroupTransform = {
      x: px(100),
      y: px(100),
      width: px(200),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(100), // Half of group width
      childExtentHeight: px(100), // Half of group height
    };

    const result = transformChildToSlideCoords(childTransform, groupTransform);

    // Scale factor is 2 (200/100)
    // Child at (0,0) with offset (0,0) -> scaled position is 0*2 = 0, plus group position 100
    expect(result.x).toBe(100); // 100 + (0 - 0) * 2
    expect(result.y).toBe(100); // 100 + (0 - 0) * 2
    expect(result.width).toBe(100); // 50 * 2
    expect(result.height).toBe(100); // 50 * 2
  });

  it("preserves rotation and flip properties", () => {
    const childTransform: Transform = {
      x: px(10),
      y: px(20),
      width: px(50),
      height: px(50),
      rotation: deg(45),
      flipH: true,
      flipV: false,
    };
    const groupTransform: GroupTransform = {
      x: px(0),
      y: px(0),
      width: px(100),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(100),
      childExtentHeight: px(100),
    };

    const result = transformChildToSlideCoords(childTransform, groupTransform);

    expect(result.rotation).toBe(45);
    expect(result.flipH).toBe(true);
    expect(result.flipV).toBe(false);
  });
});

// =============================================================================
// transformSlideToChildCoords Tests
// =============================================================================

describe("transformSlideToChildCoords", () => {
  it("returns original transform when mapping is 1:1", () => {
    const slideTransform: Transform = {
      x: px(120),
      y: px(80),
      width: px(60),
      height: px(40),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    };
    const groupTransform: GroupTransform = {
      x: px(0),
      y: px(0),
      width: px(200),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(200),
    };

    const result = transformSlideToChildCoords(slideTransform, groupTransform);

    expect(result.x).toBe(120);
    expect(result.y).toBe(80);
    expect(result.width).toBe(60);
    expect(result.height).toBe(40);
  });

  it("inverts scale and offset from slide coordinates", () => {
    const slideTransform: Transform = {
      x: px(150),
      y: px(160),
      width: px(80),
      height: px(40),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    };
    const groupTransform: GroupTransform = {
      x: px(100),
      y: px(100),
      width: px(200),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(200),
    };

    const result = transformSlideToChildCoords(slideTransform, groupTransform);

    expect(result.x).toBe(50);
    expect(result.y).toBe(60);
    expect(result.width).toBe(80);
    expect(result.height).toBe(40);
  });
});

// =============================================================================
// Group Transform Conversion Tests
// =============================================================================

describe("group transform conversion", () => {
  it("round-trips group transforms through slide coordinates", () => {
    const parentTransform: GroupTransform = {
      x: px(100),
      y: px(100),
      width: px(200),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(200),
    };
    const childTransform: GroupTransform = {
      x: px(120),
      y: px(140),
      width: px(80),
      height: px(60),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(20),
      childOffsetY: px(30),
      childExtentWidth: px(80),
      childExtentHeight: px(60),
    };

    const slideTransform = transformGroupToSlideCoords(childTransform, parentTransform);
    const roundTrip = transformGroupToChildCoords(slideTransform, parentTransform);

    expect(roundTrip.x).toBe(120);
    expect(roundTrip.y).toBe(140);
    expect(roundTrip.width).toBe(80);
    expect(roundTrip.height).toBe(60);
    expect(roundTrip.childOffsetX).toBe(20);
    expect(roundTrip.childOffsetY).toBe(30);
    expect(roundTrip.childExtentWidth).toBe(80);
    expect(roundTrip.childExtentHeight).toBe(60);
  });
});

// =============================================================================
// findGroupById Tests
// =============================================================================

describe("findGroupById", () => {
  it("finds group at top level", () => {
    const group = createTestGroup("g1", 0, 0, 100, 100, []);
    const shapes: Shape[] = [
      createTestShape("1", 0, 0, 50, 50),
      group,
      createTestShape("2", 0, 0, 50, 50),
    ];

    const result = findGroupById(shapes, "g1");

    expect(result).toBeDefined();
    expect(result?.group).toBe(group);
    expect(result?.index).toBe(1);
  });

  it("returns undefined when group not found", () => {
    const shapes: Shape[] = [
      createTestShape("1", 0, 0, 50, 50),
      createTestShape("2", 0, 0, 50, 50),
    ];

    const result = findGroupById(shapes, "nonexistent");
    expect(result).toBeUndefined();
  });

  it("returns undefined when ID belongs to non-group shape", () => {
    const shapes: Shape[] = [createTestShape("1", 0, 0, 50, 50)];

    const result = findGroupById(shapes, "1");
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// getTransformedChildren Tests
// =============================================================================

describe("getTransformedChildren", () => {
  it("transforms children with 1:1 coordinate mapping", () => {
    const child = createTestShape("c1", 10, 20, 50, 50);
    const group = createTestGroup("g1", 10, 20, 100, 100, [child]);

    const result = getTransformedChildren(group);

    expect(result.length).toBe(1);
    expect((result[0] as SpShape).properties.transform?.x).toBe(10);
    expect((result[0] as SpShape).properties.transform?.y).toBe(20);
  });

  it("handles shapes without properties", () => {
    const shapeWithoutProps = { type: "contentPart" } as unknown as Shape;
    const group = createTestGroup("g1", 0, 0, 100, 100, [shapeWithoutProps]);

    const result = getTransformedChildren(group);

    expect(result.length).toBe(1);
    expect(result[0]).toBe(shapeWithoutProps);
  });

  it("handles group without transform", () => {
    const child = createTestShape("c1", 10, 20, 50, 50);
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "g1", name: "Group g1" },
      properties: {},
      children: [child],
    };

    const result = getTransformedChildren(group);

    expect(result.length).toBe(1);
    // Child should be returned as-is when group has no transform
    expect(result[0]).toBe(child);
  });
});

// =============================================================================
// extractChildIds Tests
// =============================================================================

describe("extractChildIds", () => {
  it("extracts IDs from shapes with nonVisual", () => {
    const children: Shape[] = [
      createTestShape("1", 0, 0, 50, 50),
      createTestShape("2", 0, 0, 50, 50),
    ];

    const ids = extractChildIds(children);

    expect(ids).toEqual(["1", "2"]);
  });

  it("skips shapes without nonVisual", () => {
    const children: Shape[] = [
      createTestShape("1", 0, 0, 50, 50),
      { type: "contentPart" } as unknown as Shape,
    ];

    const ids = extractChildIds(children);

    expect(ids).toEqual(["1"]);
  });

  it("returns empty array for empty children", () => {
    const ids = extractChildIds([]);
    expect(ids).toEqual([]);
  });
});

// =============================================================================
// ungroupShape Tests
// =============================================================================

describe("ungroupShape", () => {
  it("returns undefined when group not found", () => {
    const shapes: Shape[] = [createTestShape("1", 0, 0, 50, 50)];

    const result = ungroupShape(shapes, "nonexistent");
    expect(result).toBeUndefined();
  });

  it("ungroups and transforms children to slide coordinates", () => {
    const child1 = createTestShape("c1", 10, 10, 40, 40);
    const child2 = createTestShape("c2", 60, 60, 40, 40);
    const group = createTestGroup("g1", 10, 10, 100, 100, [child1, child2]);
    const shapes: Shape[] = [createTestShape("1", 0, 0, 50, 50), group];

    const result = ungroupShape(shapes, "g1");

    expect(result).toBeDefined();
    expect(result?.newShapes.length).toBe(3); // 1 existing + 2 children
    expect(result?.childIds).toEqual(["c1", "c2"]);
  });

  it("preserves other shapes in array", () => {
    const child = createTestShape("c1", 10, 10, 40, 40);
    const group = createTestGroup("g1", 10, 10, 100, 100, [child]);
    const beforeShape = createTestShape("before", 0, 0, 50, 50);
    const afterShape = createTestShape("after", 200, 200, 50, 50);
    const shapes: Shape[] = [beforeShape, group, afterShape];

    const result = ungroupShape(shapes, "g1");

    expect(result).toBeDefined();
    expect(result?.newShapes[0]).toBe(beforeShape);
    expect(result?.newShapes[result.newShapes.length - 1]).toBe(afterShape);
  });
});

// =============================================================================
// collectShapesToGroup Tests
// =============================================================================

describe("collectShapesToGroup", () => {
  it("collects shapes matching IDs", () => {
    const shape1 = createTestShape("1", 0, 0, 50, 50);
    const shape2 = createTestShape("2", 100, 100, 50, 50);
    const shape3 = createTestShape("3", 200, 200, 50, 50);
    const shapes: Shape[] = [shape1, shape2, shape3];

    const result = collectShapesToGroup(shapes, ["1", "3"]);

    expect(result.shapes).toEqual([shape1, shape3]);
    expect(result.indices).toEqual([0, 2]);
  });

  it("skips IDs that do not exist", () => {
    const shape1 = createTestShape("1", 0, 0, 50, 50);
    const shapes: Shape[] = [shape1];

    const result = collectShapesToGroup(shapes, ["1", "nonexistent"]);

    expect(result.shapes).toEqual([shape1]);
    expect(result.indices).toEqual([0]);
  });

  it("returns empty for no matching IDs", () => {
    const shapes: Shape[] = [createTestShape("1", 0, 0, 50, 50)];

    const result = collectShapesToGroup(shapes, ["nonexistent"]);

    expect(result.shapes).toEqual([]);
    expect(result.indices).toEqual([]);
  });
});

// =============================================================================
// createGroupTransform Tests
// =============================================================================

describe("createGroupTransform", () => {
  it("creates group transform from bounds", () => {
    const bounds = {
      x: px(10),
      y: px(20),
      width: px(100),
      height: px(50),
    };

    const transform = createGroupTransform(bounds);

    expect(transform.x).toBe(10);
    expect(transform.y).toBe(20);
    expect(transform.width).toBe(100);
    expect(transform.height).toBe(50);
    expect(transform.rotation).toBe(0);
    expect(transform.flipH).toBe(false);
    expect(transform.flipV).toBe(false);
    // Child offset/extent should match group position/size for 1:1 mapping
    expect(transform.childOffsetX).toBe(10);
    expect(transform.childOffsetY).toBe(20);
    expect(transform.childExtentWidth).toBe(100);
    expect(transform.childExtentHeight).toBe(50);
  });
});

// =============================================================================
// createGroupShape Tests
// =============================================================================

describe("createGroupShape", () => {
  it("creates group shape with correct structure", () => {
    const transform = createGroupTransform({
      x: px(10),
      y: px(20),
      width: px(100),
      height: px(50),
    });
    const children = [createTestShape("1", 10, 20, 40, 30)];

    const group = createGroupShape("g1", transform, children);

    expect(group.type).toBe("grpSp");
    expect(group.nonVisual.id).toBe("g1");
    expect(group.nonVisual.name).toBe("Group g1");
    expect(group.properties.transform).toBe(transform);
    expect(group.children).toBe(children);
  });
});

// =============================================================================
// groupShapes Tests
// =============================================================================

describe("groupShapes", () => {
  it("returns undefined for less than 2 shape IDs", () => {
    const shapes: Shape[] = [createTestShape("1", 0, 0, 50, 50)];

    expect(groupShapes(shapes, [])).toBeUndefined();
    expect(groupShapes(shapes, ["1"])).toBeUndefined();
  });

  it("returns undefined when less than 2 shapes found", () => {
    const shapes: Shape[] = [createTestShape("1", 0, 0, 50, 50)];

    const result = groupShapes(shapes, ["1", "nonexistent"]);
    expect(result).toBeUndefined();
  });

  it("groups shapes and returns new shapes array with group", () => {
    const shape1 = createTestShape("1", 0, 0, 50, 50);
    const shape2 = createTestShape("2", 100, 100, 50, 50);
    const shape3 = createTestShape("3", 200, 200, 50, 50);
    const shapes: Shape[] = [shape1, shape2, shape3];

    const result = groupShapes(shapes, ["1", "2"]);

    expect(result).toBeDefined();
    expect(result?.newShapes.length).toBe(2); // group + shape3
    expect(result?.groupId).toBeDefined();

    // Find the group in new shapes
    const group = result?.newShapes.find((s) => s.type === "grpSp") as
      | GrpShape
      | undefined;
    expect(group).toBeDefined();
    expect(group?.children.length).toBe(2);
  });

  it("places group at first selected shape position", () => {
    const shape1 = createTestShape("1", 0, 0, 50, 50);
    const shape2 = createTestShape("2", 100, 100, 50, 50);
    const shape3 = createTestShape("3", 200, 200, 50, 50);
    const shapes: Shape[] = [shape1, shape2, shape3];

    const result = groupShapes(shapes, ["2", "3"]);

    expect(result).toBeDefined();
    // shape1 should still be at index 0, group should be at index 1
    expect(result?.newShapes[0]).toBe(shape1);
    expect(result?.newShapes[1].type).toBe("grpSp");
  });

  it("calculates correct combined bounds for group", () => {
    const shape1 = createTestShape("1", 10, 20, 50, 50); // x: 10-60, y: 20-70
    const shape2 = createTestShape("2", 100, 100, 40, 30); // x: 100-140, y: 100-130
    const shapes: Shape[] = [shape1, shape2];

    const result = groupShapes(shapes, ["1", "2"]);

    expect(result).toBeDefined();
    const group = result?.newShapes.find((s) => s.type === "grpSp") as
      | GrpShape
      | undefined;
    expect(group?.properties.transform?.x).toBe(10); // minX
    expect(group?.properties.transform?.y).toBe(20); // minY
    expect(group?.properties.transform?.width).toBe(130); // 140 - 10
    expect(group?.properties.transform?.height).toBe(110); // 130 - 20
  });
});
