/** @file Unit tests for comment serialization */
import { getChild, getChildren, isXmlElement, isXmlText } from "@aurochs/xml";
import type { Comment, CommentAuthor } from "@aurochs-office/pptx/domain/comment";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import {
  serializeComment,
  serializeCommentList,
  createCommentListDocument,
  serializeCommentAuthor,
  serializeCommentAuthorList,
  createCommentAuthorListDocument,
} from "./comment";

// ---------------------------------------------------------------------------
// serializeComment
// ---------------------------------------------------------------------------

describe("serializeComment", () => {
  it("serializes minimal comment with no fields", () => {
    const result = serializeComment({});
    expect(result.name).toBe("p:cm");
    expect(result.attrs).toEqual({});
    expect(result.children).toHaveLength(0);
  });

  it("serializes authorId attribute", () => {
    const result = serializeComment({ authorId: 3 });
    expect(result.attrs.authorId).toBe("3");
  });

  it("serializes dateTime as dt attribute", () => {
    const dt = "2024-01-15T10:30:00.000";
    const result = serializeComment({ dateTime: dt });
    expect(result.attrs.dt).toBe(dt);
  });

  it("serializes idx attribute", () => {
    const result = serializeComment({ idx: 7 });
    expect(result.attrs.idx).toBe("7");
  });

  it("serializes position as p:pos child with EMU conversion", () => {
    const result = serializeComment({ position: { x: px(1), y: px(2) } });
    const pos = getChild(result, "p:pos");
    expect(pos).toBeDefined();
    expect(pos!.attrs.x).toBe(String(Math.round(1 * 914400)));
    expect(pos!.attrs.y).toBe(String(Math.round(2 * 914400)));
  });

  it("serializes text as p:text child", () => {
    const result = serializeComment({ text: "Hello world" });
    const textEl = getChild(result, "p:text");
    expect(textEl).toBeDefined();
    expect(textEl!.children).toHaveLength(1);
    const textNode = textEl!.children[0];
    expect(isXmlText(textNode)).toBe(true);
    if (isXmlText(textNode)) {
      expect(textNode.value).toBe("Hello world");
    }
  });

  it("serializes all fields together", () => {
    const comment: Comment = {
      authorId: 0,
      dateTime: "2024-06-01T08:00:00.000",
      idx: 1,
      position: { x: px(3), y: px(4) },
      text: "Review this slide",
    };
    const result = serializeComment(comment);

    expect(result.name).toBe("p:cm");
    expect(result.attrs.authorId).toBe("0");
    expect(result.attrs.dt).toBe("2024-06-01T08:00:00.000");
    expect(result.attrs.idx).toBe("1");

    const pos = getChild(result, "p:pos");
    expect(pos).toBeDefined();
    expect(pos!.attrs.x).toBe(String(Math.round(3 * 914400)));
    expect(pos!.attrs.y).toBe(String(Math.round(4 * 914400)));

    const textEl = getChild(result, "p:text");
    expect(textEl).toBeDefined();
    const textNode = textEl!.children[0];
    expect(isXmlText(textNode)).toBe(true);
    if (isXmlText(textNode)) {
      expect(textNode.value).toBe("Review this slide");
    }
  });

  it("omits undefined attributes without adding them", () => {
    const result = serializeComment({ text: "only text" });
    expect(result.attrs).toEqual({});
    expect(Object.keys(result.attrs)).not.toContain("authorId");
    expect(Object.keys(result.attrs)).not.toContain("dt");
    expect(Object.keys(result.attrs)).not.toContain("idx");
  });

  it("produces children in order: position then text", () => {
    const result = serializeComment({
      position: { x: px(1), y: px(1) },
      text: "ordered",
    });
    const elements = result.children.filter(isXmlElement);
    expect(elements).toHaveLength(2);
    expect(elements[0].name).toBe("p:pos");
    expect(elements[1].name).toBe("p:text");
  });
});

// ---------------------------------------------------------------------------
// Position EMU conversion
// ---------------------------------------------------------------------------

describe("position EMU conversion", () => {
  it("converts 1 pixel to 914400 EMUs", () => {
    const result = serializeComment({ position: { x: px(1), y: px(0) } });
    const pos = getChild(result, "p:pos");
    expect(pos!.attrs.x).toBe("914400");
    expect(pos!.attrs.y).toBe("0");
  });

  it("converts fractional pixels with correct rounding", () => {
    const result = serializeComment({ position: { x: px(0.5), y: px(1.5) } });
    const pos = getChild(result, "p:pos");
    expect(pos!.attrs.x).toBe(String(Math.round(0.5 * 914400)));
    expect(pos!.attrs.y).toBe(String(Math.round(1.5 * 914400)));
  });

  it("handles zero position", () => {
    const result = serializeComment({ position: { x: px(0), y: px(0) } });
    const pos = getChild(result, "p:pos");
    expect(pos!.attrs.x).toBe("0");
    expect(pos!.attrs.y).toBe("0");
  });

  it("handles large pixel values", () => {
    const result = serializeComment({ position: { x: px(100), y: px(200) } });
    const pos = getChild(result, "p:pos");
    expect(pos!.attrs.x).toBe(String(100 * 914400));
    expect(pos!.attrs.y).toBe(String(200 * 914400));
  });
});

// ---------------------------------------------------------------------------
// serializeCommentList
// ---------------------------------------------------------------------------

describe("serializeCommentList", () => {
  it("serializes a single comment", () => {
    const result = serializeCommentList({ comments: [{ text: "one" }] });
    expect(result.name).toBe("p:cmLst");
    const cms = getChildren(result, "p:cm");
    expect(cms).toHaveLength(1);
  });

  it("serializes multiple comments", () => {
    const result = serializeCommentList({
      comments: [{ text: "first" }, { text: "second" }, { text: "third" }],
    });
    const cms = getChildren(result, "p:cm");
    expect(cms).toHaveLength(3);
  });

  it("serializes empty comment list", () => {
    const result = serializeCommentList({ comments: [] });
    expect(result.name).toBe("p:cmLst");
    const cms = getChildren(result, "p:cm");
    expect(cms).toHaveLength(0);
  });

  it("includes the PresentationML namespace", () => {
    const result = serializeCommentList({ comments: [] });
    expect(result.attrs["xmlns:p"]).toBe(
      "http://schemas.openxmlformats.org/presentationml/2006/main",
    );
  });
});

// ---------------------------------------------------------------------------
// createCommentListDocument
// ---------------------------------------------------------------------------

describe("createCommentListDocument", () => {
  it("creates an XmlDocument with p:cmLst root", () => {
    const doc = createCommentListDocument([]);
    expect(doc.children).toHaveLength(1);
    const root = doc.children[0];
    expect(isXmlElement(root)).toBe(true);
    if (isXmlElement(root)) {
      expect(root.name).toBe("p:cmLst");
    }
  });

  it("wraps provided comments inside the document", () => {
    const doc = createCommentListDocument([{ text: "a" }, { text: "b" }]);
    const root = doc.children[0];
    expect(isXmlElement(root)).toBe(true);
    if (isXmlElement(root)) {
      const cms = getChildren(root, "p:cm");
      expect(cms).toHaveLength(2);
    }
  });
});

// ---------------------------------------------------------------------------
// serializeCommentAuthor
// ---------------------------------------------------------------------------

describe("serializeCommentAuthor", () => {
  it("serializes minimal author with only id", () => {
    const result = serializeCommentAuthor({ id: 0 });
    expect(result.name).toBe("p:cmAuthor");
    expect(result.attrs.id).toBe("0");
    expect(result.children).toHaveLength(0);
  });

  it("serializes name attribute", () => {
    const result = serializeCommentAuthor({ id: 1, name: "Alice" });
    expect(result.attrs.name).toBe("Alice");
  });

  it("serializes initials attribute", () => {
    const result = serializeCommentAuthor({ id: 1, initials: "AB" });
    expect(result.attrs.initials).toBe("AB");
  });

  it("serializes lastIdx attribute", () => {
    const result = serializeCommentAuthor({ id: 1, lastIdx: 5 });
    expect(result.attrs.lastIdx).toBe("5");
  });

  it("serializes colorIndex as clrIdx attribute", () => {
    const result = serializeCommentAuthor({ id: 1, colorIndex: 2 });
    expect(result.attrs.clrIdx).toBe("2");
  });

  it("serializes all fields together", () => {
    const author: CommentAuthor = {
      id: 42,
      name: "Bob",
      initials: "BC",
      lastIdx: 10,
      colorIndex: 3,
    };
    const result = serializeCommentAuthor(author);

    expect(result.name).toBe("p:cmAuthor");
    expect(result.attrs.id).toBe("42");
    expect(result.attrs.name).toBe("Bob");
    expect(result.attrs.initials).toBe("BC");
    expect(result.attrs.lastIdx).toBe("10");
    expect(result.attrs.clrIdx).toBe("3");
    expect(result.children).toHaveLength(0);
  });

  it("omits undefined optional attributes", () => {
    const result = serializeCommentAuthor({ id: 5 });
    expect(Object.keys(result.attrs)).toEqual(["id"]);
  });
});

// ---------------------------------------------------------------------------
// serializeCommentAuthorList
// ---------------------------------------------------------------------------

describe("serializeCommentAuthorList", () => {
  it("serializes a single author", () => {
    const result = serializeCommentAuthorList({ authors: [{ id: 0 }] });
    expect(result.name).toBe("p:cmAuthorLst");
    const authors = getChildren(result, "p:cmAuthor");
    expect(authors).toHaveLength(1);
  });

  it("serializes multiple authors", () => {
    const result = serializeCommentAuthorList({
      authors: [{ id: 0, name: "A" }, { id: 1, name: "B" }],
    });
    const authors = getChildren(result, "p:cmAuthor");
    expect(authors).toHaveLength(2);
    expect(authors[0].attrs.name).toBe("A");
    expect(authors[1].attrs.name).toBe("B");
  });

  it("serializes empty author list", () => {
    const result = serializeCommentAuthorList({ authors: [] });
    expect(result.name).toBe("p:cmAuthorLst");
    const authors = getChildren(result, "p:cmAuthor");
    expect(authors).toHaveLength(0);
  });

  it("includes the PresentationML namespace", () => {
    const result = serializeCommentAuthorList({ authors: [] });
    expect(result.attrs["xmlns:p"]).toBe(
      "http://schemas.openxmlformats.org/presentationml/2006/main",
    );
  });
});

// ---------------------------------------------------------------------------
// createCommentAuthorListDocument
// ---------------------------------------------------------------------------

describe("createCommentAuthorListDocument", () => {
  it("creates an XmlDocument with p:cmAuthorLst root", () => {
    const doc = createCommentAuthorListDocument([]);
    expect(doc.children).toHaveLength(1);
    const root = doc.children[0];
    expect(isXmlElement(root)).toBe(true);
    if (isXmlElement(root)) {
      expect(root.name).toBe("p:cmAuthorLst");
    }
  });

  it("wraps provided authors inside the document", () => {
    const doc = createCommentAuthorListDocument([
      { id: 0, name: "X" },
      { id: 1, name: "Y" },
    ]);
    const root = doc.children[0];
    expect(isXmlElement(root)).toBe(true);
    if (isXmlElement(root)) {
      const authors = getChildren(root, "p:cmAuthor");
      expect(authors).toHaveLength(2);
      expect(authors[0].attrs.id).toBe("0");
      expect(authors[1].attrs.id).toBe("1");
    }
  });
});
