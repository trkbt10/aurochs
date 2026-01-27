/**
 * @file Border Parser Tests
 *
 * Tests for parsing border elements from styles.xml.
 *
 * @see ECMA-376 Part 4, Section 18.8.4 (border)
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle)
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import { parseBorder, parseBorders, parseBorderEdge } from "./border";

/**
 * Helper to parse XML string and get the root element.
 */
function parseRoot(xml: string): XmlElement {
  const doc = parseXml(xml);
  const root = doc.children.find((c): c is XmlElement => c.type === "element");
  if (!root) {
    throw new Error("No root element found");
  }
  return root;
}

describe("parseBorderEdge", () => {
  it("should return undefined for undefined input", () => {
    expect(parseBorderEdge(undefined)).toBeUndefined();
  });

  it("should return undefined for edge without style attribute", () => {
    const xml = `<left/>`;
    const el = parseRoot(xml);
    expect(parseBorderEdge(el)).toBeUndefined();
  });

  it("should return undefined for edge with style='none'", () => {
    const xml = `<left style="none"/>`;
    const el = parseRoot(xml);
    expect(parseBorderEdge(el)).toBeUndefined();
  });

  it("should parse thin border style", () => {
    const xml = `<left style="thin"/>`;
    const el = parseRoot(xml);
    const result = parseBorderEdge(el);
    expect(result).toEqual({ style: "thin", color: undefined });
  });

  it("should parse all border styles", () => {
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
      const xml = `<left style="${style}"/>`;
      const el = parseRoot(xml);
      const result = parseBorderEdge(el);
      expect(result).toEqual({ style, color: undefined });
    }
  });

  it("should parse edge with indexed color", () => {
    const xml = `<left style="thin"><color indexed="64"/></left>`;
    const el = parseRoot(xml);
    const result = parseBorderEdge(el);
    expect(result).toEqual({
      style: "thin",
      color: { type: "indexed", index: 64 },
    });
  });

  it("should parse edge with RGB color", () => {
    const xml = `<left style="medium"><color rgb="FFFF0000"/></left>`;
    const el = parseRoot(xml);
    const result = parseBorderEdge(el);
    expect(result).toEqual({
      style: "medium",
      color: { type: "rgb", value: "FFFF0000" },
    });
  });

  it("should parse edge with theme color", () => {
    const xml = `<left style="thick"><color theme="1"/></left>`;
    const el = parseRoot(xml);
    const result = parseBorderEdge(el);
    expect(result).toEqual({
      style: "thick",
      color: { type: "theme", theme: 1, tint: undefined },
    });
  });

  it("should parse edge with theme color and tint", () => {
    const xml = `<left style="thin"><color theme="1" tint="0.5"/></left>`;
    const el = parseRoot(xml);
    const result = parseBorderEdge(el);
    expect(result).toEqual({
      style: "thin",
      color: { type: "theme", theme: 1, tint: 0.5 },
    });
  });

  it("should parse edge with auto color", () => {
    const xml = `<left style="dashed"><color auto="1"/></left>`;
    const el = parseRoot(xml);
    const result = parseBorderEdge(el);
    expect(result).toEqual({
      style: "dashed",
      color: { type: "auto" },
    });
  });
});

describe("parseBorder", () => {
  it("should parse empty border (all edges none)", () => {
    const xml = `
      <border>
        <left/>
        <right/>
        <top/>
        <bottom/>
        <diagonal/>
      </border>
    `;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result).toEqual({
      left: undefined,
      right: undefined,
      top: undefined,
      bottom: undefined,
      diagonal: undefined,
      diagonalUp: undefined,
      diagonalDown: undefined,
      outline: undefined,
    });
  });

  it("should parse border with all edges styled", () => {
    const xml = `
      <border>
        <left style="thin"><color indexed="64"/></left>
        <right style="thin"><color indexed="64"/></right>
        <top style="thin"><color indexed="64"/></top>
        <bottom style="thin"><color indexed="64"/></bottom>
        <diagonal/>
      </border>
    `;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result.left).toEqual({
      style: "thin",
      color: { type: "indexed", index: 64 },
    });
    expect(result.right).toEqual({
      style: "thin",
      color: { type: "indexed", index: 64 },
    });
    expect(result.top).toEqual({
      style: "thin",
      color: { type: "indexed", index: 64 },
    });
    expect(result.bottom).toEqual({
      style: "thin",
      color: { type: "indexed", index: 64 },
    });
    expect(result.diagonal).toBeUndefined();
  });

  it("should parse border with mixed edge styles", () => {
    const xml = `
      <border>
        <left style="thin"><color rgb="FF000000"/></left>
        <right style="medium"><color rgb="FFFF0000"/></right>
        <top style="thick"><color theme="1"/></top>
        <bottom style="double"><color indexed="10"/></bottom>
        <diagonal/>
      </border>
    `;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result.left?.style).toBe("thin");
    expect(result.right?.style).toBe("medium");
    expect(result.top?.style).toBe("thick");
    expect(result.bottom?.style).toBe("double");
  });

  it("should parse diagonalUp attribute as true", () => {
    const xml = `<border diagonalUp="1"><left/><right/><top/><bottom/><diagonal/></border>`;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result.diagonalUp).toBe(true);
    expect(result.diagonalDown).toBeUndefined();
  });

  it("should parse diagonalDown attribute as true", () => {
    const xml = `<border diagonalDown="1"><left/><right/><top/><bottom/><diagonal/></border>`;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result.diagonalUp).toBeUndefined();
    expect(result.diagonalDown).toBe(true);
  });

  it("should parse both diagonal attributes", () => {
    const xml = `<border diagonalUp="1" diagonalDown="1"><left/><right/><top/><bottom/><diagonal style="thin"><color indexed="64"/></diagonal></border>`;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result.diagonalUp).toBe(true);
    expect(result.diagonalDown).toBe(true);
    expect(result.diagonal?.style).toBe("thin");
  });

  it("should parse diagonalUp='0' as false", () => {
    const xml = `<border diagonalUp="0"><left/><right/><top/><bottom/><diagonal/></border>`;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result.diagonalUp).toBe(false);
  });

  it("should parse diagonalUp='true' and 'false' string values", () => {
    const xmlTrue = `<border diagonalUp="true"><left/><right/><top/><bottom/><diagonal/></border>`;
    const xmlFalse = `<border diagonalUp="false"><left/><right/><top/><bottom/><diagonal/></border>`;

    expect(parseBorder(parseRoot(xmlTrue)).diagonalUp).toBe(true);
    expect(parseBorder(parseRoot(xmlFalse)).diagonalUp).toBe(false);
  });

  it("should parse outline attribute", () => {
    const xml = `<border outline="1"><left/><right/><top/><bottom/><diagonal/></border>`;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result.outline).toBe(true);
  });

  it("should parse border with diagonal edge", () => {
    const xml = `
      <border diagonalUp="1">
        <left/>
        <right/>
        <top/>
        <bottom/>
        <diagonal style="thin"><color rgb="FFFF0000"/></diagonal>
      </border>
    `;
    const el = parseRoot(xml);
    const result = parseBorder(el);
    expect(result.diagonal).toEqual({
      style: "thin",
      color: { type: "rgb", value: "FFFF0000" },
    });
    expect(result.diagonalUp).toBe(true);
  });
});

describe("parseBorders", () => {
  it("should parse empty borders collection", () => {
    const xml = `<borders count="0"/>`;
    const el = parseRoot(xml);
    const result = parseBorders(el);
    expect(result).toEqual([]);
  });

  it("should parse default border (index 0)", () => {
    const xml = `
      <borders count="1">
        <border>
          <left/>
          <right/>
          <top/>
          <bottom/>
          <diagonal/>
        </border>
      </borders>
    `;
    const el = parseRoot(xml);
    const result = parseBorders(el);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBeUndefined();
    expect(result[0].right).toBeUndefined();
    expect(result[0].top).toBeUndefined();
    expect(result[0].bottom).toBeUndefined();
  });

  it("should parse multiple borders", () => {
    const xml = `
      <borders count="2">
        <border>
          <left/>
          <right/>
          <top/>
          <bottom/>
          <diagonal/>
        </border>
        <border>
          <left style="thin"><color indexed="64"/></left>
          <right style="thin"><color indexed="64"/></right>
          <top style="thin"><color indexed="64"/></top>
          <bottom style="thin"><color indexed="64"/></bottom>
          <diagonal/>
        </border>
      </borders>
    `;
    const el = parseRoot(xml);
    const result = parseBorders(el);
    expect(result).toHaveLength(2);

    // First border (default)
    expect(result[0].left).toBeUndefined();
    expect(result[0].right).toBeUndefined();
    expect(result[0].top).toBeUndefined();
    expect(result[0].bottom).toBeUndefined();

    // Second border (all thin)
    expect(result[1].left?.style).toBe("thin");
    expect(result[1].right?.style).toBe("thin");
    expect(result[1].top?.style).toBe("thin");
    expect(result[1].bottom?.style).toBe("thin");
  });

  it("should parse borders with various styles", () => {
    const xml = `
      <borders count="3">
        <border>
          <left/>
          <right/>
          <top/>
          <bottom/>
          <diagonal/>
        </border>
        <border>
          <left style="thin"><color indexed="64"/></left>
          <right style="thin"><color indexed="64"/></right>
          <top style="thin"><color indexed="64"/></top>
          <bottom style="thin"><color indexed="64"/></bottom>
          <diagonal/>
        </border>
        <border diagonalUp="1" diagonalDown="1">
          <left style="medium"><color rgb="FFFF0000"/></left>
          <right style="medium"><color rgb="FFFF0000"/></right>
          <top style="medium"><color rgb="FFFF0000"/></top>
          <bottom style="medium"><color rgb="FFFF0000"/></bottom>
          <diagonal style="hair"><color theme="1"/></diagonal>
        </border>
      </borders>
    `;
    const el = parseRoot(xml);
    const result = parseBorders(el);
    expect(result).toHaveLength(3);

    // Third border has diagonal
    expect(result[2].left?.style).toBe("medium");
    expect(result[2].diagonal?.style).toBe("hair");
    expect(result[2].diagonalUp).toBe(true);
    expect(result[2].diagonalDown).toBe(true);
  });
});
