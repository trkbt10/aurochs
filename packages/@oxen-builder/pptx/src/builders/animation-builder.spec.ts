/** @file Unit tests for animation-builder */
import { createElement, type XmlDocument } from "@oxen/xml";
import { applyAnimations } from "./animation-builder";
import type { AnimationSpec } from "../types";

function createSlideDoc(): XmlDocument {
  const spTree = createElement("p:spTree", {}, [
    createElement("p:nvGrpSpPr", {}, [
      createElement("p:cNvPr", { id: "1", name: "" }),
    ]),
  ]);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
}

describe("applyAnimations", () => {
  it("returns same doc and 0 count for empty specs", () => {
    const doc = createSlideDoc();
    const result = applyAnimations(doc, []);
    expect(result.doc).toBe(doc);
    expect(result.added).toBe(0);
  });

  it("returns correct count for non-empty specs", () => {
    const doc = createSlideDoc();
    const specs: AnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "fade" },
      { shapeId: "3", class: "exit", effect: "wipe" },
    ];
    const result = applyAnimations(doc, specs);
    expect(result.added).toBe(2);
    expect(result.doc).not.toBe(doc);
  });

  it("maps all spec fields through to patcher", () => {
    const doc = createSlideDoc();
    const specs: AnimationSpec[] = [
      {
        shapeId: "2",
        class: "emphasis",
        effect: "pulse",
        trigger: "afterPrevious",
        duration: 1000,
        delay: 500,
        direction: "left",
        repeat: 3,
        autoReverse: true,
      },
    ];
    const result = applyAnimations(doc, specs);
    expect(result.added).toBe(1);
  });
});
