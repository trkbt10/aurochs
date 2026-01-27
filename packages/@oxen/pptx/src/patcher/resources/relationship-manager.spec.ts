import { parseXml, getByPath, getChildren } from "@oxen/xml";
import { createRelationshipsDocument } from "../parts/relationships";
import { addRelationship, generateRelationshipId, listRelationships, removeRelationship } from "./relationship-manager";

describe("relationship-manager", () => {
  it("generates next rId", () => {
    expect(generateRelationshipId(["rId1", "rId2"])).toBe("rId3");
    expect(generateRelationshipId(["rId2", "rId4"])).toBe("rId1");
  });

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
});

