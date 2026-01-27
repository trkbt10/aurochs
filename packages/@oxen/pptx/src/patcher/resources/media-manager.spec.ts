import { parseXml, getByPath, getChildren } from "@oxen/xml";
import { createEmptyZipPackage } from "@oxen/zip";
import { addMedia, findUnusedMedia, removeMediaReference } from "./media-manager";

function minimalContentTypes(slideCount: number): string {
  const overrides = Array.from({ length: slideCount }, (_, i) => {
    const n = i + 1;
    return `<Override PartName=\"/ppt/slides/slide${n}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\"/>`;
  }).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    overrides +
    "</Types>"
  );
}

function getSlideRels(pkg: ReturnType<typeof createEmptyZipPackage>, slideNumber: number) {
  const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
  const text = pkg.readText(relsPath);
  expect(text).not.toBeNull();
  return parseXml(text!);
}

describe("media-manager", () => {
  it("adds a PNG media file and updates slide .rels + [Content_Types].xml", () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
    pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

    const data = new Uint8Array([1, 2, 3, 4]).buffer;
    const result = addMedia(pkg, data, "image/png", "ppt/slides/slide1.xml");
    expect(result.path).toBe("ppt/media/image1.png");
    expect(pkg.exists("ppt/media/image1.png")).toBe(true);

    const rels = getSlideRels(pkg, 1);
    const relRoot = getByPath(rels, ["Relationships"])!;
    const relationships = getChildren(relRoot, "Relationship");
    const imageRel = relationships.find(
      (r) =>
        r.attrs.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    );
    expect(imageRel?.attrs.Target).toBe("../media/image1.png");
    expect(imageRel?.attrs.Id).toBe(result.rId);

    const contentTypes = parseXml(pkg.readText("[Content_Types].xml")!);
    const typesRoot = getByPath(contentTypes, ["Types"])!;
    const defaults = getChildren(typesRoot, "Default");
    expect(defaults.some((d) => d.attrs.Extension === "png" && d.attrs.ContentType === "image/png")).toBe(true);
  });

  it("deduplicates identical media bytes within ppt/media", () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("[Content_Types].xml", minimalContentTypes(2));
    pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");
    pkg.writeText("ppt/slides/slide2.xml", "<p:sld/>");

    const data = new Uint8Array([9, 9, 9]).buffer;
    const r1 = addMedia(pkg, data, "image/png", "ppt/slides/slide1.xml");
    const r2 = addMedia(pkg, data, "image/png", "ppt/slides/slide2.xml");
    expect(r1.path).toBe("ppt/media/image1.png");
    expect(r2.path).toBe("ppt/media/image1.png");
    expect(r2.rId).toBe("rId1");
  });

  it("removes slide relationship and deletes unused media file + content type", () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
    pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

    const data = new Uint8Array([7, 7]).buffer;
    addMedia(pkg, data, "image/png", "ppt/slides/slide1.xml");

    removeMediaReference(pkg, "ppt/media/image1.png", "ppt/slides/slide1.xml");
    expect(pkg.exists("ppt/media/image1.png")).toBe(false);

    const contentTypes = parseXml(pkg.readText("[Content_Types].xml")!);
    const defaults = getChildren(getByPath(contentTypes, ["Types"])!, "Default");
    expect(defaults.some((d) => d.attrs.Extension === "png")).toBe(false);
  });

  it("finds unused media files in ppt/media", () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
    pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");
    pkg.writeBinary("ppt/media/image99.png", new Uint8Array([1]).buffer);

    const unused = findUnusedMedia(pkg);
    expect(unused).toEqual(["ppt/media/image99.png"]);
  });
});
