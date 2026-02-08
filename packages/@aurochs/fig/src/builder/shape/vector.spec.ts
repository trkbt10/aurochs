/**
 * @file Vector node builder unit tests
 */

import { vectorNode } from "./vector";
import { SHAPE_NODE_TYPES } from "../../constants";

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
