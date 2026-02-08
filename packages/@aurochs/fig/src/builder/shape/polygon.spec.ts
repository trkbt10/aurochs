/**
 * @file Polygon node builder unit tests
 */

import { polygonNode } from "./polygon";
import { SHAPE_NODE_TYPES } from "../../constants";

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

  it("applies stroke align", () => {
    const result = polygonNode(1, 0)
      .stroke({ r: 0, g: 0, b: 0, a: 1 })
      .strokeWeight(4)
      .strokeAlign("OUTSIDE")
      .build();

    expect(result.strokeAlign).toEqual({ value: 2, name: "OUTSIDE" });
  });
});
