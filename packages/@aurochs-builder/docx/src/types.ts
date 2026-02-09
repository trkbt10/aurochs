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
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly color?: string;
  readonly highlight?: string;
  readonly vertAlign?: "superscript" | "subscript";
  readonly smallCaps?: boolean;
  readonly allCaps?: boolean;
};

// =============================================================================
// Paragraph Spec
// =============================================================================

export type ParagraphSpec = {
  readonly type: "paragraph";
  readonly style?: string;
  readonly alignment?: "left" | "center" | "right" | "both";
  readonly spacing?: {
    readonly before?: number;
    readonly after?: number;
    readonly line?: number;
    readonly lineRule?: "auto" | "exact" | "atLeast";
  };
  readonly indent?: {
    readonly left?: number;
    readonly right?: number;
    readonly firstLine?: number;
    readonly hanging?: number;
  };
  readonly numbering?: {
    readonly numId: number;
    readonly ilvl: number;
  };
  readonly keepNext?: boolean;
  readonly keepLines?: boolean;
  readonly pageBreakBefore?: boolean;
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
