/**
 * @file Unit tests for InstanceNodeBuilder
 */

import { instanceNode, InstanceNodeBuilder } from "./instance";

describe("InstanceNodeBuilder", () => {
  it("creates basic instance with number symbolID", () => {
    const node = instanceNode(2, 0, 1).build();

    expect(node.localID).toBe(2);
    expect(node.parentID).toBe(0);
    expect(node.name).toBe("Instance");
    expect(node.symbolID).toEqual({ sessionID: 1, localID: 1 });
    expect(node.size).toEqual({ x: 100, y: 100 });
    expect(node.visible).toBe(true);
    expect(node.opacity).toBe(1);
  });

  it("creates instance with full GUID symbolID", () => {
    const node = instanceNode(2, 0, { sessionID: 5, localID: 10 }).build();

    expect(node.symbolID).toEqual({ sessionID: 5, localID: 10 });
  });

  it("sets basic instance properties", () => {
    const node = instanceNode(2, 0, 1)
      .name("Button Instance")
      .size(120, 40)
      .position(100, 200)
      .visible(true)
      .opacity(0.8)
      .build();

    expect(node.name).toBe("Button Instance");
    expect(node.size).toEqual({ x: 120, y: 40 });
    expect(node.transform.m02).toBe(100);
    expect(node.transform.m12).toBe(200);
    expect(node.visible).toBe(true);
    expect(node.opacity).toBe(0.8);
  });

  describe("Overrides", () => {
    it("overrides background color", () => {
      const node = instanceNode(2, 0, 1)
        .overrideBackground({ r: 1, g: 0, b: 0, a: 1 })
        .build();

      expect(node.fillPaints).toBeDefined();
      expect(node.fillPaints).toHaveLength(1);
      expect(node.fillPaints![0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });

    it("does not include fillPaints when no override", () => {
      const node = instanceNode(2, 0, 1).build();

      expect(node.fillPaints).toBeUndefined();
    });

    it("adds component property references", () => {
      const node = instanceNode(2, 0, 1)
        .addPropertyReference("text#label")
        .addPropertyReference("color#background")
        .build();

      expect(node.componentPropertyReferences).toEqual([
        "text#label",
        "color#background",
      ]);
    });

    it("does not include componentPropertyReferences when empty", () => {
      const node = instanceNode(2, 0, 1).build();

      expect(node.componentPropertyReferences).toBeUndefined();
    });
  });

  describe("Child Constraints", () => {
    it("sets positioning", () => {
      const node = instanceNode(2, 0, 1)
        .positioning("AUTO")
        .build();

      expect(node.stackPositioning).toEqual({ value: 0, name: "AUTO" });
    });

    it("sets sizing", () => {
      const node = instanceNode(2, 0, 1)
        .primarySizing("FILL")
        .counterSizing("FIXED")
        .build();

      expect(node.stackPrimarySizing).toEqual({ value: 1, name: "FILL" });
      expect(node.stackCounterSizing).toEqual({ value: 0, name: "FIXED" });
    });

    it("sets constraints", () => {
      const node = instanceNode(2, 0, 1)
        .horizontalConstraint("STRETCH")
        .verticalConstraint("CENTER")
        .build();

      expect(node.horizontalConstraint).toEqual({ value: 3, name: "STRETCH" });
      expect(node.verticalConstraint).toEqual({ value: 1, name: "CENTER" });
    });

    it("sets absolute positioning", () => {
      const node = instanceNode(2, 0, 1)
        .positioning("ABSOLUTE")
        .horizontalConstraint("MIN")
        .verticalConstraint("MAX")
        .build();

      expect(node.stackPositioning).toEqual({ value: 1, name: "ABSOLUTE" });
      expect(node.horizontalConstraint).toEqual({ value: 0, name: "MIN" });
      expect(node.verticalConstraint).toEqual({ value: 2, name: "MAX" });
    });
  });
});

describe("Factory function", () => {
  it("instanceNode returns InstanceNodeBuilder", () => {
    const builder = instanceNode(2, 0, 1);
    expect(builder).toBeInstanceOf(InstanceNodeBuilder);
  });
});
