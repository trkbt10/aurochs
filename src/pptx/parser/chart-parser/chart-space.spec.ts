/**
 * @file Tests for chart-space parsing
 */

import type { XmlElement } from "../../../xml";
import {
  parseView3D,
  parseChartSurface,
  parsePictureOptions,
  parseDataTable,
  parsePivotSource,
  parsePivotFormats,
  parseProtection,
  parsePrintSettings,
  parseHeaderFooter,
  parsePageMargins,
  parsePageSetup,
  parseUserShapesRelId,
} from "./chart-space";

function el(
  name: string,
  attrs: Record<string, string> = {},
  children: (XmlElement | { type: "text"; value: string })[] = [],
): XmlElement {
  return { type: "element", name, attrs, children };
}

function text(value: string): { type: "text"; value: string } {
  return { type: "text", value };
}

// =============================================================================
// parseView3D
// =============================================================================

describe("parseView3D - c:view3D", () => {
  it("parses rotation and perspective", () => {
    const view3d = el("c:view3D", {}, [
      el("c:rotX", { val: "30" }),
      el("c:rotY", { val: "15" }),
      el("c:hPercent", { val: "50%" }),
      el("c:depthPercent", { val: "120%" }),
      el("c:rAngAx", { val: "1" }),
      el("c:perspective", { val: "30" }),
    ]);
    const result = parseView3D(view3d);

    expect(result?.rotX).toBe(30);
    expect(result?.rotY).toBe(15);
    expect(result?.hPercent).toBe(50);
    expect(result?.depthPercent).toBe(120);
    expect(result?.rAngAx).toBe(true);
    expect(result?.perspective).toBe(30);
  });
});

// =============================================================================
// parsePictureOptions / parseChartSurface
// =============================================================================

describe("parsePictureOptions - c:pictureOptions", () => {
  it("parses picture options", () => {
    const options = el("c:pictureOptions", {}, [
      el("c:applyToFront", { val: "1" }),
      el("c:applyToSides", { val: "0" }),
      el("c:applyToEnd", { val: "1" }),
      el("c:pictureFormat", { val: "stretch" }),
      el("c:pictureStackUnit", { val: "2.5" }),
    ]);
    const result = parsePictureOptions(options);

    expect(result?.applyToFront).toBe(true);
    expect(result?.applyToSides).toBe(false);
    expect(result?.applyToEnd).toBe(true);
    expect(result?.pictureFormat).toBe("stretch");
    expect(result?.pictureStackUnit).toBe(2.5);
  });
});

describe("parseChartSurface - c:surface", () => {
  it("parses surface properties", () => {
    const surface = el("c:surface", {}, [
      el("c:thickness", { val: "50%" }),
      el("c:pictureOptions", {}, [el("c:pictureFormat", { val: "stack" })]),
    ]);
    const result = parseChartSurface(surface);

    expect(result?.thickness).toBe(50);
    expect(result?.pictureOptions?.pictureFormat).toBe("stack");
  });
});

// =============================================================================
// parseDataTable
// =============================================================================

describe("parseDataTable - c:dTable", () => {
  it("parses data table flags", () => {
    const dTable = el("c:dTable", {}, [
      el("c:showHorzBorder", { val: "1" }),
      el("c:showVertBorder", { val: "0" }),
      el("c:showOutline", { val: "1" }),
      el("c:showKeys", { val: "1" }),
    ]);
    const result = parseDataTable(dTable);

    expect(result?.showHorzBorder).toBe(true);
    expect(result?.showVertBorder).toBe(false);
    expect(result?.showOutline).toBe(true);
    expect(result?.showKeys).toBe(true);
  });
});

// =============================================================================
// Pivot / Protection / Print settings
// =============================================================================

describe("parsePivotSource - c:pivotSource", () => {
  it("parses name and fmtId", () => {
    const pivotSource = el("c:pivotSource", {}, [
      el("c:name", {}, [text("PivotTable1")]),
      el("c:fmtId", { val: "3" }),
    ]);
    const result = parsePivotSource(pivotSource);

    expect(result?.name).toBe("PivotTable1");
    expect(result?.fmtId).toBe(3);
  });
});

describe("parsePivotFormats - c:pivotFmts", () => {
  it("parses pivot formats", () => {
    const pivotFmts = el("c:pivotFmts", {}, [
      el("c:pivotFmt", {}, [el("c:idx", { val: "1" })]),
      el("c:pivotFmt", {}, [el("c:idx", { val: "2" })]),
    ]);
    const result = parsePivotFormats(pivotFmts);

    expect(result?.formats.length).toBe(2);
    expect(result?.formats[0].idx).toBe(1);
    expect(result?.formats[1].idx).toBe(2);
  });
});

describe("parseProtection - c:protection", () => {
  it("parses protection flags", () => {
    const protection = el("c:protection", {}, [
      el("c:chartObject", { val: "1" }),
      el("c:data", { val: "0" }),
      el("c:formatting", { val: "1" }),
      el("c:selection", { val: "1" }),
      el("c:userInterface", { val: "0" }),
    ]);
    const result = parseProtection(protection);

    expect(result?.chartObject).toBe(true);
    expect(result?.data).toBe(false);
    expect(result?.formatting).toBe(true);
    expect(result?.selection).toBe(true);
    expect(result?.userInterface).toBe(false);
  });
});

describe("print settings parsing", () => {
  it("parses header/footer", () => {
    const headerFooter = el("c:headerFooter", { alignWithMargins: "false" }, [
      el("c:oddHeader", {}, [text("Header")]),
      el("c:oddFooter", {}, [text("Footer")]),
    ]);
    const result = parseHeaderFooter(headerFooter);

    expect(result?.oddHeader).toBe("Header");
    expect(result?.oddFooter).toBe("Footer");
    expect(result?.alignWithMargins).toBe(false);
  });

  it("parses page margins", () => {
    const pageMargins = el("c:pageMargins", { l: "1", r: "2", t: "3", b: "4", header: "5", footer: "6" });
    const result = parsePageMargins(pageMargins);

    expect(result?.left).toBe(1);
    expect(result?.right).toBe(2);
    expect(result?.top).toBe(3);
    expect(result?.bottom).toBe(4);
    expect(result?.header).toBe(5);
    expect(result?.footer).toBe(6);
  });

  it("parses page setup", () => {
    const pageSetup = el("c:pageSetup", { paperSize: "1", orientation: "landscape", copies: "2" });
    const result = parsePageSetup(pageSetup);

    expect(result?.paperSize).toBe(1);
    expect(result?.orientation).toBe("landscape");
    expect(result?.copies).toBe(2);
  });

  it("parses print settings", () => {
    const printSettings = el("c:printSettings", {}, [
      el("c:headerFooter", {}, [el("c:oddHeader", {}, [text("H")])]),
      el("c:pageMargins", { l: "1", r: "1", t: "1", b: "1", header: "1", footer: "1" }),
      el("c:pageSetup", { paperSize: "1" }),
    ]);
    const result = parsePrintSettings(printSettings);

    expect(result?.headerFooter?.oddHeader).toBe("H");
    expect(result?.pageMargins?.left).toBe(1);
    expect(result?.pageSetup?.paperSize).toBe(1);
  });
});

// =============================================================================
// parseUserShapesRelId
// =============================================================================

describe("parseUserShapesRelId - c:userShapes", () => {
  it("parses r:id", () => {
    const userShapes = el("c:userShapes", { "r:id": "rId5" });
    const result = parseUserShapesRelId(userShapes);

    expect(result).toBe("rId5");
  });
});
