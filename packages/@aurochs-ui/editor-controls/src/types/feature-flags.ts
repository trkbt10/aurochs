/**
 * @file Feature flags for shared editors
 *
 * Each flag controls visibility of a specific control within a shared editor.
 * Defaults are documented per field; all default to true unless noted.
 */

export type TextFormattingFeatures = {
  /** Show font family selector. Default: true. */
  readonly showFontFamily?: boolean;
  /** Show font size input. Default: true. */
  readonly showFontSize?: boolean;
  /** Show bold toggle. Default: true. */
  readonly showBold?: boolean;
  /** Show italic toggle. Default: true. */
  readonly showItalic?: boolean;
  /** Show underline toggle. Default: true. */
  readonly showUnderline?: boolean;
  /** Show strikethrough toggle. Default: true. */
  readonly showStrikethrough?: boolean;
  /** Show text color control. Default: true. */
  readonly showTextColor?: boolean;
  /** Show highlight color control. Default: false. */
  readonly showHighlight?: boolean;
  /** Show superscript/subscript controls. Default: false. */
  readonly showSuperSubscript?: boolean;
};

export type ParagraphFormattingFeatures = {
  /** Show alignment buttons. Default: true. */
  readonly showAlignment?: boolean;
  /** Show indentation inputs. Default: false. */
  readonly showIndentation?: boolean;
  /** Show space before/after inputs. Default: false. */
  readonly showSpacing?: boolean;
  /** Show line spacing input. Default: false. */
  readonly showLineSpacing?: boolean;
};

export type FillFormattingFeatures = {
  /** Show "None" option. Default: true. */
  readonly showNone?: boolean;
  /** Show solid color fill. Default: true. */
  readonly showSolid?: boolean;
  /** Show advanced fill slot (for gradient/pattern/image). Default: false. */
  readonly showAdvancedFill?: boolean;
};

export type OutlineFormattingFeatures = {
  /** Show width input. Default: true. */
  readonly showWidth?: boolean;
  /** Show color picker. Default: true. */
  readonly showColor?: boolean;
  /** Show dash style selector. Default: true. */
  readonly showStyle?: boolean;
};

export type TableBandFeatures = {
  /** Show header row toggle. Default: true. */
  readonly showHeaderRow?: boolean;
  /** Show total row toggle. Default: true. */
  readonly showTotalRow?: boolean;
  /** Show first column toggle. Default: true. */
  readonly showFirstColumn?: boolean;
  /** Show last column toggle. Default: true. */
  readonly showLastColumn?: boolean;
  /** Show banded rows toggle. Default: true. */
  readonly showBandedRows?: boolean;
  /** Show banded columns toggle. Default: true. */
  readonly showBandedColumns?: boolean;
};

export type CellFormattingFeatures = {
  /** Show vertical alignment controls. Default: true. */
  readonly showVerticalAlignment?: boolean;
  /** Show background color control. Default: true. */
  readonly showBackgroundColor?: boolean;
  /** Show text wrapping toggle. Default: false. */
  readonly showWrapText?: boolean;
  /** Show border controls. Default: true. */
  readonly showBorders?: boolean;
};
