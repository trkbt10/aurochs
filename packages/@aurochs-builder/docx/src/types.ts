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
  readonly text: string;
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
};

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
};

export type TableRowSpec = {
  readonly cells: readonly TableCellSpec[];
  readonly height?: { readonly value: number; readonly rule?: "auto" | "atLeast" | "exact" };
  readonly header?: boolean;
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
};

export type DocxBuildData = {
  readonly outputPath: string;
  readonly paragraphCount: number;
  readonly tableCount: number;
};
