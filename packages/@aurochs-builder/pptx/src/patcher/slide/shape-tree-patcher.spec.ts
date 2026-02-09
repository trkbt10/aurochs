/** @file Unit tests for shape tree patching operations */
import { createElement, isXmlElement, getChild, type XmlElement } from "@aurochs/xml";
import { addShapeToTree, batchUpdateShapeTree, removeShapeFromTree } from "./shape-tree-patcher";

function createTree(shapes: XmlElement[]): XmlElement {
  const nvGrpSpPr = createElement("p:nvGrpSpPr", {}, [
    createElement("p:cNvPr", { id: "1", name: "" }),
    createElement("p:cNvGrpSpPr"),
    createElement("p:nvPr"),
  ]);
  const grpSpPr = createElement("p:grpSpPr");
  return createElement("p:spTree", {}, [nvGrpSpPr, grpSpPr, ...shapes]);
}

function createShape(id: string): XmlElement {
  return createElement("p:sp", {}, [
    createElement("p:nvSpPr", {}, [
      createElement("p:cNvPr", { id, name: `Shape ${id}` }),
      createElement("p:cNvSpPr"),
      createElement("p:nvPr"),
    ]),
    createElement("p:spPr"),
  ]);
}

function listIds(tree: XmlElement): string[] {
  return tree.children
    .filter((c): c is XmlElement => isXmlElement(c) && c.name === "p:sp")
    .map((sp) => getChild(getChild(sp, "p:nvSpPr")!, "p:cNvPr")!.attrs.id);
}

describe("shape-tree-patcher", () => {
  it("adds a shape to the end", () => {
    const tree = createTree([createShape("2"), createShape("3")]);
    const result = addShapeToTree(tree, createShape("4"));
    expect(listIds(result)).toEqual(["2", "3", "4"]);
  });

  it("inserts after a specific id", () => {
    const tree = createTree([createShape("2"), createShape("3")]);
    const result = addShapeToTree(tree, createShape("4"), "2");
    expect(listIds(result)).toEqual(["2", "4", "3"]);
  });

  it("removes a shape by id", () => {
    const tree = createTree([createShape("2"), createShape("3")]);
    const result = removeShapeFromTree(tree, "2");
    expect(listIds(result)).toEqual(["3"]);
  });

  it("does nothing when removing a missing id", () => {
    const tree = createTree([createShape("2")]);
    const result = removeShapeFromTree(tree, "999");
    expect(result).toEqual(tree);
  });

  it("applies multiple operations", () => {
    const tree = createTree([createShape("2"), createShape("3")]);
    const result = batchUpdateShapeTree(tree, [
      { type: "remove", shapeId: "2" },
      { type: "add", shape: createShape("4") },
    ]);
    expect(listIds(result)).toEqual(["3", "4"]);
  });

  it("supports delete then insert after remaining shape", () => {
    const tree = createTree([createShape("2"), createShape("3")]);
    const result = batchUpdateShapeTree(tree, [
      { type: "remove", shapeId: "2" },
      { type: "add", shape: createShape("4"), afterId: "3" },
    ]);
    expect(listIds(result)).toEqual(["3", "4"]);
  });

  it("appends to end when afterId is not found", () => {
    const tree = createTree([createShape("2"), createShape("3")]);
    const result = addShapeToTree(tree, createShape("4"), "999");
    expect(listIds(result)).toEqual(["2", "3", "4"]);
  });

  it("throws when removeShapeFromTree shapeId is empty", () => {
    const tree = createTree([createShape("2")]);
    expect(() => removeShapeFromTree(tree, "")).toThrow("shapeId is required");
  });

  it("replaces a shape by id via batchUpdateShapeTree", () => {
    const tree = createTree([createShape("2"), createShape("3")]);
    const replacement = createShape("5");
    const result = batchUpdateShapeTree(tree, [{ type: "replace", shapeId: "2", newShape: replacement }]);
    expect(listIds(result)).toEqual(["5", "3"]);
  });

  it("replaceShapeInTree returns tree unchanged when shapeId not found", () => {
    const tree = createTree([createShape("2"), createShape("3")]);
    const replacement = createShape("5");
    const result = batchUpdateShapeTree(tree, [{ type: "replace", shapeId: "999", newShape: replacement }]);
    expect(listIds(result)).toEqual(["2", "3"]);
  });

  it("replaceShapeInTree throws when shapeId is empty", () => {
    const tree = createTree([createShape("2")]);
    const replacement = createShape("5");
    expect(() => batchUpdateShapeTree(tree, [{ type: "replace", shapeId: "", newShape: replacement }])).toThrow(
      "shapeId is required",
    );
  });

  it("handles shapes without cNvPr id attr gracefully", () => {
    const shapeWithoutId = createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { name: "NoID" }),
        createElement("p:cNvSpPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:spPr"),
    ]);
    const tree = createTree([shapeWithoutId, createShape("3")]);
    // Removing "3" should still work even though first shape has no id
    const result = removeShapeFromTree(tree, "3");
    expect(result.children).toHaveLength(3); // nvGrpSpPr, grpSpPr, shapeWithoutId
  });

  it("handles shapes without nvPr at all", () => {
    const shapeWithoutNvPr = createElement("p:sp", {}, [createElement("p:spPr")]);
    const tree = createTree([shapeWithoutNvPr, createShape("3")]);
    const result = removeShapeFromTree(tree, "3");
    expect(result.children).toHaveLength(3);
  });

  it("handles non-standard shape elements (p:pic, p:cxnSp, p:grpSp, p:graphicFrame)", () => {
    const pic = createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id: "10", name: "Pic" }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill"),
      createElement("p:spPr"),
    ]);
    const tree = createTree([pic, createShape("3")]);
    const result = removeShapeFromTree(tree, "10");
    const remaining = result.children.filter(
      (c): c is XmlElement => isXmlElement(c) && (c.name === "p:sp" || c.name === "p:pic"),
    );
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe("p:sp");
  });

  it("adds shape to a tree without nvGrpSpPr/grpSpPr header", () => {
    const plainTree = createElement("p:spTree", {}, [createShape("2")]);
    const result = addShapeToTree(plainTree, createShape("3"));
    // shapesStartIndex=0, so it appends at end
    expect(result.children).toHaveLength(2);
  });

  it("inserts after id in tree without nvGrpSpPr/grpSpPr header", () => {
    const plainTree = createElement("p:spTree", {}, [createShape("2"), createShape("3")]);
    const result = addShapeToTree(plainTree, createShape("4"), "2");
    // shapesStartIndex=0, afterId finds index 0, so insert at max(0, 1)=1
    const ids = result.children
      .filter((c): c is XmlElement => isXmlElement(c) && c.name === "p:sp")
      .map((sp) => getChild(getChild(sp, "p:nvSpPr")!, "p:cNvPr")!.attrs.id);
    expect(ids).toEqual(["2", "4", "3"]);
  });

  it("skips text nodes when searching for shapes by id", () => {
    const textNode = { type: "text" as const, value: "whitespace" };
    const nvGrpSpPr = createElement("p:nvGrpSpPr", {}, [
      createElement("p:cNvPr", { id: "1", name: "" }),
      createElement("p:cNvGrpSpPr"),
      createElement("p:nvPr"),
    ]);
    const grpSpPr = createElement("p:grpSpPr");
    const tree = createElement("p:spTree", {}, [nvGrpSpPr, grpSpPr, textNode, createShape("2"), createShape("3")]);
    const result = removeShapeFromTree(tree, "2");
    const ids = result.children
      .filter((c): c is XmlElement => isXmlElement(c) && c.name === "p:sp")
      .map((sp) => getChild(getChild(sp, "p:nvSpPr")!, "p:cNvPr")!.attrs.id);
    expect(ids).toEqual(["3"]);
  });
});
