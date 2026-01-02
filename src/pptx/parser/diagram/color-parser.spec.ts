/**
 * @file Diagram color definition parser tests
 */

import {
  parseDiagramColorsDefinition,
  parseDiagramColorsDefinitionHeader,
  parseDiagramColorsDefinitionHeaderList,
} from "./color-parser";
import { parseXml } from "../../../xml/index";

const XMLNS = {
  dgm: "http://schemas.openxmlformats.org/drawingml/2006/diagram",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
};

describe("parseDiagramColorsDefinition", () => {
  it("parses color definition labels", () => {
    const xml = `<?xml version="1.0"?>
<dgm:colorsDef xmlns:dgm="${XMLNS.dgm}" xmlns:a="${XMLNS.a}" uniqueId="colors-1">
  <dgm:title val="Colors"/>
  <dgm:desc val="Desc"/>
  <dgm:catLst><dgm:cat type="accent1" pri="11200"/></dgm:catLst>
  <dgm:styleLbl name="node0">
    <dgm:fillClrLst meth="repeat" hueDir="cw"><a:schemeClr val="accent1"/></dgm:fillClrLst>
    <dgm:linClrLst meth="repeat"><a:schemeClr val="lt1"/></dgm:linClrLst>
    <dgm:effectClrLst/>
    <dgm:txLinClrLst/>
    <dgm:txFillClrLst/>
    <dgm:txEffectClrLst/>
  </dgm:styleLbl>
</dgm:colorsDef>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const colors = parseDiagramColorsDefinition(doc!);
    expect(colors?.uniqueId).toBe("colors-1");
    expect(colors?.categories?.[0].type).toBe("accent1");
    expect(colors?.styleLabels?.[0].fillColors?.colors).toHaveLength(1);
    expect(colors?.styleLabels?.[0].fillColors?.method).toBe("repeat");
    expect(colors?.styleLabels?.[0].fillColors?.hueDirection).toBe("cw");
  });
});

describe("parseDiagramColorsDefinitionHeader", () => {
  it("parses colors definition header attributes", () => {
    const xml = `<?xml version="1.0"?>
<dgm:colorsDefHdr xmlns:dgm="${XMLNS.dgm}" uniqueId="urn:colors/accent0_1" minVer="16.0" resId="7">
  <dgm:title val="Main 1"/>
  <dgm:desc val=""/>
  <dgm:catLst><dgm:cat type="mainScheme" pri="10100"/></dgm:catLst>
</dgm:colorsDefHdr>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const header = parseDiagramColorsDefinitionHeader(doc!);
    expect(header?.uniqueId).toBe("urn:colors/accent0_1");
    expect(header?.minimumVersion).toBe("16.0");
    expect(header?.resourceId).toBe(7);
    expect(header?.categories?.[0].type).toBe("mainScheme");
  });

  it("parses colors definition header list", () => {
    const xml = `<?xml version="1.0"?>
<dgm:colorsDefHdrLst xmlns:dgm="${XMLNS.dgm}">
  <dgm:colorsDefHdr uniqueId="one"><dgm:title val="One"/></dgm:colorsDefHdr>
  <dgm:colorsDefHdr uniqueId="two"><dgm:title val="Two"/></dgm:colorsDefHdr>
</dgm:colorsDefHdrLst>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const headerList = parseDiagramColorsDefinitionHeaderList(doc!);
    expect(headerList?.headers).toHaveLength(2);
    expect(headerList?.headers[1].uniqueId).toBe("two");
  });
});
