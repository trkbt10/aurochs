import { createElement, isXmlElement, getChild, type XmlElement } from "@oxen/xml";
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
});

