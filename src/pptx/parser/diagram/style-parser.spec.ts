/**
 * @file Diagram style definition parser tests
 */

import {
  parseDiagramStyleDefinition,
  parseDiagramStyleDefinitionHeader,
  parseDiagramStyleDefinitionHeaderList,
} from "./style-parser";
import { parseXml } from "../../../xml/index";

const XMLNS = {
  dgm: "http://schemas.openxmlformats.org/drawingml/2006/diagram",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
};

describe("parseDiagramStyleDefinition", () => {
  it("parses style definition labels", () => {
    const xml = `<?xml version="1.0"?>
<dgm:styleDef xmlns:dgm="${XMLNS.dgm}" xmlns:a="${XMLNS.a}" uniqueId="style-1">
  <dgm:title val="Style"/>
  <dgm:desc val="Desc"/>
  <dgm:catLst><dgm:cat type="simple" pri="10100"/></dgm:catLst>
  <dgm:scene3d>
    <a:camera prst="orthographicFront"/>
    <a:lightRig rig="threePt" dir="t"/>
  </dgm:scene3d>
  <dgm:styleLbl name="node0">
    <dgm:scene3d>
      <a:camera prst="orthographicFront"/>
      <a:lightRig rig="threePt" dir="t"/>
    </dgm:scene3d>
    <dgm:sp3d/>
    <dgm:txPr><a:bodyPr/><a:lstStyle/><a:p/></dgm:txPr>
    <dgm:style>
      <a:lnRef idx="2"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef>
      <a:fillRef idx="1"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef>
      <a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef>
      <a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef>
    </dgm:style>
  </dgm:styleLbl>
</dgm:styleDef>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const style = parseDiagramStyleDefinition(doc!);
    expect(style?.uniqueId).toBe("style-1");
    expect(style?.categories?.[0].type).toBe("simple");
    expect(style?.styleLabels?.[0].name).toBe("node0");
    expect(style?.styleLabels?.[0].style?.lineReference?.index).toBe(2);
  });
});

describe("parseDiagramStyleDefinitionHeader", () => {
  it("parses style definition header attributes", () => {
    const xml = `<?xml version="1.0"?>
<dgm:styleDefHdr xmlns:dgm="${XMLNS.dgm}" uniqueId="urn:quickstyle/3d1" minVer="12.0" resId="5">
  <dgm:title val="3D"/>
  <dgm:desc val=""/>
  <dgm:catLst><dgm:cat type="3D" pri="10100"/></dgm:catLst>
</dgm:styleDefHdr>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const header = parseDiagramStyleDefinitionHeader(doc!);
    expect(header?.uniqueId).toBe("urn:quickstyle/3d1");
    expect(header?.minimumVersion).toBe("12.0");
    expect(header?.resourceId).toBe(5);
    expect(header?.categories?.[0].type).toBe("3D");
  });

  it("parses style definition header list", () => {
    const xml = `<?xml version="1.0"?>
<dgm:styleDefHdrLst xmlns:dgm="${XMLNS.dgm}">
  <dgm:styleDefHdr uniqueId="one"><dgm:title val="One"/></dgm:styleDefHdr>
  <dgm:styleDefHdr uniqueId="two"><dgm:title val="Two"/></dgm:styleDefHdr>
</dgm:styleDefHdrLst>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const headerList = parseDiagramStyleDefinitionHeaderList(doc!);
    expect(headerList?.headers).toHaveLength(2);
    expect(headerList?.headers[1].uniqueId).toBe("two");
  });
});
