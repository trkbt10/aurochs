import { createElement, getChild, getChildren, getTextContent, isXmlElement } from "@oxen/xml";
import type { TextBody } from "../../domain/text";
import type { TextBodyChange } from "../core/shape-differ";
import { applyTextBodyChangeToShape } from "./text-patcher";

function createShapeWithText(text: string, bodyPrAttrs: Record<string, string> = {}): ReturnType<typeof createElement> {
  return createElement("p:sp", {}, [
    createElement("p:spPr"),
    createElement("p:txBody", {}, [
      createElement("a:bodyPr", bodyPrAttrs),
      createElement("a:lstStyle"),
      createElement("a:p", {}, [
        createElement("a:r", {}, [
          createElement("a:t", {}, [{ type: "text", value: text }]),
        ]),
      ]),
    ]),
  ]);
}

describe("applyTextBodyChangeToShape", () => {
  it("updates text content in existing p:txBody", () => {
    const shape = createShapeWithText("Hello");
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "World" }] }],
    };
    const change: TextBodyChange = { property: "textBody", oldValue: undefined, newValue: newTextBody };
    const result = applyTextBodyChangeToShape(shape, change);

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
    const change: TextBodyChange = { property: "textBody", oldValue: undefined, newValue: newTextBody };
    const result = applyTextBodyChangeToShape(shape, change);

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
    const change: TextBodyChange = { property: "textBody", oldValue: undefined, newValue: newTextBody };
    const result = applyTextBodyChangeToShape(shape, change);

    expect(getChildren(getChild(result, "p:txBody")!, "a:p")).toHaveLength(2);
  });

  it("inserts p:txBody after p:spPr when missing", () => {
    const shape = createElement("p:sp", {}, [createElement("p:spPr")]);
    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Inserted" }] }],
    };
    const change: TextBodyChange = { property: "textBody", oldValue: undefined, newValue: newTextBody };
    const result = applyTextBodyChangeToShape(shape, change);

    const elementNames = result.children.filter(isXmlElement).map((c) => c.name);
    expect(elementNames).toEqual(["p:spPr", "p:txBody"]);
  });

  it("preserves existing bodyPr attributes", () => {
    const shape = createShapeWithText("A", { wrap: "square" });
    const newTextBody: TextBody = {
      bodyProperties: { wrapping: "none" },
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "A" }] }],
    };
    const change: TextBodyChange = { property: "textBody", oldValue: undefined, newValue: newTextBody };
    const result = applyTextBodyChangeToShape(shape, change);

    const bodyPr = getChild(getChild(result, "p:txBody")!, "a:bodyPr");
    expect(bodyPr?.attrs.wrap).toBe("square");
  });
});

