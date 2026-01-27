import { parseXml, getByPath, getChildren } from "@oxen/xml";
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

describe("content-types-manager", () => {
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

  it("adds an Override", () => {
    const doc = parseXml(createContentTypesXml());
    const updated = addOverride(doc, "/ppt/media/video1.mp4", "video/mp4");
    const types = getByPath(updated, ["Types"])!;
    const overrides = getChildren(types, "Override");
    expect(overrides.some((o) => o.attrs.PartName === "/ppt/media/video1.mp4" && o.attrs.ContentType === "video/mp4")).toBe(true);
  });

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
});

