/**
 * @file Font Parser Tests
 *
 * Tests for parsing font elements from styles.xml.
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import { parseColor, parseFont, parseFonts } from "./font";

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

// =============================================================================
// parseColor Tests
// =============================================================================

describe("parseColor", () => {
  it("should parse RGB color", () => {
    const xml = `<color rgb="FFFF0000"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "rgb", value: "FFFF0000" });
  });

  it("should parse theme color without tint", () => {
    const xml = `<color theme="1"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "theme", theme: 1, tint: undefined });
  });

  it("should parse theme color with tint", () => {
    const xml = `<color theme="3" tint="0.39997558519241921"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({
      type: "theme",
      theme: 3,
      tint: 0.39997558519241921,
    });
  });

  it("should parse theme color with negative tint", () => {
    const xml = `<color theme="1" tint="-0.249977111117893"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({
      type: "theme",
      theme: 1,
      tint: -0.249977111117893,
    });
  });

  it("should parse indexed color", () => {
    const xml = `<color indexed="64"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "indexed", index: 64 });
  });

  it("should parse auto color with auto='1'", () => {
    const xml = `<color auto="1"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "auto" });
  });

  it("should parse auto color with auto='true'", () => {
    const xml = `<color auto="true"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "auto" });
  });

  it("should return undefined for empty color element", () => {
    const xml = `<color/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseFont Tests
// =============================================================================

describe("parseFont", () => {
  it("should parse minimal font with defaults", () => {
    const xml = `<font/>`;
    const result = parseFont(parseRoot(xml));
    expect(result).toEqual({
      name: "Calibri",
      size: 11,
      bold: undefined,
      italic: undefined,
      underline: undefined,
      strikethrough: undefined,
      color: undefined,
      family: undefined,
      scheme: undefined,
      vertAlign: undefined,
      outline: undefined,
      shadow: undefined,
      condense: undefined,
      extend: undefined,
    });
  });

  it("should parse font name and size", () => {
    const xml = `
      <font>
        <name val="Arial"/>
        <sz val="14"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.name).toBe("Arial");
    expect(result.size).toBe(14);
  });

  it("should parse bold element without val attribute as true", () => {
    const xml = `
      <font>
        <b/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.bold).toBe(true);
  });

  it("should parse bold element with val='1' as true", () => {
    const xml = `
      <font>
        <b val="1"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.bold).toBe(true);
  });

  it("should parse bold element with val='true' as true", () => {
    const xml = `
      <font>
        <b val="true"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.bold).toBe(true);
  });

  it("should parse bold element with val='0' as false", () => {
    const xml = `
      <font>
        <b val="0"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.bold).toBe(false);
  });

  it("should parse bold element with val='false' as false", () => {
    const xml = `
      <font>
        <b val="false"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.bold).toBe(false);
  });

  it("should parse italic element without val attribute as true", () => {
    const xml = `
      <font>
        <i/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.italic).toBe(true);
  });

  it("should parse underline element without val as single", () => {
    const xml = `
      <font>
        <u/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.underline).toBe("single");
  });

  it("should parse underline element with val='double'", () => {
    const xml = `
      <font>
        <u val="double"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.underline).toBe("double");
  });

  it("should parse underline element with val='singleAccounting'", () => {
    const xml = `
      <font>
        <u val="singleAccounting"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.underline).toBe("singleAccounting");
  });

  it("should parse underline element with val='doubleAccounting'", () => {
    const xml = `
      <font>
        <u val="doubleAccounting"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.underline).toBe("doubleAccounting");
  });

  it("should parse underline element with val='none'", () => {
    const xml = `
      <font>
        <u val="none"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.underline).toBe("none");
  });

  it("should parse strikethrough element", () => {
    const xml = `
      <font>
        <strike/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.strikethrough).toBe(true);
  });

  it("should parse font color", () => {
    const xml = `
      <font>
        <color rgb="FF0000FF"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.color).toEqual({ type: "rgb", value: "FF0000FF" });
  });

  it("should parse font family", () => {
    const xml = `
      <font>
        <family val="2"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.family).toBe(2);
  });

  it("should parse scheme as major", () => {
    const xml = `
      <font>
        <scheme val="major"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.scheme).toBe("major");
  });

  it("should parse scheme as minor", () => {
    const xml = `
      <font>
        <scheme val="minor"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.scheme).toBe("minor");
  });

  it("should parse scheme as none", () => {
    const xml = `
      <font>
        <scheme val="none"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.scheme).toBe("none");
  });

  it("should ignore invalid scheme value", () => {
    const xml = `
      <font>
        <scheme val="invalid"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.scheme).toBeUndefined();
  });

  it("should parse vertAlign as superscript", () => {
    const xml = `
      <font>
        <vertAlign val="superscript"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.vertAlign).toBe("superscript");
  });

  it("should parse vertAlign as subscript", () => {
    const xml = `
      <font>
        <vertAlign val="subscript"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.vertAlign).toBe("subscript");
  });

  it("should parse vertAlign as baseline", () => {
    const xml = `
      <font>
        <vertAlign val="baseline"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.vertAlign).toBe("baseline");
  });

  it("should parse outline element", () => {
    const xml = `
      <font>
        <outline/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.outline).toBe(true);
  });

  it("should parse shadow element", () => {
    const xml = `
      <font>
        <shadow/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.shadow).toBe(true);
  });

  it("should parse condense element", () => {
    const xml = `
      <font>
        <condense/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.condense).toBe(true);
  });

  it("should parse extend element", () => {
    const xml = `
      <font>
        <extend/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.extend).toBe(true);
  });

  it("should parse complete font with all properties", () => {
    const xml = `
      <font>
        <sz val="12"/>
        <color theme="1"/>
        <name val="Calibri"/>
        <family val="2"/>
        <scheme val="minor"/>
        <b/>
        <i/>
        <u val="single"/>
        <strike/>
        <vertAlign val="superscript"/>
        <outline/>
        <shadow/>
        <condense/>
        <extend/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result).toEqual({
      name: "Calibri",
      size: 12,
      bold: true,
      italic: true,
      underline: "single",
      strikethrough: true,
      color: { type: "theme", theme: 1, tint: undefined },
      family: 2,
      scheme: "minor",
      vertAlign: "superscript",
      outline: true,
      shadow: true,
      condense: true,
      extend: true,
    });
  });

  it("should handle floating point font size", () => {
    const xml = `
      <font>
        <sz val="11.5"/>
      </font>
    `;
    const result = parseFont(parseRoot(xml));
    expect(result.size).toBe(11.5);
  });
});

// =============================================================================
// parseFonts Tests
// =============================================================================

describe("parseFonts", () => {
  it("should parse empty fonts collection", () => {
    const xml = `<fonts count="0"/>`;
    const result = parseFonts(parseRoot(xml));
    expect(result).toEqual([]);
  });

  it("should parse single font", () => {
    const xml = `
      <fonts count="1">
        <font>
          <sz val="11"/>
          <name val="Calibri"/>
        </font>
      </fonts>
    `;
    const result = parseFonts(parseRoot(xml));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Calibri");
    expect(result[0].size).toBe(11);
  });

  it("should parse multiple fonts", () => {
    const xml = `
      <fonts count="3">
        <font>
          <sz val="11"/>
          <name val="Calibri"/>
        </font>
        <font>
          <sz val="12"/>
          <name val="Arial"/>
          <b/>
        </font>
        <font>
          <sz val="14"/>
          <name val="Times New Roman"/>
          <i/>
          <u/>
        </font>
      </fonts>
    `;
    const result = parseFonts(parseRoot(xml));
    expect(result).toHaveLength(3);

    expect(result[0].name).toBe("Calibri");
    expect(result[0].size).toBe(11);
    expect(result[0].bold).toBeUndefined();

    expect(result[1].name).toBe("Arial");
    expect(result[1].size).toBe(12);
    expect(result[1].bold).toBe(true);

    expect(result[2].name).toBe("Times New Roman");
    expect(result[2].size).toBe(14);
    expect(result[2].italic).toBe(true);
    expect(result[2].underline).toBe("single");
  });

  it("should preserve font order from XML", () => {
    const xml = `
      <fonts count="3">
        <font><name val="First"/></font>
        <font><name val="Second"/></font>
        <font><name val="Third"/></font>
      </fonts>
    `;
    const result = parseFonts(parseRoot(xml));
    expect(result[0].name).toBe("First");
    expect(result[1].name).toBe("Second");
    expect(result[2].name).toBe("Third");
  });

  it("should handle fonts with various color types", () => {
    const xml = `
      <fonts count="4">
        <font>
          <color rgb="FFFF0000"/>
        </font>
        <font>
          <color theme="1"/>
        </font>
        <font>
          <color indexed="64"/>
        </font>
        <font>
          <color auto="1"/>
        </font>
      </fonts>
    `;
    const result = parseFonts(parseRoot(xml));
    expect(result[0].color).toEqual({ type: "rgb", value: "FFFF0000" });
    expect(result[1].color).toEqual({ type: "theme", theme: 1, tint: undefined });
    expect(result[2].color).toEqual({ type: "indexed", index: 64 });
    expect(result[3].color).toEqual({ type: "auto" });
  });

  it("should return readonly array", () => {
    const xml = `
      <fonts count="1">
        <font><name val="Test"/></font>
      </fonts>
    `;
    const result = parseFonts(parseRoot(xml));
    // TypeScript should enforce this is readonly, runtime check
    expect(Array.isArray(result)).toBe(true);
  });
});
