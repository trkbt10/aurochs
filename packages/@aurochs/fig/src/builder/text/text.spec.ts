/**
 * @file Unit tests for TextNodeBuilder
 */

import { textNode, TextNodeBuilder } from "./text";

describe("TextNodeBuilder", () => {
  it("creates basic text node with defaults", () => {
    const node = textNode(1, 0).text("Hello").build();

    expect(node.localID).toBe(1);
    expect(node.parentID).toBe(0);
    expect(node.characters).toBe("Hello");
    expect(node.fontSize).toBe(12);
    expect(node.fontName.family).toBe("Inter");
    expect(node.visible).toBe(true);
    expect(node.opacity).toBe(1);
  });

  it("sets text properties", () => {
    const node = textNode(1, 0)
      .name("Title")
      .text("Hello World")
      .fontSize(24)
      .font("Roboto", "Bold")
      .size(200, 50)
      .position(100, 100)
      .color({ r: 1, g: 0, b: 0, a: 1 })
      .build();

    expect(node.name).toBe("Title");
    expect(node.characters).toBe("Hello World");
    expect(node.fontSize).toBe(24);
    expect(node.fontName.family).toBe("Roboto");
    expect(node.fontName.style).toBe("Bold");
    expect(node.size).toEqual({ x: 200, y: 50 });
    expect(node.transform.m02).toBe(100);
    expect(node.transform.m12).toBe(100);
    expect(node.fillPaints[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("sets text alignment", () => {
    const node = textNode(1, 0)
      .alignHorizontal("CENTER")
      .alignVertical("BOTTOM")
      .build();

    expect(node.textAlignHorizontal).toEqual({ value: 1, name: "CENTER" });
    expect(node.textAlignVertical).toEqual({ value: 2, name: "BOTTOM" });
  });

  it("sets text decoration and case", () => {
    const node = textNode(1, 0)
      .decoration("UNDERLINE")
      .textCase("UPPER")
      .build();

    expect(node.textDecoration).toEqual({ value: 1, name: "UNDERLINE" });
    expect(node.textCase).toEqual({ value: 1, name: "UPPER" });
  });

  it("sets line height and letter spacing", () => {
    const node = textNode(1, 0)
      .lineHeight(24, "PIXELS")
      .letterSpacing(5, "PERCENT")
      .build();

    expect(node.lineHeight).toEqual({
      value: 24,
      units: { value: 1, name: "PIXELS" },
    });
    expect(node.letterSpacing).toEqual({
      value: 5,
      units: { value: 2, name: "PERCENT" },
    });
  });
});

describe("Factory function", () => {
  it("textNode returns TextNodeBuilder", () => {
    const builder = textNode(1, 0);
    expect(builder).toBeInstanceOf(TextNodeBuilder);
  });
});
