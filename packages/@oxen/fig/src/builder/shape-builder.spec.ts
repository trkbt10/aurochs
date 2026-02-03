/**
 * @file Shape builder unit tests
 */

import {
  ellipseNode,
  lineNode,
  starNode,
  polygonNode,
  vectorNode,
  roundedRectNode,
} from "./shape-builder";
import { SHAPE_NODE_TYPES } from "../constants";

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
});

describe("LineNodeBuilder", () => {
  it("creates basic line with defaults", () => {
    const result = lineNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.LINE);
    expect(result.name).toBe("Line");
    expect(result.fillPaints).toHaveLength(0); // lines have no fill by default
    expect(result.strokePaints).toHaveLength(1);
    expect(result.strokeWeight).toBe(1);
  });

  it("creates line with custom length and stroke", () => {
    const result = lineNode(2, 1)
      .name("Divider")
      .length(200)
      .position(50, 100)
      .stroke({ r: 0.5, g: 0.5, b: 0.5, a: 1 })
      .strokeWeight(2)
      .dashPattern([5, 3])
      .build();

    expect(result.name).toBe("Divider");
    expect(result.size.x).toBe(200);
    expect(result.size.y).toBe(0); // lines have 0 height
    expect(result.strokeWeight).toBe(2);
    expect(result.dashPattern).toEqual([5, 3]);
  });

  it("creates line with arrow caps", () => {
    const result = lineNode(3, 1)
      .strokeCap("ARROW_EQUILATERAL")
      .build();

    expect(result.strokeCap).toEqual({ value: 4, name: "ARROW_EQUILATERAL" });
  });
});

describe("StarNodeBuilder", () => {
  it("creates basic 5-point star with defaults", () => {
    const result = starNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.STAR);
    expect(result.name).toBe("Star");
    expect(result.pointCount).toBe(5);
    expect(result.starInnerRadius).toBeCloseTo(0.382); // golden ratio
    expect(result.fillPaints).toHaveLength(1);
  });

  it("creates 8-point star with custom inner radius", () => {
    const result = starNode(2, 1)
      .name("8-Point Star")
      .points(8)
      .innerRadius(0.4)
      .size(120, 120)
      .fill({ r: 1, g: 1, b: 0, a: 1 }) // yellow
      .build();

    expect(result.name).toBe("8-Point Star");
    expect(result.pointCount).toBe(8);
    expect(result.starInnerRadius).toBe(0.4);
    expect(result.size).toEqual({ x: 120, y: 120 });
  });

  it("clamps point count to minimum 3", () => {
    const result = starNode(3, 1).points(1).build();
    expect(result.pointCount).toBe(3);
  });

  it("clamps inner radius to 0-1 range", () => {
    const result1 = starNode(4, 1).innerRadius(-0.5).build();
    expect(result1.starInnerRadius).toBe(0);

    const result2 = starNode(5, 1).innerRadius(1.5).build();
    expect(result2.starInnerRadius).toBe(1);
  });
});

describe("PolygonNodeBuilder", () => {
  it("creates hexagon with defaults", () => {
    const result = polygonNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.REGULAR_POLYGON);
    expect(result.name).toBe("Polygon");
    expect(result.pointCount).toBe(6); // default hexagon
    expect(result.fillPaints).toHaveLength(1);
  });

  it("creates triangle", () => {
    const result = polygonNode(2, 1)
      .name("Triangle")
      .sides(3)
      .size(100, 87) // equilateral proportions
      .build();

    expect(result.name).toBe("Triangle");
    expect(result.pointCount).toBe(3);
  });

  it("creates octagon with stroke", () => {
    const result = polygonNode(3, 1)
      .sides(8)
      .stroke({ r: 0, g: 0, b: 0, a: 1 })
      .strokeWeight(2)
      .strokeJoin("BEVEL")
      .build();

    expect(result.pointCount).toBe(8);
    expect(result.strokePaints).toHaveLength(1);
    expect(result.strokeJoin).toEqual({ value: 1, name: "BEVEL" });
  });
});

describe("VectorNodeBuilder", () => {
  it("creates basic vector with defaults", () => {
    const result = vectorNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.VECTOR);
    expect(result.name).toBe("Vector");
    expect(result.handleMirroring).toEqual({ value: 0, name: "NONZERO" });
    expect(result.vectorData).toBeUndefined();
  });

  it("creates vector with EVENODD winding rule", () => {
    const result = vectorNode(2, 1)
      .name("Custom Path")
      .windingRule("EVENODD")
      .build();

    expect(result.handleMirroring).toEqual({ value: 1, name: "EVENODD" });
  });

  it("creates vector with blob reference", () => {
    const result = vectorNode(3, 1)
      .size(200, 150)
      .vectorNetworkBlob(42)
      .build();

    expect(result.vectorData).toBeDefined();
    expect(result.vectorData!.vectorNetworkBlob).toBe(42);
    expect(result.vectorData!.normalizedSize).toEqual({ x: 200, y: 150 });
  });
});

describe("RoundedRectangleNodeBuilder", () => {
  it("creates basic rectangle with defaults", () => {
    const result = roundedRectNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.ROUNDED_RECTANGLE);
    expect(result.name).toBe("Rectangle");
    expect(result.cornerRadius).toBeUndefined();
    expect(result.rectangleCornerRadii).toBeUndefined();
  });

  it("creates rectangle with uniform corner radius", () => {
    const result = roundedRectNode(2, 1)
      .name("Rounded Rect")
      .cornerRadius(8)
      .size(100, 50)
      .build();

    expect(result.cornerRadius).toBe(8);
    expect(result.rectangleCornerRadii).toBeUndefined();
  });

  it("creates rectangle with individual corner radii", () => {
    const result = roundedRectNode(3, 1)
      .corners([4, 8, 12, 16])
      .build();

    expect(result.cornerRadius).toBeUndefined();
    expect(result.rectangleCornerRadii).toEqual([4, 8, 12, 16]);
  });

  it("individual corners override uniform radius", () => {
    const result = roundedRectNode(4, 1)
      .cornerRadius(8)
      .corners([0, 8, 0, 8])
      .build();

    expect(result.cornerRadius).toBeUndefined();
    expect(result.rectangleCornerRadii).toEqual([0, 8, 0, 8]);
  });
});

describe("Shape builder common features", () => {
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

  it("applies visibility and opacity", () => {
    const result = starNode(1, 0).visible(false).opacity(0.5).build();

    expect(result.visible).toBe(false);
    expect(result.opacity).toBe(0.5);
  });

  it("applies stroke align", () => {
    const result = polygonNode(1, 0)
      .stroke({ r: 0, g: 0, b: 0, a: 1 })
      .strokeWeight(4)
      .strokeAlign("OUTSIDE")
      .build();

    expect(result.strokeAlign).toEqual({ value: 2, name: "OUTSIDE" });
  });
});
