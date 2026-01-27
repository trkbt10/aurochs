/**
 * @file SharedStrings Parser Tests
 *
 * Tests for parsing the shared string table from XLSX files.
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import {
  parseSharedStrings,
  parseSharedStringsRich,
  type SharedStringItem,
  type RichTextRun,
} from "./shared-strings";

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

describe("parseSharedStrings", () => {
  it("should parse an empty shared string table", () => {
    const xml = `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>`;
    const result = parseSharedStrings(parseRoot(xml));
    expect(result).toEqual([]);
  });

  it("should parse plain text strings", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">
        <si><t>Hello</t></si>
        <si><t>World</t></si>
        <si><t>Test</t></si>
      </sst>
    `;
    const result = parseSharedStrings(parseRoot(xml));
    expect(result).toEqual(["Hello", "World", "Test"]);
  });

  it("should handle empty text elements", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">
        <si><t></t></si>
        <si><t/></si>
      </sst>
    `;
    const result = parseSharedStrings(parseRoot(xml));
    expect(result).toEqual(["", ""]);
  });

  it("should parse rich text and concatenate runs", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><t>Hello </t></r>
          <r><rPr><b/></rPr><t>World</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStrings(parseRoot(xml));
    expect(result).toEqual(["Hello World"]);
  });

  it("should handle mixed plain and rich text strings", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">
        <si><t>Plain text</t></si>
        <si>
          <r><t>Rich </t></r>
          <r><rPr><i/></rPr><t>text</t></r>
        </si>
        <si><t>More plain</t></si>
      </sst>
    `;
    const result = parseSharedStrings(parseRoot(xml));
    expect(result).toEqual(["Plain text", "Rich text", "More plain"]);
  });

  it("should handle empty string items", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si></si>
      </sst>
    `;
    const result = parseSharedStrings(parseRoot(xml));
    expect(result).toEqual([""]);
  });

  it("should preserve whitespace in text", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si><t>  spaces  </t></si>
      </sst>
    `;
    const result = parseSharedStrings(parseRoot(xml));
    expect(result).toEqual(["  spaces  "]);
  });
});

describe("parseSharedStringsRich", () => {
  it("should parse an empty shared string table", () => {
    const xml = `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>`;
    const result = parseSharedStringsRich(parseRoot(xml));
    expect(result).toEqual([]);
  });

  it("should parse plain text strings", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">
        <si><t>Hello</t></si>
        <si><t>World</t></si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    expect(result).toEqual([
      { type: "plain", text: "Hello" },
      { type: "plain", text: "World" },
    ] as SharedStringItem[]);
  });

  it("should parse rich text with bold formatting", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><t>Normal </t></r>
          <r><rPr><b/></rPr><t>Bold</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("rich");

    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs).toHaveLength(2);
    expect(richItem.runs[0].text).toBe("Normal ");
    expect(richItem.runs[0].properties).toBeUndefined();
    expect(richItem.runs[1].text).toBe("Bold");
    expect(richItem.runs[1].properties?.bold).toBe(true);
  });

  it("should parse rich text with italic formatting", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><i/></rPr><t>Italic</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.italic).toBe(true);
  });

  it("should parse rich text with underline formatting", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><u/></rPr><t>Underlined</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.underline).toBe(true);
  });

  it("should parse rich text with strikethrough formatting", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><strike/></rPr><t>Strikethrough</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.strike).toBe(true);
  });

  it("should parse rich text with font size", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><sz val="14"/></rPr><t>Large</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.fontSize).toBe(14);
  });

  it("should parse rich text with font name", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><rFont val="Arial"/></rPr><t>Arial text</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.fontName).toBe("Arial");
  });

  it("should parse rich text with RGB color", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><color rgb="FFFF0000"/></rPr><t>Red</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.color).toEqual({
      type: "rgb",
      value: "FFFF0000",
    });
  });

  it("should parse rich text with theme color", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><color theme="1"/></rPr><t>Theme color</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.color).toEqual({
      type: "theme",
      theme: 1,
      tint: undefined,
    });
  });

  it("should parse rich text with theme color and tint", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><color theme="1" tint="0.5"/></rPr><t>Tinted</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.color).toEqual({
      type: "theme",
      theme: 1,
      tint: 0.5,
    });
  });

  it("should parse rich text with indexed color", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><color indexed="10"/></rPr><t>Indexed color</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.color).toEqual({
      type: "indexed",
      index: 10,
    });
  });

  it("should parse rich text with auto color", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r><rPr><color auto="1"/></rPr><t>Auto color</t></r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    expect(richItem.runs[0].properties?.color).toEqual({ type: "auto" });
  });

  it("should parse rich text with multiple formatting properties", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r>
            <rPr>
              <b/>
              <i/>
              <sz val="12"/>
              <rFont val="Calibri"/>
              <color rgb="FF0000FF"/>
            </rPr>
            <t>Formatted</t>
          </r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    const props = richItem.runs[0].properties;
    expect(props?.bold).toBe(true);
    expect(props?.italic).toBe(true);
    expect(props?.fontSize).toBe(12);
    expect(props?.fontName).toBe("Calibri");
    expect(props?.color).toEqual({ type: "rgb", value: "FF0000FF" });
  });

  it("should handle val='0' and val='false' as false for boolean properties", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r>
            <rPr>
              <b val="0"/>
              <i val="false"/>
            </rPr>
            <t>Not formatted</t>
          </r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    const props = richItem.runs[0].properties;
    expect(props?.bold).toBe(false);
    expect(props?.italic).toBe(false);
  });

  it("should handle underline val='none' as false", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si>
          <r>
            <rPr>
              <u val="none"/>
            </rPr>
            <t>Not underlined</t>
          </r>
        </si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    const richItem = result[0] as { type: "rich"; runs: readonly RichTextRun[] };
    const props = richItem.runs[0].properties;
    expect(props?.underline).toBe(false);
  });

  it("should handle empty string items", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
        <si></si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    expect(result).toEqual([{ type: "plain", text: "" }] as SharedStringItem[]);
  });

  it("should handle mixed plain and rich strings", () => {
    const xml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">
        <si><t>Plain</t></si>
        <si>
          <r><rPr><b/></rPr><t>Rich</t></r>
        </si>
        <si><t>More plain</t></si>
      </sst>
    `;
    const result = parseSharedStringsRich(parseRoot(xml));
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("plain");
    expect(result[1].type).toBe("rich");
    expect(result[2].type).toBe("plain");
  });
});
