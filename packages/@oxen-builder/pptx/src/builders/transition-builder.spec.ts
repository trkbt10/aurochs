/** @file Unit tests for transition-builder */
import { createElement, isXmlElement, type XmlDocument } from "@oxen/xml";
import { applySlideTransition, isTransitionType } from "./transition-builder";
import type { SlideTransitionSpec } from "../types";

function createSlideDoc(withTransition = false): XmlDocument {
  const cSldChildren = [
    createElement("p:spTree", {}, [
      createElement("p:nvGrpSpPr", {}, [
        createElement("p:cNvPr", { id: "1", name: "" }),
      ]),
    ]),
  ];
  const cSld = createElement("p:cSld", {}, cSldChildren);

  const rootChildren: ReturnType<typeof createElement>[] = [cSld];
  if (withTransition) {
    rootChildren.push(createElement("p:transition", { spd: "med" }));
  }

  const root = createElement("p:sld", {}, rootChildren);
  return { children: [root] };
}

function findChild(parent: { children: readonly unknown[] }, name: string) {
  return parent.children.find(
    (c) => isXmlElement(c as ReturnType<typeof createElement>) && (c as { name: string }).name === name,
  ) as { name: string; children: readonly unknown[] } | undefined;
}

describe("isTransitionType", () => {
  it("returns true for known transition types", () => {
    expect(isTransitionType("fade")).toBe(true);
    expect(isTransitionType("push")).toBe(true);
    expect(isTransitionType("wipe")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isTransitionType("invalidTransition")).toBe(false);
    expect(isTransitionType("")).toBe(false);
  });
});

describe("applySlideTransition", () => {
  it("removes existing transition when type is 'none'", () => {
    const doc = createSlideDoc(true);
    const spec: SlideTransitionSpec = { type: "none" as never };
    const result = applySlideTransition(doc, spec);

    const root = result.children[0] as { children: readonly unknown[] };
    const transition = findChild(root, "p:transition");
    expect(transition).toBeUndefined();
  });

  it("returns same doc structure when type is 'none' and no transition exists", () => {
    const doc = createSlideDoc(false);
    const spec: SlideTransitionSpec = { type: "none" as never };
    const result = applySlideTransition(doc, spec);

    const root = result.children[0] as { children: readonly unknown[] };
    const transition = findChild(root, "p:transition");
    expect(transition).toBeUndefined();
  });

  it("adds transition element for valid type", () => {
    const doc = createSlideDoc(false);
    const spec: SlideTransitionSpec = { type: "fade", duration: 500 };
    const result = applySlideTransition(doc, spec);

    const root = result.children[0] as { children: readonly unknown[] };
    const transition = findChild(root, "p:transition");
    expect(transition).toBeDefined();
  });

  it("replaces existing transition", () => {
    const doc = createSlideDoc(true);
    const spec: SlideTransitionSpec = { type: "push", duration: 300 };
    const result = applySlideTransition(doc, spec);

    const root = result.children[0] as { children: readonly unknown[] };
    const transitions = root.children.filter(
      (c) => isXmlElement(c as ReturnType<typeof createElement>) && (c as { name: string }).name === "p:transition",
    );
    expect(transitions).toHaveLength(1);
  });
});
