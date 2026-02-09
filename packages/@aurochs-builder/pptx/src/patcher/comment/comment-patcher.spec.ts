/** @file Unit tests for comment patcher operations */
import { createElement, serializeDocument } from "@aurochs/xml";
import type { ZipPackage } from "@aurochs/zip";
import { addCommentToSlide, getSlideComments, getCommentAuthors } from "./comment-patcher";

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

function createCommentAuthorsXml(
  authors: Array<{ id: number; name: string; initials: string; lastIdx: number; clrIdx: number }>,
): string {
  const authorElements = authors.map((a) =>
    createElement("p:cmAuthor", {
      id: String(a.id),
      name: a.name,
      initials: a.initials,
      lastIdx: String(a.lastIdx),
      clrIdx: String(a.clrIdx),
    }),
  );
  const doc = {
    children: [
      createElement(
        "p:cmAuthorLst",
        { "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main" },
        authorElements,
      ),
    ],
  };
  return serializeDocument(doc, { declaration: true, standalone: true });
}

function buildTextChildren(text: string | undefined) {
  if (!text) {
    return [];
  }
  return [createElement("p:text", {}, [{ type: "text" as const, value: text }])];
}

function createCommentsXml(
  comments: Array<{ authorId: string; dt: string; idx: string; text?: string }>,
): string {
  const commentElements = comments.map((c) => {
    const children = buildTextChildren(c.text);
    return createElement("p:cm", { authorId: c.authorId, dt: c.dt, idx: c.idx }, children);
  });
  const doc = {
    children: [
      createElement(
        "p:cmLst",
        { "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main" },
        commentElements,
      ),
    ],
  };
  return serializeDocument(doc, { declaration: true, standalone: true });
}

// ---------------------------------------------------------------------------
// getSlideComments
// ---------------------------------------------------------------------------

describe("getSlideComments", () => {
  it("returns empty array when no comments file exists", () => {
    const zip = createMockZip();
    const result = getSlideComments(zip, "ppt/slides/slide1.xml");
    expect(result).toEqual([]);
  });

  it("returns empty array when comments XML has no root element", () => {
    const zip = createMockZip({
      "ppt/comments/comment1.xml": '<?xml version="1.0" encoding="UTF-8"?>',
    });
    const result = getSlideComments(zip, "ppt/slides/slide1.xml");
    expect(result).toEqual([]);
  });

  it("returns comments from an existing comments file", () => {
    const commentsXml = createCommentsXml([
      { authorId: "0", dt: "2024-01-01T00:00:00.000", idx: "1", text: "Hello" },
      { authorId: "1", dt: "2024-01-02T00:00:00.000", idx: "2", text: "World" },
    ]);
    const zip = createMockZip({
      "ppt/comments/comment1.xml": commentsXml,
    });
    const result = getSlideComments(zip, "ppt/slides/slide1.xml");
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Hello");
    expect(result[1].text).toBe("World");
  });

  it("derives the correct comment path from slide number", () => {
    const commentsXml = createCommentsXml([
      { authorId: "0", dt: "2024-01-01T00:00:00.000", idx: "1", text: "Slide3" },
    ]);
    const zip = createMockZip({
      "ppt/comments/comment3.xml": commentsXml,
    });
    const result = getSlideComments(zip, "ppt/slides/slide3.xml");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Slide3");
  });

  it("defaults to slide1 when slide number is not parseable", () => {
    const commentsXml = createCommentsXml([
      { authorId: "0", dt: "2024-01-01T00:00:00.000", idx: "1", text: "Fallback" },
    ]);
    const zip = createMockZip({
      "ppt/comments/comment1.xml": commentsXml,
    });
    const result = getSlideComments(zip, "ppt/slides/unknown.xml");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Fallback");
  });
});

// ---------------------------------------------------------------------------
// getCommentAuthors
// ---------------------------------------------------------------------------

describe("getCommentAuthors", () => {
  it("returns empty array when no authors file exists", () => {
    const zip = createMockZip();
    const result = getCommentAuthors(zip);
    expect(result).toEqual([]);
  });

  it("returns empty array when authors XML has no root element", () => {
    const zip = createMockZip({
      "ppt/commentAuthors.xml": '<?xml version="1.0" encoding="UTF-8"?>',
    });
    const result = getCommentAuthors(zip);
    expect(result).toEqual([]);
  });

  it("returns authors from an existing authors file", () => {
    const authorsXml = createCommentAuthorsXml([
      { id: 0, name: "Alice", initials: "AL", lastIdx: 3, clrIdx: 0 },
      { id: 1, name: "Bob", initials: "BO", lastIdx: 2, clrIdx: 1 },
    ]);
    const zip = createMockZip({
      "ppt/commentAuthors.xml": authorsXml,
    });
    const result = getCommentAuthors(zip);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].name).toBe("Bob");
  });
});

// ---------------------------------------------------------------------------
// addCommentToSlide
// ---------------------------------------------------------------------------

describe("addCommentToSlide", () => {
  function createBaseZip(): ZipPackage {
    return createMockZip({
      "[Content_Types].xml": createContentTypesXml(),
      "ppt/_rels/presentation.xml.rels": createRelationshipsXml(),
      "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
    });
  }

  it("creates a new comment on a slide with no prior comments", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "First comment",
    });

    const comments = getSlideComments(zip, "ppt/slides/slide1.xml");
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe("First comment");
    expect(comments[0].authorId).toBe(0);
    expect(comments[0].idx).toBe(1);
  });

  it("creates the author with auto-generated initials when not provided", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "Test",
    });

    const authors = getCommentAuthors(zip);
    expect(authors).toHaveLength(1);
    expect(authors[0].name).toBe("Alice");
    expect(authors[0].initials).toBe("AL");
  });

  it("uses provided initials when specified", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      authorInitials: "AW",
      text: "Test",
    });

    const authors = getCommentAuthors(zip);
    expect(authors).toHaveLength(1);
    expect(authors[0].initials).toBe("AW");
  });

  it("reuses an existing author by name", () => {
    const authorsXml = createCommentAuthorsXml([
      { id: 0, name: "Alice", initials: "AL", lastIdx: 1, clrIdx: 0 },
    ]);
    const zip = createMockZip({
      "[Content_Types].xml": createContentTypesXml(),
      "ppt/_rels/presentation.xml.rels": createRelationshipsXml(),
      "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
      "ppt/commentAuthors.xml": authorsXml,
    });

    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "Another comment",
    });

    const authors = getCommentAuthors(zip);
    expect(authors).toHaveLength(1);
    expect(authors[0].id).toBe(0);
  });

  it("adds a second author with incremented id", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "Comment 1",
    });
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Bob",
      text: "Comment 2",
    });

    const authors = getCommentAuthors(zip);
    expect(authors).toHaveLength(2);
    expect(authors[0].name).toBe("Alice");
    expect(authors[0].id).toBe(0);
    expect(authors[1].name).toBe("Bob");
    expect(authors[1].id).toBe(1);
  });

  it("sets position when x and y are provided", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "Positioned",
      x: 100,
      y: 200,
    });

    const comments = getSlideComments(zip, "ppt/slides/slide1.xml");
    expect(comments).toHaveLength(1);
    expect(comments[0].position).toBeDefined();
    // The serializer multiplies pixel value by 914400 to get EMUs,
    // and the parser converts EMUs to pixels using EMU_TO_PX = 96/914400.
    // So the round-trip value is: input * 914400 * (96 / 914400) = input * 96
    const EMU_TO_PX = 96 / 914400;
    expect(comments[0].position!.x).toBeCloseTo(Math.round(100 * 914400) * EMU_TO_PX, 1);
    expect(comments[0].position!.y).toBeCloseTo(Math.round(200 * 914400) * EMU_TO_PX, 1);
  });

  it("omits position when only x is provided (no y)", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "No position",
      x: 100,
    });

    const comments = getSlideComments(zip, "ppt/slides/slide1.xml");
    expect(comments).toHaveLength(1);
    expect(comments[0].position).toBeUndefined();
  });

  it("increments comment idx when existing comments exist", () => {
    const commentsXml = createCommentsXml([
      { authorId: "0", dt: "2024-01-01T00:00:00.000", idx: "3", text: "Existing" },
    ]);
    const authorsXml = createCommentAuthorsXml([
      { id: 0, name: "Alice", initials: "AL", lastIdx: 3, clrIdx: 0 },
    ]);
    const zip = createMockZip({
      "[Content_Types].xml": createContentTypesXml(),
      "ppt/_rels/presentation.xml.rels": createRelationshipsXml(),
      "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
      "ppt/comments/comment1.xml": commentsXml,
      "ppt/commentAuthors.xml": authorsXml,
    });

    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "New comment",
    });

    const comments = getSlideComments(zip, "ppt/slides/slide1.xml");
    expect(comments).toHaveLength(2);
    expect(comments[1].idx).toBe(4);
  });

  it("writes content type overrides for comments and authors", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "Test",
    });

    const contentTypesXml = (zip as never as { readText: (p: string) => string | null }).readText(
      "[Content_Types].xml",
    );
    expect(contentTypesXml).toBeDefined();
    expect(contentTypesXml).toContain("comments+xml");
    expect(contentTypesXml).toContain("commentAuthors+xml");
  });

  it("writes slide rels for the comment", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "Test",
    });

    const relsXml = (zip as never as { readText: (p: string) => string | null }).readText(
      "ppt/slides/_rels/slide1.xml.rels",
    );
    expect(relsXml).toBeDefined();
    expect(relsXml).toContain("comments/comment1.xml");
  });

  it("writes presentation rels for commentAuthors", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "Test",
    });

    const presRelsXml = (zip as never as { readText: (p: string) => string | null }).readText(
      "ppt/_rels/presentation.xml.rels",
    );
    expect(presRelsXml).toBeDefined();
    expect(presRelsXml).toContain("commentAuthors.xml");
  });

  it("works for slides other than slide1", () => {
    const zip = createMockZip({
      "[Content_Types].xml": createContentTypesXml(),
      "ppt/_rels/presentation.xml.rels": createRelationshipsXml(),
      "ppt/slides/_rels/slide5.xml.rels": createRelationshipsXml(),
    });

    addCommentToSlide(zip, "ppt/slides/slide5.xml", {
      authorName: "Bob",
      text: "On slide 5",
    });

    const comments = getSlideComments(zip, "ppt/slides/slide5.xml");
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe("On slide 5");

    const relsXml = (zip as never as { readText: (p: string) => string | null }).readText(
      "ppt/slides/_rels/slide5.xml.rels",
    );
    expect(relsXml).toContain("comments/comment5.xml");
  });

  it("creates slide rels document when no rels file exists", () => {
    const zip = createMockZip({
      "[Content_Types].xml": createContentTypesXml(),
      "ppt/_rels/presentation.xml.rels": createRelationshipsXml(),
    });

    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "No rels",
    });

    const relsXml = (zip as never as { readText: (p: string) => string | null }).readText(
      "ppt/slides/_rels/slide1.xml.rels",
    );
    expect(relsXml).toBeDefined();
    expect(relsXml).toContain("Relationships");
  });

  it("creates presentation rels document when no rels file exists", () => {
    const zip = createMockZip({
      "[Content_Types].xml": createContentTypesXml(),
      "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
    });

    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "No pres rels",
    });

    const presRelsXml = (zip as never as { readText: (p: string) => string | null }).readText(
      "ppt/_rels/presentation.xml.rels",
    );
    expect(presRelsXml).toBeDefined();
    expect(presRelsXml).toContain("commentAuthors.xml");
  });

  it("updates author lastIdx after adding a comment", () => {
    const zip = createBaseZip();
    addCommentToSlide(zip, "ppt/slides/slide1.xml", {
      authorName: "Alice",
      text: "First",
    });

    const authors = getCommentAuthors(zip);
    expect(authors).toHaveLength(1);
    expect(authors[0].lastIdx).toBe(1);
  });

  it("handles missing content types XML without error", () => {
    const zip = createMockZip({
      "ppt/_rels/presentation.xml.rels": createRelationshipsXml(),
      "ppt/slides/_rels/slide1.xml.rels": createRelationshipsXml(),
    });

    expect(() => {
      addCommentToSlide(zip, "ppt/slides/slide1.xml", {
        authorName: "Alice",
        text: "No CT",
      });
    }).not.toThrow();

    const comments = getSlideComments(zip, "ppt/slides/slide1.xml");
    expect(comments).toHaveLength(1);
  });
});
