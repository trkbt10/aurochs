/**
 * @file Comment serializer
 *
 * Serializes comment domain objects to PresentationML XML elements.
 *
 * @see ECMA-376 Part 1, Section 19.4 - Comments
 */

import { createElement, type XmlDocument, type XmlElement } from "@oxen/xml";
import type { Comment, CommentAuthor, CommentAuthorList, CommentList, CommentPosition } from "@oxen-office/pptx/domain/comment";

const P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";

/**
 * Serialize a comment position.
 */
function serializeCommentPosition(position: CommentPosition): XmlElement {
  return createElement("p:pos", {
    x: String(Math.round(position.x * 914400)), // Convert pixels to EMUs
    y: String(Math.round(position.y * 914400)),
  });
}

/**
 * Serialize a single comment.
 */
export function serializeComment(comment: Comment): XmlElement {
  const attrs: Record<string, string> = {};

  if (comment.authorId !== undefined) {
    attrs.authorId = String(comment.authorId);
  }
  if (comment.dateTime !== undefined) {
    attrs.dt = comment.dateTime;
  }
  if (comment.idx !== undefined) {
    attrs.idx = String(comment.idx);
  }

  const children: XmlElement[] = [];

  if (comment.position) {
    children.push(serializeCommentPosition(comment.position));
  }

  if (comment.text) {
    children.push(createElement("p:text", {}, [{ type: "text", value: comment.text }]));
  }

  return createElement("p:cm", attrs, children);
}

/**
 * Serialize a comment list.
 */
export function serializeCommentList(commentList: CommentList): XmlElement {
  return createElement(
    "p:cmLst",
    { "xmlns:p": P_NS },
    commentList.comments.map(serializeComment),
  );
}

/**
 * Create a comment list document.
 */
export function createCommentListDocument(comments: readonly Comment[]): XmlDocument {
  return {
    children: [serializeCommentList({ comments })],
  };
}

/**
 * Serialize a comment author.
 */
export function serializeCommentAuthor(author: CommentAuthor): XmlElement {
  const attrs: Record<string, string> = {
    id: String(author.id),
  };

  if (author.name !== undefined) {
    attrs.name = author.name;
  }
  if (author.initials !== undefined) {
    attrs.initials = author.initials;
  }
  if (author.lastIdx !== undefined) {
    attrs.lastIdx = String(author.lastIdx);
  }
  if (author.colorIndex !== undefined) {
    attrs.clrIdx = String(author.colorIndex);
  }

  return createElement("p:cmAuthor", attrs);
}

/**
 * Serialize a comment author list.
 */
export function serializeCommentAuthorList(authorList: CommentAuthorList): XmlElement {
  return createElement(
    "p:cmAuthorLst",
    { "xmlns:p": P_NS },
    authorList.authors.map(serializeCommentAuthor),
  );
}

/**
 * Create a comment author list document.
 */
export function createCommentAuthorListDocument(authors: readonly CommentAuthor[]): XmlDocument {
  return {
    children: [serializeCommentAuthorList({ authors })],
  };
}
