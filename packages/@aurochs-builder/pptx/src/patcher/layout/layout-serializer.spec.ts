/**
 * @file Layout serializer tests
 *
 * Validates serializeSlideLayout output structure, attribute serialization,
 * and round-trip compatibility with getSlideLayoutAttributes.
 */

import { describe, expect, it } from "vitest";
import {
  getByPath,
  getChild,
  getChildren,
  isXmlElement,
  serializeDocument,
  type XmlDocument,
  type XmlElement,
} from "@aurochs/xml";
import { serializeSlideLayout, type SerializeSlideLayoutParams } from "./layout-serializer";
import { getSlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";

// =============================================================================
// Helpers
// =============================================================================

/** Extract the root p:sldLayout element from a serialized layout document. */
function getLayoutRoot(doc: XmlDocument): XmlElement {
  const root = getByPath(doc, ["p:sldLayout"]);
  if (!root) {
    throw new Error("p:sldLayout root not found");
  }
  return root;
}

// =============================================================================
// serializeSlideLayout
// =============================================================================

describe("serializeSlideLayout", () => {
  describe("with defaults", () => {
    const doc = serializeSlideLayout();

    it("creates valid XML with p:sldLayout root", () => {
      const root = getLayoutRoot(doc);
      expect(root.name).toBe("p:sldLayout");
    });

    it("includes required ECMA-376 namespaces", () => {
      const root = getLayoutRoot(doc);
      expect(root.attrs["xmlns:a"]).toBe(
        "http://schemas.openxmlformats.org/drawingml/2006/main",
      );
      expect(root.attrs["xmlns:r"]).toBe(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      );
      expect(root.attrs["xmlns:p"]).toBe(
        "http://schemas.openxmlformats.org/presentationml/2006/main",
      );
    });

    it("does not include optional attributes when omitted", () => {
      const root = getLayoutRoot(doc);
      expect(root.attrs.type).toBeUndefined();
      expect(root.attrs.preserve).toBeUndefined();
      expect(root.attrs.userDrawn).toBeUndefined();
      expect(root.attrs.showMasterSp).toBeUndefined();
    });

    it("does not set name on p:cSld when omitted", () => {
      const root = getLayoutRoot(doc);
      const cSld = getChild(root, "p:cSld");
      expect(cSld).toBeDefined();
      expect(cSld!.attrs.name).toBeUndefined();
    });
  });

  describe("with all params", () => {
    const params: SerializeSlideLayoutParams = {
      type: "title",
      name: "My Custom Layout",
      preserve: true,
      userDrawn: true,
      showMasterShapes: false,
    };
    const doc = serializeSlideLayout(params);

    it("sets type attribute on p:sldLayout", () => {
      const root = getLayoutRoot(doc);
      expect(root.attrs.type).toBe("title");
    });

    it("sets name attribute on p:cSld", () => {
      const root = getLayoutRoot(doc);
      const cSld = getChild(root, "p:cSld");
      expect(cSld).toBeDefined();
      expect(cSld!.attrs.name).toBe("My Custom Layout");
    });

    it("sets preserve attribute", () => {
      const root = getLayoutRoot(doc);
      expect(root.attrs.preserve).toBe("1");
    });

    it("sets userDrawn attribute", () => {
      const root = getLayoutRoot(doc);
      expect(root.attrs.userDrawn).toBe("1");
    });

    it("sets showMasterSp attribute to 0 when false", () => {
      const root = getLayoutRoot(doc);
      expect(root.attrs.showMasterSp).toBe("0");
    });
  });

  describe("required child elements", () => {
    const doc = serializeSlideLayout();
    const root = getLayoutRoot(doc);

    it("contains p:cSld element", () => {
      const cSld = getChild(root, "p:cSld");
      expect(cSld).toBeDefined();
    });

    it("contains p:spTree inside p:cSld", () => {
      const cSld = getChild(root, "p:cSld")!;
      const spTree = getChild(cSld, "p:spTree");
      expect(spTree).toBeDefined();
    });

    it("contains p:nvGrpSpPr inside p:spTree", () => {
      const spTree = getByPath(doc, ["p:sldLayout", "p:cSld", "p:spTree"]);
      expect(spTree).toBeDefined();
      const nvGrpSpPr = getChild(spTree!, "p:nvGrpSpPr");
      expect(nvGrpSpPr).toBeDefined();
    });

    it("contains p:grpSpPr with a:xfrm inside p:spTree", () => {
      const spTree = getByPath(doc, ["p:sldLayout", "p:cSld", "p:spTree"]);
      expect(spTree).toBeDefined();
      const grpSpPr = getChild(spTree!, "p:grpSpPr");
      expect(grpSpPr).toBeDefined();
      const xfrm = getChild(grpSpPr!, "a:xfrm");
      expect(xfrm).toBeDefined();
    });

    it("contains p:clrMapOvr with a:masterClrMapping", () => {
      const clrMapOvr = getChild(root, "p:clrMapOvr");
      expect(clrMapOvr).toBeDefined();
      const masterClrMapping = getChild(clrMapOvr!, "a:masterClrMapping");
      expect(masterClrMapping).toBeDefined();
    });
  });

  describe("boolean attribute serialization", () => {
    it("serializes preserve=true as '1'", () => {
      const doc = serializeSlideLayout({ preserve: true });
      const root = getLayoutRoot(doc);
      expect(root.attrs.preserve).toBe("1");
    });

    it("serializes preserve=false as '0'", () => {
      const doc = serializeSlideLayout({ preserve: false });
      const root = getLayoutRoot(doc);
      expect(root.attrs.preserve).toBe("0");
    });

    it("serializes userDrawn=true as '1'", () => {
      const doc = serializeSlideLayout({ userDrawn: true });
      const root = getLayoutRoot(doc);
      expect(root.attrs.userDrawn).toBe("1");
    });

    it("serializes userDrawn=false as '0'", () => {
      const doc = serializeSlideLayout({ userDrawn: false });
      const root = getLayoutRoot(doc);
      expect(root.attrs.userDrawn).toBe("0");
    });

    it("serializes showMasterShapes=true as showMasterSp='1'", () => {
      const doc = serializeSlideLayout({ showMasterShapes: true });
      const root = getLayoutRoot(doc);
      expect(root.attrs.showMasterSp).toBe("1");
    });

    it("serializes showMasterShapes=false as showMasterSp='0'", () => {
      const doc = serializeSlideLayout({ showMasterShapes: false });
      const root = getLayoutRoot(doc);
      expect(root.attrs.showMasterSp).toBe("0");
    });
  });

  describe("XML output validity", () => {
    it("produces serializable XML via serializeDocument", () => {
      const doc = serializeSlideLayout({
        type: "obj",
        name: "Object Layout",
        preserve: true,
      });
      const xml = serializeDocument(doc);
      expect(xml).toContain("p:sldLayout");
      expect(xml).toContain("p:cSld");
      expect(xml).toContain("p:spTree");
      expect(xml).toContain("p:clrMapOvr");
      expect(xml).toContain("a:masterClrMapping");
    });
  });

  describe("round-trip with getSlideLayoutAttributes", () => {
    it("parses back defaults correctly", () => {
      const doc = serializeSlideLayout();
      const attrs = getSlideLayoutAttributes(doc);
      expect(attrs.type).toBeUndefined();
      expect(attrs.name).toBeUndefined();
      expect(attrs.preserve).toBeUndefined();
      expect(attrs.userDrawn).toBeUndefined();
      expect(attrs.showMasterShapes).toBeUndefined();
    });

    it("parses back type attribute", () => {
      const doc = serializeSlideLayout({ type: "blank" });
      const attrs = getSlideLayoutAttributes(doc);
      expect(attrs.type).toBe("blank");
    });

    it("parses back name attribute", () => {
      const doc = serializeSlideLayout({ name: "Test Layout" });
      const attrs = getSlideLayoutAttributes(doc);
      expect(attrs.name).toBe("Test Layout");
    });

    it("parses back preserve=true", () => {
      const doc = serializeSlideLayout({ preserve: true });
      const attrs = getSlideLayoutAttributes(doc);
      expect(attrs.preserve).toBe(true);
    });

    it("parses back preserve=false", () => {
      const doc = serializeSlideLayout({ preserve: false });
      const attrs = getSlideLayoutAttributes(doc);
      expect(attrs.preserve).toBe(false);
    });

    it("parses back userDrawn=true", () => {
      const doc = serializeSlideLayout({ userDrawn: true });
      const attrs = getSlideLayoutAttributes(doc);
      expect(attrs.userDrawn).toBe(true);
    });

    it("parses back showMasterShapes=false", () => {
      const doc = serializeSlideLayout({ showMasterShapes: false });
      const attrs = getSlideLayoutAttributes(doc);
      expect(attrs.showMasterShapes).toBe(false);
    });

    it("parses back all params together", () => {
      const doc = serializeSlideLayout({
        type: "twoColTx",
        name: "Two Column",
        preserve: true,
        userDrawn: true,
        showMasterShapes: false,
      });
      const attrs = getSlideLayoutAttributes(doc);
      expect(attrs.type).toBe("twoColTx");
      expect(attrs.name).toBe("Two Column");
      expect(attrs.preserve).toBe(true);
      expect(attrs.userDrawn).toBe(true);
      expect(attrs.showMasterShapes).toBe(false);
    });
  });
});
