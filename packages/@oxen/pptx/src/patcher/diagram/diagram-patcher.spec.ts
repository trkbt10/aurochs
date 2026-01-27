import { getByPath, getChildren, getTextByPath, parseXml } from "@oxen/xml";
import { patchDiagram } from "./diagram-patcher";

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
});
