/**
 * @file Unit tests for FrameNodeBuilder
 */

import { frameNode, FrameNodeBuilder } from "./frame";

describe("FrameNodeBuilder", () => {
  it("creates basic frame with defaults", () => {
    const node = frameNode(1, 0).build();

    expect(node.localID).toBe(1);
    expect(node.parentID).toBe(0);
    expect(node.name).toBe("Frame");
    expect(node.size).toEqual({ x: 200, y: 100 });
    expect(node.clipsContent).toBe(true);
    expect(node.visible).toBe(true);
    expect(node.opacity).toBe(1);
  });

  it("sets basic frame properties", () => {
    const node = frameNode(1, 0)
      .name("Container")
      .size(300, 200)
      .position(50, 50)
      .background({ r: 0.9, g: 0.9, b: 0.9, a: 1 })
      .clipsContent(false)
      .cornerRadius(8)
      .build();

    expect(node.name).toBe("Container");
    expect(node.size).toEqual({ x: 300, y: 200 });
    expect(node.transform.m02).toBe(50);
    expect(node.transform.m12).toBe(50);
    expect(node.fillPaints[0].color).toEqual({ r: 0.9, g: 0.9, b: 0.9, a: 1 });
    expect(node.clipsContent).toBe(false);
    expect(node.cornerRadius).toBe(8);
  });

  describe("AutoLayout - Frame Level", () => {
    it("creates horizontal auto-layout frame", () => {
      const node = frameNode(1, 0)
        .autoLayout("HORIZONTAL")
        .gap(10)
        .primaryAlign("MIN")
        .counterAlign("CENTER")
        .build();

      expect(node.stackMode).toEqual({ value: 1, name: "HORIZONTAL" });
      expect(node.stackSpacing).toBe(10);
      expect(node.stackPrimaryAlignItems).toEqual({ value: 0, name: "MIN" });
      expect(node.stackCounterAlignItems).toEqual({ value: 1, name: "CENTER" });
    });

    it("creates vertical auto-layout frame", () => {
      const node = frameNode(1, 0)
        .autoLayout("VERTICAL")
        .gap(16)
        .primaryAlign("CENTER")
        .counterAlign("STRETCH")
        .build();

      expect(node.stackMode).toEqual({ value: 2, name: "VERTICAL" });
      expect(node.stackSpacing).toBe(16);
      expect(node.stackPrimaryAlignItems).toEqual({ value: 1, name: "CENTER" });
      expect(node.stackCounterAlignItems).toEqual({ value: 3, name: "STRETCH" });
    });

    it("sets uniform padding", () => {
      const node = frameNode(1, 0)
        .autoLayout("HORIZONTAL")
        .padding(16)
        .build();

      expect(node.stackPadding).toEqual({
        top: 16,
        right: 16,
        bottom: 16,
        left: 16,
      });
    });

    it("sets individual padding", () => {
      const node = frameNode(1, 0)
        .autoLayout("VERTICAL")
        .padding({ top: 10, right: 20, bottom: 30, left: 40 })
        .build();

      expect(node.stackPadding).toEqual({
        top: 10,
        right: 20,
        bottom: 30,
        left: 40,
      });
    });

    it("sets two-value padding (vertical, horizontal)", () => {
      const node = frameNode(1, 0)
        .autoLayout("HORIZONTAL")
        .padding({ top: 10, right: 20, bottom: 10, left: 20 })
        .build();

      expect(node.stackPadding).toEqual({
        top: 10,
        right: 20,
        bottom: 10,
        left: 20,
      });
    });

    it("creates wrap layout", () => {
      const node = frameNode(1, 0)
        .autoLayout("WRAP")
        .wrap(true)
        .gap(8)
        .counterGap(12)
        .contentAlign("SPACE_BETWEEN")
        .build();

      expect(node.stackMode).toEqual({ value: 3, name: "WRAP" });
      expect(node.stackWrap).toBe(true);
      expect(node.stackSpacing).toBe(8);
      expect(node.stackCounterSpacing).toBe(12);
      expect(node.stackPrimaryAlignContent).toEqual({ value: 5, name: "SPACE_BETWEEN" });
    });

    it("sets reverse z-index", () => {
      const node = frameNode(1, 0)
        .autoLayout("HORIZONTAL")
        .reverseZIndex(true)
        .build();

      expect(node.itemReverseZIndex).toBe(true);
    });

    it("auto-enables wrap mode when wrap() is called", () => {
      const node = frameNode(1, 0)
        .wrap(true)
        .build();

      expect(node.stackMode).toEqual({ value: 3, name: "WRAP" });
      expect(node.stackWrap).toBe(true);
    });
  });

  describe("AutoLayout - Child Level", () => {
    it("sets child positioning", () => {
      const node = frameNode(1, 0)
        .positioning("ABSOLUTE")
        .build();

      expect(node.stackPositioning).toEqual({ value: 1, name: "ABSOLUTE" });
    });

    it("sets child sizing", () => {
      const node = frameNode(1, 0)
        .primarySizing("FILL")
        .counterSizing("HUG")
        .build();

      expect(node.stackPrimarySizing).toEqual({ value: 1, name: "FILL" });
      expect(node.stackCounterSizing).toEqual({ value: 2, name: "HUG" });
    });

    it("sets constraints", () => {
      const node = frameNode(1, 0)
        .horizontalConstraint("CENTER")
        .verticalConstraint("SCALE")
        .build();

      expect(node.horizontalConstraint).toEqual({ value: 1, name: "CENTER" });
      expect(node.verticalConstraint).toEqual({ value: 4, name: "SCALE" });
    });
  });

  describe("Export Settings", () => {
    it("adds SVG export settings", () => {
      const node = frameNode(1, 0).exportAsSVG().build();

      expect(node.exportSettings).toHaveLength(1);
      expect(node.exportSettings![0].imageType.name).toBe("SVG");
    });

    it("adds PNG export settings", () => {
      const node = frameNode(1, 0).exportAsPNG(2).build();

      expect(node.exportSettings).toHaveLength(1);
      expect(node.exportSettings![0].imageType.name).toBe("PNG");
      expect(node.exportSettings![0].constraint.value).toBe(2);
      expect(node.exportSettings![0].suffix).toBe("@2x");
    });
  });
});

describe("Factory function", () => {
  it("frameNode returns FrameNodeBuilder", () => {
    const builder = frameNode(1, 0);
    expect(builder).toBeInstanceOf(FrameNodeBuilder);
  });
});
