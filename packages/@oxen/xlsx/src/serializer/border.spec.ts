/**
 * @file Border Serializer Tests
 */

import { getChild, getChildren } from "@oxen/xml";
import type { XlsxBorder, XlsxBorderEdge } from "../domain/style/border";
import type { XlsxColor } from "../domain/style/font";
import { serializeBorder, serializeBorders, serializeBorderEdge } from "./border";

describe("serializeBorderEdge", () => {
  it("returns undefined for undefined edge", () => {
    const result = serializeBorderEdge(undefined, "left");
    expect(result).toBeUndefined();
  });

  it("serializes edge with style none as empty element", () => {
    const edge: XlsxBorderEdge = { style: "none" };
    const result = serializeBorderEdge(edge, "left");

    expect(result).toBeDefined();
    expect(result!.name).toBe("left");
    expect(result!.attrs).toEqual({});
    expect(result!.children).toHaveLength(0);
  });

  it("serializes edge with thin style", () => {
    const edge: XlsxBorderEdge = { style: "thin" };
    const result = serializeBorderEdge(edge, "right");

    expect(result).toBeDefined();
    expect(result!.name).toBe("right");
    expect(result!.attrs.style).toBe("thin");
    expect(result!.children).toHaveLength(0);
  });

  it("serializes edge with style and indexed color", () => {
    const color: XlsxColor = { type: "indexed", index: 64 };
    const edge: XlsxBorderEdge = { style: "thin", color };
    const result = serializeBorderEdge(edge, "top");

    expect(result).toBeDefined();
    expect(result!.name).toBe("top");
    expect(result!.attrs.style).toBe("thin");

    const colorEl = getChild(result!, "color");
    expect(colorEl).toBeDefined();
    expect(colorEl!.attrs.indexed).toBe("64");
  });

  it("serializes edge with style and rgb color", () => {
    const color: XlsxColor = { type: "rgb", value: "FF0000FF" };
    const edge: XlsxBorderEdge = { style: "medium", color };
    const result = serializeBorderEdge(edge, "bottom");

    expect(result).toBeDefined();
    expect(result!.name).toBe("bottom");
    expect(result!.attrs.style).toBe("medium");

    const colorEl = getChild(result!, "color");
    expect(colorEl).toBeDefined();
    expect(colorEl!.attrs.rgb).toBe("FF0000FF");
  });

  it("serializes edge with style and theme color", () => {
    const color: XlsxColor = { type: "theme", theme: 1, tint: 0.5 };
    const edge: XlsxBorderEdge = { style: "thick", color };
    const result = serializeBorderEdge(edge, "diagonal");

    expect(result).toBeDefined();
    expect(result!.name).toBe("diagonal");
    expect(result!.attrs.style).toBe("thick");

    const colorEl = getChild(result!, "color");
    expect(colorEl).toBeDefined();
    expect(colorEl!.attrs.theme).toBe("1");
    expect(colorEl!.attrs.tint).toBe("0.5");
  });

  it("serializes edge with style and auto color", () => {
    const color: XlsxColor = { type: "auto" };
    const edge: XlsxBorderEdge = { style: "dashed", color };
    const result = serializeBorderEdge(edge, "left");

    expect(result).toBeDefined();
    expect(result!.name).toBe("left");
    expect(result!.attrs.style).toBe("dashed");

    const colorEl = getChild(result!, "color");
    expect(colorEl).toBeDefined();
    expect(colorEl!.attrs.auto).toBe("1");
  });

  it("serializes all border styles correctly", () => {
    const styles = [
      "thin",
      "medium",
      "thick",
      "dashed",
      "dotted",
      "double",
      "hair",
      "mediumDashed",
      "dashDot",
      "mediumDashDot",
      "dashDotDot",
      "mediumDashDotDot",
      "slantDashDot",
    ] as const;

    for (const style of styles) {
      const edge: XlsxBorderEdge = { style };
      const result = serializeBorderEdge(edge, "left");
      expect(result!.attrs.style).toBe(style);
    }
  });
});

describe("serializeBorder", () => {
  it("serializes empty border", () => {
    const border: XlsxBorder = {};
    const result = serializeBorder(border);

    expect(result.name).toBe("border");
    expect(result.attrs).toEqual({});
    expect(result.children).toHaveLength(0);
  });

  it("serializes border with all edges as none (default border)", () => {
    const border: XlsxBorder = {
      left: { style: "none" },
      right: { style: "none" },
      top: { style: "none" },
      bottom: { style: "none" },
      diagonal: { style: "none" },
    };
    const result = serializeBorder(border);

    expect(result.name).toBe("border");
    expect(result.children).toHaveLength(5);

    expect(getChild(result, "left")).toBeDefined();
    expect(getChild(result, "right")).toBeDefined();
    expect(getChild(result, "top")).toBeDefined();
    expect(getChild(result, "bottom")).toBeDefined();
    expect(getChild(result, "diagonal")).toBeDefined();
  });

  it("serializes border with thin edges", () => {
    const color: XlsxColor = { type: "indexed", index: 64 };
    const border: XlsxBorder = {
      left: { style: "thin", color },
      right: { style: "thin", color },
      top: { style: "thin", color },
      bottom: { style: "thin", color },
    };
    const result = serializeBorder(border);

    expect(result.name).toBe("border");
    expect(result.children).toHaveLength(4);

    const leftEl = getChild(result, "left");
    expect(leftEl!.attrs.style).toBe("thin");
    expect(getChild(leftEl!, "color")!.attrs.indexed).toBe("64");
  });

  it("serializes border with diagonalUp attribute", () => {
    const border: XlsxBorder = {
      diagonal: { style: "thin" },
      diagonalUp: true,
    };
    const result = serializeBorder(border);

    expect(result.attrs.diagonalUp).toBe("1");
    expect(result.attrs.diagonalDown).toBeUndefined();
  });

  it("serializes border with diagonalDown attribute", () => {
    const border: XlsxBorder = {
      diagonal: { style: "thin" },
      diagonalDown: true,
    };
    const result = serializeBorder(border);

    expect(result.attrs.diagonalDown).toBe("1");
    expect(result.attrs.diagonalUp).toBeUndefined();
  });

  it("serializes border with both diagonal attributes", () => {
    const border: XlsxBorder = {
      diagonal: { style: "medium" },
      diagonalUp: true,
      diagonalDown: true,
    };
    const result = serializeBorder(border);

    expect(result.attrs.diagonalUp).toBe("1");
    expect(result.attrs.diagonalDown).toBe("1");
  });

  it("serializes border with outline attribute", () => {
    const border: XlsxBorder = {
      left: { style: "thin" },
      outline: true,
    };
    const result = serializeBorder(border);

    expect(result.attrs.outline).toBe("1");
  });

  it("omits false diagonal attributes", () => {
    const border: XlsxBorder = {
      diagonal: { style: "thin" },
      diagonalUp: false,
      diagonalDown: false,
    };
    const result = serializeBorder(border);

    expect(result.attrs.diagonalUp).toBeUndefined();
    expect(result.attrs.diagonalDown).toBeUndefined();
  });

  it("maintains child element order: left, right, top, bottom, diagonal", () => {
    const border: XlsxBorder = {
      diagonal: { style: "thin" },
      bottom: { style: "thin" },
      top: { style: "thin" },
      right: { style: "thin" },
      left: { style: "thin" },
    };
    const result = serializeBorder(border);

    expect(result.children).toHaveLength(5);
    expect((result.children[0] as { name: string }).name).toBe("left");
    expect((result.children[1] as { name: string }).name).toBe("right");
    expect((result.children[2] as { name: string }).name).toBe("top");
    expect((result.children[3] as { name: string }).name).toBe("bottom");
    expect((result.children[4] as { name: string }).name).toBe("diagonal");
  });
});

describe("serializeBorders", () => {
  it("serializes empty borders collection", () => {
    const result = serializeBorders([]);

    expect(result.name).toBe("borders");
    expect(result.attrs.count).toBe("0");
    expect(result.children).toHaveLength(0);
  });

  it("serializes single default border", () => {
    const borders: XlsxBorder[] = [
      {
        left: { style: "none" },
        right: { style: "none" },
        top: { style: "none" },
        bottom: { style: "none" },
        diagonal: { style: "none" },
      },
    ];
    const result = serializeBorders(borders);

    expect(result.name).toBe("borders");
    expect(result.attrs.count).toBe("1");
    expect(result.children).toHaveLength(1);

    const borderEl = getChildren(result, "border")[0];
    expect(borderEl).toBeDefined();
    expect(getChild(borderEl, "left")).toBeDefined();
    expect(getChild(borderEl, "right")).toBeDefined();
    expect(getChild(borderEl, "top")).toBeDefined();
    expect(getChild(borderEl, "bottom")).toBeDefined();
    expect(getChild(borderEl, "diagonal")).toBeDefined();
  });

  it("serializes multiple borders", () => {
    const borders: XlsxBorder[] = [
      {}, // Empty border
      { left: { style: "thin" } },
      {
        left: { style: "medium" },
        right: { style: "medium" },
        top: { style: "medium" },
        bottom: { style: "medium" },
      },
    ];
    const result = serializeBorders(borders);

    expect(result.name).toBe("borders");
    expect(result.attrs.count).toBe("3");
    expect(result.children).toHaveLength(3);

    const borderEls = getChildren(result, "border");
    expect(borderEls).toHaveLength(3);
    expect(borderEls[0].children).toHaveLength(0);
    expect(borderEls[1].children).toHaveLength(1);
    expect(borderEls[2].children).toHaveLength(4);
  });
});

describe("color serialization within borders", () => {
  it("serializes theme color without tint", () => {
    const color: XlsxColor = { type: "theme", theme: 4 };
    const border: XlsxBorder = {
      left: { style: "thin", color },
    };
    const result = serializeBorder(border);

    const leftEl = getChild(result, "left");
    const colorEl = getChild(leftEl!, "color");
    expect(colorEl!.attrs.theme).toBe("4");
    expect(colorEl!.attrs.tint).toBeUndefined();
  });

  it("serializes theme color with tint", () => {
    const color: XlsxColor = { type: "theme", theme: 2, tint: -0.25 };
    const border: XlsxBorder = {
      top: { style: "medium", color },
    };
    const result = serializeBorder(border);

    const topEl = getChild(result, "top");
    const colorEl = getChild(topEl!, "color");
    expect(colorEl!.attrs.theme).toBe("2");
    expect(colorEl!.attrs.tint).toBe("-0.25");
  });
});
