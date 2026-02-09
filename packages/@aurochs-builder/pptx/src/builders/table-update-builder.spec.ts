/** @file Unit tests for table-update-builder */
import { contentToTextBody, applyTableUpdates } from "./table-update-builder";
import { createElement, type XmlDocument } from "@aurochs/xml";

describe("contentToTextBody", () => {
  it("converts string to single-paragraph text body", () => {
    const body = contentToTextBody("Hello");
    expect(body.paragraphs).toHaveLength(1);
    expect(body.paragraphs[0].runs[0].text).toBe("Hello");
  });

  it("converts structured spec to multi-paragraph text body", () => {
    const body = contentToTextBody({
      paragraphs: [
        { runs: [{ text: "Line 1" }] },
        { runs: [{ text: "Line 2", bold: true }] },
      ],
    });
    expect(body.paragraphs).toHaveLength(2);
    expect(body.paragraphs[1].runs[0].text).toBe("Line 2");
  });

  it("maps alignment from paragraph spec", () => {
    const body = contentToTextBody({
      paragraphs: [{ runs: [{ text: "centered" }], alignment: "center" }],
    });
    expect(body.paragraphs[0].properties.alignment).toBe("center");
  });

  it("maps text run properties", () => {
    const body = contentToTextBody({
      paragraphs: [
        {
          runs: [
            { text: "styled", bold: true, italic: true, fontSize: 14, fontFamily: "Arial", color: "FF0000" },
          ],
        },
      ],
    });
    const run = body.paragraphs[0].runs[0];
    expect(run.properties?.bold).toBe(true);
    expect(run.properties?.italic).toBe(true);
    expect(run.properties?.fontSize).toBe(14);
    expect(run.properties?.fontFamily).toBe("Arial");
  });
});

function makeSlideWithTable(): XmlDocument {
  const tbl = createElement("a:tbl", {}, [
    createElement("a:tblGrid", {}, [
      createElement("a:gridCol", { w: "1000000" }),
      createElement("a:gridCol", { w: "1000000" }),
    ]),
    createElement("a:tr", { h: "500000" }, [
      createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
      createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
    ]),
  ]);

  const graphicFrame = createElement("p:graphicFrame", {}, [
    createElement("p:nvGraphicFramePr", {}, [
      createElement("p:cNvPr", { id: "42", name: "Table 1" }),
    ]),
    createElement("a:graphic", {}, [
      createElement("a:graphicData", {}, [tbl]),
    ]),
  ]);

  const spTree = createElement("p:spTree", {}, [graphicFrame]);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const sld = createElement("p:sld", {}, [cSld]);
  return { children: [sld] };
}

describe("applyTableUpdates", () => {
  it("returns unchanged doc when no updates", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, []);
    expect(result.doc).toBe(doc);
    expect(result.updated).toBe(0);
  });

  it("returns unchanged doc when shape not found", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [{ shapeId: "999", updateCells: [] }]);
    expect(result.updated).toBe(0);
  });

  it("updates cell content by id", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        updateCells: [{ row: 0, col: 0, content: "Updated" }],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("applies table style id", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        styleId: "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}",
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("adds rows", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        addRows: [{ height: 50, cells: ["New A", "New B"] }],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("removes rows", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        removeRows: [0],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("adds columns", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        addColumns: [{ width: 100 }],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("removes columns", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        removeColumns: [0],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("returns unchanged doc when spTree is missing", () => {
    const sld = createElement("p:sld", {}, [createElement("p:cSld", {}, [])]);
    const doc: XmlDocument = { children: [sld] };
    const result = applyTableUpdates(doc, [{ shapeId: "42", updateCells: [] }]);
    expect(result.updated).toBe(0);
  });

  it("handles multiple updates on different tables", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      { shapeId: "42", updateCells: [{ row: 0, col: 0, content: "Updated" }] },
      { shapeId: "99" }, // non-existent
    ]);
    expect(result.updated).toBe(1);
  });
});
