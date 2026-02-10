/**
 * @file Surface editor formatting types
 *
 * Generic fill and outline/border formatting types used by
 * FillFormattingEditor and OutlineFormattingEditor.
 */

// --- Fill formatting ---

export type FillFormatting =
  | { readonly type: "none" }
  | { readonly type: "solid"; readonly color: string }
  | { readonly type: "other"; readonly label: string };

export type FillFormattingFeatures = {
  /** Show "None" option. Default: true. */
  readonly showNone?: boolean;
  /** Show solid color fill. Default: true. */
  readonly showSolid?: boolean;
  /** Show advanced fill slot (for gradient/pattern/image). Default: false. */
  readonly showAdvancedFill?: boolean;
};

// --- Outline formatting ---

export type OutlineFormatting = {
  /** Line width in points. */
  readonly width?: number;
  /** Line color as #RRGGBB hex string. */
  readonly color?: string;
  /** Dash style. */
  readonly style?: "solid" | "dashed" | "dotted" | "none";
};

export type BorderEdges = {
  readonly top?: OutlineFormatting;
  readonly bottom?: OutlineFormatting;
  readonly left?: OutlineFormatting;
  readonly right?: OutlineFormatting;
};

export type OutlineFormattingFeatures = {
  /** Show width input. Default: true. */
  readonly showWidth?: boolean;
  /** Show color picker. Default: true. */
  readonly showColor?: boolean;
  /** Show dash style selector. Default: true. */
  readonly showStyle?: boolean;
};
