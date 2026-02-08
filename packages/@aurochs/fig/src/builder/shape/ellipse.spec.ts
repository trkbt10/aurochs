/**
 * @file Ellipse node builder unit tests
 */

import { ellipseNode } from "./ellipse";
import { dropShadow } from "../effect/drop-shadow";
import { SHAPE_NODE_TYPES } from "../../constants";

describe("EllipseNodeBuilder", () => {
  it("creates basic ellipse with defaults", () => {
    const result = ellipseNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.ELLIPSE);
    expect(result.localID).toBe(1);
    expect(result.parentID).toBe(0);
    expect(result.name).toBe("Ellipse");
    expect(result.size).toEqual({ x: 100, y: 100 });
    expect(result.fillPaints).toHaveLength(1);
    expect(result.visible).toBe(true);
    expect(result.opacity).toBe(1);
    expect(result.arcData).toBeUndefined();
  });

  it("creates circle with custom size", () => {
    const result = ellipseNode(2, 1)
      .name("Circle")
      .size(80, 80)
      .position(10, 20)
      .fill({ r: 1, g: 0, b: 0, a: 1 }) // red
      .build();

    expect(result.name).toBe("Circle");
    expect(result.size).toEqual({ x: 80, y: 80 });
    expect(result.transform.m02).toBe(10);
    expect(result.transform.m12).toBe(20);
    expect(result.fillPaints[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("creates ellipse with arc", () => {
    const result = ellipseNode(3, 1)
      .arc(0, 180) // semicircle
      .build();

    expect(result.arcData).toBeDefined();
    expect(result.arcData!.startingAngle).toBeCloseTo(0);
    expect(result.arcData!.endingAngle).toBeCloseTo(Math.PI);
    expect(result.arcData!.innerRadius).toBe(0);
  });

  it("creates donut shape with inner radius", () => {
    const result = ellipseNode(4, 1).innerRadius(0.5).build();

    expect(result.arcData).toBeDefined();
    expect(result.arcData!.innerRadius).toBe(0.5);
  });

  it("creates ellipse with stroke", () => {
    const result = ellipseNode(5, 1)
      .noFill()
      .stroke({ r: 0, g: 0, b: 1, a: 1 }) // blue
      .strokeWeight(2)
      .strokeCap("ROUND")
      .build();

    expect(result.fillPaints).toHaveLength(0);
    expect(result.strokePaints).toHaveLength(1);
    expect(result.strokePaints![0].color).toEqual({ r: 0, g: 0, b: 1, a: 1 });
    expect(result.strokeWeight).toBe(2);
    expect(result.strokeCap).toEqual({ value: 1, name: "ROUND" });
  });

  it("applies rotation transform", () => {
    const result = ellipseNode(1, 0).rotation(45).build();

    const rad = (45 * Math.PI) / 180;
    expect(result.transform.m00).toBeCloseTo(Math.cos(rad));
    expect(result.transform.m01).toBeCloseTo(-Math.sin(rad));
    expect(result.transform.m10).toBeCloseTo(Math.sin(rad));
    expect(result.transform.m11).toBeCloseTo(Math.cos(rad));
  });

  it("applies child constraints", () => {
    const result = ellipseNode(1, 0)
      .positioning("ABSOLUTE")
      .primarySizing("FILL")
      .counterSizing("FIXED")
      .horizontalConstraint("STRETCH")
      .verticalConstraint("CENTER")
      .build();

    expect(result.stackPositioning).toEqual({ value: 1, name: "ABSOLUTE" });
    expect(result.stackPrimarySizing).toEqual({ value: 1, name: "FILL" });
    expect(result.stackCounterSizing).toEqual({ value: 0, name: "FIXED" });
    expect(result.horizontalConstraint).toEqual({ value: 3, name: "STRETCH" });
    expect(result.verticalConstraint).toEqual({ value: 1, name: "CENTER" });
  });

  it("applies effects", () => {
    const shadow = dropShadow()
      .color({ r: 0, g: 0, b: 0, a: 0.5 })
      .offset(4, 4)
      .blur(8)
      .build();

    const result = ellipseNode(1, 0).effects([shadow]).build();

    expect(result.effects).toBeDefined();
    expect(result.effects).toHaveLength(1);
    expect(result.effects![0].type.name).toBe("DROP_SHADOW");
    expect((result.effects![0] as typeof shadow).offset).toEqual({ x: 4, y: 4 });
    expect((result.effects![0] as typeof shadow).radius).toBe(8);
  });
});
