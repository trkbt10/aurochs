import { createElement, type XmlDocument, type XmlElement } from "@oxen/xml";
import { extractShapeIds, generateShapeId, generateShapeName } from "./id-generator";

function createSlideDocument(shapes: XmlElement[]): XmlDocument {
  const nvGrpSpPr = createElement("p:nvGrpSpPr", {}, [
    createElement("p:cNvPr", { id: "1", name: "" }),
    createElement("p:cNvGrpSpPr"),
    createElement("p:nvPr"),
  ]);
  const grpSpPr = createElement("p:grpSpPr");
  const spTree = createElement("p:spTree", {}, [nvGrpSpPr, grpSpPr, ...shapes]);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
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

describe("generateShapeId", () => {
  it("starts from \"2\" when list is empty", () => {
    expect(generateShapeId([])).toBe("2");
  });

  it("returns max numeric id + 1", () => {
    expect(generateShapeId(["1", "2", "10"])).toBe("11");
  });

  it("returns max + 1 even when there are gaps", () => {
    expect(generateShapeId(["2", "4", "10"])).toBe("11");
  });

  it("ignores non-numeric ids", () => {
    expect(generateShapeId(["abc", "3", "x9"])).toBe("4");
  });
});

describe("extractShapeIds", () => {
  it("extracts ids from slide XML", () => {
    const doc = createSlideDocument([createShape("2"), createShape("9")]);
    expect(extractShapeIds(doc).sort()).toEqual(["2", "9"]);
  });
});

describe("generateShapeName", () => {
  it("generates next name for same base", () => {
    expect(generateShapeName("sp", ["Shape 1", "Shape 10"])).toBe("Shape 11");
  });
});

