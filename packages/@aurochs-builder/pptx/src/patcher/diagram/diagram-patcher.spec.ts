/** @file Unit tests for diagram patching operations */
import {
  createElement,
  createText,
  getByPath,
  getChildren,
  getTextByPath,
  parseXml,
  type XmlDocument,
} from "@aurochs/xml";
import { patchDiagram, patchDiagramNodeText } from "./diagram-patcher";

describe("diagram-patcher", () => {
  const baseData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dgm:ptLst>
    <dgm:pt modelId="0" type="doc"/>
    <dgm:pt modelId="1" type="node">
      <dgm:t>
        <a:bodyPr/>
        <a:lstStyle/>
        <a:p><a:r><a:t>Node 1</a:t></a:r></a:p>
      </dgm:t>
    </dgm:pt>
  </dgm:ptLst>
  <dgm:cxnLst>
    <dgm:cxn srcId="0" destId="1" type="parOf"/>
  </dgm:cxnLst>
</dgm:dataModel>`;

  const dummy = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root/>`;

  it("updates node text", () => {
    const files = {
      data: parseXml(baseData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    const patched = patchDiagram(files, [{ type: "nodeText", nodeId: "1", text: "Updated" }]);

    const ptLst = getByPath(patched.data, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    const pt = getChildren(ptLst, "dgm:pt").find((p) => p.attrs.modelId === "1");
    if (!pt) {
      throw new Error("test: missing pt#1");
    }
    expect(getTextByPath(pt, ["dgm:t", "a:p", "a:r", "a:t"])).toBe("Updated");
  });

  it("adds a node + connection", () => {
    const files = {
      data: parseXml(baseData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    const patched = patchDiagram(files, [{ type: "addNode", parentId: "0", nodeId: "2", text: "Node 2" }]);
    const ptLst = getByPath(patched.data, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    expect(getChildren(ptLst, "dgm:pt").some((pt) => pt.attrs.modelId === "2")).toBe(true);

    const cxnLst = getByPath(patched.data, ["dgm:dataModel", "dgm:cxnLst"]);
    if (!cxnLst) {
      throw new Error("test: missing cxnLst");
    }
    expect(getChildren(cxnLst, "dgm:cxn").some((cxn) => cxn.attrs.srcId === "0" && cxn.attrs.destId === "2")).toBe(
      true,
    );
  });

  it("removes a node and its connections", () => {
    const files = {
      data: parseXml(baseData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    const patched = patchDiagram(files, [{ type: "removeNode", nodeId: "1" }]);
    const ptLst = getByPath(patched.data, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    expect(getChildren(ptLst, "dgm:pt").some((pt) => pt.attrs.modelId === "1")).toBe(false);

    const cxnLst = getByPath(patched.data, ["dgm:dataModel", "dgm:cxnLst"]);
    if (!cxnLst) {
      throw new Error("test: missing cxnLst");
    }
    expect(getChildren(cxnLst, "dgm:cxn")).toHaveLength(0);
  });

  it("adds a connection explicitly", () => {
    const files = {
      data: parseXml(baseData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    const patched = patchDiagram(files, [{ type: "setConnection", srcId: "1", destId: "0", connectionType: "parOf" }]);

    const cxnLst = getByPath(patched.data, ["dgm:dataModel", "dgm:cxnLst"]);
    if (!cxnLst) {
      throw new Error("test: missing cxnLst");
    }
    expect(getChildren(cxnLst, "dgm:cxn").some((cxn) => cxn.attrs.srcId === "1" && cxn.attrs.destId === "0")).toBe(
      true,
    );
  });

  it("does not duplicate an existing connection", () => {
    const files = {
      data: parseXml(baseData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    // Connection 0->1 parOf already exists in baseData
    const patched = patchDiagram(files, [{ type: "setConnection", srcId: "0", destId: "1", connectionType: "parOf" }]);
    const cxnLst = getByPath(patched.data, ["dgm:dataModel", "dgm:cxnLst"]);
    if (!cxnLst) {
      throw new Error("test: missing cxnLst");
    }
    const matching = getChildren(cxnLst, "dgm:cxn").filter(
      (cxn) => cxn.attrs.srcId === "0" && cxn.attrs.destId === "1" && cxn.attrs.type === "parOf",
    );
    expect(matching).toHaveLength(1);
  });

  it("removes a node even when there is no cxnLst", () => {
    const noCxnData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dgm:ptLst>
    <dgm:pt modelId="0" type="doc"/>
    <dgm:pt modelId="1" type="node"/>
  </dgm:ptLst>
</dgm:dataModel>`;
    const files = {
      data: parseXml(noCxnData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    const patched = patchDiagram(files, [{ type: "removeNode", nodeId: "1" }]);
    const ptLst = getByPath(patched.data, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    expect(getChildren(ptLst, "dgm:pt").some((pt) => pt.attrs.modelId === "1")).toBe(false);
  });

  it("adds a node when cxnLst does not exist, creating one", () => {
    const noCxnData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dgm:ptLst>
    <dgm:pt modelId="0" type="doc"/>
  </dgm:ptLst>
</dgm:dataModel>`;
    const files = {
      data: parseXml(noCxnData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    const patched = patchDiagram(files, [{ type: "addNode", parentId: "0", nodeId: "5", text: "New" }]);
    const ptLst = getByPath(patched.data, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    expect(getChildren(ptLst, "dgm:pt").some((pt) => pt.attrs.modelId === "5")).toBe(true);

    const cxnLst = getByPath(patched.data, ["dgm:dataModel", "dgm:cxnLst"]);
    if (!cxnLst) {
      throw new Error("test: cxnLst should have been created");
    }
    expect(getChildren(cxnLst, "dgm:cxn").some((cxn) => cxn.attrs.srcId === "0" && cxn.attrs.destId === "5")).toBe(
      true,
    );
  });

  it("updates text on a node that has no existing dgm:t element", () => {
    const noTextData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dgm:ptLst>
    <dgm:pt modelId="0" type="doc"/>
    <dgm:pt modelId="1" type="node"/>
  </dgm:ptLst>
</dgm:dataModel>`;
    const files = {
      data: parseXml(noTextData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    const patched = patchDiagram(files, [{ type: "nodeText", nodeId: "1", text: "Hello" }]);
    const ptLst = getByPath(patched.data, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    const pt = getChildren(ptLst, "dgm:pt").find((p) => p.attrs.modelId === "1");
    if (!pt) {
      throw new Error("test: missing pt#1");
    }
    expect(getTextByPath(pt, ["dgm:t", "a:p", "a:r", "a:t"])).toBe("Hello");
  });

  it("sets a connection when cxnLst does not exist", () => {
    const noCxnData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dgm:ptLst>
    <dgm:pt modelId="0" type="doc"/>
    <dgm:pt modelId="1" type="node"/>
  </dgm:ptLst>
</dgm:dataModel>`;
    const files = {
      data: parseXml(noCxnData),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    const patched = patchDiagram(files, [
      { type: "setConnection", srcId: "0", destId: "1", connectionType: "parOf" },
    ]);
    const cxnLst = getByPath(patched.data, ["dgm:dataModel", "dgm:cxnLst"]);
    if (!cxnLst) {
      throw new Error("test: cxnLst should have been created");
    }
    expect(getChildren(cxnLst, "dgm:cxn")).toHaveLength(1);
  });
});

describe("patchDiagramNodeText - validation errors", () => {
  const baseData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dgm:ptLst>
    <dgm:pt modelId="0" type="doc"/>
    <dgm:pt modelId="1" type="node"/>
  </dgm:ptLst>
</dgm:dataModel>`;

  it("throws when nodeId is empty", () => {
    expect(() => patchDiagramNodeText(parseXml(baseData), "", "text")).toThrow("nodeId is required");
  });

  it("throws when text is undefined", () => {
    expect(() => patchDiagramNodeText(parseXml(baseData), "1", undefined as never)).toThrow("text is required");
  });

  it("throws when dgm:ptLst is missing", () => {
    const noPtLstData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"/>`;
    expect(() => patchDiagramNodeText(parseXml(noPtLstData), "1", "text")).toThrow("missing dgm:ptLst");
  });

  it("throws when node is not found", () => {
    expect(() => patchDiagramNodeText(parseXml(baseData), "999", "text")).toThrow("node not found: 999");
  });
});

describe("patchDiagram - validation errors", () => {
  const dummy = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root/>`;
  const baseData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dgm:ptLst>
    <dgm:pt modelId="0" type="doc"/>
    <dgm:pt modelId="1" type="node"/>
  </dgm:ptLst>
</dgm:dataModel>`;
  const files = () => ({
    data: parseXml(baseData),
    layout: parseXml(dummy),
    colors: parseXml(dummy),
    quickStyle: parseXml(dummy),
  });

  it("throws when addNode parentId is empty", () => {
    expect(() => patchDiagram(files(), [{ type: "addNode", parentId: "", nodeId: "2", text: "x" }])).toThrow(
      "parentId is required",
    );
  });

  it("throws when addNode nodeId is empty", () => {
    expect(() => patchDiagram(files(), [{ type: "addNode", parentId: "0", nodeId: "", text: "x" }])).toThrow(
      "nodeId is required",
    );
  });

  it("throws when addNode nodeId already exists", () => {
    expect(() => patchDiagram(files(), [{ type: "addNode", parentId: "0", nodeId: "1", text: "x" }])).toThrow(
      "nodeId already exists: 1",
    );
  });

  it("throws when addNode parentId does not exist", () => {
    expect(() => patchDiagram(files(), [{ type: "addNode", parentId: "999", nodeId: "2", text: "x" }])).toThrow(
      "parentId not found: 999",
    );
  });

  it("throws when removeNode nodeId is empty", () => {
    expect(() => patchDiagram(files(), [{ type: "removeNode", nodeId: "" }])).toThrow("nodeId is required");
  });

  it("throws when removeNode node is not found", () => {
    expect(() => patchDiagram(files(), [{ type: "removeNode", nodeId: "999" }])).toThrow("node not found: 999");
  });

  it("throws when setConnection srcId is empty", () => {
    expect(() =>
      patchDiagram(files(), [{ type: "setConnection", srcId: "", destId: "1", connectionType: "parOf" }]),
    ).toThrow("srcId and destId are required");
  });

  it("throws when setConnection destId is empty", () => {
    expect(() =>
      patchDiagram(files(), [{ type: "setConnection", srcId: "0", destId: "", connectionType: "parOf" }]),
    ).toThrow("srcId and destId are required");
  });

  it("throws when setConnection connectionType is empty", () => {
    expect(() =>
      patchDiagram(files(), [{ type: "setConnection", srcId: "0", destId: "1", connectionType: "" }]),
    ).toThrow("connectionType is required");
  });

  it("throws when setConnection srcId does not exist in ptLst", () => {
    expect(() =>
      patchDiagram(files(), [{ type: "setConnection", srcId: "999", destId: "1", connectionType: "parOf" }]),
    ).toThrow("srcId/destId must exist");
  });

  it("throws when removeNode ptLst is missing", () => {
    const noPtLst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"/>`;
    const f = {
      data: parseXml(noPtLst),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    expect(() => patchDiagram(f, [{ type: "removeNode", nodeId: "1" }])).toThrow("missing dgm:ptLst");
  });

  it("throws when addNode ptLst is missing", () => {
    const noPtLst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"/>`;
    const f = {
      data: parseXml(noPtLst),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    expect(() => patchDiagram(f, [{ type: "addNode", parentId: "0", nodeId: "2", text: "x" }])).toThrow(
      "missing dgm:ptLst",
    );
  });

  it("throws when setConnection ptLst is missing", () => {
    const noPtLst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"/>`;
    const f = {
      data: parseXml(noPtLst),
      layout: parseXml(dummy),
      colors: parseXml(dummy),
      quickStyle: parseXml(dummy),
    };
    expect(() =>
      patchDiagram(f, [{ type: "setConnection", srcId: "0", destId: "1", connectionType: "parOf" }]),
    ).toThrow("missing dgm:ptLst");
  });
});

describe("diagram-patcher - edge cases with extra elements", () => {
  const dummyDoc = parseXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root/>`);

  function makeFiles(data: XmlDocument) {
    return { data, layout: dummyDoc, colors: dummyDoc, quickStyle: dummyDoc };
  }

  it("removeNode preserves extra elements in dgm:dataModel", () => {
    const dataWithExtra = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dgm:ptLst>
    <dgm:pt modelId="0" type="doc"/>
    <dgm:pt modelId="1" type="node"/>
  </dgm:ptLst>
  <dgm:cxnLst>
    <dgm:cxn srcId="0" destId="1" type="parOf"/>
  </dgm:cxnLst>
  <dgm:bg/>
</dgm:dataModel>`;
    const patched = patchDiagram(makeFiles(parseXml(dataWithExtra)), [{ type: "removeNode", nodeId: "1" }]);
    const dataModel = getByPath(patched.data, ["dgm:dataModel"]);
    if (!dataModel) {
      throw new Error("test: missing dataModel");
    }
    expect(getChildren(dataModel, "dgm:bg")).toHaveLength(1);
  });

  it("handles text nodes in dataModel children for removeNode", () => {
    const dataModel = createElement(
      "dgm:dataModel",
      {},
      [
        createText("\n  "),
        createElement("dgm:ptLst", {}, [
          createElement("dgm:pt", { modelId: "0", type: "doc" }),
          createElement("dgm:pt", { modelId: "1", type: "node" }),
        ]),
        createText("\n  "),
        createElement("dgm:cxnLst", {}, [createElement("dgm:cxn", { srcId: "0", destId: "1", type: "parOf" })]),
        createText("\n"),
      ],
    );
    const doc: XmlDocument = { children: [dataModel] };
    const patched = patchDiagram(makeFiles(doc), [{ type: "removeNode", nodeId: "1" }]);
    const ptLst = getByPath(patched.data, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    expect(getChildren(ptLst, "dgm:pt").some((pt) => pt.attrs.modelId === "1")).toBe(false);
  });

  it("handles text nodes in dataModel children for addNode", () => {
    const dataModel = createElement(
      "dgm:dataModel",
      {},
      [
        createText("\n  "),
        createElement("dgm:ptLst", {}, [createElement("dgm:pt", { modelId: "0", type: "doc" })]),
        createText("\n  "),
        createElement("dgm:cxnLst"),
        createText("\n"),
        createElement("dgm:bg"),
      ],
    );
    const doc: XmlDocument = { children: [dataModel] };
    const patched = patchDiagram(makeFiles(doc), [{ type: "addNode", parentId: "0", nodeId: "10", text: "New" }]);
    const ptLst = getByPath(patched.data, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    expect(getChildren(ptLst, "dgm:pt").some((pt) => pt.attrs.modelId === "10")).toBe(true);
    // bg should be preserved
    const dm = getByPath(patched.data, ["dgm:dataModel"]);
    if (!dm) {
      throw new Error("test: missing dataModel");
    }
    expect(getChildren(dm, "dgm:bg")).toHaveLength(1);
  });

  it("handles text nodes in cxnLst children for removeConnectionsForNode", () => {
    const dataModel = createElement(
      "dgm:dataModel",
      {},
      [
        createElement("dgm:ptLst", {}, [
          createElement("dgm:pt", { modelId: "0", type: "doc" }),
          createElement("dgm:pt", { modelId: "1", type: "node" }),
        ]),
        createElement("dgm:cxnLst", {}, [
          createText("\n    "),
          createElement("dgm:cxn", { srcId: "0", destId: "1", type: "parOf" }),
          createText("\n  "),
        ]),
      ],
    );
    const doc: XmlDocument = { children: [dataModel] };
    const patched = patchDiagram(makeFiles(doc), [{ type: "removeNode", nodeId: "1" }]);
    const cxnLst = getByPath(patched.data, ["dgm:dataModel", "dgm:cxnLst"]);
    if (!cxnLst) {
      throw new Error("test: missing cxnLst");
    }
    // Connections for node 1 removed, but text nodes should remain
    expect(getChildren(cxnLst, "dgm:cxn")).toHaveLength(0);
    const textNodes = cxnLst.children.filter((c) => c.type === "text");
    expect(textNodes.length).toBeGreaterThan(0);
  });

  it("handles text nodes in ptLst for patchPointText", () => {
    const dataModel = createElement(
      "dgm:dataModel",
      {},
      [
        createElement("dgm:ptLst", {}, [
          createText("\n    "),
          createElement("dgm:pt", { modelId: "0", type: "doc" }),
          createText("\n    "),
          createElement("dgm:pt", { modelId: "1", type: "node" }),
          createText("\n  "),
        ]),
      ],
    );
    const doc: XmlDocument = { children: [dataModel] };
    const patched = patchDiagramNodeText(doc, "1", "Updated");
    const ptLst = getByPath(patched, ["dgm:dataModel", "dgm:ptLst"]);
    if (!ptLst) {
      throw new Error("test: missing ptLst");
    }
    const pt = getChildren(ptLst, "dgm:pt").find((p) => p.attrs.modelId === "1");
    if (!pt) {
      throw new Error("test: missing pt#1");
    }
    expect(getTextByPath(pt, ["dgm:t", "a:p", "a:r", "a:t"])).toBe("Updated");
  });

  it("calls requireDataModelRoot when root is a wrapper element", () => {
    // When the root element is NOT dgm:dataModel, requireDataModelRoot should be invoked
    // via the fallback in updateDocumentRoot
    const wrapper = createElement(
      "wrapper",
      {},
      [
        createElement("dgm:dataModel", {}, [
          createElement("dgm:ptLst", {}, [
            createElement("dgm:pt", { modelId: "0", type: "doc" }),
            createElement("dgm:pt", { modelId: "1", type: "node" }),
          ]),
        ]),
      ],
    );
    const doc: XmlDocument = { children: [wrapper] };
    // updateDocumentRoot will pass the "wrapper" element to the callback since it's the root.
    // The callback checks `root.name === "dgm:dataModel"` which is false, then calls requireDataModelRoot.
    // But requireDataModelRoot does getByPath(dataXml, ["dgm:dataModel"]) which searches the document.
    // Since wrapper is the document root and dgm:dataModel is a child, getByPath won't find it at the
    // top level. This should throw.
    expect(() => patchDiagramNodeText(doc, "1", "text")).toThrow("missing dgm:dataModel root");
  });
});
