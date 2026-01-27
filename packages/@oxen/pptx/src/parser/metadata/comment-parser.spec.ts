/**
 * @file Tests for comment parsing
 */

import type { XmlElement, XmlText } from "@oxen/xml";
import { parseCommentAuthorList, parseCommentList } from "./comment-parser";

function el(name: string, attrs: Record<string, string> = {}, children: Array<XmlElement | XmlText> = []): XmlElement {
  return { type: "element", name, attrs, children };
}

function text(value: string): XmlText {
  return { type: "text", value };
}

describe("parseCommentAuthorList - p:cmAuthorLst (ECMA-376 Section 19.4.3)", () => {
  it("parses comment authors", () => {
    const list = el("p:cmAuthorLst", {}, [
      el("p:cmAuthor", { id: "0", name: "Julie Lee", initials: "JL", lastIdx: "1", clrIdx: "0" }),
      el("p:cmAuthor", { id: "1", name: "Fred Jones", initials: "FJ", lastIdx: "2", clrIdx: "1" }),
    ]);
    const result = parseCommentAuthorList(list);

    expect(result.authors).toEqual([
      { id: 0, name: "Julie Lee", initials: "JL", lastIdx: 1, colorIndex: 0 },
      { id: 1, name: "Fred Jones", initials: "FJ", lastIdx: 2, colorIndex: 1 },
    ]);
  });
});

describe("parseCommentList - p:cmLst (ECMA-376 Section 19.4.4)", () => {
  it("parses comments with position and text", () => {
    const list = el("p:cmLst", {}, [
      el("p:cm", { authorId: "0", dt: "2006-08-28T17:26:44.129", idx: "1" }, [
        el("p:pos", { x: "914400", y: "914400" }),
        el("p:text", {}, [text("Add diagram to clarify.")]),
      ]),
    ]);
    const result = parseCommentList(list);

    expect(result.comments[0].authorId).toBe(0);
    expect(result.comments[0].dateTime).toBe("2006-08-28T17:26:44.129");
    expect(result.comments[0].idx).toBe(1);
    expect(result.comments[0].position?.x).toBe(96);
    expect(result.comments[0].position?.y).toBe(96);
    expect(result.comments[0].text).toBe("Add diagram to clarify.");
  });
});
