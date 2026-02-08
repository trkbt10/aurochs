/**
 * @file Unit tests for SymbolNodeBuilder
 */

import { symbolNode, SymbolNodeBuilder } from "./symbol";

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

describe("Factory function", () => {
  it("symbolNode returns SymbolNodeBuilder", () => {
    const builder = symbolNode(1, 0);
    expect(builder).toBeInstanceOf(SymbolNodeBuilder);
  });
});
