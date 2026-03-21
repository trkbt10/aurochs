/**
 * @file PresentationML shape tree operations tests
 *
 * Tests for PPTX-specific shape lookup/mutation in p:spTree.
 */

import { createText, type XmlElement } from "@aurochs/xml";
import { findShapeById, getShapeIds, replaceShapeById, removeShapeById } from "./shape-ops";

function el(name: string, attrs: Record<string, string> = {}, children: XmlElement["children"] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// findShapeById
// =============================================================================

describe("findShapeById", () => {
  it("finds p:sp by id", () => {
    const sp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "5", name: "Shape 1" })])]);
    const spTree = el("p:spTree", {}, [sp]);
    expect(findShapeById(spTree, "5")).toBe(sp);
  });

  it("finds p:pic by id", () => {
    const pic = el("p:pic", {}, [el("p:nvPicPr", {}, [el("p:cNvPr", { id: "10" })])]);
    const spTree = el("p:spTree", {}, [pic]);
    expect(findShapeById(spTree, "10")).toBe(pic);
  });

  it("finds shape in nested group", () => {
    const innerSp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "7" })])]);
    const grpSp = el("p:grpSp", {}, [el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "6" })]), innerSp]);
    expect(findShapeById(el("p:spTree", {}, [grpSp]), "7")).toBe(innerSp);
  });

  it("returns null when not found", () => {
    expect(findShapeById(el("p:spTree"), "999")).toBeNull();
  });

  it("returns null when nested group does not contain target", () => {
    const innerSp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "7" })])]);
    const grpSp = el("p:grpSp", {}, [el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "6" })]), innerSp]);
    expect(findShapeById(el("p:spTree", {}, [grpSp]), "999")).toBeNull();
  });
});

// =============================================================================
// getShapeIds
// =============================================================================

describe("getShapeIds", () => {
  it("returns all shape IDs from spTree", () => {
    const spTree = el("p:spTree", {}, [
      el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2" })])]),
      el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "3" })])]),
      el("p:pic", {}, [el("p:nvPicPr", {}, [el("p:cNvPr", { id: "4" })])]),
    ]);
    expect(getShapeIds(spTree)).toEqual(["2", "3", "4"]);
  });

  it("includes IDs from nested groups", () => {
    const spTree = el("p:spTree", {}, [
      el("p:grpSp", {}, [
        el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "4" })]),
        el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "5" })])]),
      ]),
    ]);
    expect(getShapeIds(spTree)).toEqual(["4", "5"]);
  });
});

// =============================================================================
// replaceShapeById
// =============================================================================

describe("replaceShapeById", () => {
  it("replaces shape with matching ID", () => {
    const sp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "5", name: "Old" })])]);
    const newSp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "5", name: "New" })])]);
    const result = replaceShapeById(el("p:spTree", {}, [sp]), "5", newSp);
    const cNvPr = ((result.children[0] as XmlElement).children[0] as XmlElement).children[0] as XmlElement;
    expect(cNvPr.attrs.name).toBe("New");
  });

  it("preserves text children in spTree", () => {
    const sp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "5" })])]);
    const newSp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "5", name: "New" })])]);
    const result = replaceShapeById(el("p:spTree", {}, [createText("ws"), sp]), "5", newSp);
    expect(result.children).toHaveLength(2);
    expect(result.children[0]).toEqual({ type: "text", value: "ws" });
  });

  it("replaces shape inside a nested group", () => {
    const innerSp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "7", name: "Inner" })])]);
    const grpSp = el("p:grpSp", {}, [el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "6" })]), innerSp]);
    const replacement = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "7", name: "Replaced" })])]);
    const result = replaceShapeById(el("p:spTree", {}, [grpSp]), "7", replacement);
    const updatedGrp = result.children[0] as XmlElement;
    const cNvPr = ((updatedGrp.children[1] as XmlElement).children[0] as XmlElement).children[0] as XmlElement;
    expect(cNvPr.attrs.name).toBe("Replaced");
  });
});

// =============================================================================
// removeShapeById
// =============================================================================

describe("removeShapeById", () => {
  it("removes shape with matching ID", () => {
    const spTree = el("p:spTree", {}, [
      el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2" })])]),
      el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "3" })])]),
    ]);
    const result = removeShapeById(spTree, "2");
    expect(result.children).toHaveLength(1);
    const remaining = ((result.children[0] as XmlElement).children[0] as XmlElement).children[0] as XmlElement;
    expect(remaining.attrs.id).toBe("3");
  });

  it("preserves text children in spTree", () => {
    const sp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2" })])]);
    const result = removeShapeById(el("p:spTree", {}, [createText("ws"), sp]), "2");
    expect(result.children).toHaveLength(1);
    expect(result.children[0]).toEqual({ type: "text", value: "ws" });
  });

  it("removes shape from inside a nested group", () => {
    const innerSp = el("p:sp", {}, [el("p:nvSpPr", {}, [el("p:cNvPr", { id: "7" })])]);
    const grpSp = el("p:grpSp", {}, [el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "6" })]), innerSp]);
    const result = removeShapeById(el("p:spTree", {}, [grpSp]), "7");
    const updatedGrp = result.children[0] as XmlElement;
    expect(updatedGrp.children).toHaveLength(1);
    expect((updatedGrp.children[0] as XmlElement).name).toBe("p:nvGrpSpPr");
  });
});
