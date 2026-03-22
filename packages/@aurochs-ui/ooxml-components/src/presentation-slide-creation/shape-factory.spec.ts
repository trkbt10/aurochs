/**
 * @file Shape factory tests
 *
 * Tests for shared shape factory functions.
 */

import type { SpShape } from "@aurochs-office/pptx/domain";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import {
  generateShapeId,
  resetShapeCounter,
  createSpShape,
  createTextBox,
  createConnector,
  createPicShape,
  createBoundsFromDrag,
  getDefaultBoundsForMode,
  createShapeFromMode,
  type ShapeBounds,
} from "./shape-factory";

beforeEach(() => {
  resetShapeCounter();
});

const BOUNDS: ShapeBounds = { x: px(10), y: px(20), width: px(200), height: px(100) };

describe("generateShapeId", () => {
  it("generates unique IDs", () => {
    const a = generateShapeId();
    const b = generateShapeId();
    expect(a).not.toBe(b);
  });

  it("resets counter", () => {
    generateShapeId();
    resetShapeCounter();
    const id = generateShapeId();
    expect(id).toMatch(/^shape-\d+-1$/);
  });
});

describe("createSpShape", () => {
  it("creates shape with correct type and bounds", () => {
    const shape = createSpShape("s1" as ShapeId, BOUNDS, "rect");
    expect(shape.type).toBe("sp");
    expect(shape.properties.transform!.x).toBe(BOUNDS.x);
    expect(shape.properties.transform!.width).toBe(BOUNDS.width);
    expect(shape.properties.geometry?.type).toBe("preset");
    if (shape.properties.geometry?.type === "preset") {
      expect(shape.properties.geometry.preset).toBe("rect");
    }
  });

  it("has fill and line", () => {
    const shape = createSpShape("s1" as ShapeId, BOUNDS, "ellipse");
    expect(shape.properties.fill?.type).toBe("solidFill");
    expect(shape.properties.line).toBeDefined();
  });
});

describe("createTextBox", () => {
  it("creates textbox with textBox flag and empty textBody", () => {
    const shape = createTextBox("tb" as ShapeId, BOUNDS);
    expect(shape.type).toBe("sp");
    expect(shape.nonVisual.textBox).toBe(true);
    expect(shape.properties.fill?.type).toBe("noFill");
    expect(shape.textBody).toBeDefined();
    expect(shape.textBody!.paragraphs).toHaveLength(1);
  });
});

describe("createConnector", () => {
  it("creates connector with correct type", () => {
    const shape = createConnector("c1" as ShapeId, BOUNDS);
    expect(shape.type).toBe("cxnSp");
    expect(shape.properties.geometry?.type).toBe("preset");
    if (shape.properties.geometry?.type === "preset") {
      expect(shape.properties.geometry.preset).toBe("straightConnector1");
    }
  });
});

describe("createPicShape", () => {
  it("creates picture with dataUrl", () => {
    const shape = createPicShape("p1" as ShapeId, BOUNDS, "data:image/png;base64,abc");
    expect(shape.type).toBe("pic");
    expect(shape.blipFill.resourceId).toBe("data:image/png;base64,abc");
  });
});

describe("createBoundsFromDrag", () => {
  it("normalizes start/end ordering", () => {
    const bounds = createBoundsFromDrag({
      startX: px(300), startY: px(400),
      endX: px(100), endY: px(200),
    });
    expect(bounds.x as number).toBe(100);
    expect(bounds.y as number).toBe(200);
    expect(bounds.width as number).toBe(200);
    expect(bounds.height as number).toBe(200);
  });

  it("enforces minimum 10px", () => {
    const bounds = createBoundsFromDrag({
      startX: px(50), startY: px(50),
      endX: px(51), endY: px(52),
    });
    expect(bounds.width as number).toBe(10);
    expect(bounds.height as number).toBe(10);
  });
});

describe("getDefaultBoundsForMode", () => {
  it("returns centered bounds for shape mode", () => {
    const bounds = getDefaultBoundsForMode({ type: "shape", preset: "rect" }, px(500), px(300));
    expect(bounds.x as number).toBe(500 - 75); // default 150 width / 2
    expect(bounds.y as number).toBe(300 - 50); // default 100 height / 2
  });

  it("returns different dimensions for textbox", () => {
    const bounds = getDefaultBoundsForMode({ type: "textbox" }, px(500), px(300));
    expect(bounds.width as number).toBe(200);
    expect(bounds.height as number).toBe(40);
  });

  it("returns different dimensions for connector", () => {
    const bounds = getDefaultBoundsForMode({ type: "connector" }, px(500), px(300));
    expect(bounds.width as number).toBe(100);
    expect(bounds.height as number).toBe(0);
  });
});

describe("createShapeFromMode", () => {
  it("creates sp shape for shape mode", () => {
    const shape = createShapeFromMode({ type: "shape", preset: "triangle" }, BOUNDS);
    expect(shape).toBeDefined();
    expect(shape!.type).toBe("sp");
  });

  it("creates textbox for textbox mode", () => {
    const shape = createShapeFromMode({ type: "textbox" }, BOUNDS);
    expect(shape).toBeDefined();
    expect((shape as SpShape).nonVisual.textBox).toBe(true);
  });

  it("creates connector for connector mode", () => {
    const shape = createShapeFromMode({ type: "connector" }, BOUNDS);
    expect(shape).toBeDefined();
    expect(shape!.type).toBe("cxnSp");
  });

  it("returns undefined for select mode", () => {
    expect(createShapeFromMode({ type: "select" }, BOUNDS)).toBeUndefined();
  });

  it("returns undefined for picture mode", () => {
    expect(createShapeFromMode({ type: "picture" }, BOUNDS)).toBeUndefined();
  });

  it("returns undefined for pen mode", () => {
    expect(createShapeFromMode({ type: "pen" }, BOUNDS)).toBeUndefined();
  });

  it("returns undefined for table mode (handled by pptx-editor)", () => {
    expect(createShapeFromMode({ type: "table", rows: 2, cols: 3 }, BOUNDS)).toBeUndefined();
  });

  it("returns undefined for chart mode (handled by pptx-editor)", () => {
    expect(createShapeFromMode({ type: "chart", chartType: "bar" }, BOUNDS)).toBeUndefined();
  });

  it("each created shape gets a unique ID", () => {
    const a = createShapeFromMode({ type: "shape", preset: "rect" }, BOUNDS)!;
    const b = createShapeFromMode({ type: "shape", preset: "rect" }, BOUNDS)!;
    expect(a.type !== "contentPart" && a.nonVisual.id).not.toBe(b.type !== "contentPart" && b.nonVisual.id);
  });
});
