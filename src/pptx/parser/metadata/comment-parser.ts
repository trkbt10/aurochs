/**
 * @file Comment parser
 *
 * @see ECMA-376 Part 1, Section 19.4 (Comments)
 */

import type {
  Comment,
  CommentAuthor,
  CommentAuthorList,
  CommentList,
  CommentPosition,
} from "../../domain/index";
import { getAttr, getChild, getChildren, getTextContent, type XmlElement } from "../../../xml/index";
import { getEmuAttr, getIntAttr, getIntAttrOr } from "../primitive";

function parseCommentPosition(element: XmlElement | undefined): CommentPosition | undefined {
  if (!element) {return undefined;}
  const x = getEmuAttr(element, "x");
  const y = getEmuAttr(element, "y");
  if (x === undefined || y === undefined) {return undefined;}
  return { x, y };
}

/**
 * Parse comment author (p:cmAuthor).
 */
export function parseCommentAuthor(element: XmlElement): CommentAuthor {
  return {
    id: getIntAttrOr(element, "id", 0),
    name: getAttr(element, "name"),
    initials: getAttr(element, "initials"),
    lastIdx: getIntAttr(element, "lastIdx"),
    colorIndex: getIntAttr(element, "clrIdx"),
  };
}

/**
 * Parse comment author list (p:cmAuthorLst).
 */
export function parseCommentAuthorList(element: XmlElement): CommentAuthorList {
  const authors = getChildren(element, "p:cmAuthor").map(parseCommentAuthor);
  return { authors };
}

/**
 * Parse comment (p:cm).
 */
export function parseComment(element: XmlElement): Comment {
  const pos = getChild(element, "p:pos");
  const text = getChild(element, "p:text");

  return {
    authorId: getIntAttr(element, "authorId"),
    dateTime: getAttr(element, "dt"),
    idx: getIntAttr(element, "idx"),
    position: parseCommentPosition(pos),
    text: text ? getTextContent(text) : undefined,
  };
}

/**
 * Parse comment list (p:cmLst).
 */
export function parseCommentList(element: XmlElement): CommentList {
  const comments = getChildren(element, "p:cm").map(parseComment);
  return { comments };
}
