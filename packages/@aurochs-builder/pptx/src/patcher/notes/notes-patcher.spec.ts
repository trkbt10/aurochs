/** @file Unit tests for notes patcher operations */
import { createElement, getByPath, getChild, getChildren, isXmlElement, parseXml, serializeDocument } from "@aurochs/xml";
import type { ZipPackage } from "@aurochs/zip";
import { setSlideNotes, getSlideNotes } from "./notes-patcher";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createContentTypesXml(): string {
  const doc = {
    children: [
      createElement("Types", { xmlns: "http://schemas.openxmlformats.org/package/2006/content-types" }, []),
    ],
  };
  return serializeDocument(doc, { declaration: true, standalone: true });
}

function createRelationshipsXml(): string {
  const doc = {
    children: [
      createElement("Relationships", { xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" }, []),
    ],
  };
  return serializeDocument(doc, { declaration: true, standalone: true });
}

function createMockZip(files: Record<string, string> = {}): ZipPackage {
  const store: Record<string, string> = { ...files };
  return {
    readText: (path: string) => store[path] ?? null,
    writeText: (path: string, content: string) => {
      store[path] = content;
    },
    listFiles: () => Object.keys(store),
  } as never;
}

function createNotesSlideXml(text: string): string {
  const doc = {
    children: [
      createElement(
        "p:notes",
        {
          "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
        },
        [
          createElement("p:cSld", {}, [
            createElement("p:spTree", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "1", name: "" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr"),
              ]),
              createElement("p:grpSpPr"),
              createElement("p:sp", {}, [
                createElement("p:nvSpPr", {}, [
                  createElement("p:cNvPr", { id: "3", name: "Slide Image Placeholder 3" }),
                  createElement("p:cNvSpPr", {}, [
                    createElement("a:spLocks", { noGrp: "1", noRot: "1", noChangeAspect: "1" }),
                  ]),
                  createElement("p:nvPr", {}, [createElement("p:ph", { type: "sldImg" })]),
                ]),
                createElement("p:spPr"),
              ]),
              createElement("p:sp", {}, [
                createElement("p:nvSpPr", {}, [
                  createElement("p:cNvPr", { id: "2", name: "Notes Placeholder 2" }),
                  createElement("p:cNvSpPr", {}, [createElement("a:spLocks", { noGrp: "1" })]),
                  createElement("p:nvPr", {}, [createElement("p:ph", { type: "body", idx: "1" })]),
                ]),
                createElement("p:spPr"),
                createElement("p:txBody", {}, [
                  createElement("a:bodyPr"),
                  createElement("a:lstStyle"),
                  createElement("a:p", {}, [
                    createElement("a:r", {}, [
                      createElement("a:rPr", { lang: "en-US" }),
                      createElement("a:t", {}, [{ type: "text" as const, value: text }]),
                    ]),
                    createElement("a:endParaRPr", { lang: "en-US" }),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ],
      ),
    ],
  };
  return serializeDocument(doc, { declaration: true, standalone: true });
}

// ---------------------------------------------------------------------------
// getSlideNotes
// ---------------------------------------------------------------------------

describe("getSlideNotes", () => {
  it("returns undefined when no notes file exists", () => {
    const zip = createMockZip();
    const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
    expect(result).toBeUndefined();
  });

  it("returns the text from an existing notes slide", () => {
    const notesXml = createNotesSlideXml("Hello speaker notes");
    const zip = createMockZip({
      "ppt/notesSlides/notesSlide1.xml": notesXml,
    });

    const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
    expect(result).toBe("Hello speaker notes");
  });

  it("derives correct notes path from slide number", () => {
    const notesXml = createNotesSlideXml("Slide 3 notes");
    const zip = createMockZip({
      "ppt/notesSlides/notesSlide3.xml": notesXml,
    });

    const result = getSlideNotes(zip, "ppt/slides/slide3.xml");
    expect(result).toBe("Slide 3 notes");
  });

  it("defaults to slide 1 when slide number is not parseable", () => {
    const notesXml = createNotesSlideXml("Fallback notes");
    const zip = createMockZip({
      "ppt/notesSlides/notesSlide1.xml": notesXml,
    });

    const result = getSlideNotes(zip, "ppt/slides/unknown.xml");
    expect(result).toBe("Fallback notes");
  });

  it("returns undefined when notes XML has no body placeholder", () => {
    const doc = {
      children: [
        createElement(
          "p:notes",
          {
            "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
            "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
          },
          [
            createElement("p:cSld", {}, [
              createElement("p:spTree", {}, [
                createElement("p:nvGrpSpPr", {}, [
                  createElement("p:cNvPr", { id: "1", name: "" }),
                  createElement("p:cNvGrpSpPr"),
                  createElement("p:nvPr"),
                ]),
                createElement("p:grpSpPr"),
                createElement("p:sp", {}, [
                  createElement("p:nvSpPr", {}, [
                    createElement("p:cNvPr", { id: "3", name: "Slide Image Placeholder" }),
                    createElement("p:cNvSpPr"),
                    createElement("p:nvPr", {}, [createElement("p:ph", { type: "sldImg" })]),
                  ]),
                  createElement("p:spPr"),
                ]),
              ]),
            ]),
          ],
        ),
      ],
    };
    const notesXml = serializeDocument(doc, { declaration: true, standalone: true });
    const zip = createMockZip({
      "ppt/notesSlides/notesSlide1.xml": notesXml,
    });

    const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
    expect(result).toBeUndefined();
  });

  it("returns undefined when body placeholder has no txBody", () => {
    const doc = {
      children: [
        createElement(
          "p:notes",
          {
            "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
            "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
          },
          [
            createElement("p:cSld", {}, [
              createElement("p:spTree", {}, [
                createElement("p:nvGrpSpPr", {}, [
                  createElement("p:cNvPr", { id: "1", name: "" }),
                  createElement("p:cNvGrpSpPr"),
                  createElement("p:nvPr"),
                ]),
                createElement("p:grpSpPr"),
                createElement("p:sp", {}, [
                  createElement("p:nvSpPr", {}, [
                    createElement("p:cNvPr", { id: "2", name: "Notes Placeholder" }),
                    createElement("p:cNvSpPr"),
                    createElement("p:nvPr", {}, [createElement("p:ph", { type: "body", idx: "1" })]),
                  ]),
                  createElement("p:spPr"),
                  // No p:txBody
                ]),
              ]),
            ]),
          ],
        ),
      ],
    };
    const notesXml = serializeDocument(doc, { declaration: true, standalone: true });
    const zip = createMockZip({
      "ppt/notesSlides/notesSlide1.xml": notesXml,
    });

    const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
    expect(result).toBeUndefined();
  });

  it("concatenates text from multiple runs in a paragraph", () => {
    const doc = {
      children: [
        createElement(
          "p:notes",
          {
            "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
            "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
          },
          [
            createElement("p:cSld", {}, [
              createElement("p:spTree", {}, [
                createElement("p:nvGrpSpPr", {}, [
                  createElement("p:cNvPr", { id: "1", name: "" }),
                  createElement("p:cNvGrpSpPr"),
                  createElement("p:nvPr"),
                ]),
                createElement("p:grpSpPr"),
                createElement("p:sp", {}, [
                  createElement("p:nvSpPr", {}, [
                    createElement("p:cNvPr", { id: "2", name: "Notes" }),
                    createElement("p:cNvSpPr"),
                    createElement("p:nvPr", {}, [createElement("p:ph", { type: "body", idx: "1" })]),
                  ]),
                  createElement("p:spPr"),
                  createElement("p:txBody", {}, [
                    createElement("a:bodyPr"),
                    createElement("a:p", {}, [
                      createElement("a:r", {}, [
                        createElement("a:t", {}, [{ type: "text" as const, value: "Hello " }]),
                      ]),
                      createElement("a:r", {}, [
                        createElement("a:t", {}, [{ type: "text" as const, value: "World" }]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ],
        ),
      ],
    };
    const notesXml = serializeDocument(doc, { declaration: true, standalone: true });
    const zip = createMockZip({
      "ppt/notesSlides/notesSlide1.xml": notesXml,
    });

    const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
    expect(result).toBe("Hello World");
  });

  it("matches placeholder without explicit type (undefined type)", () => {
    const doc = {
      children: [
        createElement(
          "p:notes",
          {
            "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
            "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
          },
          [
            createElement("p:cSld", {}, [
              createElement("p:spTree", {}, [
                createElement("p:nvGrpSpPr", {}, [
                  createElement("p:cNvPr", { id: "1", name: "" }),
                  createElement("p:cNvGrpSpPr"),
                  createElement("p:nvPr"),
                ]),
                createElement("p:grpSpPr"),
                createElement("p:sp", {}, [
                  createElement("p:nvSpPr", {}, [
                    createElement("p:cNvPr", { id: "2", name: "Text" }),
                    createElement("p:cNvSpPr"),
                    createElement("p:nvPr", {}, [
                      // p:ph without type attribute (phType = undefined)
                      createElement("p:ph", { idx: "1" }),
                    ]),
                  ]),
                  createElement("p:spPr"),
                  createElement("p:txBody", {}, [
                    createElement("a:bodyPr"),
                    createElement("a:p", {}, [
                      createElement("a:r", {}, [
                        createElement("a:t", {}, [{ type: "text" as const, value: "No type attr" }]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ],
        ),
      ],
    };
    const notesXml = serializeDocument(doc, { declaration: true, standalone: true });
    const zip = createMockZip({
      "ppt/notesSlides/notesSlide1.xml": notesXml,
    });

    const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
    expect(result).toBe("No type attr");
  });
});

// ---------------------------------------------------------------------------
// setSlideNotes - new notes
// ---------------------------------------------------------------------------

describe("setSlideNotes", () => {
  function createBaseZip(): ZipPackage {
    return createMockZip({
      "[Content_Types].xml": createContentTypesXml(),
      "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
    });
  }

  describe("creating new notes", () => {
    it("creates a new notes slide when none exists", () => {
      const zip = createBaseZip();
      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "New notes" });

      const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
      expect(result).toBe("New notes");
    });

    it("writes the notes XML to the correct path", () => {
      const zip = createBaseZip();
      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "Test" });

      const notesXml = (zip as never as { readText: (p: string) => string | null }).readText(
        "ppt/notesSlides/notesSlide1.xml",
      );
      expect(notesXml).toBeDefined();
      expect(notesXml).toContain("p:notes");
    });

    it("creates correct notes path for non-slide1 slides", () => {
      const zip = createMockZip({
        "[Content_Types].xml": createContentTypesXml(),
        "ppt/slides/_rels/slide7.xml.rels": createRelationshipsXml(),
      });

      setSlideNotes(zip, "ppt/slides/slide7.xml", { text: "Slide 7 notes" });

      const result = getSlideNotes(zip, "ppt/slides/slide7.xml");
      expect(result).toBe("Slide 7 notes");
    });

    it("adds content type override for notes slide", () => {
      const zip = createBaseZip();
      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "CT test" });

      const ctXml = (zip as never as { readText: (p: string) => string | null }).readText("[Content_Types].xml");
      expect(ctXml).toContain("notesSlide+xml");
    });

    it("adds relationship from slide to notes", () => {
      const zip = createBaseZip();
      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "Rels test" });

      const relsXml = (zip as never as { readText: (p: string) => string | null }).readText(
        "ppt/slides/_rels/slide1.xml.rels",
      );
      expect(relsXml).toBeDefined();
      expect(relsXml).toContain("notesSlides/notesSlide1.xml");
    });

    it("creates notes rels file with back-reference to slide", () => {
      const zip = createBaseZip();
      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "Back ref" });

      const notesRelsXml = (zip as never as { readText: (p: string) => string | null }).readText(
        "ppt/notesSlides/_rels/notesSlide1.xml.rels",
      );
      expect(notesRelsXml).toBeDefined();
      expect(notesRelsXml).toContain("slides/slide1.xml");
    });

    it("creates slide rels document when no rels file exists", () => {
      const zip = createMockZip({
        "[Content_Types].xml": createContentTypesXml(),
      });

      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "No rels" });

      const relsXml = (zip as never as { readText: (p: string) => string | null }).readText(
        "ppt/slides/_rels/slide1.xml.rels",
      );
      expect(relsXml).toBeDefined();
      expect(relsXml).toContain("Relationships");
    });

    it("handles missing content types XML without error", () => {
      const zip = createMockZip({
        "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
      });

      expect(() => {
        setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "No CT" });
      }).not.toThrow();

      const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
      expect(result).toBe("No CT");
    });

    it("creates notes with correct XML structure", () => {
      const zip = createBaseZip();
      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "Structure test" });

      const notesXml = (zip as never as { readText: (p: string) => string | null }).readText(
        "ppt/notesSlides/notesSlide1.xml",
      );
      expect(notesXml).toBeDefined();
      const doc = parseXml(notesXml!);
      const root = doc.children.find(isXmlElement);
      expect(root).toBeDefined();
      expect(root!.name).toBe("p:notes");

      const cSld = getByPath(doc, ["p:notes", "p:cSld"]);
      expect(cSld).toBeDefined();

      const spTree = getByPath(doc, ["p:notes", "p:cSld", "p:spTree"]);
      expect(spTree).toBeDefined();

      const shapes = getChildren(spTree!, "p:sp");
      expect(shapes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // setSlideNotes - updating existing notes
  // ---------------------------------------------------------------------------

  describe("updating existing notes", () => {
    it("updates the text of an existing notes slide", () => {
      const notesXml = createNotesSlideXml("Old notes");
      const zip = createMockZip({
        "ppt/notesSlides/notesSlide1.xml": notesXml,
        "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
      });

      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "New notes" });

      const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
      expect(result).toBe("New notes");
    });

    it("preserves the slide image placeholder when updating notes", () => {
      const notesXml = createNotesSlideXml("Original");
      const zip = createMockZip({
        "ppt/notesSlides/notesSlide1.xml": notesXml,
        "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
      });

      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "Updated" });

      const updatedXml = (zip as never as { readText: (p: string) => string | null }).readText(
        "ppt/notesSlides/notesSlide1.xml",
      );
      const doc = parseXml(updatedXml!);
      const spTree = getByPath(doc, ["p:notes", "p:cSld", "p:spTree"]);
      expect(spTree).toBeDefined();

      const shapes = getChildren(spTree!, "p:sp");
      const sldImgShape = shapes.find((sp) => {
        const nvSpPr = getChild(sp, "p:nvSpPr");
        if (!nvSpPr) {
          return false;
        }
        const nvPr = getChild(nvSpPr, "p:nvPr");
        if (!nvPr) {
          return false;
        }
        const ph = getChild(nvPr, "p:ph");
        return ph?.attrs.type === "sldImg";
      });
      expect(sldImgShape).toBeDefined();
    });

    it("does not modify notes file when no placeholder is found", () => {
      // Notes without a body placeholder
      const doc = {
        children: [
          createElement(
            "p:notes",
            {
              "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
              "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
              "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
            },
            [
              createElement("p:cSld", {}, [
                createElement("p:spTree", {}, [
                  createElement("p:nvGrpSpPr", {}, [
                    createElement("p:cNvPr", { id: "1", name: "" }),
                    createElement("p:cNvGrpSpPr"),
                    createElement("p:nvPr"),
                  ]),
                  createElement("p:grpSpPr"),
                ]),
              ]),
            ],
          ),
        ],
      };
      const notesXml = serializeDocument(doc, { declaration: true, standalone: true });
      const zip = createMockZip({
        "ppt/notesSlides/notesSlide1.xml": notesXml,
        "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
      });

      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "Cannot update" });

      // getSlideNotes should return undefined since no body placeholder
      const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
      expect(result).toBeUndefined();
    });

    it("replaces text in an existing notes body", () => {
      const notesXml = createNotesSlideXml("Before update");
      const zip = createMockZip({
        "ppt/notesSlides/notesSlide1.xml": notesXml,
        "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
      });

      setSlideNotes(zip, "ppt/slides/slide1.xml", { text: "After update" });

      const result = getSlideNotes(zip, "ppt/slides/slide1.xml");
      expect(result).toBe("After update");
    });

    it("updates text for a non-slide1 notes slide", () => {
      const notesXml = createNotesSlideXml("Slide 4 old notes");
      const zip = createMockZip({
        "ppt/notesSlides/notesSlide4.xml": notesXml,
        "ppt/slides/_rels/slide4.xml.rels": createRelationshipsXml(),
      });

      setSlideNotes(zip, "ppt/slides/slide4.xml", { text: "Slide 4 new notes" });

      const result = getSlideNotes(zip, "ppt/slides/slide4.xml");
      expect(result).toBe("Slide 4 new notes");
    });
  });
});
