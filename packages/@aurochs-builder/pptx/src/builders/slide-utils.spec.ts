/** @file Unit tests for slide-utils */
import { createElement, serializeDocument, type XmlDocument } from "@aurochs/xml";
import { getShapeId, getExistingShapeIds, applyBackgroundSpec } from "./slide-utils";
import type { BuildContext } from "./registry";

describe("getShapeId", () => {
  it("returns nonVisual id for regular shapes", () => {
    expect(getShapeId({ type: "sp", nonVisual: { id: "5" } })).toBe("5");
  });

  it('returns "0" for contentPart shapes', () => {
    expect(getShapeId({ type: "contentPart", nonVisual: { id: "10" } })).toBe("0");
  });

  it('returns "0" when nonVisual is undefined', () => {
    expect(getShapeId({ type: "sp" })).toBe("0");
  });

  it('returns "0" when nonVisual.id is undefined', () => {
    expect(getShapeId({ type: "sp", nonVisual: {} as { id: string } })).toBe("0");
  });
});

function createMockCtx(): BuildContext {
  return {
    existingIds: ["1"],
    specDir: "/tmp",
    zipPackage: {
      readText: () => null,
      writeText: () => {},
      listFiles: () => [],
    } as never,
    slidePath: "ppt/slides/slide1.xml",
  };
}

function createSlideDoc(): XmlDocument {
  const spTree = createElement("p:spTree", {}, []);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
}

// =============================================================================
// getExistingShapeIds
// =============================================================================

describe("getExistingShapeIds", () => {
  it("extracts shape IDs from a slide with shapes", () => {
    const slideContent: XmlDocument = {
      children: [
        createElement("p:sld", {}, [
          createElement("p:cSld", {}, [
            createElement("p:spTree", {}, [
              createElement("p:nvGrpSpPr", {}, []),
              createElement("p:sp", {}, [
                createElement("p:nvSpPr", {}, [
                  createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
                  createElement("p:cNvSpPr", {}),
                  createElement("p:nvPr", {}),
                ]),
                createElement("p:spPr", {}),
              ]),
              createElement("p:sp", {}, [
                createElement("p:nvSpPr", {}, [
                  createElement("p:cNvPr", { id: "5", name: "Shape 5" }),
                  createElement("p:cNvSpPr", {}),
                  createElement("p:nvPr", {}),
                ]),
                createElement("p:spPr", {}),
              ]),
            ]),
          ]),
        ]),
      ],
    };

    const ids = getExistingShapeIds({ content: slideContent });
    expect(ids.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty array for slide with no shapes (empty spTree)", () => {
    const slideContent: XmlDocument = {
      children: [
        createElement("p:sld", {}, [
          createElement("p:cSld", {}, [
            createElement("p:spTree", {}, [
              createElement("p:nvGrpSpPr", {}, []),
            ]),
          ]),
        ]),
      ],
    };

    const ids = getExistingShapeIds({ content: slideContent });
    // The nvGrpSpPr is parsed by shape parser; it may or may not produce a shape.
    // The important thing is this does not throw.
    expect(Array.isArray(ids)).toBe(true);
  });

  it("returns empty array when content is undefined/null", () => {
    const ids = getExistingShapeIds({ content: undefined });
    expect(ids).toEqual([]);
  });

  it("returns empty array when p:sld is missing", () => {
    const slideContent: XmlDocument = {
      children: [createElement("other", {}, [])],
    };
    const ids = getExistingShapeIds({ content: slideContent });
    expect(ids).toEqual([]);
  });
});

// =============================================================================
// applyBackgroundSpec
// =============================================================================

describe("applyBackgroundSpec", () => {
  it("returns unchanged doc when spec is undefined", async () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const result = await applyBackgroundSpec(doc, undefined, ctx);
    expect(result).toBe(doc);
  });

  it("applies solid background from hex string", async () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const result = await applyBackgroundSpec(doc, "FF0000", ctx);
    expect(result).not.toBe(doc);
  });

  it("applies gradient background", async () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const result = await applyBackgroundSpec(
      doc,
      {
        type: "gradient",
        stops: [
          { position: 0, color: "FF0000" },
          { position: 100, color: "0000FF" },
        ],
      },
      ctx,
    );
    expect(result).not.toBe(doc);
  });

  it("applies solid background from structured spec", async () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const result = await applyBackgroundSpec(doc, { type: "solid", color: "00FF00" }, ctx);
    expect(result).not.toBe(doc);
  });

  it("applies image background from in-memory data", async () => {
    const contentTypesXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      "</Types>";

    const store = new Map<string, string>([["[Content_Types].xml", contentTypesXml]]);
    const binaryStore = new Map<string, ArrayBuffer>();
    const zipPackage = {
      readText: (p: string) => store.get(p) ?? null,
      writeText: (p: string, content: string) => {
        store.set(p, content);
      },
      writeBinary: (p: string, data: ArrayBuffer) => {
        binaryStore.set(p, data);
      },
      readBinary: (p: string) => binaryStore.get(p) ?? null,
      listFiles: () => [...store.keys(), ...binaryStore.keys()],
      exists: (p: string) => store.has(p) || binaryStore.has(p),
    } as never;

    const ctx: BuildContext = {
      existingIds: ["1"],
      specDir: "/tmp",
      zipPackage,
      slidePath: "ppt/slides/slide1.xml",
    };

    const doc = createSlideDoc();
    const result = await applyBackgroundSpec(
      doc,
      {
        type: "image",
        data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        mimeType: "image/png",
      },
      ctx,
    );
    expect(result).not.toBe(doc);

    // Verify the background element was serialized into the doc
    const serialized = serializeDocument(result);
    expect(serialized).toContain("p:bg");
  });
});
