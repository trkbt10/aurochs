/**
 * @file Shape transform utilities tests
 */
import { px, deg } from "@oxen/ooxml/domain/units";
import type { SpShape, GraphicFrame, GrpShape, CxnShape, ContentPartShape } from "@oxen/pptx/domain/shape";
import { getShapeTransform } from "@oxen/pptx-render/svg";
import { withUpdatedTransform, hasEditableTransform } from "./transform";

// =============================================================================
// Test Fixtures
// =============================================================================

const createSpShape = (x: number, y: number, width: number, height: number): SpShape => ({
  type: "sp",
  nonVisual: { id: "sp1", name: "Test Shape" },
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
});

const createGraphicFrame = (x: number, y: number, width: number, height: number): GraphicFrame => ({
  type: "graphicFrame",
  nonVisual: { id: "gf1", name: "Test Table" },
  transform: {
    x: px(x),
    y: px(y),
    width: px(width),
    height: px(height),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  },
  content: {
    type: "table",
    data: {
      table: {
        grid: { columns: [] },
        rows: [],
        properties: {},
      },
    },
  },
});

const createGrpShape = (x: number, y: number): GrpShape => ({
  type: "grpSp",
  nonVisual: { id: "grp1", name: "Test Group" },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(100),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(100),
      childExtentHeight: px(100),
    },
  },
  children: [],
});

const createCxnShape = (x: number, y: number): CxnShape => ({
  type: "cxnSp",
  nonVisual: { id: "cxn1", name: "Test Connector" },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(100),
      height: px(0),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
  },
});

const createContentPart = (): ContentPartShape => ({
  type: "contentPart",
  contentPart: {
    id: "rId1",
  },
});

// =============================================================================
// Tests
// =============================================================================

describe("getShapeTransform", () => {
  it("returns transform from SpShape", () => {
    const shape = createSpShape(10, 20, 100, 50);
    const transform = getShapeTransform(shape);
    expect(transform?.x).toBe(10);
    expect(transform?.y).toBe(20);
    expect(transform?.width).toBe(100);
    expect(transform?.height).toBe(50);
  });

  it("returns transform from GraphicFrame", () => {
    const shape = createGraphicFrame(30, 40, 200, 150);
    const transform = getShapeTransform(shape);
    expect(transform?.x).toBe(30);
    expect(transform?.y).toBe(40);
    expect(transform?.width).toBe(200);
    expect(transform?.height).toBe(150);
  });

  it("returns transform from GrpShape", () => {
    const shape = createGrpShape(50, 60);
    const transform = getShapeTransform(shape);
    expect(transform?.x).toBe(50);
    expect(transform?.y).toBe(60);
  });

  it("returns transform from CxnShape", () => {
    const shape = createCxnShape(70, 80);
    const transform = getShapeTransform(shape);
    expect(transform?.x).toBe(70);
    expect(transform?.y).toBe(80);
  });
});

describe("withUpdatedTransform", () => {
  it("updates SpShape transform", () => {
    const shape = createSpShape(10, 20, 100, 50);
    const updated = withUpdatedTransform(shape, { x: px(100), y: px(200) });

    expect(updated.type).toBe("sp");
    const transform = getShapeTransform(updated);
    expect(transform?.x).toBe(100);
    expect(transform?.y).toBe(200);
    expect(transform?.width).toBe(100); // Unchanged
    expect(transform?.height).toBe(50); // Unchanged
  });

  it("updates GraphicFrame transform directly", () => {
    const shape = createGraphicFrame(30, 40, 200, 150);
    const updated = withUpdatedTransform(shape, { width: px(300), height: px(250) });

    expect(updated.type).toBe("graphicFrame");
    const transform = getShapeTransform(updated);
    expect(transform?.x).toBe(30); // Unchanged
    expect(transform?.y).toBe(40); // Unchanged
    expect(transform?.width).toBe(300);
    expect(transform?.height).toBe(250);
  });

  it("updates GrpShape transform", () => {
    const shape = createGrpShape(50, 60);
    const updated = withUpdatedTransform(shape, { rotation: deg(45) });

    expect(updated.type).toBe("grpSp");
    const transform = getShapeTransform(updated);
    expect(transform?.rotation).toBe(45);
  });

  it("updates CxnShape transform", () => {
    const shape = createCxnShape(70, 80);
    const updated = withUpdatedTransform(shape, { x: px(150) });

    expect(updated.type).toBe("cxnSp");
    const transform = getShapeTransform(updated);
    expect(transform?.x).toBe(150);
    expect(transform?.y).toBe(80); // Unchanged
  });

  it("returns contentPart unchanged", () => {
    const shape = createContentPart();
    const updated = withUpdatedTransform(shape, { x: px(100) });

    expect(updated).toBe(shape); // Same reference
  });

  it("does not mutate original shape", () => {
    const shape = createSpShape(10, 20, 100, 50);
    withUpdatedTransform(shape, { x: px(999) });

    // Original should be unchanged
    expect(getShapeTransform(shape)?.x).toBe(10);
  });
});

describe("hasEditableTransform", () => {
  it("returns true for SpShape with transform", () => {
    const shape = createSpShape(10, 20, 100, 50);
    expect(hasEditableTransform(shape)).toBe(true);
  });

  it("returns true for GraphicFrame", () => {
    const shape = createGraphicFrame(30, 40, 200, 150);
    expect(hasEditableTransform(shape)).toBe(true);
  });

  it("returns true for GrpShape with transform", () => {
    const shape = createGrpShape(50, 60);
    expect(hasEditableTransform(shape)).toBe(true);
  });

  it("returns true for CxnShape with transform", () => {
    const shape = createCxnShape(70, 80);
    expect(hasEditableTransform(shape)).toBe(true);
  });

  it("returns false for ContentPart", () => {
    const shape = createContentPart();
    expect(hasEditableTransform(shape)).toBe(false);
  });

  it("returns false for SpShape without transform", () => {
    const shape: SpShape = {
      type: "sp",
      nonVisual: { id: "sp1", name: "No Transform" },
      properties: {},
    };
    expect(hasEditableTransform(shape)).toBe(false);
  });
});
