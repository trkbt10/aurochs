/** @file Unit tests for background-builder */
import { createElement, type XmlDocument, type XmlElement } from "@aurochs/xml";
import { applyBackground, isImageBackground } from "./background-builder";

function createSlideDoc(): XmlDocument {
  const spTree = createElement("p:spTree", {}, []);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
}

function getCsld(doc: XmlDocument): XmlElement {
  const sld = doc.children[0] as XmlElement;
  return sld.children[0] as XmlElement;
}

describe("isImageBackground", () => {
  it("returns true for image background spec", () => {
    expect(isImageBackground({ type: "image", path: "bg.png" })).toBe(true);
  });

  it("returns false for solid color string", () => {
    expect(isImageBackground("FF0000")).toBe(false);
  });

  it("returns false for solid spec", () => {
    expect(isImageBackground({ type: "solid", color: "FF0000" })).toBe(false);
  });

  it("returns false for gradient spec", () => {
    expect(
      isImageBackground({
        type: "gradient",
        stops: [
          { position: 0, color: "FF0000" },
          { position: 100, color: "0000FF" },
        ],
      }),
    ).toBe(false);
  });
});

describe("applyBackground", () => {
  it("applies solid color background from hex string", () => {
    const result = applyBackground(createSlideDoc(), "FF0000");
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("strips # prefix from hex color string", () => {
    const result = applyBackground(createSlideDoc(), "#FF0000");
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("strips # prefix from solid spec color", () => {
    const result = applyBackground(createSlideDoc(), { type: "solid", color: "#1E40AF" });
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("applies gradient background", () => {
    const result = applyBackground(createSlideDoc(), {
      type: "gradient",
      stops: [
        { position: 0, color: "FF0000" },
        { position: 100, color: "0000FF" },
      ],
      angle: 90,
    });
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("replaces existing background", () => {
    const existingBg = createElement("p:bg", {}, []);
    const spTree = createElement("p:spTree");
    const cSld = createElement("p:cSld", {}, [existingBg, spTree]);
    const root = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [root] };

    const result = applyBackground(doc, "FF0000");
    const cSldResult = getCsld(result);
    const bgChildren = cSldResult.children.filter((c) => (c as XmlElement).name === "p:bg");
    expect(bgChildren).toHaveLength(1);
  });

  it("throws for unknown fill type", () => {
    expect(() =>
      applyBackground(createSlideDoc(), { type: "unknown" } as never),
    ).toThrow("Unknown background fill type");
  });
});
