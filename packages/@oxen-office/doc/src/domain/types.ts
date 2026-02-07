/**
 * @file DOC domain types – intermediate representation extracted from .doc binary
 */

/** A run of text with uniform character properties. */
export type DocTextRun = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strike?: boolean;
  readonly fontSize?: number;
  readonly fontName?: string;
  readonly color?: string;
};

/** A paragraph extracted from .doc. */
export type DocParagraph = {
  readonly runs: readonly DocTextRun[];
  readonly alignment?: "left" | "center" | "right" | "justify";
};

/** The full document extracted from .doc binary. */
export type DocDocument = {
  readonly paragraphs: readonly DocParagraph[];
};
