/** @file Unit tests for media manager */
import { parseXml, getByPath, getChildren } from "@aurochs/xml";
import { createEmptyZipPackage } from "@aurochs/zip";
import type { MediaType } from "./media-manager";
import { addMedia, findUnusedMedia, removeMediaReference } from "./media-manager";

function minimalContentTypes(slideCount: number): string {
  const overrides = Array.from({ length: slideCount }, (_, i) => {
    const n = i + 1;
    return `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
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
    const result = addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });
    expect(result.path).toBe("ppt/media/image1.png");
    expect(pkg.exists("ppt/media/image1.png")).toBe(true);

    const rels = getSlideRels(pkg, 1);
    const relRoot = getByPath(rels, ["Relationships"])!;
    const relationships = getChildren(relRoot, "Relationship");
    const imageRel = relationships.find(
      (r) => r.attrs.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
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
    const r1 = addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });
    const r2 = addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide2.xml" });
    expect(r1.path).toBe("ppt/media/image1.png");
    expect(r2.path).toBe("ppt/media/image1.png");
    expect(r2.rId).toBe("rId1");
  });

  it("removes slide relationship and deletes unused media file + content type", () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
    pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

    const data = new Uint8Array([7, 7]).buffer;
    addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });

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

  // =========================================================================
  // addMedia validation throws (lines 45, 48, 51)
  // =========================================================================

  describe("addMedia validation", () => {
    it("throws when mediaData is missing", () => {
      const pkg = createEmptyZipPackage();
      expect(() =>
        addMedia({
          pkg,
          mediaData: null as never,
          mediaType: "image/png",
          referringPart: "ppt/slides/slide1.xml",
        }),
      ).toThrow("addMedia: mediaData is required");
    });

    it("throws when mediaType is missing", () => {
      const pkg = createEmptyZipPackage();
      const data = new Uint8Array([1]).buffer;
      expect(() =>
        addMedia({
          pkg,
          mediaData: data,
          mediaType: "" as never,
          referringPart: "ppt/slides/slide1.xml",
        }),
      ).toThrow("addMedia: mediaType is required");
    });

    it("throws when referringPart is missing", () => {
      const pkg = createEmptyZipPackage();
      const data = new Uint8Array([1]).buffer;
      expect(() =>
        addMedia({
          pkg,
          mediaData: data,
          mediaType: "image/png",
          referringPart: "" as never,
        }),
      ).toThrow("addMedia: referringPart is required");
    });
  });

  // =========================================================================
  // removeMediaReference validation (lines 72, 75)
  // =========================================================================

  describe("removeMediaReference validation", () => {
    it("throws when mediaPath is missing", () => {
      const pkg = createEmptyZipPackage();
      expect(() => removeMediaReference(pkg, "" as never, "ppt/slides/slide1.xml")).toThrow(
        "removeMediaReference: mediaPath is required",
      );
    });

    it("throws when referringPart is missing", () => {
      const pkg = createEmptyZipPackage();
      expect(() => removeMediaReference(pkg, "ppt/media/image1.png", "" as never)).toThrow(
        "removeMediaReference: referringPart is required",
      );
    });
  });

  // =========================================================================
  // removeMediaReference early returns (lines 80, 85)
  // =========================================================================

  describe("removeMediaReference early returns", () => {
    it("returns early when rels file does not exist", () => {
      const pkg = createEmptyZipPackage();
      // No rels file exists for slide1 — should return silently without error
      expect(() => removeMediaReference(pkg, "ppt/media/image1.png", "ppt/slides/slide1.xml")).not.toThrow();
    });

    it("returns early when rels file readText returns null", () => {
      const pkg = createEmptyZipPackage();
      // Write a rels path entry so pkg.exists returns true, but readText will return the content.
      // We need to simulate readText returning null. The rels path for slide1 is:
      // ppt/slides/_rels/slide1.xml.rels
      // We write a binary entry so readText returns null for it.
      const relsPath = "ppt/slides/_rels/slide1.xml.rels";
      pkg.writeBinary(relsPath, new Uint8Array([0xff, 0xfe]).buffer);

      // Overwrite readText to return null for this path
      const originalReadText = pkg.readText.bind(pkg);
      const patchedPkg = {
        ...pkg,
        readText: (path: string) => {
          if (path === relsPath) {
            return null;
          }
          return originalReadText(path);
        },
      };

      expect(() =>
        removeMediaReference(patchedPkg as never, "ppt/media/image1.png", "ppt/slides/slide1.xml"),
      ).not.toThrow();
    });
  });

  // =========================================================================
  // removeMediaReference keeps shared media (line 101)
  // =========================================================================

  describe("removeMediaReference keeps shared media", () => {
    it("does not delete media file when it is still referenced by another slide", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes(2));
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");
      pkg.writeText("ppt/slides/slide2.xml", "<p:sld/>");

      const data = new Uint8Array([5, 5, 5]).buffer;
      addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });
      addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide2.xml" });

      // Remove reference from slide1 only
      removeMediaReference(pkg, "ppt/media/image1.png", "ppt/slides/slide1.xml");

      // Media should still exist because slide2 still references it
      expect(pkg.exists("ppt/media/image1.png")).toBe(true);
    });
  });

  // =========================================================================
  // updateContentTypesForMedia throw (line 125)
  // =========================================================================

  describe("updateContentTypesForMedia throw", () => {
    it("throws when [Content_Types].xml is missing during addMedia", () => {
      const pkg = createEmptyZipPackage();
      // No [Content_Types].xml written
      const data = new Uint8Array([1]).buffer;
      expect(() =>
        addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" }),
      ).toThrow("addMedia: missing [Content_Types].xml");
    });
  });

  // =========================================================================
  // updateContentTypesCleanup throw (line 136)
  // =========================================================================

  describe("updateContentTypesCleanup throw", () => {
    it("throws when [Content_Types].xml is missing during removeMediaReference cleanup", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

      const data = new Uint8Array([3, 3]).buffer;
      addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });

      // Patch readText to return null for [Content_Types].xml only on the second call.
      // collectUsedMediaTargets reads it first (succeeds), then updateContentTypesCleanup
      // reads it second (fails). We use a closure counter to achieve this.
      const originalReadText = pkg.readText.bind(pkg);
      const createCounter = () => {
        const state = { count: 0 };
        return () => {
          state.count += 1;
          return state.count;
        };
      };
      const nextCount = createCounter();
      const patchedPkg = {
        ...pkg,
        readText: (path: string) => {
          if (path === "[Content_Types].xml") {
            if (nextCount() >= 2) {
              return null;
            }
          }
          return originalReadText(path);
        },
      };

      expect(() =>
        removeMediaReference(patchedPkg as never, "ppt/media/image1.png", "ppt/slides/slide1.xml"),
      ).toThrow("removeMediaReference: missing [Content_Types].xml");
    });
  });

  // =========================================================================
  // collectUsedMediaTargets throw (line 176)
  // =========================================================================

  describe("collectUsedMediaTargets throw", () => {
    it("throws when [Content_Types].xml is missing during findUnusedMedia", () => {
      const pkg = createEmptyZipPackage();
      // No [Content_Types].xml
      pkg.writeBinary("ppt/media/image1.png", new Uint8Array([1]).buffer);

      expect(() => findUnusedMedia(pkg)).toThrow("collectUsedMediaTargets: missing [Content_Types].xml");
    });
  });

  // =========================================================================
  // Various media types (lines 187, 190, 193, 208-227)
  // =========================================================================

  describe("various media types", () => {
    const mediaTypeCases: Array<{
      readonly mediaType: MediaType;
      readonly expectedExtension: string;
      readonly expectedPrefix: string;
      readonly expectedContentType: string;
      readonly expectedRelType: string;
    }> = [
      {
        mediaType: "image/jpeg",
        expectedExtension: "jpeg",
        expectedPrefix: "image",
        expectedContentType: "image/jpeg",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      },
      {
        mediaType: "image/gif",
        expectedExtension: "gif",
        expectedPrefix: "image",
        expectedContentType: "image/gif",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      },
      {
        mediaType: "image/svg+xml",
        expectedExtension: "svg",
        expectedPrefix: "image",
        expectedContentType: "image/svg+xml",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      },
      {
        mediaType: "video/mp4",
        expectedExtension: "mp4",
        expectedPrefix: "video",
        expectedContentType: "video/mp4",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video",
      },
      {
        mediaType: "video/webm",
        expectedExtension: "webm",
        expectedPrefix: "video",
        expectedContentType: "video/webm",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video",
      },
      {
        mediaType: "video/quicktime",
        expectedExtension: "mov",
        expectedPrefix: "video",
        expectedContentType: "video/quicktime",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video",
      },
      {
        mediaType: "audio/mpeg",
        expectedExtension: "mp3",
        expectedPrefix: "audio",
        expectedContentType: "audio/mpeg",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",
      },
      {
        mediaType: "audio/wav",
        expectedExtension: "wav",
        expectedPrefix: "audio",
        expectedContentType: "audio/wav",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",
      },
      {
        mediaType: "audio/mp4",
        expectedExtension: "m4a",
        expectedPrefix: "audio",
        expectedContentType: "audio/mp4",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",
      },
      {
        mediaType: "audio/ogg",
        expectedExtension: "ogg",
        expectedPrefix: "audio",
        expectedContentType: "audio/ogg",
        expectedRelType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",
      },
    ];

    for (const { mediaType, expectedExtension, expectedPrefix, expectedContentType, expectedRelType } of mediaTypeCases) {
      it(`adds ${mediaType} with correct path, extension, and relationship`, () => {
        const pkg = createEmptyZipPackage();
        pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
        pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

        const data = new Uint8Array([10, 20, 30]).buffer;
        const result = addMedia({ pkg, mediaData: data, mediaType, referringPart: "ppt/slides/slide1.xml" });

        expect(result.path).toBe(`ppt/media/${expectedPrefix}1.${expectedExtension}`);
        expect(pkg.exists(result.path)).toBe(true);

        // Check relationship type
        const rels = getSlideRels(pkg, 1);
        const relRoot = getByPath(rels, ["Relationships"])!;
        const relationships = getChildren(relRoot, "Relationship");
        const rel = relationships.find((r) => r.attrs.Type === expectedRelType);
        expect(rel).toBeDefined();
        expect(rel?.attrs.Id).toBe(result.rId);

        // Check content type
        const contentTypes = parseXml(pkg.readText("[Content_Types].xml")!);
        const typesRoot = getByPath(contentTypes, ["Types"])!;
        const defaults = getChildren(typesRoot, "Default");
        expect(
          defaults.some(
            (d) => d.attrs.Extension === expectedExtension && d.attrs.ContentType === expectedContentType,
          ),
        ).toBe(true);
      });
    }
  });

  // =========================================================================
  // Buffer comparison (lines 241, 249, 255)
  // =========================================================================

  describe("buffer comparison via deduplication", () => {
    it("does not deduplicate when byte lengths differ", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

      const data1 = new Uint8Array([1, 2, 3]).buffer;
      const data2 = new Uint8Array([1, 2, 3, 4]).buffer;

      const r1 = addMedia({ pkg, mediaData: data1, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });
      const r2 = addMedia({ pkg, mediaData: data2, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });

      expect(r1.path).toBe("ppt/media/image1.png");
      expect(r2.path).toBe("ppt/media/image2.png");
    });

    it("does not deduplicate when bytes differ at same length", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

      const data1 = new Uint8Array([1, 2, 3]).buffer;
      const data2 = new Uint8Array([1, 2, 99]).buffer;

      const r1 = addMedia({ pkg, mediaData: data1, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });
      const r2 = addMedia({ pkg, mediaData: data2, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });

      expect(r1.path).toBe("ppt/media/image1.png");
      expect(r2.path).toBe("ppt/media/image2.png");
    });
  });

  // =========================================================================
  // generateMediaPath collision (line 265)
  // =========================================================================

  describe("generateMediaPath collision", () => {
    it("increments index when media file names already exist", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

      // Pre-populate with different bytes so deduplication does not match
      pkg.writeBinary("ppt/media/image1.png", new Uint8Array([1]).buffer);
      pkg.writeBinary("ppt/media/image2.png", new Uint8Array([2]).buffer);

      const data = new Uint8Array([99, 99, 99]).buffer;
      const result = addMedia({ pkg, mediaData: data, mediaType: "image/png", referringPart: "ppt/slides/slide1.xml" });

      expect(result.path).toBe("ppt/media/image3.png");
    });
  });

  // =========================================================================
  // collectUsedMediaTargets with video and audio rels (lines 187, 190, 193)
  // =========================================================================

  describe("collectUsedMediaTargets covers all relationship types", () => {
    it("recognizes video references when checking for unused media", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

      const data = new Uint8Array([10, 20]).buffer;
      addMedia({ pkg, mediaData: data, mediaType: "video/mp4", referringPart: "ppt/slides/slide1.xml" });

      // The video file should not be in unused since it is referenced
      const unused = findUnusedMedia(pkg);
      expect(unused).not.toContain("ppt/media/video1.mp4");
    });

    it("recognizes audio references when checking for unused media", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

      const data = new Uint8Array([30, 40]).buffer;
      addMedia({ pkg, mediaData: data, mediaType: "audio/mpeg", referringPart: "ppt/slides/slide1.xml" });

      const unused = findUnusedMedia(pkg);
      expect(unused).not.toContain("ppt/media/audio1.mp3");
    });

    it("recognizes image references when checking for unused media", () => {
      const pkg = createEmptyZipPackage();
      pkg.writeText("[Content_Types].xml", minimalContentTypes(1));
      pkg.writeText("ppt/slides/slide1.xml", "<p:sld/>");

      const data = new Uint8Array([50, 60]).buffer;
      addMedia({ pkg, mediaData: data, mediaType: "image/jpeg", referringPart: "ppt/slides/slide1.xml" });

      const unused = findUnusedMedia(pkg);
      expect(unused).not.toContain("ppt/media/image1.jpeg");
    });
  });
});
