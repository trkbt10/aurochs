/**
 * @file Diagram layout definition parser tests
 */

import {
  parseDiagramLayoutDefinition,
  parseDiagramLayoutDefinitionHeader,
  parseDiagramLayoutDefinitionHeaderList,
} from "./layout-parser";
import { parseXml } from "@oxen/xml";

const XMLNS = {
  dgm: "http://schemas.openxmlformats.org/drawingml/2006/diagram",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
};

describe("parseDiagramLayoutDefinition", () => {
  it("parses layout definition nodes and rules", () => {
    const xml = `<?xml version="1.0"?>
<dgm:layoutDef xmlns:dgm="${XMLNS.dgm}" xmlns:a="${XMLNS.a}" xmlns:r="${XMLNS.r}" uniqueId="layout-1">
  <dgm:title val="Layout"/>
  <dgm:desc val="Sample"/>
  <dgm:catLst>
    <dgm:cat type="list" pri="400"/>
  </dgm:catLst>
  <dgm:sampData>
    <dgm:dataModel>
      <dgm:ptLst><dgm:pt modelId="0" type="doc"/></dgm:ptLst>
      <dgm:cxnLst/>
      <dgm:bg/>
      <dgm:whole/>
    </dgm:dataModel>
  </dgm:sampData>
  <dgm:layoutNode name="diagram" chOrder="t" moveWith="peer" styleLbl="accent">
    <dgm:varLst>
      <dgm:dir/>
      <dgm:animLvl val="ctr"/>
      <dgm:animOne val="branch"/>
      <dgm:begSty val="arr"/>
      <dgm:endSty val="auto"/>
      <dgm:autoTxRot val="upr"/>
      <dgm:bendPt val="end"/>
      <dgm:break val="bal"/>
      <dgm:ctrShpMap val="fNode"/>
      <dgm:chAlign val="l"/>
      <dgm:chDir val="horz"/>
      <dgm:dim val="1D"/>
      <dgm:begPts val="auto"/>
      <dgm:endPts val="tR"/>
      <dgm:connRout val="bend"/>
      <dgm:contDir val="sameDir"/>
      <dgm:horzAlign val="ctr"/>
      <dgm:nodeHorzAlign val="l"/>
      <dgm:nodeVertAlign val="mid"/>
      <dgm:off val="ctr"/>
      <dgm:alignTx val="ctr"/>
      <dgm:parTxLTRAlign val="r"/>
      <dgm:dir val="rev"/>
      <dgm:fallback val="2D"/>
      <dgm:flowDir val="row"/>
      <dgm:grDir val="tL"/>
      <dgm:hierAlign val="bCtrDes"/>
      <dgm:hierBranch val="hang"/>
      <dgm:resizeHandles val="exact"/>
      <dgm:linDir val="fromL"/>
    </dgm:varLst>
    <dgm:choose name="choice">
      <dgm:if name="if1" func="var" arg="dir" op="equ" val="norm">
      <dgm:alg type="snake">
        <dgm:param type="grDir" val="tL"/>
        <dgm:param type="rtShortDist" val="1"/>
        <dgm:param type="pyraAcctPos" val="aft"/>
        <dgm:param type="pyraAcctTxMar" val="step"/>
        <dgm:param type="rotPath" val="alongPath"/>
        <dgm:param type="secChAlign" val="b"/>
        <dgm:param type="secLinDir" val="fromR"/>
        <dgm:param type="stElem" val="node"/>
        <dgm:param type="txAnchorHorz" val="ctr"/>
        <dgm:param type="txAnchorVert" val="mid"/>
        <dgm:param type="txBlDir" val="vert"/>
        <dgm:param type="txDir" val="fromB"/>
        <dgm:param type="vertAlign" val="none"/>
      </dgm:alg>
      </dgm:if>
      <dgm:else name="else1">
        <dgm:alg type="snake"/>
      </dgm:else>
    </dgm:choose>
    <dgm:shape type="rect" r:blip="">
      <dgm:adjLst><dgm:adj idx="1" val="0.5"/></dgm:adjLst>
    </dgm:shape>
    <dgm:presOf axis="desOrSelf" ptType="node asst" cnt="1 3" hideLastTrans="true false" st="2" step="1 3"/>
    <dgm:constrLst><dgm:constr type="w" val="1" for="ch" refFor="des" op="gte"/></dgm:constrLst>
    <dgm:ruleLst><dgm:rule type="primFontSz" val="5"/></dgm:ruleLst>
    <dgm:forEach name="child" axis="ch des" ptType="node pres" cnt="2 4" hideLastTrans="1 0" st="1" step="2">
      <dgm:layoutNode name="node"><dgm:alg type="tx"/></dgm:layoutNode>
    </dgm:forEach>
  </dgm:layoutNode>
</dgm:layoutDef>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const layout = parseDiagramLayoutDefinition(doc!);
    expect(layout?.uniqueId).toBe("layout-1");
    expect(layout?.categories?.[0].type).toBe("list");
    expect(layout?.sampleData?.points).toHaveLength(1);
    expect(layout?.layoutNode?.name).toBe("diagram");
    expect(layout?.layoutNode?.childOrder).toBe("t");
    expect(layout?.layoutNode?.moveWith).toBe("peer");
    expect(layout?.layoutNode?.styleLabel).toBe("accent");
    expect(layout?.layoutNode?.variables?.variables[0].name).toBe("dir");
    expect(layout?.layoutNode?.variables?.variables[1].value).toBe("ctr");
    expect(layout?.layoutNode?.variables?.variables[2].value).toBe("branch");
    expect(layout?.layoutNode?.variables?.variables[3].value).toBe("arr");
    expect(layout?.layoutNode?.variables?.variables[4].value).toBe("auto");
    expect(layout?.layoutNode?.variables?.variables[5].value).toBe("upr");
    expect(layout?.layoutNode?.variables?.variables[6].value).toBe("end");
    expect(layout?.layoutNode?.variables?.variables[7].value).toBe("bal");
    expect(layout?.layoutNode?.variables?.variables[8].value).toBe("fNode");
    expect(layout?.layoutNode?.variables?.variables[9].value).toBe("l");
    expect(layout?.layoutNode?.variables?.variables[10].value).toBe("horz");
    expect(layout?.layoutNode?.variables?.variables[11].value).toBe("1D");
    expect(layout?.layoutNode?.variables?.variables[12].value).toBe("auto");
    expect(layout?.layoutNode?.variables?.variables[13].value).toBe("tR");
    expect(layout?.layoutNode?.variables?.variables[14].value).toBe("bend");
    expect(layout?.layoutNode?.variables?.variables[15].value).toBe("sameDir");
    expect(layout?.layoutNode?.variables?.variables[16].value).toBe("ctr");
    expect(layout?.layoutNode?.variables?.variables[17].value).toBe("l");
    expect(layout?.layoutNode?.variables?.variables[18].value).toBe("mid");
    expect(layout?.layoutNode?.variables?.variables[19].value).toBe("ctr");
    expect(layout?.layoutNode?.variables?.variables[20].value).toBe("ctr");
    expect(layout?.layoutNode?.variables?.variables[21].value).toBe("r");
    expect(layout?.layoutNode?.variables?.variables[22].value).toBe("rev");
    expect(layout?.layoutNode?.variables?.variables[23].value).toBe("2D");
    expect(layout?.layoutNode?.variables?.variables[24].value).toBe("row");
    expect(layout?.layoutNode?.variables?.variables[25].value).toBe("tL");
    expect(layout?.layoutNode?.variables?.variables[26].value).toBe("bCtrDes");
    expect(layout?.layoutNode?.variables?.variables[27].value).toBe("hang");
    expect(layout?.layoutNode?.variables?.variables[28].value).toBe("exact");
    expect(layout?.layoutNode?.variables?.variables[29].value).toBe("fromL");
    expect(layout?.layoutNode?.choose?.[0].if?.function).toBe("var");
    expect(layout?.layoutNode?.choose?.[0].if?.argument).toBe("dir");
    expect(layout?.layoutNode?.choose?.[0].if?.operator).toBe("equ");
    expect(layout?.layoutNode?.choose?.[0].if?.value).toBe("norm");
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[0]).toEqual({
      type: "grDir",
      value: "tL",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[1]).toEqual({
      type: "rtShortDist",
      value: true,
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[2]).toEqual({
      type: "pyraAcctPos",
      value: "aft",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[3]).toEqual({
      type: "pyraAcctTxMar",
      value: "step",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[4]).toEqual({
      type: "rotPath",
      value: "alongPath",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[5]).toEqual({
      type: "secChAlign",
      value: "b",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[6]).toEqual({
      type: "secLinDir",
      value: "fromR",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[7]).toEqual({
      type: "stElem",
      value: "node",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[8]).toEqual({
      type: "txAnchorHorz",
      value: "ctr",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[9]).toEqual({
      type: "txAnchorVert",
      value: "mid",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[10]).toEqual({
      type: "txBlDir",
      value: "vert",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[11]).toEqual({
      type: "txDir",
      value: "fromB",
    });
    expect(layout?.layoutNode?.choose?.[0].if?.algorithm?.params?.[12]).toEqual({
      type: "vertAlign",
      value: "none",
    });
    expect(layout?.layoutNode?.shape?.type).toBe("rect");
    expect(layout?.layoutNode?.shape?.adjustments?.[0].index).toBe(1);
    expect(layout?.layoutNode?.presentationOf?.axis).toEqual(["desOrSelf"]);
    expect(layout?.layoutNode?.presentationOf?.pointType).toEqual(["node", "asst"]);
    expect(layout?.layoutNode?.presentationOf?.count).toEqual([1, 3]);
    expect(layout?.layoutNode?.presentationOf?.hideLastTransition).toEqual([true, false]);
    expect(layout?.layoutNode?.presentationOf?.start).toEqual([2]);
    expect(layout?.layoutNode?.presentationOf?.step).toEqual([1, 3]);
    expect(layout?.layoutNode?.constraints?.[0].type).toBe("w");
    expect(layout?.layoutNode?.constraints?.[0].operator).toBe("gte");
    expect(layout?.layoutNode?.constraints?.[0].forRelationship).toBe("ch");
    expect(layout?.layoutNode?.constraints?.[0].referenceForRelationship).toBe("des");
    expect(layout?.layoutNode?.rules?.[0].type).toBe("primFontSz");
    expect(layout?.layoutNode?.forEach?.[0].axis).toEqual(["ch", "des"]);
    expect(layout?.layoutNode?.forEach?.[0].pointType).toEqual(["node", "pres"]);
    expect(layout?.layoutNode?.forEach?.[0].count).toEqual([2, 4]);
    expect(layout?.layoutNode?.forEach?.[0].hideLastTransition).toEqual([true, false]);
    expect(layout?.layoutNode?.forEach?.[0].start).toEqual([1]);
    expect(layout?.layoutNode?.forEach?.[0].step).toEqual([2]);
    expect(layout?.layoutNode?.forEach?.[0].content.children?.[0].name).toBe("node");
  });

  it("parses layout shape output types", () => {
    const xml = `<?xml version="1.0"?>
<dgm:layoutDef xmlns:dgm="${XMLNS.dgm}" xmlns:r="${XMLNS.r}">
  <dgm:layoutNode name="diagram">
    <dgm:shape type="conn"/>
  </dgm:layoutNode>
</dgm:layoutDef>`;

    const doc = parseXml(xml);
    const layout = parseDiagramLayoutDefinition(doc!);
    expect(layout?.layoutNode?.shape?.type).toBe("conn");
  });
});

describe("parseDiagramLayoutDefinitionHeader", () => {
  it("parses layout definition header attributes", () => {
    const xml = `<?xml version="1.0"?>
<dgm:layoutDefHdr xmlns:dgm="${XMLNS.dgm}" uniqueId="urn:layout/default" defStyle="style1" minVer="16.0" resId="12">
  <dgm:title val="Basic Block List"/>
  <dgm:desc val=""/>
  <dgm:catLst><dgm:cat type="list" pri="1000"/></dgm:catLst>
</dgm:layoutDefHdr>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const header = parseDiagramLayoutDefinitionHeader(doc!);
    expect(header?.uniqueId).toBe("urn:layout/default");
    expect(header?.defaultStyle).toBe("style1");
    expect(header?.minimumVersion).toBe("16.0");
    expect(header?.resourceId).toBe(12);
    expect(header?.categories?.[0].type).toBe("list");
  });

  it("parses layout definition header list", () => {
    const xml = `<?xml version="1.0"?>
<dgm:layoutDefHdrLst xmlns:dgm="${XMLNS.dgm}">
  <dgm:layoutDefHdr uniqueId="one"><dgm:title val="One"/></dgm:layoutDefHdr>
  <dgm:layoutDefHdr uniqueId="two"><dgm:title val="Two"/></dgm:layoutDefHdr>
</dgm:layoutDefHdrLst>`;

    const doc = parseXml(xml);
    expect(doc).toBeDefined();
    const headerList = parseDiagramLayoutDefinitionHeaderList(doc!);
    expect(headerList?.headers).toHaveLength(2);
    expect(headerList?.headers[1].uniqueId).toBe("two");
  });
});
