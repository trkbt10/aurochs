/**
 * @file Design tokens for Office Editor UI
 *
 * Centralized design system constants for colors, spacing, typography, etc.
 * These tokens are used both directly in TypeScript and injected as CSS variables.
 */

/**
 * Color palette for the editor UI
 */
export const colorTokens = {
  accent: {
    /** Primary actions */
    primary: "#4472C4",
    /** Selection state - secondary emphasis */
    secondary: "#3b82f6",
    /** Danger/delete actions */
    danger: "#ef4444",
  },
  background: {
    /** Main container background */
    primary: "#ffffff",
    /** Panel/toolbar background */
    secondary: "#f8f9fa",
    /** Input field background */
    tertiary: "#f0f1f3",
    /** Hover state background */
    hover: "#e8eaed",
  },
  text: {
    /** Primary text color */
    primary: "#1a1a1a",
    /** Secondary/muted text */
    secondary: "#5f6368",
    /** Tertiary/hint text */
    tertiary: "#9aa0a6",
    /** Inverse text (on accent backgrounds) */
    inverse: "#ffffff",
  },
  border: {
    /** Subtle dividers */
    subtle: "rgba(0, 0, 0, 0.08)",
    /** Standard dividers */
    primary: "rgba(0, 0, 0, 0.12)",
    /** Strong emphasis borders */
    strong: "#dadce0",
  },
  selection: {
    /** Primary selection box color */
    primary: "#0066ff",
    /** Secondary selection (multi-select) */
    secondary: "#00aaff",
  },
  hyperlink: {
    /** Hyperlink color (Word default blue) */
    default: "#0563C1",
    /** Visited hyperlink color */
    visited: "#954F72",
  },
} as const;

/**
 * Border radius values
 */
export const radiusTokens = {
  /** Small radius (buttons, inputs) */
  sm: "4px",
  /** Medium radius (cards, panels) */
  md: "6px",
  /** Large radius (modals, popovers) */
  lg: "8px",
} as const;

/**
 * Spacing values
 */
export const spacingTokens = {
  /** 2x Extra small: 2px */
  "2xs": "2px",
  /** Extra small: 4px */
  xs: "4px",
  /** Extra small plus: 6px */
  "xs-plus": "6px",
  /** Small: 8px */
  sm: "8px",
  /** Medium: 12px */
  md: "12px",
  /** Large: 16px */
  lg: "16px",
  /** Extra large: 24px */
  xl: "24px",
} as const;

/**
 * Typography tokens
 */
export const fontTokens = {
  size: {
    /** 10px - labels, badges */
    xs: "10px",
    /** 11px - small UI text */
    sm: "11px",
    /** 12px - standard UI text */
    md: "12px",
    /** 13px - larger UI text */
    lg: "13px",
  },
  weight: {
    /** Normal weight */
    normal: 400,
    /** Medium weight */
    medium: 500,
    /** Semibold weight */
    semibold: 600,
  },
} as const;

/**
 * Icon tokens
 */
export const iconTokens = {
  size: {
    /** Small icons: 14px */
    sm: 14,
    /** Medium icons: 16px */
    md: 16,
    /** Large icons: 20px */
    lg: 20,
  },
  /** Standard stroke width for lucide icons */
  strokeWidth: 2,
} as const;

/**
 * Editor layout tokens
 * UI-specific constants for document editor layout (not ECMA376-based)
 */
export const editorLayoutTokens = {
  /** Visual gap between pages in multi-page document view (pixels) */
  pageGap: 24,
} as const;

/**
 * Field label width tokens for FieldGroup inline labels.
 *
 * Widths are sized to fit label text rendered at fontTokens.size.sm (11px)
 * with fontTokens.weight.medium (500). Mixed-state variants accommodate
 * the longer "(Mixed)" suffix.
 */
export const fieldLabelTokens = {
  /** TextFormattingEditor labels */
  text: {
    /** "Font" */
    font: 36,
    /** "Size" */
    size: 32,
    /** "Size (Mixed)" */
    sizeMixed: 72,
    /** "Color" */
    color: 40,
    /** "Color (Mixed)" */
    colorMixed: 80,
    /** "Highlight" */
    highlight: 56,
    /** "Hi (Mixed)" */
    highlightMixed: 64,
  },
  /** ParagraphFormattingEditor labels */
  paragraph: {
    /** "Line Spacing" */
    lineSpacing: 80,
    /** "Before" */
    spaceBefore: 48,
    /** "After" */
    spaceAfter: 40,
    /** "Left" */
    indentLeft: 32,
    /** "Right" */
    indentRight: 36,
    /** "First Line" */
    firstLine: 64,
  },
  /** OutlineFormattingEditor labels */
  outline: {
    /** "Width" */
    width: 40,
    /** "Style" */
    style: 36,
    /** "Color" */
    color: 40,
  },
  /** CellFormattingEditor labels */
  cell: {
    /** "Background" */
    background: 72,
  },
} as const;

/**
 * Field container width tokens for FieldGroup style.width.
 * These size the entire field group, distinct from label width.
 */
export const fieldContainerTokens = {
  /** Font size input field */
  fontSize: "90px",
  /** Font size input field (mixed state) */
  fontSizeMixed: "130px",
} as const;

/**
 * Combined tokens object for convenience
 */
export const tokens = {
  color: colorTokens,
  radius: radiusTokens,
  spacing: spacingTokens,
  font: fontTokens,
  icon: iconTokens,
  editorLayout: editorLayoutTokens,
  fieldLabel: fieldLabelTokens,
  fieldContainer: fieldContainerTokens,
} as const;

/**
 * Type helpers for token values
 */
export type ColorTokens = typeof colorTokens;
export type RadiusTokens = typeof radiusTokens;
export type SpacingTokens = typeof spacingTokens;
export type FontTokens = typeof fontTokens;
export type IconTokens = typeof iconTokens;
export type FieldLabelTokens = typeof fieldLabelTokens;
export type FieldContainerTokens = typeof fieldContainerTokens;
export type Tokens = typeof tokens;
