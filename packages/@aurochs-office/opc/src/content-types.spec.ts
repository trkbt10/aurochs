/**
 * @file Content types parsing and macro format detection tests
 */

import { describe, expect, it } from "vitest";
import { parseXml } from "@aurochs/xml";
import {
  MACRO_ENABLED_CONTENT_TYPES,
  parseContentTypes,
  contentTypesToEntries,
  detectMacroFormat,
  detectMacroFormatFromXml,
} from "./content-types";

describe("parseContentTypes", () => {
  it("parses defaults and overrides from [Content_Types].xml", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    const doc = parseXml(xml);
    const result = parseContentTypes(doc);

    expect(result.defaults.get("rels")).toBe(
      "application/vnd.openxmlformats-package.relationships+xml"
    );
    expect(result.defaults.get("xml")).toBe("application/xml");
    expect(result.overrides.get("/xl/workbook.xml")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
    );
    expect(result.overrides.get("/xl/worksheets/sheet1.xml")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
    );
  });

  it("handles empty Types element", () => {
    const xml = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>`;
    const doc = parseXml(xml);
    const result = parseContentTypes(doc);

    expect(result.defaults.size).toBe(0);
    expect(result.overrides.size).toBe(0);
  });

  it("ignores malformed entries", () => {
    const xml = `<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml"/>
  <Override PartName="/missing-content-type.xml"/>
  <Default ContentType="missing-extension"/>
</Types>`;
    const doc = parseXml(xml);
    const result = parseContentTypes(doc);

    expect(result.defaults.size).toBe(0);
    expect(result.overrides.size).toBe(0);
  });
});

describe("contentTypesToEntries", () => {
  it("converts parsed content types to entries array", () => {
    const parsed = {
      defaults: new Map([
        ["xml", "application/xml"],
        ["rels", "application/vnd.openxmlformats-package.relationships+xml"],
      ]),
      overrides: new Map([
        ["/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"],
      ]),
    };

    const entries = contentTypesToEntries(parsed);

    expect(entries).toHaveLength(3);
    expect(entries.filter((e) => e.kind === "default")).toHaveLength(2);
    expect(entries.filter((e) => e.kind === "override")).toHaveLength(1);
  });
});

describe("detectMacroFormat", () => {
  it("detects xlsm from macro-enabled workbook content type", () => {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map([
        ["/xl/workbook.xml", MACRO_ENABLED_CONTENT_TYPES.xlsm],
      ]),
    };

    expect(detectMacroFormat(parsed)).toBe("xlsm");
  });

  it("detects docm from macro-enabled document content type", () => {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map([
        ["/word/document.xml", MACRO_ENABLED_CONTENT_TYPES.docm],
      ]),
    };

    expect(detectMacroFormat(parsed)).toBe("docm");
  });

  it("detects pptm from macro-enabled presentation content type", () => {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map([
        ["/ppt/presentation.xml", MACRO_ENABLED_CONTENT_TYPES.pptm],
      ]),
    };

    expect(detectMacroFormat(parsed)).toBe("pptm");
  });

  it("detects ppsm from macro-enabled slideshow content type", () => {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map([
        ["/ppt/presentation.xml", MACRO_ENABLED_CONTENT_TYPES.ppsm],
      ]),
    };

    expect(detectMacroFormat(parsed)).toBe("ppsm");
  });

  it("returns null for non-macro xlsx content type", () => {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map([
        ["/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"],
      ]),
    };

    expect(detectMacroFormat(parsed)).toBeNull();
  });

  it("returns null for non-macro docx content type", () => {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map([
        ["/word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"],
      ]),
    };

    expect(detectMacroFormat(parsed)).toBeNull();
  });

  it("returns null for non-macro pptx content type", () => {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map([
        ["/ppt/presentation.xml", "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"],
      ]),
    };

    expect(detectMacroFormat(parsed)).toBeNull();
  });

  it("returns null when no main part is found", () => {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map([
        ["/some/other/path.xml", MACRO_ENABLED_CONTENT_TYPES.xlsm],
      ]),
    };

    expect(detectMacroFormat(parsed)).toBeNull();
  });
});

describe("detectMacroFormatFromXml", () => {
  it("detects xlsm format from full [Content_Types].xml", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="${MACRO_ENABLED_CONTENT_TYPES.xlsm}"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    const doc = parseXml(xml);
    expect(detectMacroFormatFromXml(doc)).toBe("xlsm");
  });

  it("detects docm format from full [Content_Types].xml", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="${MACRO_ENABLED_CONTENT_TYPES.docm}"/>
</Types>`;

    const doc = parseXml(xml);
    expect(detectMacroFormatFromXml(doc)).toBe("docm");
  });

  it("returns null for regular xlsx", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
</Types>`;

    const doc = parseXml(xml);
    expect(detectMacroFormatFromXml(doc)).toBeNull();
  });
});
