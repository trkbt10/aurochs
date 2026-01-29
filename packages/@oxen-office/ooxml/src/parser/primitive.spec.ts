import {
  getAngleAttr,
  getBoolAttr,
  getEmuAttr,
  getPercent100kAttr,
  parseAngle,
  parseBoolean,
  parseEmu,
  parseLineWidth,
  parseFixedPercentage,
  parsePercentage,
  parsePercentage100k,
  parseSchemeColorValue,
} from "./primitive";
import { parseXml, getByPath } from "@oxen/xml";

describe("ooxml/parser/primitive", () => {
  it("parseBoolean supports OOXML values", () => {
    expect(parseBoolean("1")).toBe(true);
    expect(parseBoolean("true")).toBe(true);
    expect(parseBoolean("on")).toBe(true);
    expect(parseBoolean("")).toBe(true);
    expect(parseBoolean("0")).toBe(false);
    expect(parseBoolean("false")).toBe(false);
    expect(parseBoolean("off")).toBe(false);
    expect(parseBoolean("wat")).toBeUndefined();
  });

  it("parseEmu converts EMU to pixels (914400 => 96px)", () => {
    expect(parseEmu("914400")).toBe(96);
  });

  it("parseLineWidth enforces bounds", () => {
    expect(parseLineWidth("0")).toBe(0);
    expect(parseLineWidth("20116800")).toBe(2112);
    expect(parseLineWidth("-1")).toBeUndefined();
    expect(parseLineWidth("20116801")).toBeUndefined();
  });

  it("parseAngle converts OOXML angle units (60000 => 1deg)", () => {
    expect(parseAngle("60000")).toBe(1);
    expect(parseAngle("5400000")).toBe(90);
  });

  it("parsePercentage handles 1000ths", () => {
    expect(parsePercentage("50000")).toBe(50);
  });

  it("parsePercentage100k handles 100000ths", () => {
    expect(parsePercentage100k("50000")).toBe(50);
    expect(parsePercentage100k("100000")).toBe(100);
  });

  it("parseFixedPercentage enforces 0-100", () => {
    expect(parseFixedPercentage("0")).toBe(0);
    expect(parseFixedPercentage("100000")).toBe(100);
    expect(parseFixedPercentage("-1")).toBeUndefined();
    expect(parseFixedPercentage("100001")).toBeUndefined();
  });

  it("parseSchemeColorValue accepts known values", () => {
    expect(parseSchemeColorValue("accent1")).toBe("accent1");
    expect(parseSchemeColorValue("phClr")).toBe("phClr");
    expect(parseSchemeColorValue("nope")).toBeUndefined();
  });

  it("attribute helpers parse values", () => {
    const xml = parseXml(`
      <a:root xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
        emu="914400" ang="5400000" pct="50000" flag="1" />`);
    const el = getByPath(xml, ["a:root"]);
    expect(el).toBeTruthy();
    if (!el) {throw new Error("missing a:root");}

    expect(getEmuAttr(el, "emu")).toBe(96);
    expect(getAngleAttr(el, "ang")).toBe(90);
    expect(getPercent100kAttr(el, "pct")).toBe(50);
    expect(getBoolAttr(el, "flag")).toBe(true);
  });
});
