/**
 * @file DOC domain types – intermediate representation extracted from .doc binary
 */

// --- Underline style ---

export type DocUnderlineStyle =
  | "single"
  | "wordsOnly"
  | "double"
  | "dotted"
  | "thick"
  | "dash"
  | "dotDash"
  | "dotDotDash"
  | "wave";

// --- Line spacing ---

export type DocLineSpacing = {
  /** Line height value (twips or 1/240 of a line) */
  readonly value: number;
  /** true = proportional (value in 1/240 units), false = exact/atLeast twips */
  readonly multi: boolean;
};

// --- Character formatting ---

/** A run of text with uniform character properties. */
export type DocTextRun = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly underlineStyle?: DocUnderlineStyle;
  readonly underlineColor?: string;
  readonly strike?: boolean;
  readonly dstrike?: boolean;
  readonly caps?: boolean;
  readonly smallCaps?: boolean;
  readonly hidden?: boolean;
  readonly outline?: boolean;
  readonly shadow?: boolean;
  readonly emboss?: boolean;
  readonly imprint?: boolean;
  readonly superscript?: boolean;
  readonly subscript?: boolean;
  readonly fontSize?: number;
  readonly fontName?: string;
  readonly fontNameEastAsia?: string;
  readonly fontNameComplex?: string;
  readonly fontNameBiDi?: string;
  readonly color?: string;
  readonly highlight?: string;
  readonly spacing?: number;
};

// --- Paragraph formatting ---

/** Paragraph alignment. */
export type DocAlignment = "left" | "center" | "right" | "justify" | "distribute";

/** Paragraph borders (top, left, bottom, right, between, bar). */
export type DocParagraphBorders = {
  readonly top?: DocBorder;
  readonly left?: DocBorder;
  readonly bottom?: DocBorder;
  readonly right?: DocBorder;
  readonly between?: DocBorder;
  readonly bar?: DocBorder;
};

/** Paragraph/cell shading. */
export type DocShading = {
  readonly foreColor?: string;
  readonly backColor?: string;
  readonly pattern?: number;
};

/** Tab stop alignment. */
export type DocTabAlignment = "left" | "center" | "right" | "decimal" | "bar";

/** Tab stop leader character. */
export type DocTabLeader = "dot" | "hyphen" | "underscore" | "heavy" | "middleDot";

/** A tab stop definition. */
export type DocTabStop = {
  readonly position: number;
  readonly alignment: DocTabAlignment;
  readonly leader?: DocTabLeader;
};

/** A paragraph extracted from .doc. */
export type DocParagraph = {
  readonly runs: readonly DocTextRun[];
  readonly alignment?: DocAlignment;
  readonly indentLeft?: number;
  readonly indentRight?: number;
  readonly firstLineIndent?: number;
  readonly spaceBefore?: number;
  readonly spaceAfter?: number;
  readonly lineSpacing?: DocLineSpacing;
  readonly keepTogether?: boolean;
  readonly keepWithNext?: boolean;
  readonly pageBreakBefore?: boolean;
  readonly widowControl?: boolean;
  readonly outlineLevel?: number;
  readonly styleIndex?: number;
  readonly listIndex?: number;
  readonly listLevel?: number;
  readonly inTable?: boolean;
  readonly isRowEnd?: boolean;
  readonly tableDepth?: number;
  readonly borders?: DocParagraphBorders;
  readonly shading?: DocShading;
  readonly tabs?: readonly DocTabStop[];
  readonly spaceBeforeAuto?: boolean;
  readonly spaceAfterAuto?: boolean;
};

// --- Section ---

export type DocSectionBreakType = "continuous" | "newColumn" | "newPage" | "evenPage" | "oddPage";

/** Line numbering settings for a section. */
export type DocLineNumbering = {
  readonly countBy?: number;
  readonly start?: number;
  readonly restart?: "perPage" | "perSection" | "continuous";
  readonly distance?: number;
};

/** Page number format. */
export type DocPageNumberFormat = "decimal" | "upperRoman" | "lowerRoman" | "upperLetter" | "lowerLetter";

export type DocSection = {
  readonly pageWidth?: number;
  readonly pageHeight?: number;
  readonly orientation?: "portrait" | "landscape";
  readonly marginTop?: number;
  readonly marginBottom?: number;
  readonly marginLeft?: number;
  readonly marginRight?: number;
  readonly gutter?: number;
  readonly columns?: number;
  readonly columnSpacing?: number;
  readonly breakType?: DocSectionBreakType;
  readonly titlePage?: boolean;
  readonly headerDistance?: number;
  readonly footerDistance?: number;
  readonly lineNumbering?: DocLineNumbering;
  readonly pageNumberFormat?: DocPageNumberFormat;
  readonly pageNumberStart?: number;
  readonly pageNumberRestart?: boolean;
  readonly verticalAlign?: "top" | "center" | "bottom" | "justified";
  readonly paragraphs: readonly DocParagraph[];
};

// --- Table ---

export type DocBorderStyle =
  | "none" | "single" | "thick" | "double" | "dotted"
  | "dashed" | "dotDash" | "dotDotDash" | "triple"
  | "thinThickSmall" | "thickThinSmall" | "thinThickThinSmall"
  | "thinThickMedium" | "thickThinMedium" | "thinThickThinMedium"
  | "thinThickLarge" | "thickThinLarge" | "thinThickThinLarge"
  | "wave" | "doubleWave" | "dashSmall" | "dashDotStroked" | "emboss3D" | "engrave3D";

export type DocBorder = {
  readonly style?: DocBorderStyle;
  readonly width?: number;
  readonly color?: string;
};

export type DocTableBorders = {
  readonly top?: DocBorder;
  readonly left?: DocBorder;
  readonly bottom?: DocBorder;
  readonly right?: DocBorder;
  readonly insideH?: DocBorder;
  readonly insideV?: DocBorder;
};

export type DocTableCell = {
  readonly paragraphs: readonly DocParagraph[];
  readonly width?: number;
  readonly verticalMerge?: "restart" | "continue";
  readonly verticalAlign?: "top" | "center" | "bottom";
  readonly horizontalMerge?: "restart" | "continue";
  readonly backgroundColor?: string;
};

export type DocTableRow = {
  readonly cells: readonly DocTableCell[];
  readonly height?: number;
  readonly header?: boolean;
  readonly borders?: DocTableBorders;
};

export type DocTable = {
  readonly rows: readonly DocTableRow[];
};

// --- Style ---

export type DocStyleType = "paragraph" | "character" | "table" | "list";

export type DocStyle = {
  readonly index: number;
  readonly name?: string;
  readonly type: DocStyleType;
  readonly basedOn?: number;
  readonly next?: number;
};

// --- List ---

export type DocListLevel = {
  readonly start: number;
  readonly format: number;
  readonly text: string;
  readonly alignment: number;
  readonly follow: number;
};

export type DocListDefinition = {
  readonly lsid: number;
  readonly levels: readonly DocListLevel[];
  readonly simpleList: boolean;
};

export type DocListLevelOverride = {
  readonly level: number;
  readonly startOverride?: number;
};

export type DocListOverride = {
  readonly lsid: number;
  readonly levelOverrides?: readonly DocListLevelOverride[];
};

// --- Hyperlink ---

export type DocHyperlink = {
  readonly url?: string;
  readonly anchor?: string;
  readonly displayText: string;
};

// --- Headers/Footers ---

export type DocHeaderFooterType = "even" | "odd" | "first";

export type DocHeaderFooter = {
  readonly type: DocHeaderFooterType;
  readonly content: readonly DocParagraph[];
};

// --- Footnotes/Endnotes ---

export type DocNote = {
  readonly cpRef: number;
  readonly content: readonly DocParagraph[];
};

// --- Comments ---

export type DocComment = {
  readonly author: string;
  readonly initials?: string;
  readonly cpStart: number;
  readonly cpEnd: number;
  readonly content: readonly DocParagraph[];
};

// --- Bookmarks ---

export type DocBookmark = {
  readonly name: string;
  readonly cpStart: number;
  readonly cpEnd: number;
};

// --- Field ---

export type DocField = {
  readonly type: string;
  readonly instruction: string;
  readonly result: string;
  readonly cpStart: number;
  readonly cpEnd: number;
};

// --- Form field ---

/** A form field extracted from .doc. */
export type DocFormField = {
  readonly type: "text" | "checkbox" | "dropdown";
  readonly name?: string;
  readonly defaultValue?: string;
  readonly cpStart: number;
  readonly cpEnd: number;
};

// --- Textbox ---

/** A textbox extracted from .doc. */
export type DocTextbox = {
  readonly index: number;
  readonly content: readonly DocParagraph[];
};

// --- Image ---

/** An embedded image extracted from .doc. */
export type DocImage = {
  /** CP position in main text where image appears */
  readonly cp: number;
  /** Content type (image/jpeg, image/png, etc.) */
  readonly contentType: string;
  /** Raw image data */
  readonly data: Uint8Array;
  /** Original width in twips */
  readonly widthTwips?: number;
  /** Original height in twips */
  readonly heightTwips?: number;
  /** Display width in EMU (calculated from original size × scale - cropping) */
  readonly widthEmu?: number;
  /** Display height in EMU */
  readonly heightEmu?: number;
  /** True if this image is an OLE object's preview image */
  readonly isOlePreview?: boolean;
};

// --- Shape Anchor ---

/** A floating shape anchor position in the document. */
export type DocShapeAnchor = {
  /** CP in main text where the shape is anchored */
  readonly cp: number;
  /** Shape ID */
  readonly spid: number;
  /** Bounding rectangle in twips */
  readonly xaLeft: number;
  readonly yaTop: number;
  readonly xaRight: number;
  readonly yaBottom: number;
  /** Text wrapping mode */
  readonly wrapping: number;
  /** Positioning flags */
  readonly fBelowText: boolean;
  readonly fAnchorLock: boolean;
};

// --- Document ---

/** A block-level content element: paragraph or table. */
export type DocBlockContent = DocParagraph | DocTable;

/** The full document extracted from .doc binary. */
export type DocDocument = {
  readonly paragraphs: readonly DocParagraph[];
  /** Block-level content: paragraphs and tables (table paragraphs grouped into DocTable). */
  readonly content?: readonly DocBlockContent[];
  readonly sections?: readonly DocSection[];
  readonly styles?: readonly DocStyle[];
  readonly fonts?: readonly string[];
  readonly lists?: readonly DocListDefinition[];
  readonly listOverrides?: readonly DocListOverride[];
  readonly headers?: readonly DocHeaderFooter[];
  readonly footers?: readonly DocHeaderFooter[];
  readonly footnotes?: readonly DocNote[];
  readonly endnotes?: readonly DocNote[];
  readonly comments?: readonly DocComment[];
  readonly bookmarks?: readonly DocBookmark[];
  readonly fields?: readonly DocField[];
  readonly hyperlinks?: readonly DocHyperlink[];
  readonly images?: readonly DocImage[];
  readonly shapeAnchors?: readonly DocShapeAnchor[];
  readonly formFields?: readonly DocFormField[];
  readonly textboxes?: readonly DocTextbox[];
};
