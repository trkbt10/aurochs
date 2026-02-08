/** @file Unit tests for background-builder */
import { createElement, type XmlDocument } from "@aurochs/xml";
import { applyBackground, isImageBackground } from "./background-builder";

function createSlideDoc(): XmlDocument {
  const spTree = createElement("p:spTree", {}, [
    createElement("p:nvGrpSpPr", {}, [createElement("p:cNvPr", { id: "1", name: "" })]),
  ]);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
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
    const doc = createSlideDoc();
    const result = applyBackground(doc, "FF0000");

    // Should have p:bg as first child of p:cSld
    const sld = result.children[0]!;
    const cSld = (sld as { children: readonly unknown[] }).children[0] as {
      name: string;
      children: readonly unknown[];
    };
    expect(cSld.name).toBe("p:cSld");

    const firstChild = cSld.children[0] as { name: string };
    expect(firstChild.name).toBe("p:bg");
  });

  it("applies solid spec background", () => {
    const doc = createSlideDoc();
    const result = applyBackground(doc, { type: "solid", color: "00FF00" });

    const sld = result.children[0]!;
    const cSld = (sld as { children: readonly unknown[] }).children[0] as {
      name: string;
      children: readonly unknown[];
    };
    const firstChild = cSld.children[0] as { name: string };
    expect(firstChild.name).toBe("p:bg");
  });

  it("applies gradient background", () => {
    const doc = createSlideDoc();
    const result = applyBackground(doc, {
      type: "gradient",
      stops: [
        { position: 0, color: "FF0000" },
        { position: 100, color: "0000FF" },
      ],
      angle: 90,
    });

    const sld = result.children[0]!;
    const cSld = (sld as { children: readonly unknown[] }).children[0] as {
      name: string;
      children: readonly unknown[];
    };
    const firstChild = cSld.children[0] as { name: string };
    expect(firstChild.name).toBe("p:bg");
  });

  it("replaces existing background", () => {
    // Create doc with existing background
    const existingBg = createElement("p:bg", {}, []);
    const spTree = createElement("p:spTree");
    const cSld = createElement("p:cSld", {}, [existingBg, spTree]);
    const root = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [root] };

    const result = applyBackground(doc, "FF0000");

    const sld = result.children[0]!;
    const cSldResult = (sld as { children: readonly unknown[] }).children[0] as {
      name: string;
      children: readonly unknown[];
    };
    // Should have exactly one p:bg
    const bgChildren = cSldResult.children.filter((c) => (c as { name?: string }).name === "p:bg");
    expect(bgChildren).toHaveLength(1);
  });
});
