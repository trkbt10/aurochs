/**
 * @file Comment patcher
 *
 * Provides functions for adding, updating, and removing comments in PPTX files.
 *
 * @see ECMA-376 Part 1, Section 19.4 - Comments
 */

import {
  getChildren,
  isXmlElement,
  parseXml,
  serializeDocument,
  type XmlDocument,
} from "@aurochs/xml";
import type { ZipPackage } from "@aurochs/zip";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type {
  Comment,
  CommentAuthor,
  CommentPosition,
} from "@aurochs-office/pptx/domain/comment";
import {
  createCommentListDocument,
  createCommentAuthorListDocument,
} from "../serializer/comment";
import { parseCommentList, parseCommentAuthorList } from "@aurochs-office/pptx/parser/metadata/comment-parser";
import { addRelationship, ensureRelationshipsDocument, type RelationshipType } from "../resources/relationship-manager";
import { addOverride } from "../resources/content-types-manager";

const COMMENT_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.comments+xml";
const COMMENT_AUTHORS_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml";
const COMMENT_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" as RelationshipType;
const COMMENT_AUTHORS_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors" as RelationshipType;

/**
 * Simple comment specification for adding comments.
 */
export type SimpleCommentSpec = {
  /** Author name */
  readonly authorName: string;
  /** Author initials (optional) */
  readonly authorInitials?: string;
  /** Comment text */
  readonly text: string;
  /** Position x in pixels (optional) */
  readonly x?: number;
  /** Position y in pixels (optional) */
  readonly y?: number;
};

// =============================================================================
// Helper Functions
// =============================================================================

function getSlideRelsPath(slidePath: string): string {
  return slidePath.replace(/\/([^/]+)\.xml$/, "/_rels/$1.xml.rels");
}

function getNextCommentIndex(pkg: ZipPackage, slidePath: string): number {
  const slideNum = slidePath.match(/slide(\d+)\.xml$/)?.[1] ?? "1";
  const commentsPath = `ppt/comments/comment${slideNum}.xml`;
  const commentsXml = pkg.readText(commentsPath);

  if (!commentsXml) {
    return 1;
  }

  const doc = parseXml(commentsXml);
  const root = doc.children.find(isXmlElement);
  if (!root) {
    return 1;
  }

  const comments = getChildren(root, "p:cm");
  const maxIdx = comments.reduce((max, cm) => {
    const idx = parseInt(cm.attrs.idx ?? "0", 10);
    return idx > max ? idx : max;
  }, 0);

  return maxIdx + 1;
}

function ensureCommentAuthors(pkg: ZipPackage): { authors: CommentAuthor[]; doc: XmlDocument } {
  const authorsPath = "ppt/commentAuthors.xml";
  const authorsXml = pkg.readText(authorsPath);

  if (authorsXml) {
    const doc = parseXml(authorsXml);
    const root = doc.children.find(isXmlElement);
    if (root) {
      const list = parseCommentAuthorList(root);
      return { authors: [...list.authors], doc };
    }
  }

  return { authors: [], doc: createCommentAuthorListDocument([]) };
}

function findOrCreateAuthor(authors: CommentAuthor[], name: string, initials?: string): CommentAuthor {
  const existing = authors.find((a) => a.name === name);
  if (existing) {
    return existing;
  }

  const maxId = authors.reduce((max, a) => Math.max(max, a.id), -1);
  const newAuthor: CommentAuthor = {
    id: maxId + 1,
    name,
    initials: initials ?? name.slice(0, 2).toUpperCase(),
    lastIdx: 0,
    colorIndex: (maxId + 1) % 8,
  };

  authors.push(newAuthor);
  return newAuthor;
}

/** Load existing comments from a comments XML path */
function loadExistingComments(pkg: ZipPackage, commentsPath: string): Comment[] {
  const commentsXml = pkg.readText(commentsPath);
  if (!commentsXml) {
    return [];
  }
  const doc = parseXml(commentsXml);
  const root = doc.children.find(isXmlElement);
  if (!root) {
    return [];
  }
  return [...parseCommentList(root).comments];
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Add a comment to a slide.
 *
 * @param pkg - The ZipPackage containing the PPTX
 * @param slidePath - Path to the slide XML (e.g., "ppt/slides/slide1.xml")
 * @param spec - Comment specification
 */
export function addCommentToSlide(pkg: ZipPackage, slidePath: string, spec: SimpleCommentSpec): void {
  const slideNum = slidePath.match(/slide(\d+)\.xml$/)?.[1] ?? "1";
  const commentsPath = `ppt/comments/comment${slideNum}.xml`;

  // Ensure comment authors exist
  const { authors } = ensureCommentAuthors(pkg);
  const author = findOrCreateAuthor(authors, spec.authorName, spec.authorInitials);

  // Get or create comments document
  const existingComments = loadExistingComments(pkg, commentsPath);

  // Create new comment
  const position: CommentPosition | undefined =
    spec.x !== undefined && spec.y !== undefined ? { x: spec.x as Pixels, y: spec.y as Pixels } : undefined;

  const newComment: Comment = {
    authorId: author.id,
    dateTime: new Date().toISOString(),
    idx: getNextCommentIndex(pkg, slidePath),
    position,
    text: spec.text,
  };

  const comments = [...existingComments, newComment];

  // Update author's lastIdx
  const updatedAuthors = authors.map((a) =>
    a.id === author.id ? { ...a, lastIdx: Math.max(a.lastIdx ?? 0, newComment.idx ?? 0) } : a,
  );

  // Write comment authors
  const authorsXmlOut = serializeDocument(createCommentAuthorListDocument(updatedAuthors), {
    declaration: true,
    standalone: true,
  });
  pkg.writeText("ppt/commentAuthors.xml", authorsXmlOut);

  // Write comments
  const commentsXmlOut = serializeDocument(createCommentListDocument(comments), {
    declaration: true,
    standalone: true,
  });
  pkg.writeText(commentsPath, commentsXmlOut);

  // Ensure content types
  const contentTypesPath = "[Content_Types].xml";
  const contentTypesXml = pkg.readText(contentTypesPath);
  if (contentTypesXml) {
    const ctDoc = addOverride(
      addOverride(parseXml(contentTypesXml), `/${commentsPath}`, COMMENT_CONTENT_TYPE),
      "/ppt/commentAuthors.xml",
      COMMENT_AUTHORS_CONTENT_TYPE,
    );
    pkg.writeText(contentTypesPath, serializeDocument(ctDoc, { declaration: true, standalone: true }));
  }

  // Ensure relationships
  const relsPath = getSlideRelsPath(slidePath);
  const relsXml = pkg.readText(relsPath);
  const relsDoc = ensureRelationshipsDocument(relsXml ? parseXml(relsXml) : null);
  const { updatedXml: newRelsDoc } = addRelationship(relsDoc, `../comments/comment${slideNum}.xml`, COMMENT_REL_TYPE);
  pkg.writeText(relsPath, serializeDocument(newRelsDoc, { declaration: true, standalone: true }));

  // Ensure presentation relationship to commentAuthors
  const presRelsPath = "ppt/_rels/presentation.xml.rels";
  const presRelsXml = pkg.readText(presRelsPath);
  const presRelsDoc = ensureRelationshipsDocument(presRelsXml ? parseXml(presRelsXml) : null);
  const { updatedXml: newPresRelsDoc } = addRelationship(presRelsDoc, "commentAuthors.xml", COMMENT_AUTHORS_REL_TYPE);
  pkg.writeText(presRelsPath, serializeDocument(newPresRelsDoc, { declaration: true, standalone: true }));
}

/**
 * Get all comments from a slide.
 *
 * @param pkg - The ZipPackage containing the PPTX
 * @param slidePath - Path to the slide XML
 * @returns Array of comments
 */
export function getSlideComments(pkg: ZipPackage, slidePath: string): readonly Comment[] {
  const slideNum = slidePath.match(/slide(\d+)\.xml$/)?.[1] ?? "1";
  const commentsPath = `ppt/comments/comment${slideNum}.xml`;
  const commentsXml = pkg.readText(commentsPath);

  if (!commentsXml) {
    return [];
  }

  const doc = parseXml(commentsXml);
  const root = doc.children.find(isXmlElement);
  if (!root) {
    return [];
  }

  return parseCommentList(root).comments;
}

/**
 * Get all comment authors from the presentation.
 *
 * @param pkg - The ZipPackage containing the PPTX
 * @returns Array of comment authors
 */
export function getCommentAuthors(pkg: ZipPackage): readonly CommentAuthor[] {
  const authorsPath = "ppt/commentAuthors.xml";
  const authorsXml = pkg.readText(authorsPath);

  if (!authorsXml) {
    return [];
  }

  const doc = parseXml(authorsXml);
  const root = doc.children.find(isXmlElement);
  if (!root) {
    return [];
  }

  return parseCommentAuthorList(root).authors;
}
