/**
 * @file Canonical adapter data types (SoT)
 *
 * These types define the contract between format-specific adapters
 * (pptx-editor, pdf-editor, etc.) and react-editor-ui sections.
 * Both editors import from here instead of defining locally.
 */

// =============================================================================
// Text formatting types
// =============================================================================

/** Text decoration/position style used by CaseTransformData. */
export type TextStyle = "superscript" | "subscript" | "underline" | "strikethrough";

/** Font family and weight for react-editor-ui FontSection. */
export type FontData = {
  readonly family: string;
  readonly weight: string;
};

/** Font size/leading/kerning/tracking for react-editor-ui FontMetricsSection. */
export type FontMetricsData = {
  readonly size: string;
  readonly leading: string;
  readonly kerning: "auto" | "optical" | "metrics" | "none";
  readonly tracking: string;
};

/** Caps and text decoration toggles for react-editor-ui CaseTransformSection. */
export type CaseTransformData = {
  readonly case: "normal" | "small-caps" | "all-caps";
  readonly styles: readonly TextStyle[];
};

// =============================================================================
// Paragraph formatting types
// =============================================================================

/** Text alignment for react-editor-ui TextJustifySection. */
export type TextJustifyData = {
  readonly align: "left" | "center" | "right" | "justify" | "justify-left" | "justify-center" | "justify-all";
};

/** Paragraph spacing for react-editor-ui ParagraphSpacingSection. */
export type ParagraphSpacingData = {
  readonly before: string;
  readonly after: string;
  readonly hyphenate: boolean;
};

/** Indentation for react-editor-ui IndentSection. */
export type IndentData = {
  readonly left: string;
  readonly right: string;
  readonly firstLine: string;
};

/** Bulleted list style options (must match react-editor-ui BulletedListStyle). */
export type BulletedListStyle = "disc" | "circle" | "square";

/** Numbered list style options (must match react-editor-ui NumberedListStyle). */
export type NumberedListStyle = "decimal" | "lower-alpha" | "upper-alpha" | "lower-roman" | "upper-roman";

/** List style for react-editor-ui ListSection. */
export type ListData = {
  readonly type: "none" | "bulleted" | "numbered";
  readonly style: BulletedListStyle | NumberedListStyle | "";
};

// =============================================================================
// Layout types
// =============================================================================

/** Position data for react-editor-ui PositionSection. */
export type PositionData = {
  readonly x: string;
  readonly y: string;
};

/** Size data for react-editor-ui SizeSection. */
export type SizeData = {
  readonly width: string;
  readonly height: string;
};

// =============================================================================
// Page size types
// =============================================================================

/** Page size preset definition for PageSizeEditor. */
export type PageSizePreset = {
  readonly value: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
};

/** Page size data for PageSizeEditor. */
export type PageSizeData = {
  readonly width: string;
  readonly height: string;
  readonly preset: string; // "" = custom
};
