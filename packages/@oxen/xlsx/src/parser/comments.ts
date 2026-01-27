/**
 * @file Worksheet comments parser
 *
 * Parses `xl/comments*.xml` (legacy cell comments) and returns a normalized comment list.
 *
 * @see ECMA-376 Part 4, Section 18.7.6 (comments)
 * @see ECMA-376 Part 4, Section 18.7.3 (comment)
 */

import type { XlsxComment } from "../domain/comment";
import { parseCellRef } from "../domain/cell/address";
import { parseIntAttr } from "./primitive";
import type { XmlElement } from "@oxen/xml";
import { getAttr, getChild, getChildren, getTextContent, isXmlElement } from "@oxen/xml";

function matchesLocalName(element: XmlElement, localName: string): boolean {
  return element.name === localName || element.name.endsWith(`:${localName}`);
}

function collectDescendantsByLocalName(element: XmlElement, localName: string): readonly XmlElement[] {
  const self = matchesLocalName(element, localName) ? [element] : [];
  const children = element.children.flatMap((child): readonly XmlElement[] => {
    if (!isXmlElement(child)) {
      return [];
    }
    return collectDescendantsByLocalName(child, localName);
  });
  return [...self, ...children];
}

function parseCommentText(textElement: XmlElement): string {
  const tNodes = collectDescendantsByLocalName(textElement, "t");
  const raw = tNodes.map((t) => getTextContent(t)).join("");
  return raw.replace(/\r\n?/gu, "\n");
}

function parseAuthors(root: XmlElement): readonly string[] {
  const authorsEl = getChild(root, "authors");
  if (!authorsEl) {
    return [];
  }
  return getChildren(authorsEl, "author").map((author) => getTextContent(author));
}

function parseCommentList(root: XmlElement, authors: readonly string[]): readonly XlsxComment[] {
  const listEl = getChild(root, "commentList");
  if (!listEl) {
    return [];
  }

  return getChildren(listEl, "comment").flatMap((commentEl): readonly XlsxComment[] => {
    const ref = getAttr(commentEl, "ref");
    if (!ref) {
      return [];
    }
    const authorId = parseIntAttr(getAttr(commentEl, "authorId"));
    const author = authorId !== undefined ? authors[authorId] : undefined;
    const textEl = getChild(commentEl, "text");
    const text = textEl ? parseCommentText(textEl) : "";
    return [{ address: parseCellRef(ref), author, text }];
  });
}

/**
 * Parse a `<comments>` root element.
 */
export function parseComments(commentsRoot: XmlElement): readonly XlsxComment[] {
  const authors = parseAuthors(commentsRoot);
  return parseCommentList(commentsRoot, authors);
}
