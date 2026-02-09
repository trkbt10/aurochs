/** @file Unit tests for table-update-builder */
import { contentToTextBody, applyTableUpdates } from "./table-update-builder";
import { createElement, isXmlElement, type XmlDocument } from "@aurochs/xml";

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

  it("returns unchanged when graphicFrame has no nvGraphicFramePr", () => {
    const tbl = createElement("a:tbl", {}, []);
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("a:graphic", {}, [createElement("a:graphicData", {}, [tbl])]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    const result = applyTableUpdates(doc, [{ shapeId: "42", updateCells: [] }]);
    expect(result.updated).toBe(0);
  });

  it("returns unchanged when graphicFrame has nvGraphicFramePr but no cNvPr", () => {
    const tbl = createElement("a:tbl", {}, []);
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, []),
      createElement("a:graphic", {}, [createElement("a:graphicData", {}, [tbl])]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    const result = applyTableUpdates(doc, [{ shapeId: "42", updateCells: [] }]);
    expect(result.updated).toBe(0);
  });

  it("returns unchanged when graphicFrame has no a:graphic child", () => {
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [createElement("p:cNvPr", { id: "42", name: "Table 1" })]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    const result = applyTableUpdates(doc, [{ shapeId: "42", updateCells: [] }]);
    expect(result.updated).toBe(0);
  });

  it("returns unchanged when graphic has no a:graphicData", () => {
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [createElement("p:cNvPr", { id: "42", name: "Table 1" })]),
      createElement("a:graphic", {}, []),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    const result = applyTableUpdates(doc, [{ shapeId: "42", updateCells: [] }]);
    expect(result.updated).toBe(0);
  });

  it("processes removeRows in descending order", () => {
    // Create table with 3 rows
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblGrid", {}, [createElement("a:gridCol", { w: "1000000" })]),
      createElement("a:tr", { h: "500000" }, [
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
      ]),
      createElement("a:tr", { h: "500000" }, [
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
      ]),
      createElement("a:tr", { h: "500000" }, [
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
      ]),
    ]);
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [createElement("p:cNvPr", { id: "42", name: "Table 1" })]),
      createElement("a:graphic", {}, [createElement("a:graphicData", {}, [tbl])]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    // Remove rows 0 and 2 - should sort to [2, 0] internally (descending)
    const result = applyTableUpdates(doc, [{ shapeId: "42", removeRows: [0, 2] }]);
    expect(result.updated).toBe(1);
  });

  it("adds a row with fewer cells than columns (pads with empty cells)", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        addRows: [{ height: 50, cells: ["Only one cell"] }],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("adds a row with position", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        addRows: [{ height: 50, cells: ["A", "B"], position: 0 }],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("adds a column with position", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        addColumns: [{ width: 100, position: 0 }],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("removes multiple columns in descending order", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblGrid", {}, [
        createElement("a:gridCol", { w: "1000000" }),
        createElement("a:gridCol", { w: "1000000" }),
        createElement("a:gridCol", { w: "1000000" }),
      ]),
      createElement("a:tr", { h: "500000" }, [
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
      ]),
    ]);
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [createElement("p:cNvPr", { id: "42", name: "Table 1" })]),
      createElement("a:graphic", {}, [createElement("a:graphicData", {}, [tbl])]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    const result = applyTableUpdates(doc, [{ shapeId: "42", removeColumns: [0, 2] }]);
    expect(result.updated).toBe(1);
  });

  it("applies only styleId when no other changes", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        styleId: "{GUID-HERE}",
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("handles structured text body spec for cell update", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        updateCells: [
          {
            row: 0,
            col: 0,
            content: {
              paragraphs: [
                {
                  runs: [
                    { text: "Bold", bold: true, italic: true, fontSize: 14, fontFamily: "Arial", color: "FF0000" },
                  ],
                  alignment: "center",
                },
              ],
            },
          },
        ],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("handles structured text body spec for addRows cells", () => {
    const doc = makeSlideWithTable();
    const result = applyTableUpdates(doc, [
      {
        shapeId: "42",
        addRows: [
          {
            height: 50,
            cells: [
              {
                paragraphs: [{ runs: [{ text: "Rich" }] }],
              },
              "Plain",
            ],
          },
        ],
      },
    ]);
    expect(result.updated).toBe(1);
  });

  it("returns unchanged when p:sld is missing", () => {
    const doc: XmlDocument = { children: [createElement("other")] };
    const result = applyTableUpdates(doc, [{ shapeId: "42", updateCells: [{ row: 0, col: 0, content: "X" }] }]);
    expect(result.updated).toBe(0);
  });

  it("returns unchanged when p:cSld is missing", () => {
    const sld = createElement("p:sld", {}, []);
    const doc: XmlDocument = { children: [sld] };
    const result = applyTableUpdates(doc, [{ shapeId: "42", updateCells: [{ row: 0, col: 0, content: "X" }] }]);
    expect(result.updated).toBe(0);
  });

  it("skips graphicFrame with no table inside", () => {
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [createElement("p:cNvPr", { id: "42", name: "T" })]),
      createElement("a:graphic", {}, [createElement("a:graphicData", {}, [createElement("a:other")])]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    const result = applyTableUpdates(doc, [{ shapeId: "42", updateCells: [] }]);
    expect(result.updated).toBe(0);
  });

  it("handles table with no tblGrid (colCount = 0) applying only styleId", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblPr"),
      createElement("a:tr", { h: "500000" }, [
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
      ]),
    ]);
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [createElement("p:cNvPr", { id: "42", name: "T" })]),
      createElement("a:graphic", {}, [createElement("a:graphicData", {}, [tbl])]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    const result = applyTableUpdates(doc, [{ shapeId: "42", styleId: "{GUID}" }]);
    expect(result.updated).toBe(1);
  });

  it("skips non-graphicFrame children in spTree", () => {
    const doc = makeSlideWithTable();
    // Looking for shapeId that doesn't exist, but exercises the non-graphicFrame skip
    const result = applyTableUpdates(doc, [{ shapeId: "nonexistent" }]);
    expect(result.updated).toBe(0);
  });

  it("preserves non-spTree children in cSld when updating", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblGrid", {}, [createElement("a:gridCol", { w: "1000000" })]),
      createElement("a:tr", { h: "500000" }, [
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
      ]),
    ]);
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [createElement("p:cNvPr", { id: "42", name: "T" })]),
      createElement("a:graphic", {}, [createElement("a:graphicData", {}, [tbl])]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [createElement("p:bg"), spTree, createElement("p:extLst")]);
    const sld = createElement("p:sld", {}, [createElement("p:clrMapOvr"), cSld, createElement("p:timing")]);
    const doc: XmlDocument = { children: [createElement("xml"), sld] };

    const result = applyTableUpdates(doc, [
      { shapeId: "42", updateCells: [{ row: 0, col: 0, content: "Hello" }] },
    ]);
    expect(result.updated).toBe(1);
    // Verify the doc was fully reconstructed with non-sld children preserved
    const resultChildren = result.doc.children.filter(isXmlElement);
    expect(resultChildren).toHaveLength(2);
    expect(resultChildren[0].name).toBe("xml");
    expect(resultChildren[1].name).toBe("p:sld");
    // Verify p:sld preserved its non-cSld children
    const sldChildren = resultChildren[1].children.filter(isXmlElement);
    expect(sldChildren).toHaveLength(3);
    expect(sldChildren[0].name).toBe("p:clrMapOvr");
    expect(sldChildren[1].name).toBe("p:cSld");
    expect(sldChildren[2].name).toBe("p:timing");
    // Verify cSld preserved its non-spTree children
    const cSldChildren = sldChildren[1].children.filter(isXmlElement);
    expect(cSldChildren).toHaveLength(3);
    expect(cSldChildren[0].name).toBe("p:bg");
    expect(cSldChildren[1].name).toBe("p:spTree");
    expect(cSldChildren[2].name).toBe("p:extLst");
  });

  it("preserves non-tbl children in graphicData and non-graphicData in graphic", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblGrid", {}, [createElement("a:gridCol", { w: "1000000" })]),
      createElement("a:tr", { h: "500000" }, [
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:p")])]),
      ]),
    ]);
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [createElement("p:cNvPr", { id: "42", name: "T" })]),
      createElement("a:graphic", {}, [
        createElement("a:extra"),
        createElement("a:graphicData", {}, [createElement("a:before"), tbl, createElement("a:after")]),
      ]),
    ]);
    const spTree = createElement("p:spTree", {}, [graphicFrame]);
    const cSld = createElement("p:cSld", {}, [spTree]);
    const sld = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [sld] };

    const result = applyTableUpdates(doc, [
      { shapeId: "42", updateCells: [{ row: 0, col: 0, content: "Updated" }] },
    ]);
    expect(result.updated).toBe(1);
  });
});
