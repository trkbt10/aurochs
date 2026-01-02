/**
 * @file Diagram data model parser tests
 */

import { parseDiagramDataModel } from "./data-parser";
import { parseXml } from "../../../xml/index";

const XMLNS = {
  dgm: "http://schemas.openxmlformats.org/drawingml/2006/diagram",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
};

describe("parseDiagramDataModel", () => {
  it("parses points, connections, and formatting blocks", () => {
    const xml = `<?xml version="1.0"?>
<dgm:dataModel xmlns:dgm="${XMLNS.dgm}" xmlns:a="${XMLNS.a}">
  <dgm:ptLst>
    <dgm:pt modelId="1" type="doc">
      <dgm:prSet loTypeId="layout" loCatId="list" qsTypeId="style" qsCatId="simple" csTypeId="colors" csCatId="accent1" phldr="1" phldrT="[Text]" custAng="15" custFlipHor="1" custScaleX="50000" custLinFactNeighborX="25000">
        <dgm:presLayoutVars>
          <dgm:dir/>
          <dgm:resizeHandles val="exact"/>
          <dgm:linDir val="fromT"/>
        </dgm:presLayoutVars>
      </dgm:prSet>
      <dgm:spPr>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </dgm:spPr>
      <dgm:t>
        <a:bodyPr/>
        <a:lstStyle/>
        <a:p>
          <a:r><a:t>Hello</a:t></a:r>
        </a:p>
      </dgm:t>
    </dgm:pt>
  </dgm:ptLst>
  <dgm:cxnLst>
    <dgm:cxn modelId="2" srcId="1" destId="3" srcOrd="0" destOrd="1"/>
  </dgm:cxnLst>
  <dgm:bg/>
  <dgm:whole/>
</dgm:dataModel>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const model = parseDiagramDataModel(doc!);
    expect(model).toBeDefined();
    expect(model?.points).toHaveLength(1);
    expect(model?.connections).toHaveLength(1);
    expect(model?.background?.present).toBe(true);
    expect(model?.whole?.present).toBe(true);

    const point = model?.points[0];
    expect(point?.modelId).toBe("1");
    expect(point?.type).toBe("doc");
    expect(point?.propertySet?.placeholder).toBe(true);
    expect(point?.propertySet?.presentationLayoutVars?.variables).toEqual([
      { name: "dir", value: undefined },
      { name: "resizeHandles", value: "exact" },
      { name: "linDir", value: "fromT" },
    ]);
    expect(point?.propertySet?.customAngle).toBe(15);
    expect(point?.propertySet?.customFlipHorizontal).toBe(true);
    expect(point?.propertySet?.customScaleX).toBe(50);
    expect(point?.propertySet?.customLinearFactorNeighborX).toBe(25);
    expect(point?.textBody?.paragraphs[0].runs[0].type).toBe("text");
  });

  it("parses connection types", () => {
    const xml = `<?xml version="1.0"?>
<dgm:dataModel xmlns:dgm="${XMLNS.dgm}">
  <dgm:ptLst><dgm:pt modelId="0" type="doc"/></dgm:ptLst>
  <dgm:cxnLst><dgm:cxn modelId="1" type="parOf" srcId="0" destId="2"/></dgm:cxnLst>
</dgm:dataModel>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const dataModel = parseDiagramDataModel(doc!);
    expect(dataModel?.connections).toHaveLength(1);
    expect(dataModel?.connections[0].type).toBe("parOf");
  });
});
