/**
 * @file Comment types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.4 - Comments
 */

import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Comment Types
// =============================================================================

/**
 * Comment author.
 * @see ECMA-376 Part 1, Section 19.4.2 (cmAuthor)
 */
export type CommentAuthor = {
  readonly id: number;
  readonly name?: string;
  readonly initials?: string;
  readonly lastIdx?: number;
  readonly colorIndex?: number;
};

/**
 * Comment author list.
 * @see ECMA-376 Part 1, Section 19.4.3 (cmAuthorLst)
 */
export type CommentAuthorList = {
  readonly authors: readonly CommentAuthor[];
};

/**
 * Comment position.
 * @see ECMA-376 Part 1, Section 19.4.5 (pos)
 */
export type CommentPosition = {
  readonly x: Pixels;
  readonly y: Pixels;
};

/**
 * Comment.
 * @see ECMA-376 Part 1, Section 19.4.1 (cm)
 */
export type Comment = {
  readonly authorId?: number;
  readonly dateTime?: string;
  readonly idx?: number;
  readonly position?: CommentPosition;
  readonly text?: string;
};

/**
 * Comment list.
 * @see ECMA-376 Part 1, Section 19.4.4 (cmLst)
 */
export type CommentList = {
  readonly comments: readonly Comment[];
};
