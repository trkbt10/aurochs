/** @file relationships tests */
import { getByPath, getChildren } from "@aurochs/xml";
import { createRelationshipsDocument, RELATIONSHIPS_XMLNS } from "./relationships";

describe("createRelationshipsDocument", () => {
  it("creates empty Relationships document when called with no args", () => {
    const doc = createRelationshipsDocument();
    const root = getByPath(doc, ["Relationships"]);
    expect(root).toBeDefined();
    expect(root!.name).toBe("Relationships");
    expect(root!.attrs.xmlns).toBe(RELATIONSHIPS_XMLNS);
    expect(root!.children).toHaveLength(0);
  });

  it("creates empty Relationships document when called with empty array", () => {
    const doc = createRelationshipsDocument([]);
    const root = getByPath(doc, ["Relationships"]);
    expect(root).toBeDefined();
    expect(root!.children).toHaveLength(0);
  });

  it("creates document with single relationship", () => {
    const doc = createRelationshipsDocument([
      {
        id: "rId1",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
        target: "slides/slide1.xml",
      },
    ]);
    const root = getByPath(doc, ["Relationships"])!;
    const rels = getChildren(root, "Relationship");
    expect(rels).toHaveLength(1);
    expect(rels[0].attrs.Id).toBe("rId1");
    expect(rels[0].attrs.Type).toBe(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
    );
    expect(rels[0].attrs.Target).toBe("slides/slide1.xml");
    expect(rels[0].attrs.TargetMode).toBeUndefined();
  });

  it("creates document with multiple relationships", () => {
    const doc = createRelationshipsDocument([
      { id: "rId1", type: "type1", target: "target1" },
      { id: "rId2", type: "type2", target: "target2" },
      { id: "rId3", type: "type3", target: "target3" },
    ]);
    const root = getByPath(doc, ["Relationships"])!;
    const rels = getChildren(root, "Relationship");
    expect(rels).toHaveLength(3);
    expect(rels[0].attrs.Id).toBe("rId1");
    expect(rels[1].attrs.Id).toBe("rId2");
    expect(rels[2].attrs.Id).toBe("rId3");
  });

  it("includes TargetMode when specified", () => {
    const doc = createRelationshipsDocument([
      {
        id: "rId1",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        target: "https://example.com",
        targetMode: "External",
      },
    ]);
    const root = getByPath(doc, ["Relationships"])!;
    const rels = getChildren(root, "Relationship");
    expect(rels[0].attrs.TargetMode).toBe("External");
  });

  it("omits TargetMode when not specified", () => {
    const doc = createRelationshipsDocument([
      { id: "rId1", type: "type1", target: "target1" },
    ]);
    const root = getByPath(doc, ["Relationships"])!;
    const rels = getChildren(root, "Relationship");
    expect(rels[0].attrs.TargetMode).toBeUndefined();
  });

  it("uses correct xmlns constant", () => {
    expect(RELATIONSHIPS_XMLNS).toBe("http://schemas.openxmlformats.org/package/2006/relationships");
  });
});
