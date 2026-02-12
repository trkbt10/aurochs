/**
 * @file DOCX Build Specification Types
 *
 * Simplified types for building DOCX documents from JSON specifications.
 * These are converted to domain types via spec-converter.ts.
 */

// =============================================================================
// Run Spec
// =============================================================================

export type RunSpec = {
  /** Simple text content (use `contents` for mixed content with drawings) */
  readonly text?: string;
  /** Rich content including text and drawings (overrides `text` if provided) */
  readonly contents?: readonly RunContentSpec[];
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean | string;
  readonly strikethrough?: boolean;
  readonly doubleStrikethrough?: boolean;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  /** Font for East Asian characters */
  readonly fontFamilyEastAsian?: string;
  /** Font for Complex Script characters */
  readonly fontFamilyComplexScript?: string;
  readonly color?: string;
  readonly highlight?: string;
  readonly vertAlign?: "superscript" | "subscript";
  readonly smallCaps?: boolean;
  readonly allCaps?: boolean;
  /** Character spacing in twips (1/20 of a point) */
  readonly letterSpacing?: number;
  /** Kerning threshold in half-points (text above this size will have kerning applied) */
  readonly kerning?: number;
  /** Vertical position adjustment in half-points (positive = raise, negative = lower) */
  readonly position?: number;
  /** Emboss effect */
  readonly emboss?: boolean;
  /** Imprint/engrave effect */
  readonly imprint?: boolean;
  /** Outline effect (only character borders visible) */
  readonly outline?: boolean;
  /** Shadow effect */
  readonly shadow?: boolean;
  /** Bold for complex scripts */
  readonly boldCs?: boolean;
  /** Italic for complex scripts */
  readonly italicCs?: boolean;
  /** Right-to-left text */
  readonly rtl?: boolean;
  /** Theme font for ASCII characters */
  readonly asciiTheme?: "majorAscii" | "majorHAnsi" | "majorEastAsia" | "majorBidi"
                       | "minorAscii" | "minorHAnsi" | "minorEastAsia" | "minorBidi";
  /** Complex script font size in half-points */
  readonly fontSizeCs?: number;
  /** Run shading (background) */
  readonly shading?: {
    readonly val?: string;
    readonly fill?: string;
  };
};

// =============================================================================
// Drawing Spec
// =============================================================================

/** Drawing extent in EMUs (English Metric Units) */
export type DrawingExtentSpec = {
  readonly cx: number;
  readonly cy: number;
};

/** Document properties for drawing */
export type DrawingDocPropsSpec = {
  readonly id: number;
  readonly name: string;
  readonly descr?: string;
};

/** Horizontal position for anchor drawing */
export type DrawingPositionHSpec = {
  readonly relativeFrom: "character" | "column" | "insideMargin" | "leftMargin" | "margin" | "outsideMargin" | "page" | "rightMargin";
  readonly posOffset?: number;
  readonly align?: "left" | "right" | "center" | "inside" | "outside";
};

/** Vertical position for anchor drawing */
export type DrawingPositionVSpec = {
  readonly relativeFrom: "bottomMargin" | "insideMargin" | "line" | "margin" | "outsideMargin" | "page" | "paragraph" | "topMargin";
  readonly posOffset?: number;
  readonly align?: "top" | "bottom" | "center" | "inside" | "outside";
};

/** Wrap type for anchor drawing */
export type DrawingWrapSpec =
  | { readonly type: "none" }
  | { readonly type: "topAndBottom" }
  | { readonly type: "square"; readonly wrapText?: "bothSides" | "left" | "right" | "largest" }
  | { readonly type: "tight"; readonly wrapText?: "bothSides" | "left" | "right" | "largest" }
  | { readonly type: "through"; readonly wrapText?: "bothSides" | "left" | "right" | "largest" };

/** Inline drawing specification */
export type InlineDrawingSpec = {
  readonly type: "inline";
  readonly extent: DrawingExtentSpec;
  readonly docPr: DrawingDocPropsSpec;
  /** Media filename (key in DocxBuildSpec.media) */
  readonly mediaFile: string;
};

/** Anchor drawing specification */
export type AnchorDrawingSpec = {
  readonly type: "anchor";
  readonly extent: DrawingExtentSpec;
  readonly positionH: DrawingPositionHSpec;
  readonly positionV: DrawingPositionVSpec;
  readonly behindDoc?: boolean;
  readonly locked?: boolean;
  readonly wrap?: DrawingWrapSpec;
  readonly docPr: DrawingDocPropsSpec;
  /** Media filename (key in DocxBuildSpec.media) */
  readonly mediaFile: string;
};

/** Drawing specification (inline or anchor) */
export type DrawingSpec = InlineDrawingSpec | AnchorDrawingSpec;

/** Run content that can contain text or drawing */
export type RunContentSpec =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "drawing"; readonly drawing: DrawingSpec };

// =============================================================================
// Paragraph Border Spec
// =============================================================================

export type ParagraphBorderEdgeSpec = {
  readonly style: string;
  readonly size?: number;
  readonly color?: string;
  readonly space?: number;
};

export type ParagraphBordersSpec = {
  readonly top?: ParagraphBorderEdgeSpec;
  readonly bottom?: ParagraphBorderEdgeSpec;
  readonly left?: ParagraphBorderEdgeSpec;
  readonly right?: ParagraphBorderEdgeSpec;
  readonly between?: ParagraphBorderEdgeSpec;
};

// =============================================================================
// Paragraph Spec
// =============================================================================

export type ParagraphSpec = {
  readonly type: "paragraph";
  readonly style?: string;
  /** Paragraph alignment (justification) */
  readonly alignment?: "left" | "center" | "right" | "both" | "distribute" | "start" | "end";
  readonly spacing?: {
    readonly before?: number;
    readonly after?: number;
    readonly line?: number;
    readonly lineRule?: "auto" | "exact" | "atLeast";
    /** Auto spacing before paragraph (based on content) */
    readonly beforeAutospacing?: boolean;
    /** Auto spacing after paragraph (based on content) */
    readonly afterAutospacing?: boolean;
  };
  readonly indent?: {
    readonly left?: number;
    readonly right?: number;
    readonly firstLine?: number;
    readonly hanging?: number;
    /** Start indent for bidi-aware layout (equivalent to left in LTR, right in RTL) */
    readonly start?: number;
    /** End indent for bidi-aware layout (equivalent to right in LTR, left in RTL) */
    readonly end?: number;
  };
  readonly numbering?: {
    readonly numId: number;
    readonly ilvl: number;
  };
  readonly keepNext?: boolean;
  readonly keepLines?: boolean;
  readonly pageBreakBefore?: boolean;
  /** Tab stops in twips */
  readonly tabs?: readonly {
    readonly pos: number;
    readonly val?: "left" | "center" | "right" | "decimal";
  }[];
  /** Background shading fill color (hex without #) */
  readonly shading?: string;
  /** Paragraph borders */
  readonly borders?: ParagraphBordersSpec;
  /** Bidirectional paragraph (right-to-left base direction) */
  readonly bidi?: boolean;
  /** Text direction (e.g., "btLr" for bottom-to-top left-to-right) */
  readonly textDirection?: string;
  /** Widow/orphan control */
  readonly widowControl?: boolean;
  /** Outline level (0-9, used for TOC generation) */
  readonly outlineLvl?: number;
  readonly runs: readonly RunSpec[];
};

// =============================================================================
// Table Spec
// =============================================================================

export type BorderEdgeSpec = {
  readonly style: string;
  readonly size?: number;
  readonly color?: string;
};

export type TableCellSpec = {
  readonly content: readonly ParagraphSpec[];
  readonly width?: { readonly value: number; readonly type: "dxa" | "pct" | "auto" };
  readonly gridSpan?: number;
  readonly vMerge?: "restart" | "continue";
  readonly shading?: string;
  readonly vAlign?: "top" | "center" | "bottom";
  readonly borders?: {
    readonly top?: BorderEdgeSpec;
    readonly left?: BorderEdgeSpec;
    readonly bottom?: BorderEdgeSpec;
    readonly right?: BorderEdgeSpec;
  };
  /** Text direction */
  readonly textDirection?: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | "tbLrV";
  /** No text wrap */
  readonly noWrap?: boolean;
};

export type TableRowSpec = {
  readonly cells: readonly TableCellSpec[];
  readonly height?: { readonly value: number; readonly rule?: "auto" | "atLeast" | "exact" };
  readonly header?: boolean;
  /** Row cannot split across pages */
  readonly cantSplit?: boolean;
};

export type TableSpec = {
  readonly type: "table";
  readonly style?: string;
  readonly width?: { readonly value: number; readonly type: "dxa" | "pct" | "auto" };
  readonly alignment?: "left" | "center" | "right";
  readonly borders?: {
    readonly top?: BorderEdgeSpec;
    readonly left?: BorderEdgeSpec;
    readonly bottom?: BorderEdgeSpec;
    readonly right?: BorderEdgeSpec;
    readonly insideH?: BorderEdgeSpec;
    readonly insideV?: BorderEdgeSpec;
  };
  readonly grid?: readonly number[];
  readonly rows: readonly TableRowSpec[];
  /** Table indentation */
  readonly indent?: { readonly value: number; readonly type: "dxa" | "pct" | "auto" };
  /** Table shading (background fill color) */
  readonly shading?: string;
  /** Default cell margins for all cells */
  readonly cellMargins?: {
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
    readonly left?: number;
  };
  /** Table layout algorithm */
  readonly layout?: "fixed" | "autofit";
  /** Bidirectional table (RTL) */
  readonly bidiVisual?: boolean;
};

// =============================================================================
// Block Content Spec
// =============================================================================

export type BlockContentSpec = ParagraphSpec | TableSpec;

// =============================================================================
// Numbering Spec
// =============================================================================

export type NumberingLevelSpec = {
  readonly ilvl: number;
  readonly numFmt: string;
  readonly lvlText: string;
  readonly start?: number;
  readonly lvlJc?: "left" | "center" | "right";
  readonly indent?: { readonly left?: number; readonly hanging?: number };
  readonly font?: string;
};

export type NumberingDefinitionSpec = {
  readonly abstractNumId: number;
  readonly numId: number;
  readonly levels: readonly NumberingLevelSpec[];
};

// =============================================================================
// Style Spec
// =============================================================================

export type StyleSpec = {
  readonly type: "paragraph" | "character" | "table";
  readonly styleId: string;
  readonly name: string;
  readonly basedOn?: string;
  readonly next?: string;
  readonly paragraph?: Omit<ParagraphSpec, "type" | "runs">;
  readonly run?: Omit<RunSpec, "text">;
};

// =============================================================================
// Header/Footer Spec
// =============================================================================

export type HeaderFooterContentSpec = {
  readonly content: readonly BlockContentSpec[];
};

// =============================================================================
// Section Spec
// =============================================================================

export type SectionSpec = {
  readonly pageSize?: { readonly w: number; readonly h: number; readonly orient?: "portrait" | "landscape" };
  readonly margins?: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
    readonly header?: number;
    readonly footer?: number;
    readonly gutter?: number;
  };
  readonly columns?: {
    readonly num?: number;
    readonly space?: number;
    readonly equalWidth?: boolean;
  };
  /** Section break type */
  readonly type?: "nextPage" | "continuous" | "evenPage" | "oddPage";
  /** Page numbering settings */
  readonly pageNumbering?: {
    readonly format?: "decimal" | "upperRoman" | "lowerRoman" | "upperLetter" | "lowerLetter";
    readonly start?: number;
  };
  /** Different first page header/footer */
  readonly titlePage?: boolean;
  /** Headers */
  readonly headers?: {
    readonly default?: HeaderFooterContentSpec;
    readonly first?: HeaderFooterContentSpec;
    readonly even?: HeaderFooterContentSpec;
  };
  /** Footers */
  readonly footers?: {
    readonly default?: HeaderFooterContentSpec;
    readonly first?: HeaderFooterContentSpec;
    readonly even?: HeaderFooterContentSpec;
  };
};

// =============================================================================
// Top-level Build Spec
// =============================================================================

export type DocxBuildSpec = {
  readonly output: string;
  readonly content: readonly BlockContentSpec[];
  readonly numbering?: readonly NumberingDefinitionSpec[];
  readonly styles?: readonly StyleSpec[];
  readonly section?: SectionSpec;
  /** Media files (images) keyed by filename, value is base64 string or Uint8Array */
  readonly media?: Record<string, string | Uint8Array>;
};

export type DocxBuildData = {
  readonly outputPath: string;
  readonly paragraphCount: number;
  readonly tableCount: number;
};
