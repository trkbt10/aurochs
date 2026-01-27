import { createElement, getChild, getChildren, getTextContent } from "@oxen/xml";
import type { TextBody } from "../../domain/text";
import { patchTextBodyElement, serializeTextBody } from "./text";

describe("serializeTextBody", () => {
  it("serializes empty TextBody with a single empty paragraph", () => {
    const body: TextBody = { bodyProperties: {}, paragraphs: [] };
    const el = serializeTextBody(body);
    expect(el.name).toBe("p:txBody");
    expect(getChild(el, "a:bodyPr")).toBeDefined();
    expect(getChild(el, "a:lstStyle")).toBeDefined();
    expect(getChildren(el, "a:p")).toHaveLength(1);
  });

  it("serializes multiple paragraphs", () => {
    const body: TextBody = {
      bodyProperties: {},
      paragraphs: [
        { properties: {}, runs: [{ type: "text", text: "A" }] },
        { properties: {}, runs: [{ type: "text", text: "B" }] },
      ],
    };
    const el = serializeTextBody(body);
    expect(getChildren(el, "a:p")).toHaveLength(2);
  });
});

describe("patchTextBodyElement", () => {
  it("preserves existing a:bodyPr attributes while replacing paragraphs", () => {
    const existing = createElement("p:txBody", {}, [
      createElement("a:bodyPr", { wrap: "none", anchor: "ctr" }),
      createElement("a:lstStyle"),
      createElement("a:p", {}, [
        createElement("a:r", {}, [createElement("a:t", {}, [{ type: "text", value: "Old" }])]),
      ]),
      createElement("a:extLst"),
    ]);

    const nextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: "New" }] }],
    };

    const patched = patchTextBodyElement(existing, nextBody);
    const bodyPr = getChild(patched, "a:bodyPr");
    expect(bodyPr?.attrs.wrap).toBe("none");
    expect(bodyPr?.attrs.anchor).toBe("ctr");
    expect(getChild(patched, "a:extLst")).toBeDefined();

    const p = getChildren(patched, "a:p")[0]!;
    const t = getChild(getChild(p, "a:r")!, "a:t")!;
    expect(getTextContent(t)).toBe("New");
  });
});

