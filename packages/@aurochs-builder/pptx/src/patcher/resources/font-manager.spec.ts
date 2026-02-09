/** @file Unit tests for font embedding manager */
import { parseXml, getByPath, getChildren } from "@aurochs/xml";
import { createEmptyZipPackage } from "@aurochs/zip";
import type { EmbeddedFontData } from "@aurochs-office/pptx/app/presentation-document";
import { embedFonts } from "./font-manager";

function minimalContentTypes(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    "</Types>"
  );
}

function minimalPresentation(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<p:sldMasterIdLst/>" +
    "<p:sldIdLst/>" +
    '<p:sldSz cx="9144000" cy="6858000"/>' +
    '<p:notesSz cx="6858000" cy="9144000"/>' +
    "</p:presentation>"
  );
}

function makeFontData(overrides: Partial<EmbeddedFontData> = {}): EmbeddedFontData {
  return {
    fontFamily: "TestFont",
    format: "truetype",
    data: new Uint8Array([0x00, 0x01, 0x00, 0x00]),
    ...overrides,
  } as never;
}

describe("font-manager", () => {
  describe("embedFonts", () => {
    it("returns zero count when fonts array is empty", () => {
      const pkg = createEmptyZipPackage();
      const result = embedFonts(pkg, []);
      expect(result.count).toBe(0);
      expect(result.paths).toEqual([]);
    });

    it("returns zero count when fonts is falsy", () => {
      const pkg = createEmptyZipPackage();
      const result = embedFonts(pkg, null as never);
      expect(result.count).toBe(0);
      expect(result.paths).toEqual([]);
    });

    it("embeds a truetype font file into ppt/fonts/", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const font = makeFontData({ fontFamily: "Roboto", format: "truetype" });
      const result = embedFonts(pkg, [font]);

      expect(result.count).toBe(1);
      expect(result.paths).toEqual(["ppt/fonts/font1.fntdata"]);
      expect(pkg.exists("ppt/fonts/font1.fntdata")).toBe(true);
    });

    it("embeds an opentype font file into ppt/fonts/", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const font = makeFontData({ fontFamily: "OpenSans", format: "opentype" });
      const result = embedFonts(pkg, [font]);

      expect(result.count).toBe(1);
      expect(result.paths).toEqual(["ppt/fonts/font1.fntdata"]);
    });

    it("skips fonts with unsupported format (type1, cff, woff)", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const fonts = [
        makeFontData({ fontFamily: "Type1Font", format: "type1" }),
        makeFontData({ fontFamily: "CFFFont", format: "cff" }),
        makeFontData({ fontFamily: "WoffFont", format: "woff" }),
      ];
      const result = embedFonts(pkg, fonts);

      expect(result.count).toBe(0);
      expect(result.paths).toEqual([]);
    });

    it("generates incremental font paths avoiding collisions", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const font1 = makeFontData({ fontFamily: "Font1", format: "truetype" });
      const font2 = makeFontData({ fontFamily: "Font2", format: "truetype" });

      const result = embedFonts(pkg, [font1, font2]);

      expect(result.count).toBe(2);
      expect(result.paths).toEqual(["ppt/fonts/font1.fntdata", "ppt/fonts/font2.fntdata"]);
      expect(pkg.exists("ppt/fonts/font1.fntdata")).toBe(true);
      expect(pkg.exists("ppt/fonts/font2.fntdata")).toBe(true);
    });

    it("skips existing font index and finds next available", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());
      // Pre-populate font1 so next font should be font2
      pkg.writeBinary("ppt/fonts/font1.fntdata", new Uint8Array([0xff]).buffer);

      const font = makeFontData({ fontFamily: "NewFont", format: "truetype" });
      const result = embedFonts(pkg, [font]);

      expect(result.paths).toEqual(["ppt/fonts/font2.fntdata"]);
    });

    it("adds fntdata content type to [Content_Types].xml", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const font = makeFontData({ fontFamily: "Roboto", format: "truetype" });
      embedFonts(pkg, [font]);

      const ctDoc = parseXml(pkg.readText("[Content_Types].xml")!);
      const typesRoot = getByPath(ctDoc, ["Types"])!;
      const defaults = getChildren(typesRoot, "Default");
      const fntDefault = defaults.find((d) => d.attrs.Extension === "fntdata");
      expect(fntDefault).toBeDefined();
      expect(fntDefault!.attrs.ContentType).toBe("application/x-fontdata");
    });

    it("adds font relationship to ppt/_rels/presentation.xml.rels", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const font = makeFontData({ fontFamily: "Roboto", format: "truetype" });
      embedFonts(pkg, [font]);

      const relsText = pkg.readText("ppt/_rels/presentation.xml.rels");
      expect(relsText).not.toBeNull();
      const relsDoc = parseXml(relsText!);
      const relsRoot = getByPath(relsDoc, ["Relationships"])!;
      const rels = getChildren(relsRoot, "Relationship");
      const fontRel = rels.find(
        (r) => r.attrs.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font",
      );
      expect(fontRel).toBeDefined();
      expect(fontRel!.attrs.Target).toBe("fonts/font1.fntdata");
    });

    it("updates presentation.xml with p:embeddedFontLst", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const font = makeFontData({ fontFamily: "Roboto", format: "truetype" });
      embedFonts(pkg, [font]);

      const presText = pkg.readText("ppt/presentation.xml");
      expect(presText).not.toBeNull();
      const presDoc = parseXml(presText!);
      const presRoot = getByPath(presDoc, ["p:presentation"])!;
      const embeddedFontLst = getChildren(presRoot, "p:embeddedFontLst");
      expect(embeddedFontLst).toHaveLength(1);

      const embeddedFonts = getChildren(embeddedFontLst[0]!, "p:embeddedFont");
      expect(embeddedFonts).toHaveLength(1);

      const fontEl = getChildren(embeddedFonts[0]!, "p:font");
      expect(fontEl[0]!.attrs.typeface).toBe("Roboto");

      const regularEl = getChildren(embeddedFonts[0]!, "p:regular");
      expect(regularEl[0]!.attrs["r:embed"]).toBe("rId1");
    });

    it("embeddedFontLst is inserted after p:notesSz", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const font = makeFontData({ fontFamily: "Arial", format: "truetype" });
      embedFonts(pkg, [font]);

      const presText = pkg.readText("ppt/presentation.xml")!;
      const presDoc = parseXml(presText);
      const presRoot = getByPath(presDoc, ["p:presentation"])!;
      const childNames = presRoot.children
        .filter((c) => typeof c === "object" && c !== null && "name" in c)
        .map((c) => (c as { name: string }).name);

      const notesSzIdx = childNames.indexOf("p:notesSz");
      const embFontIdx = childNames.indexOf("p:embeddedFontLst");
      expect(embFontIdx).toBe(notesSzIdx + 1);
    });

    it("handles multiple truetype fonts with correct embedded font list", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const fonts = [
        makeFontData({ fontFamily: "FontA", format: "truetype" }),
        makeFontData({ fontFamily: "FontB", format: "opentype" }),
      ];
      const result = embedFonts(pkg, fonts);

      expect(result.count).toBe(2);

      const presDoc = parseXml(pkg.readText("ppt/presentation.xml")!);
      const presRoot = getByPath(presDoc, ["p:presentation"])!;
      const embeddedFontLst = getChildren(presRoot, "p:embeddedFontLst")[0]!;
      const embeddedFonts = getChildren(embeddedFontLst, "p:embeddedFont");
      expect(embeddedFonts).toHaveLength(2);

      const typefaces = embeddedFonts.map((ef) => getChildren(ef, "p:font")[0]!.attrs.typeface);
      expect(typefaces).toEqual(["FontA", "FontB"]);
    });

    it("mixed supported and unsupported fonts only embeds supported ones", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const fonts = [
        makeFontData({ fontFamily: "Supported", format: "truetype" }),
        makeFontData({ fontFamily: "Unsupported", format: "type1" }),
        makeFontData({ fontFamily: "AlsoSupported", format: "opentype" }),
      ];
      const result = embedFonts(pkg, fonts);

      expect(result.count).toBe(2);
      expect(result.paths).toEqual(["ppt/fonts/font1.fntdata", "ppt/fonts/font2.fntdata"]);
    });

    it("does not add content type when no fonts are embeddable", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const fonts = [makeFontData({ format: "type1" })];
      embedFonts(pkg, fonts);

      const ctDoc = parseXml(pkg.readText("[Content_Types].xml")!);
      const typesRoot = getByPath(ctDoc, ["Types"])!;
      const defaults = getChildren(typesRoot, "Default");
      expect(defaults.some((d) => d.attrs.Extension === "fntdata")).toBe(false);
    });

    it("does not update presentation.xml when content types XML is missing", () => {
      const pkg = createEmptyZipPackage();
      // No [Content_Types].xml
      pkg.writeText("ppt/presentation.xml", minimalPresentation());

      const font = makeFontData({ fontFamily: "Test", format: "truetype" });
      const result = embedFonts(pkg, [font]);

      // Font is still embedded and relationship created, but content type not added
      expect(result.count).toBe(1);
      expect(result.paths).toEqual(["ppt/fonts/font1.fntdata"]);
    });

    it("does not crash when presentation.xml is missing", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      // No ppt/presentation.xml

      const font = makeFontData({ fontFamily: "Test", format: "truetype" });
      const result = embedFonts(pkg, [font]);

      expect(result.count).toBe(1);
      expect(result.paths).toEqual(["ppt/fonts/font1.fntdata"]);
    });

    it("handles presentation.xml without a root element gracefully", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      pkg.writeText("ppt/presentation.xml", '<?xml version="1.0"?>');

      const font = makeFontData({ fontFamily: "Test", format: "truetype" });
      // Should not throw - updatePresentationWithFonts returns early if no root
      const result = embedFonts(pkg, [font]);
      expect(result.count).toBe(1);
    });

    it("appends embeddedFontLst at end when no known elements are present", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes());
      // Presentation with no standard child elements
      pkg.writeText(
        "ppt/presentation.xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
          "</p:presentation>",
      );

      const font = makeFontData({ fontFamily: "Fallback", format: "truetype" });
      embedFonts(pkg, [font]);

      const presDoc = parseXml(pkg.readText("ppt/presentation.xml")!);
      const presRoot = getByPath(presDoc, ["p:presentation"])!;
      const children = presRoot.children.filter(
        (c) => typeof c === "object" && c !== null && "name" in c,
      );
      const lastChild = children[children.length - 1] as { name: string };
      expect(lastChild.name).toBe("p:embeddedFontLst");
    });
  });
});
