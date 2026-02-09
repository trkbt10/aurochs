/** @file Unit tests for transition-builder */
import { createElement, isXmlElement, type XmlDocument } from "@aurochs/xml";
import { applySlideTransition, isTransitionType } from "./transition-builder";
import type { SlideTransitionSpec } from "../types";

function createSlideDoc(withTransition = false): XmlDocument {
  const cSldChildren = [
    createElement("p:spTree", {}, [
      createElement("p:nvGrpSpPr", {}, [createElement("p:cNvPr", { id: "1", name: "" })]),
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

  it("inserts transition after clrMapOvr when present", () => {
    const cSld = createElement("p:cSld", {}, [createElement("p:spTree")]);
    const clrMapOvr = createElement("p:clrMapOvr", {});
    const root = createElement("p:sld", {}, [cSld, clrMapOvr]);
    const doc: XmlDocument = { children: [root] };

    const spec: SlideTransitionSpec = { type: "fade", duration: 500 };
    const result = applySlideTransition(doc, spec);

    const sld = result.children[0] as { children: readonly unknown[] };
    const names = sld.children
      .filter((c) => isXmlElement(c as ReturnType<typeof createElement>))
      .map((c) => (c as { name: string }).name);
    const clrIdx = names.indexOf("p:clrMapOvr");
    const transIdx = names.indexOf("p:transition");
    expect(transIdx).toBeGreaterThan(clrIdx);
  });

  it("passes transition options through", () => {
    const doc = createSlideDoc(false);
    const spec: SlideTransitionSpec = {
      type: "wipe",
      duration: 700,
      advanceOnClick: true,
      advanceAfter: 3000,
      direction: "r",
    };
    const result = applySlideTransition(doc, spec);

    const root = result.children[0] as { children: readonly unknown[] };
    const transition = findChild(root, "p:transition");
    expect(transition).toBeDefined();
  });

  it("removes transition and does not add when type is 'none' with existing transition", () => {
    // Confirm that "none" type removes the transition AND doesn't add a new one
    const doc = createSlideDoc(true);
    const spec: SlideTransitionSpec = { type: "none" as never };
    const result = applySlideTransition(doc, spec);

    const root = result.children[0] as { children: readonly unknown[] };
    const transitions = root.children.filter(
      (c) => isXmlElement(c as ReturnType<typeof createElement>) && (c as { name: string }).name === "p:transition",
    );
    expect(transitions).toHaveLength(0);
  });

  it("inserts transition after p:cSld when no clrMapOvr exists", () => {
    const cSld = createElement("p:cSld", {}, [createElement("p:spTree")]);
    const timing = createElement("p:timing", {});
    const root = createElement("p:sld", {}, [cSld, timing]);
    const doc: XmlDocument = { children: [root] };

    const spec: SlideTransitionSpec = { type: "fade", duration: 500 };
    const result = applySlideTransition(doc, spec);

    const sld = result.children[0] as { children: readonly unknown[] };
    const names = sld.children
      .filter((c) => isXmlElement(c as ReturnType<typeof createElement>))
      .map((c) => (c as { name: string }).name);
    const cSldIdx = names.indexOf("p:cSld");
    const transIdx = names.indexOf("p:transition");
    expect(transIdx).toBe(cSldIdx + 1);
  });

  it("appends transition at end when no p:cSld child exists", () => {
    // Minimal slide with only spTree directly in root (unusual but tests fallback)
    const root = createElement("p:sld", {}, [createElement("p:spTree")]);
    const doc: XmlDocument = { children: [root] };

    const spec: SlideTransitionSpec = { type: "fade", duration: 500 };
    const result = applySlideTransition(doc, spec);

    const sld = result.children[0] as { children: readonly unknown[] };
    const names = sld.children
      .filter((c) => isXmlElement(c as ReturnType<typeof createElement>))
      .map((c) => (c as { name: string }).name);
    // transition should be appended at the end since p:cSld is not found
    expect(names[names.length - 1]).toBe("p:transition");
  });

  it("applies spokes option for wheel transition", () => {
    const doc = createSlideDoc(false);
    const spec: SlideTransitionSpec = {
      type: "wheel",
      duration: 500,
      spokes: 4,
    };
    const result = applySlideTransition(doc, spec);
    const root = result.children[0] as { children: readonly unknown[] };
    const transition = findChild(root, "p:transition");
    expect(transition).toBeDefined();
  });

  it("applies orientation option for blinds transition", () => {
    const doc = createSlideDoc(false);
    const spec: SlideTransitionSpec = {
      type: "blinds",
      duration: 500,
      orientation: "vert",
    };
    const result = applySlideTransition(doc, spec);
    const root = result.children[0] as { children: readonly unknown[] };
    const transition = findChild(root, "p:transition");
    expect(transition).toBeDefined();
  });
});
