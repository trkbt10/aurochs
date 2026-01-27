/**
 * @file Number Format Serializer Tests
 *
 * Tests for serializing XlsxNumberFormat objects to XML elements.
 */

import type { XmlElement } from "@oxen/xml";
import { serializeElement } from "@oxen/xml";
import { numFmtId } from "../domain/types";
import type { XlsxNumberFormat } from "../domain/style/number-format";
import { BUILTIN_NUMBER_FORMATS } from "../domain/style/number-format";
import { serializeNumFmt, serializeNumFmts } from "./number-format";

describe("serializeNumFmt", () => {
  it("should serialize a simple number format", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(164),
      formatCode: "#,##0.00",
    };

    const result = serializeNumFmt(format);

    expect(result).toEqual({
      type: "element",
      name: "numFmt",
      attrs: {
        numFmtId: "164",
        formatCode: "#,##0.00",
      },
      children: [],
    });
  });

  it("should serialize a date format", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(165),
      formatCode: "yyyy-mm-dd",
    };

    const result = serializeNumFmt(format);

    expect(result.attrs.numFmtId).toBe("165");
    expect(result.attrs.formatCode).toBe("yyyy-mm-dd");
  });

  it("should preserve double quotes in XmlElement (escaping done by XML serializer)", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(166),
      formatCode: '#,##0.00 "円"',
    };

    const result = serializeNumFmt(format);

    // XmlElement stores raw value; escaping is done by serializeElement
    expect(result.attrs.formatCode).toBe('#,##0.00 "円"');
  });

  it("should preserve ampersand in XmlElement (escaping done by XML serializer)", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(167),
      formatCode: "0 & text",
    };

    const result = serializeNumFmt(format);

    expect(result.attrs.formatCode).toBe("0 & text");
  });

  it("should preserve less-than and greater-than in XmlElement", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(168),
      formatCode: "[<100]0;[>=100]#,##0",
    };

    const result = serializeNumFmt(format);

    expect(result.attrs.formatCode).toBe("[<100]0;[>=100]#,##0");
  });

  it("should preserve single quote in XmlElement", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(169),
      formatCode: "0'text'",
    };

    const result = serializeNumFmt(format);

    expect(result.attrs.formatCode).toBe("0'text'");
  });

  it("should handle empty format code", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(170),
      formatCode: "",
    };

    const result = serializeNumFmt(format);

    expect(result.attrs.formatCode).toBe("");
  });

  it("should preserve complex currency format in XmlElement", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(171),
      formatCode: '"$"#,##0.00;[Red]"$"-#,##0.00',
    };

    const result = serializeNumFmt(format);

    // XmlElement stores raw value
    expect(result.attrs.formatCode).toBe('"$"#,##0.00;[Red]"$"-#,##0.00');
  });

  it("should escape special characters when serialized to XML string", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(172),
      formatCode: '"$"#,##0.00 & [<100]',
    };

    const element = serializeNumFmt(format);
    const xml = serializeElement(element);

    // XML serializer escapes special characters
    expect(xml).toBe(
      '<numFmt numFmtId="172" formatCode="&quot;$&quot;#,##0.00 &amp; [&lt;100]"/>',
    );
  });

  it("should produce valid XML when serialized", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(164),
      formatCode: "#,##0.00",
    };

    const element = serializeNumFmt(format);
    const xml = serializeElement(element);

    expect(xml).toBe('<numFmt numFmtId="164" formatCode="#,##0.00"/>');
  });

  it("should produce valid XML with escaped characters", () => {
    const format: XlsxNumberFormat = {
      numFmtId: numFmtId(164),
      formatCode: '#,##0.00 "円"',
    };

    const element = serializeNumFmt(format);
    const xml = serializeElement(element);

    expect(xml).toBe(
      '<numFmt numFmtId="164" formatCode="#,##0.00 &quot;円&quot;"/>',
    );
  });
});

describe("serializeNumFmts", () => {
  it("should return undefined for empty array", () => {
    const result = serializeNumFmts([]);

    expect(result).toBeUndefined();
  });

  it("should return undefined when only built-in formats exist", () => {
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(0), formatCode: "General" },
      { numFmtId: numFmtId(1), formatCode: "0" },
      { numFmtId: numFmtId(14), formatCode: "mm-dd-yy" },
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeUndefined();
  });

  it("should serialize single custom format", () => {
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(164), formatCode: "#,##0.00" },
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeDefined();
    expect(result!.type).toBe("element");
    expect(result!.name).toBe("numFmts");
    expect(result!.attrs.count).toBe("1");
    expect(result!.children.length).toBe(1);
  });

  it("should serialize multiple custom formats", () => {
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(164), formatCode: "#,##0.00" },
      { numFmtId: numFmtId(165), formatCode: "yyyy-mm-dd" },
      { numFmtId: numFmtId(166), formatCode: "0.00%" },
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeDefined();
    expect(result!.attrs.count).toBe("3");
    expect(result!.children.length).toBe(3);

    // Check first child
    const firstChild = result!.children[0] as XmlElement;
    expect(firstChild.attrs.numFmtId).toBe("164");
    expect(firstChild.attrs.formatCode).toBe("#,##0.00");

    // Check second child
    const secondChild = result!.children[1] as XmlElement;
    expect(secondChild.attrs.numFmtId).toBe("165");
    expect(secondChild.attrs.formatCode).toBe("yyyy-mm-dd");

    // Check third child
    const thirdChild = result!.children[2] as XmlElement;
    expect(thirdChild.attrs.numFmtId).toBe("166");
    expect(thirdChild.attrs.formatCode).toBe("0.00%");
  });

  it("should filter out built-in formats from mixed array", () => {
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(0), formatCode: "General" }, // built-in
      { numFmtId: numFmtId(164), formatCode: "#,##0.00" }, // custom
      { numFmtId: numFmtId(14), formatCode: "mm-dd-yy" }, // built-in
      { numFmtId: numFmtId(165), formatCode: "yyyy-mm-dd" }, // custom
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeDefined();
    expect(result!.attrs.count).toBe("2");
    expect(result!.children.length).toBe(2);

    // Verify only custom formats are included
    const children = result!.children as XmlElement[];
    expect(children[0].attrs.numFmtId).toBe("164");
    expect(children[1].attrs.numFmtId).toBe("165");
  });

  it("should preserve order of custom formats", () => {
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(200), formatCode: "second" },
      { numFmtId: numFmtId(164), formatCode: "first" },
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeDefined();
    const children = result!.children as XmlElement[];
    expect(children[0].attrs.numFmtId).toBe("200");
    expect(children[1].attrs.numFmtId).toBe("164");
  });

  it("should treat ID 163 as built-in (last built-in ID)", () => {
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(163), formatCode: "some-format" },
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeUndefined();
  });

  it("should treat ID 164 as custom (first custom ID)", () => {
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(164), formatCode: "some-format" },
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeDefined();
    expect(result!.attrs.count).toBe("1");
  });

  it("should produce valid XML when serialized", () => {
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(164), formatCode: "#,##0.00" },
      { numFmtId: numFmtId(165), formatCode: "yyyy-mm-dd" },
    ];

    const result = serializeNumFmts(formats);
    const xml = serializeElement(result!);

    expect(xml).toBe(
      '<numFmts count="2">' +
        '<numFmt numFmtId="164" formatCode="#,##0.00"/>' +
        '<numFmt numFmtId="165" formatCode="yyyy-mm-dd"/>' +
        "</numFmts>",
    );
  });
});

describe("BUILTIN_NUMBER_FORMATS integration", () => {
  it("should not serialize any built-in format IDs defined in BUILTIN_NUMBER_FORMATS", () => {
    // Create formats using all built-in IDs from BUILTIN_NUMBER_FORMATS
    const builtinFormats: XlsxNumberFormat[] = [];
    for (const [id, code] of BUILTIN_NUMBER_FORMATS) {
      builtinFormats.push({
        numFmtId: numFmtId(id),
        formatCode: code,
      });
    }

    const result = serializeNumFmts(builtinFormats);

    expect(result).toBeUndefined();
  });

  it("should correctly serialize custom formats alongside built-in references", () => {
    const formats: XlsxNumberFormat[] = [
      // Built-in formats that should be filtered out
      { numFmtId: numFmtId(0), formatCode: "General" },
      { numFmtId: numFmtId(1), formatCode: "0" },
      { numFmtId: numFmtId(2), formatCode: "0.00" },
      // Custom formats that should be included
      { numFmtId: numFmtId(164), formatCode: 'yyyy"年"m"月"d"日"' },
      { numFmtId: numFmtId(165), formatCode: "#,##0.00;[Red]-#,##0.00" },
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeDefined();
    expect(result!.attrs.count).toBe("2");

    // XmlElement stores raw values
    const children = result!.children as XmlElement[];
    expect(children[0].attrs.formatCode).toBe('yyyy"年"m"月"d"日"');
    expect(children[1].attrs.formatCode).toBe("#,##0.00;[Red]-#,##0.00");

    // Verify XML output is properly escaped
    const xml = serializeElement(result!);
    expect(xml).toContain('yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;');
  });

  it("should handle all built-in format IDs from 0 to 163 as built-in", () => {
    // Test boundary: IDs 0-163 are built-in
    const formats: XlsxNumberFormat[] = [];
    for (let i = 0; i <= 163; i++) {
      formats.push({
        numFmtId: numFmtId(i),
        formatCode: `format-${i}`,
      });
    }

    const result = serializeNumFmts(formats);

    expect(result).toBeUndefined();
  });

  it("should handle all custom format IDs from 164 onwards", () => {
    // Test some custom IDs
    const formats: XlsxNumberFormat[] = [
      { numFmtId: numFmtId(164), formatCode: "custom-164" },
      { numFmtId: numFmtId(500), formatCode: "custom-500" },
      { numFmtId: numFmtId(1000), formatCode: "custom-1000" },
    ];

    const result = serializeNumFmts(formats);

    expect(result).toBeDefined();
    expect(result!.attrs.count).toBe("3");
  });
});
