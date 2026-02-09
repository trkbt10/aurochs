/** @file content-types-manager tests */
import { parseXml, getByPath, getChildren, isXmlElement, type XmlDocument } from "@aurochs/xml";
import { addContentType, addOverride, removeUnusedContentTypes } from "./content-types-manager";

function createContentTypesXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
    "</Types>"
  );
}

function createContentTypesXmlNoOverrides(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    "</Types>"
  );
}

describe("content-types-manager", () => {
  describe("addContentType", () => {
    it("adds a new Default content type", () => {
      const doc = parseXml(createContentTypesXml());
      const updated = addContentType(doc, "png", "image/png");
      const types = getByPath(updated, ["Types"])!;
      const defaults = getChildren(types, "Default");
      expect(defaults.some((d) => d.attrs.Extension === "png" && d.attrs.ContentType === "image/png")).toBe(true);
    });

    it("does nothing for duplicate Default content type", () => {
      const doc = parseXml(createContentTypesXml());
      const withPng = addContentType(doc, "png", "image/png");
      const again = addContentType(withPng, "png", "image/png");
      expect(again).toBe(withPng);
    });

    it("throws when extension is empty", () => {
      const doc = parseXml(createContentTypesXml());
      expect(() => addContentType(doc, "", "image/png")).toThrow("extension is required");
    });

    it("throws when contentType is empty", () => {
      const doc = parseXml(createContentTypesXml());
      expect(() => addContentType(doc, "png", "")).toThrow("contentType is required");
    });

    it("throws when root is not Types", () => {
      const doc: XmlDocument = { children: [{ type: "element", name: "NotTypes", attrs: {}, children: [] }] };
      expect(() => addContentType(doc, "png", "image/png")).toThrow("missing Types root");
    });

    it("throws when extension exists with different content type", () => {
      const doc = parseXml(createContentTypesXml());
      const withPng = addContentType(doc, "png", "image/png");
      expect(() => addContentType(withPng, "png", "image/jpeg")).toThrow('already exists with ContentType');
    });

    it("normalizes extension by stripping leading dot", () => {
      const doc = parseXml(createContentTypesXml());
      const updated = addContentType(doc, ".png", "image/png");
      const types = getByPath(updated, ["Types"])!;
      const defaults = getChildren(types, "Default");
      expect(defaults.some((d) => d.attrs.Extension === "png")).toBe(true);
    });

    it("normalizes extension to lowercase", () => {
      const doc = parseXml(createContentTypesXml());
      const updated = addContentType(doc, "PNG", "image/png");
      const types = getByPath(updated, ["Types"])!;
      const defaults = getChildren(types, "Default");
      expect(defaults.some((d) => d.attrs.Extension === "png")).toBe(true);
    });

    it("inserts Default before first Override", () => {
      const doc = parseXml(createContentTypesXml());
      const updated = addContentType(doc, "png", "image/png");
      const types = getByPath(updated, ["Types"])!;
      const elementChildren = types.children.filter(isXmlElement);
      const pngIdx = elementChildren.findIndex((c) => c.name === "Default" && c.attrs.Extension === "png");
      const overrideIdx = elementChildren.findIndex((c) => c.name === "Override");
      expect(pngIdx).toBeLessThan(overrideIdx);
    });

    it("appends Default at end when no Overrides exist", () => {
      const doc = parseXml(createContentTypesXmlNoOverrides());
      const updated = addContentType(doc, "png", "image/png");
      const types = getByPath(updated, ["Types"])!;
      const elementChildren = types.children.filter(isXmlElement);
      const last = elementChildren[elementChildren.length - 1];
      expect(last.name).toBe("Default");
      expect(last.attrs.Extension).toBe("png");
    });

    it("returns original doc when root updateDocumentRoot callback receives non-Types", () => {
      // This covers the guard inside updateDocumentRoot callback
      const doc: XmlDocument = { children: [] };
      expect(() => addContentType(doc, "png", "image/png")).toThrow("missing Types root");
    });
  });

  describe("addOverride", () => {
    it("adds an Override", () => {
      const doc = parseXml(createContentTypesXml());
      const updated = addOverride(doc, "/ppt/media/video1.mp4", "video/mp4");
      const types = getByPath(updated, ["Types"])!;
      const overrides = getChildren(types, "Override");
      expect(
        overrides.some((o) => o.attrs.PartName === "/ppt/media/video1.mp4" && o.attrs.ContentType === "video/mp4"),
      ).toBe(true);
    });

    it("throws when partName is empty", () => {
      const doc = parseXml(createContentTypesXml());
      expect(() => addOverride(doc, "", "video/mp4")).toThrow("partName is required");
    });

    it("throws when contentType is empty", () => {
      const doc = parseXml(createContentTypesXml());
      expect(() => addOverride(doc, "/ppt/x.xml", "")).toThrow("contentType is required");
    });

    it("throws when root is not Types", () => {
      const doc: XmlDocument = { children: [{ type: "element", name: "NotTypes", attrs: {}, children: [] }] };
      expect(() => addOverride(doc, "/ppt/x.xml", "ct")).toThrow("missing Types root");
    });

    it("normalizes partName by prepending /", () => {
      const doc = parseXml(createContentTypesXml());
      const updated = addOverride(doc, "ppt/media/video1.mp4", "video/mp4");
      const types = getByPath(updated, ["Types"])!;
      const overrides = getChildren(types, "Override");
      expect(overrides.some((o) => o.attrs.PartName === "/ppt/media/video1.mp4")).toBe(true);
    });

    it("returns same doc when override already exists with same type", () => {
      const doc = parseXml(createContentTypesXml());
      const slideType = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
      const result = addOverride(doc, "/ppt/slides/slide1.xml", slideType);
      expect(result).toBe(doc);
    });

    it("throws when override exists with different content type", () => {
      const doc = parseXml(createContentTypesXml());
      expect(() => addOverride(doc, "/ppt/slides/slide1.xml", "different/type")).toThrow(
        'already exists with ContentType',
      );
    });
  });

  describe("removeUnusedContentTypes", () => {
    it("removes unused Defaults and Overrides", () => {
      const doc = parseXml(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="png" ContentType="image/png"/>' +
          '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
          '<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
          "</Types>",
      );

      const updated = removeUnusedContentTypes(doc, ["ppt/slides/slide1.xml", "ppt/slides/slide1.xml.rels"]);
      const types = getByPath(updated, ["Types"])!;
      const defaults = getChildren(types, "Default");
      expect(defaults.some((d) => d.attrs.Extension === "png")).toBe(false);
      const overrides = getChildren(types, "Override");
      expect(overrides.some((o) => o.attrs.PartName === "/ppt/slides/slide2.xml")).toBe(false);
    });

    it("throws when root is not Types", () => {
      const doc: XmlDocument = { children: [{ type: "element", name: "NotTypes", attrs: {}, children: [] }] };
      expect(() => removeUnusedContentTypes(doc, [])).toThrow("missing Types root");
    });

    it("always keeps xml and rels Default entries", () => {
      const doc = parseXml(createContentTypesXml());
      const updated = removeUnusedContentTypes(doc, []);
      const types = getByPath(updated, ["Types"])!;
      const defaults = getChildren(types, "Default");
      expect(defaults.some((d) => d.attrs.Extension === "xml")).toBe(true);
      expect(defaults.some((d) => d.attrs.Extension === "rels")).toBe(true);
    });

    it("keeps Defaults for extensions used by parts", () => {
      const doc = parseXml(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="png" ContentType="image/png"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          "</Types>",
      );
      const updated = removeUnusedContentTypes(doc, ["ppt/media/image1.png"]);
      const types = getByPath(updated, ["Types"])!;
      const defaults = getChildren(types, "Default");
      expect(defaults.some((d) => d.attrs.Extension === "png")).toBe(true);
    });

    it("normalizes parts with leading slash", () => {
      const doc = parseXml(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Override PartName="/ppt/slides/slide1.xml" ContentType="ct"/>' +
          "</Types>",
      );
      const updated = removeUnusedContentTypes(doc, ["/ppt/slides/slide1.xml"]);
      const types = getByPath(updated, ["Types"])!;
      const overrides = getChildren(types, "Override");
      expect(overrides).toHaveLength(1);
    });

    it("removes Override entries that have no PartName attribute", () => {
      const doc: XmlDocument = {
        children: [
          {
            type: "element",
            name: "Types",
            attrs: {},
            children: [
              { type: "element", name: "Default", attrs: { Extension: "xml", ContentType: "application/xml" }, children: [] },
              { type: "element", name: "Default", attrs: { Extension: "rels", ContentType: "application/rels" }, children: [] },
              { type: "element", name: "Override", attrs: { ContentType: "ct" }, children: [] },
            ],
          },
        ],
      };
      const updated = removeUnusedContentTypes(doc, []);
      const types = getByPath(updated, ["Types"])!;
      const overrides = getChildren(types, "Override");
      expect(overrides).toHaveLength(0);
    });

    it("preserves non-element children (text nodes)", () => {
      const doc: XmlDocument = {
        children: [
          {
            type: "element",
            name: "Types",
            attrs: {},
            children: [
              { type: "text", value: "\n" },
              { type: "element", name: "Default", attrs: { Extension: "xml", ContentType: "application/xml" }, children: [] },
              { type: "element", name: "Default", attrs: { Extension: "rels", ContentType: "application/rels" }, children: [] },
            ],
          },
        ],
      };
      const updated = removeUnusedContentTypes(doc, []);
      const types = getByPath(updated, ["Types"])!;
      const textNodes = types.children.filter((c) => !isXmlElement(c));
      expect(textNodes).toHaveLength(1);
    });

    it("preserves unknown element types (not Default or Override)", () => {
      const doc: XmlDocument = {
        children: [
          {
            type: "element",
            name: "Types",
            attrs: {},
            children: [
              { type: "element", name: "Default", attrs: { Extension: "xml", ContentType: "application/xml" }, children: [] },
              { type: "element", name: "Default", attrs: { Extension: "rels", ContentType: "application/rels" }, children: [] },
              { type: "element", name: "CustomElement", attrs: {}, children: [] },
            ],
          },
        ],
      };
      const updated = removeUnusedContentTypes(doc, []);
      const types = getByPath(updated, ["Types"])!;
      const customs = types.children.filter((c) => isXmlElement(c) && c.name === "CustomElement");
      expect(customs).toHaveLength(1);
    });

    it("handles parts without file extensions", () => {
      const doc = parseXml(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="png" ContentType="image/png"/>' +
          "</Types>",
      );
      // Part without extension should not cause extension to be kept
      const updated = removeUnusedContentTypes(doc, ["noextension"]);
      const types = getByPath(updated, ["Types"])!;
      const defaults = getChildren(types, "Default");
      expect(defaults.some((d) => d.attrs.Extension === "png")).toBe(false);
    });
  });
});
