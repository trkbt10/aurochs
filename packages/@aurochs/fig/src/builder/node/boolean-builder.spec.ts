/**
 * @file Boolean operation node builder unit tests
 */

import { booleanNode, BOOLEAN_OPERATION_TYPE_VALUES } from "./boolean-builder";

describe("BooleanOperationNodeBuilder", () => {
  it("creates basic boolean with defaults", () => {
    const result = booleanNode(1, 0).build();

    expect(result.localID).toBe(1);
    expect(result.parentID).toBe(0);
    expect(result.name).toBe("Boolean");
    expect(result.booleanOperation).toEqual({ value: 0, name: "UNION" });
    expect(result.visible).toBe(true);
    expect(result.opacity).toBe(1);
  });

  it("creates UNION boolean", () => {
    const result = booleanNode(1, 0).union().build();

    expect(result.booleanOperation.name).toBe("UNION");
    expect(result.booleanOperation.value).toBe(BOOLEAN_OPERATION_TYPE_VALUES.UNION);
  });

  it("creates SUBTRACT boolean", () => {
    const result = booleanNode(1, 0).subtract().build();

    expect(result.booleanOperation.name).toBe("SUBTRACT");
    expect(result.booleanOperation.value).toBe(BOOLEAN_OPERATION_TYPE_VALUES.SUBTRACT);
  });

  it("creates INTERSECT boolean", () => {
    const result = booleanNode(1, 0).intersect().build();

    expect(result.booleanOperation.name).toBe("INTERSECT");
    expect(result.booleanOperation.value).toBe(BOOLEAN_OPERATION_TYPE_VALUES.INTERSECT);
  });

  it("creates EXCLUDE boolean", () => {
    const result = booleanNode(1, 0).exclude().build();

    expect(result.booleanOperation.name).toBe("EXCLUDE");
    expect(result.booleanOperation.value).toBe(BOOLEAN_OPERATION_TYPE_VALUES.EXCLUDE);
  });

  it("creates boolean with fill", () => {
    const result = booleanNode(1, 0)
      .name("Filled Boolean")
      .fill({ r: 1, g: 0, b: 0, a: 1 })
      .build();

    expect(result.name).toBe("Filled Boolean");
    expect(result.fillPaints).toHaveLength(1);
    expect(result.fillPaints![0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });
});
