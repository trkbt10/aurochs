/** @file Unit tests for OLE object embedding manager */
import { parseXml, getByPath, getChildren } from "@aurochs/xml";
import { createEmptyZipPackage } from "@aurochs/zip";
import {
  addOleObject,
  getOleTypeFromFile,
  getOleTypeFromMimeType,
  getOleTypeInfo,
  OLE_TYPE_MAP,
} from "./ole-manager";

function minimalContentTypes(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    "</Types>"
  );
}

describe("ole-manager", () => {
  describe("addOleObject", () => {
    it("embeds an xlsx OLE object and returns path, rId, and progId", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

      const data = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
      const result = addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml");

      expect(result.path).toBe("ppt/embeddings/oleObject1.xlsx");
      expect(result.progId).toBe("Excel.Sheet.12");
      expect(result.rId).toMatch(/^rId\d+$/);
      expect(pkg.exists("ppt/embeddings/oleObject1.xlsx")).toBe(true);
    });

    it("embeds a docx OLE object with correct progId", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());

      const data = new Uint8Array([1, 2, 3]).buffer;
      const result = addOleObject(pkg, data, "docx", "ppt/slides/slide1.xml");

      expect(result.path).toBe("ppt/embeddings/oleObject1.docx");
      expect(result.progId).toBe("Word.Document.12");
    });

    it("embeds a pptx OLE object with correct progId", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());

      const data = new Uint8Array([1, 2, 3]).buffer;
      const result = addOleObject(pkg, data, "pptx", "ppt/slides/slide1.xml");

      expect(result.path).toBe("ppt/embeddings/oleObject1.pptx");
      expect(result.progId).toBe("PowerPoint.Show.12");
    });

    it("generates incremental paths avoiding collisions", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      // Pre-populate oleObject1.xlsx
      pkg.writeBinary("ppt/embeddings/oleObject1.xlsx", new Uint8Array([0xff]).buffer);

      const data = new Uint8Array([1]).buffer;
      const result = addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml");

      expect(result.path).toBe("ppt/embeddings/oleObject2.xlsx");
    });

    it("adds content type for the OLE extension", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());

      const data = new Uint8Array([1]).buffer;
      addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml");

      const ctDoc = parseXml(pkg.readText("[Content_Types].xml")!);
      const typesRoot = getByPath(ctDoc, ["Types"])!;
      const defaults = getChildren(typesRoot, "Default");
      const xlsxDefault = defaults.find((d) => d.attrs.Extension === "xlsx");
      expect(xlsxDefault).toBeDefined();
      expect(xlsxDefault!.attrs.ContentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });

    it("adds OLE relationship to the referring part .rels file", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());

      const data = new Uint8Array([1]).buffer;
      const result = addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml");

      const relsText = pkg.readText("ppt/slides/_rels/slide1.xml.rels");
      expect(relsText).not.toBeNull();
      const relsDoc = parseXml(relsText!);
      const relsRoot = getByPath(relsDoc, ["Relationships"])!;
      const rels = getChildren(relsRoot, "Relationship");
      const oleRel = rels.find(
        (r) => r.attrs.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject",
      );
      expect(oleRel).toBeDefined();
      expect(oleRel!.attrs.Id).toBe(result.rId);
    });

    it("computes correct relative target from slide to embeddings", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());

      const data = new Uint8Array([1]).buffer;
      addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml");

      const relsText = pkg.readText("ppt/slides/_rels/slide1.xml.rels")!;
      const relsDoc = parseXml(relsText);
      const relsRoot = getByPath(relsDoc, ["Relationships"])!;
      const rels = getChildren(relsRoot, "Relationship");
      const oleRel = rels.find(
        (r) => r.attrs.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject",
      );
      expect(oleRel!.attrs.Target).toBe("../embeddings/oleObject1.xlsx");
    });

    it("throws when oleData is falsy", () => {
      const pkg = createEmptyZipPackage();
      expect(() => addOleObject(pkg, null as never, "xlsx", "ppt/slides/slide1.xml")).toThrow(
        "addOleObject: oleData is required",
      );
    });

    it("throws when oleType is falsy", () => {
      const pkg = createEmptyZipPackage();
      const data = new Uint8Array([1]).buffer;
      expect(() => addOleObject(pkg, data, "" as never, "ppt/slides/slide1.xml")).toThrow(
        "addOleObject: oleType is required",
      );
    });

    it("throws when referringPart is falsy", () => {
      const pkg = createEmptyZipPackage();
      const data = new Uint8Array([1]).buffer;
      expect(() => addOleObject(pkg, data, "xlsx", "")).toThrow("addOleObject: referringPart is required");
    });

    it("throws when [Content_Types].xml is missing", () => {
      const pkg = createEmptyZipPackage();
      const data = new Uint8Array([1]).buffer;
      expect(() => addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml")).toThrow(
        "addOleObject: missing [Content_Types].xml",
      );
    });

    it("works when referring part rels file already exists", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      // Pre-populate rels file with an existing relationship
      pkg.writeText(
        "ppt/slides/_rels/slide1.xml.rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" ' +
          'Target="../slideLayouts/slideLayout1.xml"/>' +
          "</Relationships>",
      );

      const data = new Uint8Array([1]).buffer;
      const result = addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml");

      // Should get rId2 since rId1 is already taken
      expect(result.rId).toBe("rId2");
    });

    it("adds multiple OLE objects with unique paths", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());

      const data = new Uint8Array([1]).buffer;
      const r1 = addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml");
      const r2 = addOleObject(pkg, data, "xlsx", "ppt/slides/slide1.xml");

      expect(r1.path).toBe("ppt/embeddings/oleObject1.xlsx");
      expect(r2.path).toBe("ppt/embeddings/oleObject2.xlsx");
    });

    it("relationship target from presentation.xml to embeddings is relative", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());

      const data = new Uint8Array([1]).buffer;
      addOleObject(pkg, data, "docx", "ppt/presentation.xml");

      const relsText = pkg.readText("ppt/_rels/presentation.xml.rels")!;
      const relsDoc = parseXml(relsText);
      const relsRoot = getByPath(relsDoc, ["Relationships"])!;
      const rels = getChildren(relsRoot, "Relationship");
      const oleRel = rels.find(
        (r) => r.attrs.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject",
      );
      expect(oleRel!.attrs.Target).toBe("embeddings/oleObject1.docx");
    });
  });

  describe("getOleTypeFromFile", () => {
    it("returns xlsx for .xlsx files", () => {
      expect(getOleTypeFromFile("data.xlsx")).toBe("xlsx");
    });

    it("returns docx for .docx files", () => {
      expect(getOleTypeFromFile("report.docx")).toBe("docx");
    });

    it("returns pptx for .pptx files", () => {
      expect(getOleTypeFromFile("slides.pptx")).toBe("pptx");
    });

    it("returns null for unsupported extensions", () => {
      expect(getOleTypeFromFile("image.png")).toBeNull();
      expect(getOleTypeFromFile("document.pdf")).toBeNull();
      expect(getOleTypeFromFile("archive.zip")).toBeNull();
    });

    it("handles uppercase extensions", () => {
      expect(getOleTypeFromFile("DATA.XLSX")).toBe("xlsx");
      expect(getOleTypeFromFile("REPORT.DOCX")).toBe("docx");
    });

    it("handles files with multiple dots", () => {
      expect(getOleTypeFromFile("my.report.v2.xlsx")).toBe("xlsx");
    });

    it("returns null for files with no extension", () => {
      expect(getOleTypeFromFile("noextension")).toBeNull();
    });
  });

  describe("getOleTypeFromMimeType", () => {
    it("returns xlsx for spreadsheet MIME type", () => {
      expect(
        getOleTypeFromMimeType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      ).toBe("xlsx");
    });

    it("returns docx for word document MIME type", () => {
      expect(
        getOleTypeFromMimeType(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ).toBe("docx");
    });

    it("returns pptx for presentation MIME type", () => {
      expect(
        getOleTypeFromMimeType(
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ),
      ).toBe("pptx");
    });

    it("returns null for unsupported MIME types", () => {
      expect(getOleTypeFromMimeType("application/pdf")).toBeNull();
      expect(getOleTypeFromMimeType("image/png")).toBeNull();
      expect(getOleTypeFromMimeType("text/plain")).toBeNull();
    });
  });

  describe("getOleTypeInfo", () => {
    it("returns correct info for xlsx", () => {
      const info = getOleTypeInfo("xlsx");
      expect(info.extension).toBe("xlsx");
      expect(info.progId).toBe("Excel.Sheet.12");
      expect(info.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });

    it("returns correct info for docx", () => {
      const info = getOleTypeInfo("docx");
      expect(info.extension).toBe("docx");
      expect(info.progId).toBe("Word.Document.12");
      expect(info.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });

    it("returns correct info for pptx", () => {
      const info = getOleTypeInfo("pptx");
      expect(info.extension).toBe("pptx");
      expect(info.progId).toBe("PowerPoint.Show.12");
      expect(info.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
    });
  });

  describe("OLE_TYPE_MAP", () => {
    it("has entries for all three Office types", () => {
      expect(Object.keys(OLE_TYPE_MAP)).toEqual(["xlsx", "docx", "pptx"]);
    });
  });
});
