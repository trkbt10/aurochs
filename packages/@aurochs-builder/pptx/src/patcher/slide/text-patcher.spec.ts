/** @file text-patcher tests */
import { createElement, getChild, getChildren, getTextContent, isXmlElement } from "@aurochs/xml";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import type { TextBodyChange } from "../core/shape-differ";
import { applyTextBodyChangeToShape } from "./text-patcher";

function createShapeWithText(text: string, bodyPrAttrs: Record<string, string> = {}): ReturnType<typeof createElement> {
  return createElement("p:sp", {}, [
    createElement("p:spPr"),
    createElement("p:txBody", {}, [
      createElement("a:bodyPr", bodyPrAttrs),
      createElement("a:lstStyle"),
      createElement("a:p", {}, [createElement("a:r", {}, [createElement("a:t", {}, [{ type: "text", value: text }])])]),
    ]),
  ]);
}

function makeChange(newValue: TextBody | undefined): TextBodyChange {
  return { property: "textBody", oldValue: undefined, newValue };
}

describe("applyTextBodyChangeToShape", () => {
  it("updates text content in existing p:txBody", () => {
    const shape = createShapeWithText("Hello");
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "World" }] }],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    const txBody = getChild(result, "p:txBody")!;
    const p = getChildren(txBody, "a:p")[0]!;
    const t = getChild(getChild(p, "a:r")!, "a:t")!;
    expect(getTextContent(t)).toBe("World");
  });

  it("updates run formatting", () => {
    const shape = createShapeWithText("X");
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "X", properties: { bold: true } }] }],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    const rPr = getChild(getChild(getChild(getChild(result, "p:txBody")!, "a:p")!, "a:r")!, "a:rPr");
    expect(rPr?.attrs.b).toBe("1");
  });

  it("adds/removes paragraphs", () => {
    const shape = createShapeWithText("A");
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [
        { properties: {}, runs: [{ type: "text", text: "A" }] },
        { properties: {}, runs: [{ type: "text", text: "B" }] },
      ],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    expect(getChildren(getChild(result, "p:txBody")!, "a:p")).toHaveLength(2);
  });

  it("inserts p:txBody after p:spPr when missing", () => {
    const shape = createElement("p:sp", {}, [createElement("p:spPr")]);
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Inserted" }] }],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    const elementNames = result.children.filter(isXmlElement).map((c) => c.name);
    expect(elementNames).toEqual(["p:spPr", "p:txBody"]);
  });

  it("preserves existing bodyPr attributes", () => {
    const shape = createShapeWithText("A", { wrap: "square" });
    const newTextBody: TextBody = {
      bodyProperties: { wrapping: "none" },
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "A" }] }],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    const bodyPr = getChild(getChild(result, "p:txBody")!, "a:bodyPr");
    expect(bodyPr?.attrs.wrap).toBe("square");
  });

  it("removes p:txBody when newValue is undefined", () => {
    const shape = createShapeWithText("Hello");
    const change: TextBodyChange = { property: "textBody", oldValue: undefined, newValue: undefined };
    const result = applyTextBodyChangeToShape(shape, change);

    expect(getChild(result, "p:txBody")).toBeUndefined();
    expect(getChild(result, "p:spPr")).toBeDefined();
  });

  it("removes a:txBody when newValue is undefined", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:spPr"),
      createElement("a:txBody", {}, [
        createElement("a:bodyPr"),
        createElement("a:lstStyle"),
        createElement("a:p"),
      ]),
    ]);
    const change: TextBodyChange = { property: "textBody", oldValue: undefined, newValue: undefined };
    const result = applyTextBodyChangeToShape(shape, change);

    expect(getChild(result, "a:txBody")).toBeUndefined();
    expect(getChild(result, "p:txBody")).toBeUndefined();
  });

  it("handles a:txBody by coercing to p:txBody", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:spPr"),
      createElement("a:txBody", {}, [
        createElement("a:bodyPr"),
        createElement("a:lstStyle"),
        createElement("a:p", {}, [createElement("a:r", {}, [createElement("a:t", {}, [{ type: "text", value: "old" }])])]),
      ]),
    ]);
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "new" }] }],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    // The existing a:txBody slot is replaced; the patched element keeps the original name via patchTextBodyElement
    const txBody = result.children.find(
      (c) => isXmlElement(c) && (c.name === "p:txBody" || c.name === "a:txBody"),
    );
    expect(txBody).toBeDefined();
  });

  it("appends p:txBody at end when shape has no p:spPr", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:nvSpPr"),
    ]);
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Appended" }] }],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    const elementNames = result.children.filter(isXmlElement).map((c) => c.name);
    expect(elementNames[elementNames.length - 1]).toBe("p:txBody");
  });

  it("preserves existing lstStyle when patching", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:spPr"),
      createElement("p:txBody", {}, [
        createElement("a:bodyPr"),
        createElement("a:lstStyle", {}, [createElement("a:lvl1pPr")]),
        createElement("a:p"),
      ]),
    ]);
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Patched" }] }],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    const txBody = getChild(result, "p:txBody")!;
    const lstStyle = getChild(txBody, "a:lstStyle")!;
    expect(getChild(lstStyle, "a:lvl1pPr")).toBeDefined();
  });

  it("creates empty paragraph when textBody has no paragraphs", () => {
    const shape = createElement("p:sp", {}, [createElement("p:spPr")]);
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    const txBody = getChild(result, "p:txBody")!;
    const paragraphs = getChildren(txBody, "a:p");
    expect(paragraphs).toHaveLength(1);
  });

  it("creates empty paragraph when patching with empty paragraphs", () => {
    const shape = createShapeWithText("original");
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [],
    };
    const result = applyTextBodyChangeToShape(shape, makeChange(newTextBody));

    const txBody = getChild(result, "p:txBody")!;
    const paragraphs = getChildren(txBody, "a:p");
    expect(paragraphs).toHaveLength(1);
    // The empty paragraph should have no children
    expect(paragraphs[0].children).toHaveLength(0);
  });
});
