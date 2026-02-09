/** @file relationship-manager tests */
import { parseXml, getByPath, getChildren, type XmlDocument } from "@aurochs/xml";
import { listRelationships } from "@aurochs-office/opc";
import { createRelationshipsDocument } from "../parts/relationships";
import {
  addRelationship,
  ensureRelationshipsDocument,
  generateRelationshipId,
  removeRelationship,
} from "./relationship-manager";

describe("relationship-manager", () => {
  describe("generateRelationshipId", () => {
    it("generates next rId", () => {
      expect(generateRelationshipId(["rId1", "rId2"])).toBe("rId3");
      expect(generateRelationshipId(["rId2", "rId4"])).toBe("rId1");
    });

    it("returns rId1 when no existing IDs", () => {
      expect(generateRelationshipId([])).toBe("rId1");
    });

    it("fills gaps in ID sequence", () => {
      expect(generateRelationshipId(["rId1", "rId3"])).toBe("rId2");
    });

    it("ignores non-rId format strings", () => {
      expect(generateRelationshipId(["abc", "xyz", "rId2"])).toBe("rId1");
    });
  });

  describe("addRelationship", () => {
    it("adds a relationship and preserves existing ones", () => {
      const doc = createRelationshipsDocument([
        {
          id: "rId1",
          type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
          target: "../slideLayouts/slideLayout1.xml",
        },
      ]);

      const { updatedXml, rId } = addRelationship(
        doc,
        "../media/image1.png",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      );
      expect(rId).toBe("rId2");
      expect(listRelationships(updatedXml)).toHaveLength(2);
    });

    it("does not add duplicates (same Type+Target)", () => {
      const doc = createRelationshipsDocument([
        {
          id: "rId5",
          type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
          target: "../media/image1.png",
        },
      ]);

      const { updatedXml, rId } = addRelationship(
        doc,
        "../media/image1.png",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      );
      expect(updatedXml).toBe(doc);
      expect(rId).toBe("rId5");
    });

    it("sets TargetMode=External for hyperlink relationships with URI targets", () => {
      const doc = createRelationshipsDocument();
      const { updatedXml } = addRelationship(
        doc,
        "https://example.com",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
      );

      const root = getByPath(updatedXml, ["Relationships"]);
      expect(root).toBeDefined();
      const rels = getChildren(root!, "Relationship");
      expect(rels).toHaveLength(1);
      expect(rels[0].attrs.TargetMode).toBe("External");
    });

    it("does not set TargetMode for hyperlink with relative target", () => {
      const doc = createRelationshipsDocument();
      const { updatedXml } = addRelationship(
        doc,
        "slide2.xml",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
      );

      const root = getByPath(updatedXml, ["Relationships"]);
      const rels = getChildren(root!, "Relationship");
      expect(rels).toHaveLength(1);
      expect(rels[0].attrs.TargetMode).toBeUndefined();
    });

    it("does not set TargetMode for non-hyperlink relationships", () => {
      const doc = createRelationshipsDocument();
      const { updatedXml } = addRelationship(
        doc,
        "https://example.com/image.png",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      );

      const root = getByPath(updatedXml, ["Relationships"]);
      const rels = getChildren(root!, "Relationship");
      expect(rels[0].attrs.TargetMode).toBeUndefined();
    });

    it("throws when target is empty", () => {
      const doc = createRelationshipsDocument();
      expect(() =>
        addRelationship(doc, "", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"),
      ).toThrow("target is required");
    });

    it("throws when root is not Relationships", () => {
      const doc: XmlDocument = { children: [{ type: "element", name: "NotRels", attrs: {}, children: [] }] };
      expect(() =>
        addRelationship(
          doc,
          "../media/image1.png",
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
        ),
      ).toThrow("missing Relationships root");
    });

    it("adds xmlns when missing on Relationships root", () => {
      const doc: XmlDocument = {
        children: [
          {
            type: "element",
            name: "Relationships",
            attrs: {},
            children: [],
          },
        ],
      };
      const { updatedXml } = addRelationship(
        doc,
        "../media/image1.png",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      );
      const root = getByPath(updatedXml, ["Relationships"]);
      expect(root?.attrs.xmlns).toBe("http://schemas.openxmlformats.org/package/2006/relationships");
    });

    it("preserves existing xmlns on Relationships root", () => {
      const doc = createRelationshipsDocument();
      const { updatedXml } = addRelationship(
        doc,
        "../media/image1.png",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      );
      const root = getByPath(updatedXml, ["Relationships"]);
      expect(root?.attrs.xmlns).toBe("http://schemas.openxmlformats.org/package/2006/relationships");
    });
  });

  describe("removeRelationship", () => {
    it("removes a relationship by rId", () => {
      const doc = parseXml(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="t" Target="a"/>' +
          '<Relationship Id="rId2" Type="t" Target="b"/>' +
          "</Relationships>",
      );

      const updated = removeRelationship(doc, "rId1");
      expect(listRelationships(updated).map((r) => r.id)).toEqual(["rId2"]);
    });

    it("throws when rId is empty", () => {
      const doc = createRelationshipsDocument();
      expect(() => removeRelationship(doc, "")).toThrow("rId is required");
    });

    it("returns unchanged doc when rId not found", () => {
      const doc = createRelationshipsDocument([
        { id: "rId1", type: "t", target: "a" },
      ]);
      const updated = removeRelationship(doc, "rId999");
      const rels = listRelationships(updated);
      expect(rels).toHaveLength(1);
      expect(rels[0].id).toBe("rId1");
    });

    it("preserves non-Relationship children", () => {
      const doc: XmlDocument = {
        children: [
          {
            type: "element",
            name: "Relationships",
            attrs: {},
            children: [
              { type: "text", value: "\n" },
              { type: "element", name: "Relationship", attrs: { Id: "rId1", Type: "t", Target: "a" }, children: [] },
            ],
          },
        ],
      };
      const updated = removeRelationship(doc, "rId1");
      const root = getByPath(updated, ["Relationships"])!;
      expect(root.children).toHaveLength(1);
      expect(root.children[0]).toEqual({ type: "text", value: "\n" });
    });
  });

  describe("ensureRelationshipsDocument", () => {
    it("creates new document when null", () => {
      const doc = ensureRelationshipsDocument(null);
      const root = getByPath(doc, ["Relationships"]);
      expect(root).toBeDefined();
      expect(root!.attrs.xmlns).toBe("http://schemas.openxmlformats.org/package/2006/relationships");
    });

    it("creates new document when root is invalid", () => {
      const invalidDoc: XmlDocument = { children: [{ type: "element", name: "NotRels", attrs: {}, children: [] }] };
      const doc = ensureRelationshipsDocument(invalidDoc);
      const root = getByPath(doc, ["Relationships"]);
      expect(root).toBeDefined();
    });

    it("creates new document when doc has no element root", () => {
      const emptyDoc: XmlDocument = { children: [] };
      const doc = ensureRelationshipsDocument(emptyDoc);
      const root = getByPath(doc, ["Relationships"]);
      expect(root).toBeDefined();
    });

    it("returns same document when valid", () => {
      const validDoc = createRelationshipsDocument([
        { id: "rId1", type: "t", target: "a" },
      ]);
      const result = ensureRelationshipsDocument(validDoc);
      expect(result).toBe(validDoc);
    });
  });
});
