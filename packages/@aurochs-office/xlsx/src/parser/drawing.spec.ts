/**
 * @file Drawing Parser Tests
 *
 * Tests for parsing drawing elements from XLSX files.
 */

import { parseXml } from "@aurochs/xml";
import type { XmlElement } from "@aurochs/xml";
import { parseDrawing } from "./drawing";

/**
 * Helper to parse XML string and get the root element.
 */
function parseRoot(xml: string): XmlElement {
  const doc = parseXml(xml);
  const root = doc.children.find((c): c is XmlElement => c.type === "element");
  if (!root) {
    throw new Error("No root element found");
  }
  return root;
}

describe("parseDrawing", () => {
  describe("twoCellAnchor", () => {
    it("should parse a twoCellAnchor with picture", () => {
      const xml = `
        <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">
          <xdr:twoCellAnchor editAs="oneCell">
            <xdr:from>
              <xdr:col>1</xdr:col>
              <xdr:colOff>100000</xdr:colOff>
              <xdr:row>2</xdr:row>
              <xdr:rowOff>50000</xdr:rowOff>
            </xdr:from>
            <xdr:to>
              <xdr:col>5</xdr:col>
              <xdr:colOff>200000</xdr:colOff>
              <xdr:row>10</xdr:row>
              <xdr:rowOff>75000</xdr:rowOff>
            </xdr:to>
            <xdr:pic>
              <xdr:nvPicPr>
                <xdr:cNvPr id="2" name="Picture 1" descr="Test image"/>
              </xdr:nvPicPr>
              <xdr:blipFill>
                <a:blip xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" r:embed="rId1"/>
              </xdr:blipFill>
            </xdr:pic>
          </xdr:twoCellAnchor>
        </xdr:wsDr>
      `;

      const result = parseDrawing(parseRoot(xml));

      expect(result.anchors).toHaveLength(1);
      const anchor = result.anchors[0]!;
      expect(anchor.type).toBe("twoCellAnchor");

      if (anchor.type === "twoCellAnchor") {
        expect(anchor.from.col).toBe(1);
        expect(anchor.from.colOff).toBe(100000);
        expect(anchor.from.row).toBe(2);
        expect(anchor.from.rowOff).toBe(50000);
        expect(anchor.to.col).toBe(5);
        expect(anchor.to.colOff).toBe(200000);
        expect(anchor.to.row).toBe(10);
        expect(anchor.to.rowOff).toBe(75000);
        expect(anchor.editAs).toBe("oneCell");
        expect(anchor.content?.type).toBe("picture");

        if (anchor.content?.type === "picture") {
          expect(anchor.content.nvPicPr.id).toBe(2);
          expect(anchor.content.nvPicPr.name).toBe("Picture 1");
          expect(anchor.content.nvPicPr.descr).toBe("Test image");
          expect(anchor.content.blipRelId).toBe("rId1");
        }
      }
    });

    it("should parse a twoCellAnchor with shape", () => {
      const xml = `
        <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">
          <xdr:twoCellAnchor>
            <xdr:from>
              <xdr:col>0</xdr:col>
              <xdr:colOff>0</xdr:colOff>
              <xdr:row>0</xdr:row>
              <xdr:rowOff>0</xdr:rowOff>
            </xdr:from>
            <xdr:to>
              <xdr:col>3</xdr:col>
              <xdr:colOff>0</xdr:colOff>
              <xdr:row>3</xdr:row>
              <xdr:rowOff>0</xdr:rowOff>
            </xdr:to>
            <xdr:sp>
              <xdr:nvSpPr>
                <xdr:cNvPr id="3" name="Rectangle 1"/>
              </xdr:nvSpPr>
              <xdr:spPr>
                <a:prstGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" prst="rect"/>
              </xdr:spPr>
            </xdr:sp>
          </xdr:twoCellAnchor>
        </xdr:wsDr>
      `;

      const result = parseDrawing(parseRoot(xml));

      expect(result.anchors).toHaveLength(1);
      const anchor = result.anchors[0]!;
      expect(anchor.type).toBe("twoCellAnchor");

      if (anchor.type === "twoCellAnchor") {
        expect(anchor.content?.type).toBe("shape");

        if (anchor.content?.type === "shape") {
          expect(anchor.content.nvSpPr.id).toBe(3);
          expect(anchor.content.nvSpPr.name).toBe("Rectangle 1");
          expect(anchor.content.prstGeom).toBe("rect");
        }
      }
    });

    it("should parse a twoCellAnchor with chartFrame", () => {
      const xml = `
        <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">
          <xdr:twoCellAnchor>
            <xdr:from>
              <xdr:col>0</xdr:col>
              <xdr:colOff>0</xdr:colOff>
              <xdr:row>0</xdr:row>
              <xdr:rowOff>0</xdr:rowOff>
            </xdr:from>
            <xdr:to>
              <xdr:col>10</xdr:col>
              <xdr:colOff>0</xdr:colOff>
              <xdr:row>15</xdr:row>
              <xdr:rowOff>0</xdr:rowOff>
            </xdr:to>
            <xdr:graphicFrame>
              <xdr:nvGraphicFramePr>
                <xdr:cNvPr id="4" name="Chart 1"/>
              </xdr:nvGraphicFramePr>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
                  <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId2"/>
                </a:graphicData>
              </a:graphic>
            </xdr:graphicFrame>
          </xdr:twoCellAnchor>
        </xdr:wsDr>
      `;

      const result = parseDrawing(parseRoot(xml));

      expect(result.anchors).toHaveLength(1);
      const anchor = result.anchors[0]!;

      if (anchor.type === "twoCellAnchor") {
        expect(anchor.content?.type).toBe("chartFrame");

        if (anchor.content?.type === "chartFrame") {
          expect(anchor.content.nvGraphicFramePr.id).toBe(4);
          expect(anchor.content.nvGraphicFramePr.name).toBe("Chart 1");
          expect(anchor.content.chartRelId).toBe("rId2");
        }
      }
    });
  });

  describe("oneCellAnchor", () => {
    it("should parse a oneCellAnchor with extent", () => {
      const xml = `
        <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">
          <xdr:oneCellAnchor>
            <xdr:from>
              <xdr:col>2</xdr:col>
              <xdr:colOff>0</xdr:colOff>
              <xdr:row>5</xdr:row>
              <xdr:rowOff>0</xdr:rowOff>
            </xdr:from>
            <xdr:ext cx="1000000" cy="500000"/>
            <xdr:sp>
              <xdr:nvSpPr>
                <xdr:cNvPr id="5" name="Ellipse 1"/>
              </xdr:nvSpPr>
              <xdr:spPr>
                <a:prstGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" prst="ellipse"/>
              </xdr:spPr>
            </xdr:sp>
          </xdr:oneCellAnchor>
        </xdr:wsDr>
      `;

      const result = parseDrawing(parseRoot(xml));

      expect(result.anchors).toHaveLength(1);
      const anchor = result.anchors[0]!;
      expect(anchor.type).toBe("oneCellAnchor");

      if (anchor.type === "oneCellAnchor") {
        expect(anchor.from.col).toBe(2);
        expect(anchor.from.row).toBe(5);
        expect(anchor.ext.cx).toBe(1000000);
        expect(anchor.ext.cy).toBe(500000);
        expect(anchor.content?.type).toBe("shape");
      }
    });
  });

  describe("absoluteAnchor", () => {
    it("should parse an absoluteAnchor", () => {
      const xml = `
        <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">
          <xdr:absoluteAnchor>
            <xdr:pos x="914400" y="457200"/>
            <xdr:ext cx="2000000" cy="1000000"/>
            <xdr:sp>
              <xdr:nvSpPr>
                <xdr:cNvPr id="6" name="Triangle 1"/>
              </xdr:nvSpPr>
              <xdr:spPr>
                <a:prstGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" prst="triangle"/>
              </xdr:spPr>
            </xdr:sp>
          </xdr:absoluteAnchor>
        </xdr:wsDr>
      `;

      const result = parseDrawing(parseRoot(xml));

      expect(result.anchors).toHaveLength(1);
      const anchor = result.anchors[0]!;
      expect(anchor.type).toBe("absoluteAnchor");

      if (anchor.type === "absoluteAnchor") {
        expect(anchor.pos.x).toBe(914400);
        expect(anchor.pos.y).toBe(457200);
        expect(anchor.ext.cx).toBe(2000000);
        expect(anchor.ext.cy).toBe(1000000);
      }
    });
  });

  describe("groupShape", () => {
    it("should parse a group shape with children", () => {
      const xml = `
        <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
                  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <xdr:twoCellAnchor>
            <xdr:from>
              <xdr:col>0</xdr:col>
              <xdr:colOff>0</xdr:colOff>
              <xdr:row>0</xdr:row>
              <xdr:rowOff>0</xdr:rowOff>
            </xdr:from>
            <xdr:to>
              <xdr:col>10</xdr:col>
              <xdr:colOff>0</xdr:colOff>
              <xdr:row>10</xdr:row>
              <xdr:rowOff>0</xdr:rowOff>
            </xdr:to>
            <xdr:grpSp>
              <xdr:nvGrpSpPr>
                <xdr:cNvPr id="7" name="Group 1"/>
                <xdr:cNvGrpSpPr>
                  <a:grpSpLocks noGrp="1"/>
                </xdr:cNvGrpSpPr>
              </xdr:nvGrpSpPr>
              <xdr:grpSpPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="5000000" cy="5000000"/>
                  <a:chOff x="0" y="0"/>
                  <a:chExt cx="5000000" cy="5000000"/>
                </a:xfrm>
              </xdr:grpSpPr>
              <xdr:sp>
                <xdr:nvSpPr>
                  <xdr:cNvPr id="8" name="Rect in group"/>
                </xdr:nvSpPr>
                <xdr:spPr>
                  <a:prstGeom prst="rect"/>
                </xdr:spPr>
              </xdr:sp>
              <xdr:sp>
                <xdr:nvSpPr>
                  <xdr:cNvPr id="9" name="Ellipse in group"/>
                </xdr:nvSpPr>
                <xdr:spPr>
                  <a:prstGeom prst="ellipse"/>
                </xdr:spPr>
              </xdr:sp>
            </xdr:grpSp>
          </xdr:twoCellAnchor>
        </xdr:wsDr>
      `;

      const result = parseDrawing(parseRoot(xml));

      expect(result.anchors).toHaveLength(1);
      const anchor = result.anchors[0]!;

      if (anchor.type === "twoCellAnchor") {
        expect(anchor.content?.type).toBe("groupShape");

        if (anchor.content?.type === "groupShape") {
          expect(anchor.content.nvGrpSpPr.id).toBe(7);
          expect(anchor.content.nvGrpSpPr.name).toBe("Group 1");
          expect(anchor.content.groupLocks?.noGrp).toBe(true);
          expect(anchor.content.transform).toBeDefined();
          expect(anchor.content.transform?.cx).toBe(5000000);
          expect(anchor.content.transform?.cy).toBe(5000000);
          expect(anchor.content.transform?.chExtCx).toBe(5000000);
          expect(anchor.content.transform?.chExtCy).toBe(5000000);
          expect(anchor.content.children).toHaveLength(2);
          expect(anchor.content.children[0]?.type).toBe("shape");
          expect(anchor.content.children[1]?.type).toBe("shape");
        }
      }
    });
  });

  describe("empty drawing", () => {
    it("should parse an empty drawing", () => {
      const xml = `
        <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">
        </xdr:wsDr>
      `;

      const result = parseDrawing(parseRoot(xml));

      expect(result.anchors).toHaveLength(0);
    });
  });

  describe("multiple anchors", () => {
    it("should parse multiple anchors of different types", () => {
      const xml = `
        <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">
          <xdr:twoCellAnchor>
            <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
            <xdr:to><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
          </xdr:twoCellAnchor>
          <xdr:oneCellAnchor>
            <xdr:from><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
            <xdr:ext cx="100" cy="100"/>
          </xdr:oneCellAnchor>
          <xdr:absoluteAnchor>
            <xdr:pos x="1000" y="1000"/>
            <xdr:ext cx="500" cy="500"/>
          </xdr:absoluteAnchor>
        </xdr:wsDr>
      `;

      const result = parseDrawing(parseRoot(xml));

      expect(result.anchors).toHaveLength(3);
      expect(result.anchors[0]?.type).toBe("twoCellAnchor");
      expect(result.anchors[1]?.type).toBe("oneCellAnchor");
      expect(result.anchors[2]?.type).toBe("absoluteAnchor");
    });
  });
});
