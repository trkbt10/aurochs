/**
 * @file Tests for DOCX document serialization
 */
import { getChild, getChildren } from "@aurochs/xml";
import type { DocxDocument, DocxBody, DocxBlockContent } from "@aurochs-office/docx/domain/document";
import {
  serializeBlockContent,
  serializeBody,
  serializeDocument,
} from "./document";

// =============================================================================
// serializeBlockContent
// =============================================================================

describe("serializeBlockContent", () => {
  it("serializes paragraph content", () => {
    const content: DocxBlockContent = {
      type: "paragraph",
      content: [{ type: "run", content: [{ type: "text", value: "Hello" }] }],
    };
    const el = serializeBlockContent(content);
    expect(el.name).toBe("w:p");
  });

  it("serializes table content", () => {
    const content: DocxBlockContent = {
      type: "table",
      rows: [{
        type: "tableRow",
        cells: [{
          type: "tableCell",
          content: [{ type: "paragraph", content: [] }],
        }],
      }],
    };
    const el = serializeBlockContent(content);
    expect(el.name).toBe("w:tbl");
  });

});

// =============================================================================
// serializeBody
// =============================================================================

describe("serializeBody", () => {
  it("serializes body with content and section properties", () => {
    const body: DocxBody = {
      content: [
        { type: "paragraph", content: [] },
        { type: "paragraph", content: [{ type: "run", content: [{ type: "text", value: "text" }] }] },
      ],
      sectPr: { pgSz: { w: 12240, h: 15840 } },
    };
    const el = serializeBody(body);
    expect(el.name).toBe("w:body");
    expect(getChildren(el, "w:p")).toHaveLength(2);
    expect(getChild(el, "w:sectPr")).toBeDefined();
  });

  it("serializes body without section properties", () => {
    const body: DocxBody = {
      content: [{ type: "paragraph", content: [] }],
    };
    const el = serializeBody(body);
    expect(el.name).toBe("w:body");
    expect(getChildren(el, "w:p")).toHaveLength(1);
    expect(getChild(el, "w:sectPr")).toBeUndefined();
  });

  it("serializes empty body", () => {
    const body: DocxBody = { content: [] };
    const el = serializeBody(body);
    expect(el.name).toBe("w:body");
    expect(el.children).toHaveLength(0);
  });
});

// =============================================================================
// serializeDocument
// =============================================================================

describe("serializeDocument", () => {
  it("serializes document with namespaces", () => {
    const doc: DocxDocument = {
      body: {
        content: [{ type: "paragraph", content: [] }],
      },
    };
    const el = serializeDocument(doc);
    expect(el.name).toBe("w:document");
    expect(el.attrs["xmlns:w"]).toBeDefined();
    expect(el.attrs["xmlns:r"]).toBeDefined();
    expect(el.attrs["xmlns:wp"]).toBeDefined();
    expect(el.attrs["xmlns:a"]).toBeDefined();
    expect(el.attrs["xmlns:pic"]).toBeDefined();
    expect(el.attrs["xmlns:m"]).toBeDefined();
    expect(el.attrs["xmlns:v"]).toBeDefined();
    expect(el.attrs["xmlns:o"]).toBeDefined();
    expect(el.attrs["xmlns:wpc"]).toBeDefined();
    expect(el.attrs["xmlns:mc"]).toBeDefined();
    expect(el.attrs["mc:Ignorable"]).toBe("w14 w15 w16se wp14");
    expect(getChild(el, "w:body")).toBeDefined();
  });
});
