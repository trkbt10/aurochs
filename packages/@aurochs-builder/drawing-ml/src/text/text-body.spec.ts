import { describe, expect, it } from "bun:test";
import { buildTextRun, buildParagraph, buildTextBody } from "./text-body";
import type { TextRunSpec, TextParagraphSpec } from "../types";

describe("buildTextRun", () => {
  it("returns text-only run when no formatting", () => {
    const run = buildTextRun({ text: "hello" });
    expect(run).toEqual({ type: "text", text: "hello", properties: undefined });
  });

  it("sets bold and italic", () => {
    const run = buildTextRun({ text: "x", bold: true, italic: true });
    expect(run.properties?.bold).toBe(true);
    expect(run.properties?.italic).toBe(true);
  });

  it("maps underline style to OOXML value", () => {
    const run = buildTextRun({ text: "x", underline: "single" });
    expect(run.properties?.underline).toBe("sng");
  });

  it("skips underline when none", () => {
    const run = buildTextRun({ text: "x", underline: "none" });
    expect(run.properties).toBeUndefined();
  });

  it("maps strikethrough to OOXML value", () => {
    const run = buildTextRun({ text: "x", strikethrough: "single" });
    expect(run.properties?.strike).toBe("sngStrike");
  });

  it("skips strikethrough when noStrike", () => {
    const run = buildTextRun({ text: "x", strikethrough: "noStrike" });
    expect(run.properties).toBeUndefined();
  });

  it("maps caps style", () => {
    const run = buildTextRun({ text: "x", caps: "all" });
    expect(run.properties?.caps).toBe("all");
  });

  it("skips caps when none", () => {
    const run = buildTextRun({ text: "x", caps: "none" });
    expect(run.properties).toBeUndefined();
  });

  it("maps superscript baseline", () => {
    const run = buildTextRun({ text: "x", verticalPosition: "superscript" });
    expect(run.properties?.baseline).toBe(30);
  });

  it("maps subscript baseline", () => {
    const run = buildTextRun({ text: "x", verticalPosition: "subscript" });
    expect(run.properties?.baseline).toBe(-25);
  });

  it("skips baseline when normal", () => {
    const run = buildTextRun({ text: "x", verticalPosition: "normal" });
    expect(run.properties).toBeUndefined();
  });

  it("sets letter spacing as Pixels", () => {
    const run = buildTextRun({ text: "x", letterSpacing: 2 });
    expect(run.properties?.spacing).toBe(2);
  });

  it("sets fontSize and fontFamily", () => {
    const run = buildTextRun({ text: "x", fontSize: 24, fontFamily: "Arial" });
    expect(run.properties?.fontSize).toBe(24);
    expect(run.properties?.fontFamily).toBe("Arial");
  });

  it("converts color to fill with SolidFill", () => {
    const run = buildTextRun({ text: "x", color: "#FF0000" });
    expect(run.properties?.fill).toEqual({
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" } },
    });
  });

  it("converts color without hash to fill", () => {
    const run = buildTextRun({ text: "x", color: "00FF00" });
    expect(run.properties?.fill).toEqual({
      type: "solidFill",
      color: { spec: { type: "srgb", value: "00FF00" } },
    });
  });

  it("sets textOutline from outline spec", () => {
    const run = buildTextRun({ text: "x", outline: { color: "#000000", width: 2 } });
    expect(run.properties?.textOutline).toBeDefined();
    expect(run.properties?.textOutline?.width).toBe(2);
  });

  it("sets effects from effects spec", () => {
    const run = buildTextRun({
      text: "x",
      effects: { shadow: { color: "#000000", blur: 5 } },
    });
    expect(run.properties?.effects).toBeDefined();
  });

  it("sets hyperlink from hyperlink spec", () => {
    const run = buildTextRun({ text: "click", hyperlink: { url: "https://example.com", tooltip: "Go" } });
    expect(run.properties?.hyperlink).toEqual({ id: "https://example.com", tooltip: "Go" });
  });
});

describe("buildParagraph", () => {
  it("builds paragraph with level and alignment", () => {
    const para = buildParagraph({ runs: [{ text: "x" }], level: 2, alignment: "center" });
    expect(para.properties.level).toBe(2);
    expect(para.properties.alignment).toBe("center");
    expect(para.runs).toHaveLength(1);
  });

  it("builds char bullet style", () => {
    const para = buildParagraph({ runs: [{ text: "x" }], bullet: { type: "char", char: "→" } });
    expect(para.properties.bulletStyle?.bullet).toEqual({ type: "char", char: "→" });
    expect(para.properties.bulletStyle?.colorFollowText).toBe(true);
  });

  it("builds autoNum bullet style", () => {
    const para = buildParagraph({ runs: [{ text: "x" }], bullet: { type: "autoNum", autoNumType: "romanUcPeriod" } });
    expect(para.properties.bulletStyle?.bullet).toEqual({ type: "auto", scheme: "romanUcPeriod" });
  });

  it("skips bullet when type is none", () => {
    const para = buildParagraph({ runs: [{ text: "x" }], bullet: { type: "none" } });
    expect(para.properties.bulletStyle).toBeUndefined();
  });

  it("builds percent line spacing", () => {
    const para = buildParagraph({ runs: [{ text: "x" }], lineSpacing: { type: "percent", value: 150 } });
    expect(para.properties.lineSpacing).toEqual({ type: "percent", value: 150000 });
  });

  it("builds points line spacing (stores in points, serializer converts to centipoints)", () => {
    const para = buildParagraph({ runs: [{ text: "x" }], lineSpacing: { type: "points", value: 18 } });
    expect(para.properties.lineSpacing).toEqual({ type: "points", value: 18 });
  });

  it("builds spaceBefore/spaceAfter as LineSpacing objects", () => {
    const para = buildParagraph({ runs: [{ text: "x" }], spaceBefore: 6, spaceAfter: 12 });
    expect(para.properties.spaceBefore).toEqual({ type: "points", value: 6 });
    expect(para.properties.spaceAfter).toEqual({ type: "points", value: 12 });
  });

  it("sets indent and marginLeft as Pixels", () => {
    const para = buildParagraph({ runs: [{ text: "x" }], indent: 10, marginLeft: 20 });
    expect(para.properties.indent).toBe(10);
    expect(para.properties.marginLeft).toBe(20);
  });

  it("builds empty properties when no options", () => {
    const para = buildParagraph({ runs: [{ text: "x" }] });
    expect(Object.keys(para.properties)).toHaveLength(0);
  });
});

describe("buildTextBody", () => {
  it("builds simple string as single paragraph", () => {
    const body = buildTextBody("hello");
    expect(body.paragraphs).toHaveLength(1);
    expect(body.paragraphs[0].runs[0]).toEqual({ type: "text", text: "hello" });
  });

  it("builds rich text as multiple paragraphs", () => {
    const specs: TextParagraphSpec[] = [
      { runs: [{ text: "A" }] },
      { runs: [{ text: "B" }] },
    ];
    const body = buildTextBody(specs);
    expect(body.paragraphs).toHaveLength(2);
  });

  it("builds body properties with anchor", () => {
    const body = buildTextBody("x", { anchor: "center" });
    expect(body.bodyProperties.anchor).toBe("center");
  });

  it("builds body properties with insets", () => {
    const body = buildTextBody("x", { insetLeft: 5, insetTop: 10 });
    expect(body.bodyProperties.insets?.left).toBe(5);
    expect(body.bodyProperties.insets?.top).toBe(10);
    expect(body.bodyProperties.insets?.right).toBe(0);
    expect(body.bodyProperties.insets?.bottom).toBe(0);
  });

  it("builds empty body properties when no spec", () => {
    const body = buildTextBody("x");
    expect(Object.keys(body.bodyProperties)).toHaveLength(0);
  });
});
