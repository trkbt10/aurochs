/** @file Unit tests for shape ID and name generation */
import { createElement, type XmlDocument, type XmlElement } from "@aurochs/xml";
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
  it('starts from "2" when list is empty', () => {
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

  it("returns empty array when document has no root element", () => {
    const doc: XmlDocument = { children: [] };
    expect(extractShapeIds(doc)).toEqual([]);
  });

  it("returns empty array when root has no p:cSld child", () => {
    const root = createElement("p:sld", {}, [createElement("p:clrMapOvr")]);
    const doc: XmlDocument = { children: [root] };
    expect(extractShapeIds(doc)).toEqual([]);
  });

  it("returns empty array when p:cSld has no p:spTree", () => {
    const cSld = createElement("p:cSld", {}, [createElement("p:bg")]);
    const root = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [root] };
    expect(extractShapeIds(doc)).toEqual([]);
  });
});

describe("generateShapeName", () => {
  it("generates next name for same base", () => {
    expect(generateShapeName("sp", ["Shape 1", "Shape 10"])).toBe("Shape 11");
  });

  it("throws when type is empty string", () => {
    expect(() => generateShapeName("", [])).toThrow("generateShapeName: type is required");
  });

  it('returns "TextBox N" for type "text"', () => {
    expect(generateShapeName("text", ["TextBox 3"])).toBe("TextBox 4");
  });

  it('returns "TextBox N" for type "textbox"', () => {
    expect(generateShapeName("textbox", [])).toBe("TextBox 1");
  });

  it('returns "TextBox N" for type "textBox"', () => {
    expect(generateShapeName("textBox", ["TextBox 1", "TextBox 2"])).toBe("TextBox 3");
  });

  it('returns "Picture N" for type "pic"', () => {
    expect(generateShapeName("pic", ["Picture 5"])).toBe("Picture 6");
  });

  it('returns "Picture N" for type "picture"', () => {
    expect(generateShapeName("picture", [])).toBe("Picture 1");
  });

  it('returns "Group N" for type "grpSp"', () => {
    expect(generateShapeName("grpSp", ["Group 2"])).toBe("Group 3");
  });

  it('returns "Group N" for type "group"', () => {
    expect(generateShapeName("group", [])).toBe("Group 1");
  });

  it('returns "Connector N" for type "cxnSp"', () => {
    expect(generateShapeName("cxnSp", ["Connector 1"])).toBe("Connector 2");
  });

  it('returns "Connector N" for type "connector"', () => {
    expect(generateShapeName("connector", [])).toBe("Connector 1");
  });

  it("uses the type as-is for unknown types", () => {
    expect(generateShapeName("chart", ["chart 1"])).toBe("chart 2");
  });

  it("starts from 1 when no existing names match the base", () => {
    expect(generateShapeName("sp", ["Picture 5", "TextBox 2"])).toBe("Shape 1");
  });
});
