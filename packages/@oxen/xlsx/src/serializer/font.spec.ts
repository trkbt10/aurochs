/**
 * @file Font Serializer Tests
 *
 * Tests for serializing XlsxFont types to XML elements.
 * Includes element order verification per ECMA-376 specification.
 */

import { serializeElement } from "@oxen/xml";
import type { XlsxFont, XlsxColor } from "../domain/style/font";
import { serializeColor, serializeFont, serializeFonts } from "./font";

/**
 * Helper to serialize and get the XML string for comparison.
 */
function toXmlString(font: XlsxFont): string {
  return serializeElement(serializeFont(font));
}

// =============================================================================
// serializeColor Tests
// =============================================================================

describe("serializeColor", () => {
  it("should serialize RGB color", () => {
    const color: XlsxColor = { type: "rgb", value: "FFFF0000" };
    const result = serializeElement(serializeColor(color));
    expect(result).toBe('<color rgb="FFFF0000"/>');
  });

  it("should serialize theme color without tint", () => {
    const color: XlsxColor = { type: "theme", theme: 1 };
    const result = serializeElement(serializeColor(color));
    expect(result).toBe('<color theme="1"/>');
  });

  it("should serialize theme color with tint", () => {
    const color: XlsxColor = { type: "theme", theme: 3, tint: 0.5 };
    const result = serializeElement(serializeColor(color));
    expect(result).toBe('<color theme="3" tint="0.5"/>');
  });

  it("should serialize theme color with negative tint", () => {
    const color: XlsxColor = { type: "theme", theme: 1, tint: -0.25 };
    const result = serializeElement(serializeColor(color));
    expect(result).toBe('<color theme="1" tint="-0.25"/>');
  });

  it("should serialize indexed color", () => {
    const color: XlsxColor = { type: "indexed", index: 64 };
    const result = serializeElement(serializeColor(color));
    expect(result).toBe('<color indexed="64"/>');
  });

  it("should serialize auto color", () => {
    const color: XlsxColor = { type: "auto" };
    const result = serializeElement(serializeColor(color));
    expect(result).toBe('<color auto="1"/>');
  });

  it("should support custom element name", () => {
    const color: XlsxColor = { type: "rgb", value: "FF000000" };
    const result = serializeElement(serializeColor(color, "fgColor"));
    expect(result).toBe('<fgColor rgb="FF000000"/>');
  });
});

// =============================================================================
// serializeFont Tests
// =============================================================================

describe("serializeFont", () => {
  it("should serialize minimal font with name and size", () => {
    const font: XlsxFont = {
      name: "Calibri",
      size: 11,
    };
    const result = toXmlString(font);
    expect(result).toBe('<font><sz val="11"/><name val="Calibri"/></font>');
  });

  it("should serialize bold font", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      bold: true,
    };
    const result = toXmlString(font);
    expect(result).toContain("<b/>");
  });

  it("should not serialize bold when false", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      bold: false,
    };
    const result = toXmlString(font);
    expect(result).not.toContain("<b");
  });

  it("should not serialize bold when undefined", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
    };
    const result = toXmlString(font);
    expect(result).not.toContain("<b");
  });

  it("should serialize italic font", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      italic: true,
    };
    const result = toXmlString(font);
    expect(result).toContain("<i/>");
  });

  it("should not serialize italic when false", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      italic: false,
    };
    const result = toXmlString(font);
    expect(result).not.toContain("<i");
  });

  it("should serialize strikethrough", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      strikethrough: true,
    };
    const result = toXmlString(font);
    expect(result).toContain("<strike/>");
  });

  it("should serialize single underline without val attribute", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      underline: "single",
    };
    const result = toXmlString(font);
    expect(result).toContain("<u/>");
    expect(result).not.toContain('val="single"');
  });

  it("should serialize double underline with val attribute", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      underline: "double",
    };
    const result = toXmlString(font);
    expect(result).toContain('<u val="double"/>');
  });

  it("should serialize singleAccounting underline", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      underline: "singleAccounting",
    };
    const result = toXmlString(font);
    expect(result).toContain('<u val="singleAccounting"/>');
  });

  it("should serialize doubleAccounting underline", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      underline: "doubleAccounting",
    };
    const result = toXmlString(font);
    expect(result).toContain('<u val="doubleAccounting"/>');
  });

  it("should not serialize underline when none", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      underline: "none",
    };
    const result = toXmlString(font);
    expect(result).not.toContain("<u");
  });

  it("should serialize font color", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      color: { type: "rgb", value: "FF0000FF" },
    };
    const result = toXmlString(font);
    expect(result).toContain('<color rgb="FF0000FF"/>');
  });

  it("should serialize font family", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      family: 2,
    };
    const result = toXmlString(font);
    expect(result).toContain('<family val="2"/>');
  });

  it("should serialize scheme as major", () => {
    const font: XlsxFont = {
      name: "Calibri",
      size: 11,
      scheme: "major",
    };
    const result = toXmlString(font);
    expect(result).toContain('<scheme val="major"/>');
  });

  it("should serialize scheme as minor", () => {
    const font: XlsxFont = {
      name: "Calibri",
      size: 11,
      scheme: "minor",
    };
    const result = toXmlString(font);
    expect(result).toContain('<scheme val="minor"/>');
  });

  it("should serialize scheme as none", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 11,
      scheme: "none",
    };
    const result = toXmlString(font);
    expect(result).toContain('<scheme val="none"/>');
  });

  it("should serialize vertAlign as superscript", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      vertAlign: "superscript",
    };
    const result = toXmlString(font);
    expect(result).toContain('<vertAlign val="superscript"/>');
  });

  it("should serialize vertAlign as subscript", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      vertAlign: "subscript",
    };
    const result = toXmlString(font);
    expect(result).toContain('<vertAlign val="subscript"/>');
  });

  it("should serialize vertAlign as baseline", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      vertAlign: "baseline",
    };
    const result = toXmlString(font);
    expect(result).toContain('<vertAlign val="baseline"/>');
  });

  it("should serialize outline", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      outline: true,
    };
    const result = toXmlString(font);
    expect(result).toContain("<outline/>");
  });

  it("should serialize shadow", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      shadow: true,
    };
    const result = toXmlString(font);
    expect(result).toContain("<shadow/>");
  });

  it("should serialize condense", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      condense: true,
    };
    const result = toXmlString(font);
    expect(result).toContain("<condense/>");
  });

  it("should serialize extend", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      extend: true,
    };
    const result = toXmlString(font);
    expect(result).toContain("<extend/>");
  });

  it("should serialize complete font with all properties", () => {
    const font: XlsxFont = {
      name: "Calibri",
      size: 12,
      bold: true,
      italic: true,
      underline: "single",
      strikethrough: true,
      color: { type: "theme", theme: 1 },
      family: 2,
      scheme: "minor",
      vertAlign: "superscript",
      outline: true,
      shadow: true,
      condense: true,
      extend: true,
    };
    const result = toXmlString(font);

    expect(result).toContain("<b/>");
    expect(result).toContain("<i/>");
    expect(result).toContain("<strike/>");
    expect(result).toContain("<condense/>");
    expect(result).toContain("<extend/>");
    expect(result).toContain("<outline/>");
    expect(result).toContain("<shadow/>");
    expect(result).toContain("<u/>");
    expect(result).toContain('<vertAlign val="superscript"/>');
    expect(result).toContain('<sz val="12"/>');
    expect(result).toContain('<color theme="1"/>');
    expect(result).toContain('<name val="Calibri"/>');
    expect(result).toContain('<family val="2"/>');
    expect(result).toContain('<scheme val="minor"/>');
  });

  it("should handle floating point font size", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 11.5,
    };
    const result = toXmlString(font);
    expect(result).toContain('<sz val="11.5"/>');
  });
});

// =============================================================================
// Element Order Tests (ECMA-376 Compliance)
// =============================================================================

describe("serializeFont element order", () => {
  /**
   * ECMA-376 Part 4, Section 18.8.22 defines the order of child elements:
   * 1. b, 2. i, 3. strike, 4. condense, 5. extend, 6. outline, 7. shadow,
   * 8. u, 9. vertAlign, 10. sz, 11. color, 12. name, 13. family, 14. charset, 15. scheme
   */

  it("should output b before i", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      bold: true,
      italic: true,
    };
    const result = toXmlString(font);
    const bIndex = result.indexOf("<b/>");
    const iIndex = result.indexOf("<i/>");
    expect(bIndex).toBeLessThan(iIndex);
  });

  it("should output i before strike", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      italic: true,
      strikethrough: true,
    };
    const result = toXmlString(font);
    const iIndex = result.indexOf("<i/>");
    const strikeIndex = result.indexOf("<strike/>");
    expect(iIndex).toBeLessThan(strikeIndex);
  });

  it("should output strike before condense", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      strikethrough: true,
      condense: true,
    };
    const result = toXmlString(font);
    const strikeIndex = result.indexOf("<strike/>");
    const condenseIndex = result.indexOf("<condense/>");
    expect(strikeIndex).toBeLessThan(condenseIndex);
  });

  it("should output condense before extend", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      condense: true,
      extend: true,
    };
    const result = toXmlString(font);
    const condenseIndex = result.indexOf("<condense/>");
    const extendIndex = result.indexOf("<extend/>");
    expect(condenseIndex).toBeLessThan(extendIndex);
  });

  it("should output extend before outline", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      extend: true,
      outline: true,
    };
    const result = toXmlString(font);
    const extendIndex = result.indexOf("<extend/>");
    const outlineIndex = result.indexOf("<outline/>");
    expect(extendIndex).toBeLessThan(outlineIndex);
  });

  it("should output outline before shadow", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      outline: true,
      shadow: true,
    };
    const result = toXmlString(font);
    const outlineIndex = result.indexOf("<outline/>");
    const shadowIndex = result.indexOf("<shadow/>");
    expect(outlineIndex).toBeLessThan(shadowIndex);
  });

  it("should output shadow before u", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      shadow: true,
      underline: "single",
    };
    const result = toXmlString(font);
    const shadowIndex = result.indexOf("<shadow/>");
    const uIndex = result.indexOf("<u/>");
    expect(shadowIndex).toBeLessThan(uIndex);
  });

  it("should output u before vertAlign", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      underline: "single",
      vertAlign: "superscript",
    };
    const result = toXmlString(font);
    const uIndex = result.indexOf("<u/>");
    const vertAlignIndex = result.indexOf("<vertAlign");
    expect(uIndex).toBeLessThan(vertAlignIndex);
  });

  it("should output vertAlign before sz", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      vertAlign: "superscript",
    };
    const result = toXmlString(font);
    const vertAlignIndex = result.indexOf("<vertAlign");
    const szIndex = result.indexOf("<sz");
    expect(vertAlignIndex).toBeLessThan(szIndex);
  });

  it("should output sz before color", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      color: { type: "rgb", value: "FF000000" },
    };
    const result = toXmlString(font);
    const szIndex = result.indexOf("<sz");
    const colorIndex = result.indexOf("<color");
    expect(szIndex).toBeLessThan(colorIndex);
  });

  it("should output color before name", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      color: { type: "rgb", value: "FF000000" },
    };
    const result = toXmlString(font);
    const colorIndex = result.indexOf("<color");
    const nameIndex = result.indexOf("<name");
    expect(colorIndex).toBeLessThan(nameIndex);
  });

  it("should output name before family", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      family: 2,
    };
    const result = toXmlString(font);
    const nameIndex = result.indexOf("<name");
    const familyIndex = result.indexOf("<family");
    expect(nameIndex).toBeLessThan(familyIndex);
  });

  it("should output family before scheme", () => {
    const font: XlsxFont = {
      name: "Calibri",
      size: 11,
      family: 2,
      scheme: "minor",
    };
    const result = toXmlString(font);
    const familyIndex = result.indexOf("<family");
    const schemeIndex = result.indexOf("<scheme");
    expect(familyIndex).toBeLessThan(schemeIndex);
  });

  it("should maintain correct order for all elements", () => {
    const font: XlsxFont = {
      name: "Calibri",
      size: 11,
      bold: true,
      italic: true,
      strikethrough: true,
      condense: true,
      extend: true,
      outline: true,
      shadow: true,
      underline: "double",
      vertAlign: "subscript",
      color: { type: "theme", theme: 1, tint: 0.5 },
      family: 2,
      scheme: "minor",
    };
    const result = toXmlString(font);

    // Get indices of all elements
    const indices = {
      b: result.indexOf("<b/>"),
      i: result.indexOf("<i/>"),
      strike: result.indexOf("<strike/>"),
      condense: result.indexOf("<condense/>"),
      extend: result.indexOf("<extend/>"),
      outline: result.indexOf("<outline/>"),
      shadow: result.indexOf("<shadow/>"),
      u: result.indexOf("<u "),
      vertAlign: result.indexOf("<vertAlign"),
      sz: result.indexOf("<sz"),
      color: result.indexOf("<color"),
      name: result.indexOf("<name"),
      family: result.indexOf("<family"),
      scheme: result.indexOf("<scheme"),
    };

    // Verify order: b < i < strike < condense < extend < outline < shadow < u < vertAlign < sz < color < name < family < scheme
    expect(indices.b).toBeLessThan(indices.i);
    expect(indices.i).toBeLessThan(indices.strike);
    expect(indices.strike).toBeLessThan(indices.condense);
    expect(indices.condense).toBeLessThan(indices.extend);
    expect(indices.extend).toBeLessThan(indices.outline);
    expect(indices.outline).toBeLessThan(indices.shadow);
    expect(indices.shadow).toBeLessThan(indices.u);
    expect(indices.u).toBeLessThan(indices.vertAlign);
    expect(indices.vertAlign).toBeLessThan(indices.sz);
    expect(indices.sz).toBeLessThan(indices.color);
    expect(indices.color).toBeLessThan(indices.name);
    expect(indices.name).toBeLessThan(indices.family);
    expect(indices.family).toBeLessThan(indices.scheme);
  });
});

// =============================================================================
// serializeFonts Tests
// =============================================================================

describe("serializeFonts", () => {
  it("should serialize empty fonts collection", () => {
    const result = serializeElement(serializeFonts([]));
    expect(result).toBe('<fonts count="0"/>');
  });

  it("should serialize single font", () => {
    const fonts: XlsxFont[] = [{ name: "Calibri", size: 11 }];
    const result = serializeElement(serializeFonts(fonts));
    expect(result).toBe(
      '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>',
    );
  });

  it("should serialize multiple fonts", () => {
    const fonts: XlsxFont[] = [
      { name: "Calibri", size: 11 },
      { name: "Arial", size: 12, bold: true },
      { name: "Times New Roman", size: 14, italic: true, underline: "single" },
    ];
    const result = serializeElement(serializeFonts(fonts));

    expect(result).toContain('count="3"');
    expect(result).toContain('<name val="Calibri"/>');
    expect(result).toContain('<name val="Arial"/>');
    expect(result).toContain("<b/>");
    expect(result).toContain('<name val="Times New Roman"/>');
    expect(result).toContain("<i/>");
    expect(result).toContain("<u/>");
  });

  it("should preserve font order", () => {
    const fonts: XlsxFont[] = [
      { name: "First", size: 10 },
      { name: "Second", size: 11 },
      { name: "Third", size: 12 },
    ];
    const result = serializeElement(serializeFonts(fonts));

    const firstIndex = result.indexOf("First");
    const secondIndex = result.indexOf("Second");
    const thirdIndex = result.indexOf("Third");

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  it("should handle fonts with various color types", () => {
    const fonts: XlsxFont[] = [
      { name: "Font1", size: 11, color: { type: "rgb", value: "FFFF0000" } },
      { name: "Font2", size: 11, color: { type: "theme", theme: 1 } },
      { name: "Font3", size: 11, color: { type: "indexed", index: 64 } },
      { name: "Font4", size: 11, color: { type: "auto" } },
    ];
    const result = serializeElement(serializeFonts(fonts));

    expect(result).toContain('rgb="FFFF0000"');
    expect(result).toContain('theme="1"');
    expect(result).toContain('indexed="64"');
    expect(result).toContain('auto="1"');
  });

  it("should correctly count fonts", () => {
    const fonts: XlsxFont[] = Array.from({ length: 5 }, (_, i) => ({
      name: `Font${i}`,
      size: 10 + i,
    }));
    const result = serializeElement(serializeFonts(fonts));
    expect(result).toContain('count="5"');
  });
});

// =============================================================================
// Round-trip Tests (Parser + Serializer)
// =============================================================================

describe("round-trip compatibility", () => {
  it("should produce XML that matches expected format for basic font", () => {
    const font: XlsxFont = {
      name: "Calibri",
      size: 11,
      color: { type: "theme", theme: 1 },
      family: 2,
      scheme: "minor",
    };
    const result = toXmlString(font);
    expect(result).toBe(
      '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>',
    );
  });

  it("should produce XML that matches expected format for bold italic font", () => {
    const font: XlsxFont = {
      name: "Arial",
      size: 12,
      bold: true,
      italic: true,
    };
    const result = toXmlString(font);
    expect(result).toBe(
      '<font><b/><i/><sz val="12"/><name val="Arial"/></font>',
    );
  });
});
