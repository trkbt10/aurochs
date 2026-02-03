/**
 * @file Unit tests for symbol-builder.ts
 *
 * Tests SymbolNodeBuilder and InstanceNodeBuilder.
 */

import {
  symbolNode,
  instanceNode,
  SymbolNodeBuilder,
  InstanceNodeBuilder,
} from "./symbol-builder";

describe("SymbolNodeBuilder", () => {
  it("creates basic symbol with defaults", () => {
    const node = symbolNode(1, 0).build();

    expect(node.localID).toBe(1);
    expect(node.parentID).toBe(0);
    expect(node.name).toBe("Component");
    expect(node.size).toEqual({ x: 200, y: 100 });
    expect(node.visible).toBe(true);
    expect(node.opacity).toBe(1);
    expect(node.clipsContent).toBe(true);
  });

  it("sets basic symbol properties", () => {
    const node = symbolNode(1, 0)
      .name("Button")
      .size(120, 40)
      .position(50, 50)
      .background({ r: 0.2, g: 0.5, b: 1, a: 1 })
      .cornerRadius(8)
      .build();

    expect(node.name).toBe("Button");
    expect(node.size).toEqual({ x: 120, y: 40 });
    expect(node.transform.m02).toBe(50);
    expect(node.transform.m12).toBe(50);
    expect(node.fillPaints[0].color).toEqual({ r: 0.2, g: 0.5, b: 1, a: 1 });
    expect(node.cornerRadius).toBe(8);
  });

  describe("AutoLayout", () => {
    it("creates horizontal auto-layout symbol", () => {
      const node = symbolNode(1, 0)
        .autoLayout("HORIZONTAL")
        .gap(8)
        .padding({ top: 12, right: 16, bottom: 12, left: 16 })
        .primaryAlign("CENTER")
        .counterAlign("CENTER")
        .build();

      expect(node.stackMode).toEqual({ value: 1, name: "HORIZONTAL" });
      expect(node.stackSpacing).toBe(8);
      expect(node.stackPadding).toEqual({
        top: 12,
        right: 16,
        bottom: 12,
        left: 16,
      });
      expect(node.stackPrimaryAlignItems).toEqual({ value: 1, name: "CENTER" });
      expect(node.stackCounterAlignItems).toEqual({ value: 1, name: "CENTER" });
    });

    it("creates vertical auto-layout symbol", () => {
      const node = symbolNode(1, 0)
        .autoLayout("VERTICAL")
        .gap(16)
        .padding(24)
        .primaryAlign("MIN")
        .counterAlign("STRETCH")
        .build();

      expect(node.stackMode).toEqual({ value: 2, name: "VERTICAL" });
      expect(node.stackSpacing).toBe(16);
      expect(node.stackPadding).toEqual({
        top: 24,
        right: 24,
        bottom: 24,
        left: 24,
      });
      expect(node.stackPrimaryAlignItems).toEqual({ value: 0, name: "MIN" });
      expect(node.stackCounterAlignItems).toEqual({ value: 3, name: "STRETCH" });
    });

    it("creates wrap layout symbol", () => {
      const node = symbolNode(1, 0)
        .wrap(true)
        .gap(10)
        .counterGap(15)
        .contentAlign("SPACE_BETWEEN")
        .build();

      expect(node.stackMode).toEqual({ value: 3, name: "WRAP" });
      expect(node.stackWrap).toBe(true);
      expect(node.stackSpacing).toBe(10);
      expect(node.stackCounterSpacing).toBe(15);
      expect(node.stackPrimaryAlignContent).toEqual({ value: 5, name: "SPACE_BETWEEN" });
    });

    it("sets reverse z-index", () => {
      const node = symbolNode(1, 0)
        .autoLayout("HORIZONTAL")
        .reverseZIndex(true)
        .build();

      expect(node.itemReverseZIndex).toBe(true);
    });
  });

  describe("Export Settings", () => {
    it("adds SVG export settings", () => {
      const node = symbolNode(1, 0).exportAsSVG().build();

      expect(node.exportSettings).toHaveLength(1);
      expect(node.exportSettings![0].imageType.name).toBe("SVG");
    });
  });
});

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

describe("Factory functions", () => {
  it("symbolNode returns SymbolNodeBuilder", () => {
    const builder = symbolNode(1, 0);
    expect(builder).toBeInstanceOf(SymbolNodeBuilder);
  });

  it("instanceNode returns InstanceNodeBuilder", () => {
    const builder = instanceNode(2, 0, 1);
    expect(builder).toBeInstanceOf(InstanceNodeBuilder);
  });
});
