/**
 * @file Tests for DOCX Drawing Parser
 */

import { describe, it, expect } from "bun:test";
import { parseDrawing } from "./drawing";
import { parseXml } from "../../xml";

// =============================================================================
// Helper Functions
// =============================================================================

function parseXmlElement(xml: string) {
  const doc = parseXml(xml);
  for (const child of doc.children) {
    if (child.type === "element") {
      return child;
    }
  }
  throw new Error("No element found in XML");
}

// =============================================================================
// Tests
// =============================================================================

describe("parseDrawing", () => {
  describe("inline drawing", () => {
    it("should parse inline drawing with picture", () => {
      const xml = `
        <w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                   xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                   xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                   xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                   xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="914400" cy="914400"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="1" name="Picture 1" descr="Test image"/>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="1" name="image.png"/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="rId1"/>
                    <a:stretch/>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm/>
                    <a:prstGeom prst="rect"/>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      `;

      const element = parseXmlElement(xml);
      const drawing = parseDrawing(element);

      expect(drawing).toBeDefined();
      expect(drawing?.type).toBe("inline");

      if (drawing?.type === "inline") {
        expect(drawing.extent.cx).toBe(914400);
        expect(drawing.extent.cy).toBe(914400);
        expect(drawing.docPr.id).toBe(1);
        expect(drawing.docPr.name).toBe("Picture 1");
        expect(drawing.docPr.descr).toBe("Test image");
        expect(drawing.pic?.blipFill?.blip?.rEmbed).toBe("rId1");
      }
    });

    it("should parse inline drawing with minimal data", () => {
      const xml = `
        <w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                   xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
          <wp:inline>
            <wp:extent cx="100" cy="200"/>
            <wp:docPr id="2" name="Test"/>
          </wp:inline>
        </w:drawing>
      `;

      const element = parseXmlElement(xml);
      const drawing = parseDrawing(element);

      expect(drawing).toBeDefined();
      expect(drawing?.type).toBe("inline");

      if (drawing?.type === "inline") {
        expect(drawing.extent.cx).toBe(100);
        expect(drawing.extent.cy).toBe(200);
        expect(drawing.pic).toBeUndefined();
      }
    });
  });

  describe("anchor drawing", () => {
    it("should parse anchor drawing with position", () => {
      const xml = `
        <w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                   xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
          <wp:anchor distT="0" distB="0" distL="114300" distR="114300"
                     simplePos="0" allowOverlap="1" behindDoc="0" locked="0" layoutInCell="1"
                     relativeHeight="1">
            <wp:positionH relativeFrom="column">
              <wp:posOffset>0</wp:posOffset>
            </wp:positionH>
            <wp:positionV relativeFrom="paragraph">
              <wp:posOffset>0</wp:posOffset>
            </wp:positionV>
            <wp:extent cx="914400" cy="914400"/>
            <wp:wrapSquare wrapText="bothSides"/>
            <wp:docPr id="1" name="Picture 1"/>
          </wp:anchor>
        </w:drawing>
      `;

      const element = parseXmlElement(xml);
      const drawing = parseDrawing(element);

      expect(drawing).toBeDefined();
      expect(drawing?.type).toBe("anchor");

      if (drawing?.type === "anchor") {
        expect(drawing.distL).toBe(114300);
        expect(drawing.allowOverlap).toBe(true);
        expect(drawing.behindDoc).toBe(false);
        expect(drawing.positionH?.relativeFrom).toBe("column");
        expect(drawing.positionH?.posOffset).toBe(0);
        expect(drawing.positionV?.relativeFrom).toBe("paragraph");
        expect(drawing.wrap?.type).toBe("square");
      }
    });
  });

  describe("invalid drawing", () => {
    it("should return undefined for drawing without inline or anchor", () => {
      const xml = `
        <w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        </w:drawing>
      `;

      const element = parseXmlElement(xml);
      const drawing = parseDrawing(element);

      expect(drawing).toBeUndefined();
    });
  });
});
