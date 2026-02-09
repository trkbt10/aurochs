/** @file Unit tests for background-builder */
import { createElement, getChild, isXmlElement, type XmlDocument, type XmlElement } from "@aurochs/xml";
import { applyBackground, applyImageBackground, isImageBackground } from "./background-builder";
import type { ZipPackage } from "@aurochs/zip";

function createSlideDoc(): XmlDocument {
  const spTree = createElement("p:spTree", {}, []);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
}

function getCsld(doc: XmlDocument): XmlElement {
  const sld = doc.children[0] as XmlElement;
  return sld.children[0] as XmlElement;
}

/** Recursively find an element by name in the tree */
function findDescendant(el: XmlElement, name: string): XmlElement | undefined {
  for (const child of el.children) {
    if (isXmlElement(child)) {
      if (child.name === name) {
        return child;
      }
      const found = findDescendant(child, name);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

describe("isImageBackground", () => {
  it("returns true for image background spec", () => {
    expect(isImageBackground({ type: "image", path: "bg.png" })).toBe(true);
  });

  it("returns false for solid color string", () => {
    expect(isImageBackground("FF0000")).toBe(false);
  });

  it("returns false for solid spec", () => {
    expect(isImageBackground({ type: "solid", color: "FF0000" })).toBe(false);
  });

  it("returns false for gradient spec", () => {
    expect(
      isImageBackground({
        type: "gradient",
        stops: [
          { position: 0, color: "FF0000" },
          { position: 100, color: "0000FF" },
        ],
      }),
    ).toBe(false);
  });

  it("returns true for image spec with data instead of path", () => {
    expect(isImageBackground({ type: "image", data: new Uint8Array([1, 2, 3]) })).toBe(true);
  });
});

describe("applyBackground", () => {
  it("applies solid color background from hex string", () => {
    const result = applyBackground(createSlideDoc(), "FF0000");
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("strips # prefix from hex color string", () => {
    const result = applyBackground(createSlideDoc(), "#FF0000");
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("strips # prefix from solid spec color", () => {
    const result = applyBackground(createSlideDoc(), { type: "solid", color: "#1E40AF" });
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("applies gradient background", () => {
    const result = applyBackground(createSlideDoc(), {
      type: "gradient",
      stops: [
        { position: 0, color: "FF0000" },
        { position: 100, color: "0000FF" },
      ],
      angle: 90,
    });
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("replaces existing background", () => {
    const existingBg = createElement("p:bg", {}, []);
    const spTree = createElement("p:spTree");
    const cSld = createElement("p:cSld", {}, [existingBg, spTree]);
    const root = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [root] };

    const result = applyBackground(doc, "FF0000");
    const cSldResult = getCsld(result);
    const bgChildren = cSldResult.children.filter((c) => (c as XmlElement).name === "p:bg");
    expect(bgChildren).toHaveLength(1);
  });

  it("throws for unknown fill type", () => {
    expect(() =>
      applyBackground(createSlideDoc(), { type: "unknown" } as never),
    ).toThrow("Unknown background fill type");
  });

  it("returns unchanged root when p:cSld is missing", () => {
    const root = createElement("p:sld", {}, [createElement("p:spTree")]);
    const doc: XmlDocument = { children: [root] };
    const result = applyBackground(doc, "FF0000");
    // Should return a doc (no crash), but the root children should not have p:bg
    const sld = result.children[0] as XmlElement;
    const hasBg = sld.children.some((c) => (c as XmlElement).name === "p:bg");
    expect(hasBg).toBe(false);
  });

  it("applies gradient background with default angle 0", () => {
    const result = applyBackground(createSlideDoc(), {
      type: "gradient",
      stops: [
        { position: 0, color: "FF0000" },
        { position: 100, color: "0000FF" },
      ],
    });
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("applies solid fill with explicit type", () => {
    const result = applyBackground(createSlideDoc(), { type: "solid", color: "00FF00" });
    const cSld = getCsld(result);
    const firstChild = cSld.children[0] as XmlElement;
    expect(firstChild.name).toBe("p:bg");
  });

  it("places p:bg before p:spTree", () => {
    const result = applyBackground(createSlideDoc(), "FF0000");
    const cSld = getCsld(result);
    const childNames = cSld.children.map((c) => (c as XmlElement).name);
    expect(childNames[0]).toBe("p:bg");
    expect(childNames[1]).toBe("p:spTree");
  });

  it("creates p:bgPr inside p:bg with the fill element", () => {
    const result = applyBackground(createSlideDoc(), "AABBCC");
    const cSld = getCsld(result);
    const bg = getChild(cSld, "p:bg")!;
    expect(bg).toBeDefined();
    const bgPr = getChild(bg, "p:bgPr")!;
    expect(bgPr).toBeDefined();
    // Inside bgPr there should be a:solidFill
    const solidFill = getChild(bgPr, "a:solidFill");
    expect(solidFill).toBeDefined();
  });

  it("produces a:gradFill inside p:bgPr for gradient background", () => {
    const result = applyBackground(createSlideDoc(), {
      type: "gradient",
      stops: [
        { position: 0, color: "FF0000" },
        { position: 50, color: "00FF00" },
        { position: 100, color: "0000FF" },
      ],
      angle: 45,
    });
    const cSld = getCsld(result);
    const bg = getChild(cSld, "p:bg")!;
    const bgPr = getChild(bg, "p:bgPr")!;
    const gradFill = getChild(bgPr, "a:gradFill");
    expect(gradFill).toBeDefined();
  });

  it("preserves all other children of p:cSld besides p:bg", () => {
    const spTree = createElement("p:spTree", {}, []);
    const extLst = createElement("p:extLst", {}, []);
    const cSld = createElement("p:cSld", {}, [spTree, extLst]);
    const root = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [root] };

    const result = applyBackground(doc, "FF0000");
    const cSldResult = getCsld(result);
    const childNames = cSldResult.children.filter(isXmlElement).map((c) => c.name);
    expect(childNames).toContain("p:bg");
    expect(childNames).toContain("p:spTree");
    expect(childNames).toContain("p:extLst");
  });
});

describe("applyImageBackground", () => {
  function createMockZipPackage(): ZipPackage {
    const files = new Map<string, string | ArrayBuffer>();
    const relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;
    const contentTypesContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`;
    files.set("ppt/slides/_rels/slide1.xml.rels", relsContent);
    files.set("[Content_Types].xml", contentTypesContent);

    return {
      readText: (p: string) => {
        const val = files.get(p);
        return typeof val === "string" ? val : null;
      },
      writeText: (p: string, data: string) => {
        files.set(p, data);
      },
      readBinary: (_p: string) => null,
      writeBinary: (p: string, data: ArrayBuffer) => {
        files.set(p, data);
      },
      exists: (p: string) => files.has(p),
      listFiles: () => Array.from(files.keys()),
      asPresentationFile: () => ({
        readText: (p: string) => {
          const val = files.get(p);
          return typeof val === "string" ? val : null;
        },
      }),
    } as never;
  }

  it("applies image background with in-memory data", async () => {
    const doc = createSlideDoc();
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header bytes

    const result = await applyImageBackground(
      doc,
      { type: "image", data: imageData, mimeType: "image/png" },
      {
        specDir: "/tmp",
        zipPackage: createMockZipPackage(),
        slidePath: "ppt/slides/slide1.xml",
      },
    );

    const cSld = getCsld(result);
    const bg = getChild(cSld, "p:bg")!;
    expect(bg).toBeDefined();
    const bgPr = getChild(bg, "p:bgPr")!;
    expect(bgPr).toBeDefined();
    const blipFill = getChild(bgPr, "a:blipFill");
    expect(blipFill).toBeDefined();
  });

  it("defaults to image/png mimeType when data is provided without mimeType", async () => {
    const doc = createSlideDoc();
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const result = await applyImageBackground(
      doc,
      { type: "image", data: imageData },
      {
        specDir: "/tmp",
        zipPackage: createMockZipPackage(),
        slidePath: "ppt/slides/slide1.xml",
      },
    );

    const cSld = getCsld(result);
    const bg = getChild(cSld, "p:bg")!;
    expect(bg).toBeDefined();
  });

  it("throws when neither path nor data is provided", async () => {
    const doc = createSlideDoc();

    await expect(
      applyImageBackground(
        doc,
        { type: "image" },
        {
          specDir: "/tmp",
          zipPackage: createMockZipPackage(),
          slidePath: "ppt/slides/slide1.xml",
        },
      ),
    ).rejects.toThrow("BackgroundImageSpec requires either 'path' or 'data'");
  });

  it("replaces existing p:bg when applying image background", async () => {
    const existingBg = createElement("p:bg", {}, []);
    const spTree = createElement("p:spTree");
    const cSld = createElement("p:cSld", {}, [existingBg, spTree]);
    const root = createElement("p:sld", {}, [cSld]);
    const doc: XmlDocument = { children: [root] };

    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const result = await applyImageBackground(
      doc,
      { type: "image", data: imageData, mimeType: "image/png" },
      {
        specDir: "/tmp",
        zipPackage: createMockZipPackage(),
        slidePath: "ppt/slides/slide1.xml",
      },
    );

    const cSldResult = getCsld(result);
    const bgChildren = cSldResult.children.filter((c) => isXmlElement(c) && c.name === "p:bg");
    expect(bgChildren).toHaveLength(1);
  });

  it("returns unchanged root when p:cSld is missing for image background", async () => {
    const root = createElement("p:sld", {}, [createElement("p:spTree")]);
    const doc: XmlDocument = { children: [root] };

    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const result = await applyImageBackground(
      doc,
      { type: "image", data: imageData, mimeType: "image/png" },
      {
        specDir: "/tmp",
        zipPackage: createMockZipPackage(),
        slidePath: "ppt/slides/slide1.xml",
      },
    );

    const sld = result.children[0] as XmlElement;
    const hasBg = sld.children.some((c) => isXmlElement(c) && c.name === "p:bg");
    expect(hasBg).toBe(false);
  });

  it("produces a:blip with r:embed attribute for image background", async () => {
    const doc = createSlideDoc();
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const result = await applyImageBackground(
      doc,
      { type: "image", data: imageData, mimeType: "image/png" },
      {
        specDir: "/tmp",
        zipPackage: createMockZipPackage(),
        slidePath: "ppt/slides/slide1.xml",
      },
    );

    const cSld = getCsld(result);
    const bg = getChild(cSld, "p:bg")!;
    const bgPr = getChild(bg, "p:bgPr")!;
    const blipFill = getChild(bgPr, "a:blipFill")!;
    const blip = getChild(blipFill, "a:blip")!;
    expect(blip.attrs["r:embed"]).toBeDefined();
    expect(blip.attrs["r:embed"]).toMatch(/^rId/);
  });

  it("uses a:stretch fill mode by default", async () => {
    const doc = createSlideDoc();
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const result = await applyImageBackground(
      doc,
      { type: "image", data: imageData, mimeType: "image/png" },
      {
        specDir: "/tmp",
        zipPackage: createMockZipPackage(),
        slidePath: "ppt/slides/slide1.xml",
      },
    );

    const cSld = getCsld(result);
    const bg = getChild(cSld, "p:bg")!;
    const stretch = findDescendant(bg, "a:stretch");
    expect(stretch).toBeDefined();
  });

  it("uses a:tile fill mode when mode is 'tile'", async () => {
    const doc = createSlideDoc();
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const result = await applyImageBackground(
      doc,
      { type: "image", data: imageData, mimeType: "image/png", mode: "tile" },
      {
        specDir: "/tmp",
        zipPackage: createMockZipPackage(),
        slidePath: "ppt/slides/slide1.xml",
      },
    );

    const cSld = getCsld(result);
    const bg = getChild(cSld, "p:bg")!;
    const tile = findDescendant(bg, "a:tile");
    expect(tile).toBeDefined();
  });

  it("uses a:stretch fill mode when mode is 'cover'", async () => {
    const doc = createSlideDoc();
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const result = await applyImageBackground(
      doc,
      { type: "image", data: imageData, mimeType: "image/png", mode: "cover" },
      {
        specDir: "/tmp",
        zipPackage: createMockZipPackage(),
        slidePath: "ppt/slides/slide1.xml",
      },
    );

    const cSld = getCsld(result);
    const bg = getChild(cSld, "p:bg")!;
    const stretch = findDescendant(bg, "a:stretch");
    expect(stretch).toBeDefined();
  });
});
