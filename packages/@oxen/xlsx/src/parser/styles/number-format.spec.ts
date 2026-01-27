/**
 * @file Number Format Parser Tests
 *
 * Tests for parsing numFmt elements from styles.xml.
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import { numFmtId } from "../../domain/types";
import type { XlsxNumberFormat } from "../../domain/style/number-format";
import {
  parseNumFmt,
  parseNumFmts,
  isCustomFormat,
  resolveFormatCode,
} from "./number-format";

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

describe("parseNumFmt", () => {
  it("should parse a numFmt element with numFmtId and formatCode", () => {
    const xml = `<numFmt numFmtId="164" formatCode="#,##0.00"/>`;
    const result = parseNumFmt(parseRoot(xml));

    expect(result).toEqual({
      numFmtId: numFmtId(164),
      formatCode: "#,##0.00",
    });
  });

  it("should parse a numFmt element with empty formatCode", () => {
    const xml = `<numFmt numFmtId="165" formatCode=""/>`;
    const result = parseNumFmt(parseRoot(xml));

    expect(result).toEqual({
      numFmtId: numFmtId(165),
      formatCode: "",
    });
  });

  it("should default formatCode to empty string when missing", () => {
    const xml = `<numFmt numFmtId="166"/>`;
    const result = parseNumFmt(parseRoot(xml));

    expect(result).toEqual({
      numFmtId: numFmtId(166),
      formatCode: "",
    });
  });

  it("should throw when numFmtId is missing", () => {
    const xml = `<numFmt formatCode="#,##0"/>`;
    expect(() => parseNumFmt(parseRoot(xml))).toThrow(
      'Required attribute "numFmtId" is missing or invalid',
    );
  });

  it("should throw when numFmtId is not a valid integer", () => {
    const xml = `<numFmt numFmtId="abc" formatCode="#,##0"/>`;
    expect(() => parseNumFmt(parseRoot(xml))).toThrow(
      'Required attribute "numFmtId" is missing or invalid',
    );
  });

  it("should parse date format codes", () => {
    const xml = `<numFmt numFmtId="167" formatCode="yyyy-mm-dd"/>`;
    const result = parseNumFmt(parseRoot(xml));

    expect(result).toEqual({
      numFmtId: numFmtId(167),
      formatCode: "yyyy-mm-dd",
    });
  });

  it("should parse currency format codes", () => {
    const xml = `<numFmt numFmtId="168" formatCode="&quot;$&quot;#,##0.00"/>`;
    const result = parseNumFmt(parseRoot(xml));

    expect(result).toEqual({
      numFmtId: numFmtId(168),
      formatCode: '"$"#,##0.00',
    });
  });
});

describe("parseNumFmts", () => {
  it("should return empty array when numFmtsElement is undefined", () => {
    const result = parseNumFmts(undefined);
    expect(result).toEqual([]);
  });

  it("should parse empty numFmts element", () => {
    const xml = `<numFmts count="0"/>`;
    const result = parseNumFmts(parseRoot(xml));
    expect(result).toEqual([]);
  });

  it("should parse single numFmt element", () => {
    const xml = `
      <numFmts count="1">
        <numFmt numFmtId="164" formatCode="#,##0.00"/>
      </numFmts>
    `;
    const result = parseNumFmts(parseRoot(xml));

    expect(result).toEqual([
      { numFmtId: numFmtId(164), formatCode: "#,##0.00" },
    ]);
  });

  it("should parse multiple numFmt elements", () => {
    const xml = `
      <numFmts count="3">
        <numFmt numFmtId="164" formatCode="#,##0.00"/>
        <numFmt numFmtId="165" formatCode="yyyy-mm-dd"/>
        <numFmt numFmtId="166" formatCode="0.00%"/>
      </numFmts>
    `;
    const result = parseNumFmts(parseRoot(xml));

    expect(result).toEqual([
      { numFmtId: numFmtId(164), formatCode: "#,##0.00" },
      { numFmtId: numFmtId(165), formatCode: "yyyy-mm-dd" },
      { numFmtId: numFmtId(166), formatCode: "0.00%" },
    ]);
  });

  it("should preserve order of numFmt elements", () => {
    const xml = `
      <numFmts count="2">
        <numFmt numFmtId="200" formatCode="second"/>
        <numFmt numFmtId="164" formatCode="first"/>
      </numFmts>
    `;
    const result = parseNumFmts(parseRoot(xml));

    expect(result[0].numFmtId).toEqual(numFmtId(200));
    expect(result[1].numFmtId).toEqual(numFmtId(164));
  });
});

describe("isCustomFormat", () => {
  it("should return false for built-in format ID 0 (General)", () => {
    expect(isCustomFormat(0)).toBe(false);
  });

  it("should return false for built-in format ID 1", () => {
    expect(isCustomFormat(1)).toBe(false);
  });

  it("should return false for built-in format ID 14 (date)", () => {
    expect(isCustomFormat(14)).toBe(false);
  });

  it("should return false for built-in format ID 49 (text)", () => {
    expect(isCustomFormat(49)).toBe(false);
  });

  it("should return false for last built-in format ID 163", () => {
    expect(isCustomFormat(163)).toBe(false);
  });

  it("should return true for first custom format ID 164", () => {
    expect(isCustomFormat(164)).toBe(true);
  });

  it("should return true for custom format ID 165", () => {
    expect(isCustomFormat(165)).toBe(true);
  });

  it("should return true for high custom format ID", () => {
    expect(isCustomFormat(1000)).toBe(true);
  });
});

describe("resolveFormatCode", () => {
  const customFormats: readonly XlsxNumberFormat[] = [
    { numFmtId: numFmtId(164), formatCode: "#,##0.00" },
    { numFmtId: numFmtId(165), formatCode: "yyyy-mm-dd" },
    { numFmtId: numFmtId(166), formatCode: "0.00%" },
  ];

  describe("built-in formats", () => {
    it("should resolve built-in format ID 0 to General", () => {
      expect(resolveFormatCode(0, customFormats)).toBe("General");
    });

    it("should resolve built-in format ID 1 to 0", () => {
      expect(resolveFormatCode(1, customFormats)).toBe("0");
    });

    it("should resolve built-in format ID 2 to 0.00", () => {
      expect(resolveFormatCode(2, customFormats)).toBe("0.00");
    });

    it("should resolve built-in format ID 9 to 0%", () => {
      expect(resolveFormatCode(9, customFormats)).toBe("0%");
    });

    it("should resolve built-in format ID 14 to mm-dd-yy", () => {
      expect(resolveFormatCode(14, customFormats)).toBe("mm-dd-yy");
    });

    it("should resolve built-in format ID 49 to @ (text)", () => {
      expect(resolveFormatCode(49, customFormats)).toBe("@");
    });
  });

  describe("custom formats", () => {
    it("should resolve custom format ID 164", () => {
      expect(resolveFormatCode(164, customFormats)).toBe("#,##0.00");
    });

    it("should resolve custom format ID 165", () => {
      expect(resolveFormatCode(165, customFormats)).toBe("yyyy-mm-dd");
    });

    it("should resolve custom format ID 166", () => {
      expect(resolveFormatCode(166, customFormats)).toBe("0.00%");
    });
  });

  describe("fallback behavior", () => {
    it("should return General for unknown custom format ID", () => {
      expect(resolveFormatCode(999, customFormats)).toBe("General");
    });

    it("should return General for unknown built-in format ID", () => {
      // ID 5-8 are not defined in BUILTIN_NUMBER_FORMATS
      expect(resolveFormatCode(5, customFormats)).toBe("General");
    });

    it("should return General when custom formats is empty", () => {
      expect(resolveFormatCode(164, [])).toBe("General");
    });
  });

  describe("priority", () => {
    it("should prefer built-in over custom for same ID (hypothetical)", () => {
      // Create a custom format with a built-in ID (shouldn't happen in practice)
      const conflictingFormats: readonly XlsxNumberFormat[] = [
        { numFmtId: numFmtId(0), formatCode: "CUSTOM" },
      ];
      // Built-in should take precedence
      expect(resolveFormatCode(0, conflictingFormats)).toBe("General");
    });
  });
});
