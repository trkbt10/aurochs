/**
 * @file Text editor formatting types
 *
 * Generic text run and paragraph formatting types used by TextFormattingEditor
 * and ParagraphFormattingEditor. All numeric values are in points.
 */

// --- Text run formatting ---

/** Label + value pair for style option dropdowns (underline style, strike style, etc.). */
export type StyleOption<T extends string = string> = {
  readonly value: T;
  readonly label: string;
};

export type TextFormatting = {
  /** Primary font family name. */
  readonly fontFamily?: string;
  /** Font size in points. */
  readonly fontSize?: number;
  /** Bold toggle. */
  readonly bold?: boolean;
  /** Italic toggle. */
  readonly italic?: boolean;
  /** Underline toggle (simplified from format-specific styles). */
  readonly underline?: boolean;
  /** Strikethrough toggle (simplified from format-specific styles). */
  readonly strikethrough?: boolean;
  /** Text color as #RRGGBB hex string. */
  readonly textColor?: string;
  /** Highlight/background color as #RRGGBB hex string. */
  readonly highlightColor?: string;
  /** Superscript toggle. */
  readonly superscript?: boolean;
  /** Subscript toggle. */
  readonly subscript?: boolean;
  /** Underline style (format-specific value, e.g. "sng"/"dbl" for PPTX, "single"/"double" for DOCX). */
  readonly underlineStyle?: string;
  /** Strikethrough style (format-specific value, e.g. "sngStrike"/"dblStrike" for PPTX). */
  readonly strikethroughStyle?: string;
  /** Text capitalization: "none" | "small" (small caps) | "all" (all caps). */
  readonly caps?: "none" | "small" | "all";
  /** Letter spacing in pixels. */
  readonly letterSpacing?: number;
  /** Baseline offset as percentage (-100 to 100). Positive = superscript direction. */
  readonly baseline?: number;
  /** Kerning in points. */
  readonly kerning?: number;
};

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
  /** Show underline style dropdown instead of simple toggle. Default: false. */
  readonly showUnderlineStyle?: boolean;
  /** Show strikethrough style dropdown instead of simple toggle. Default: false. */
  readonly showStrikeStyle?: boolean;
  /** Show caps control (none/small-caps/all-caps). Default: false. */
  readonly showCaps?: boolean;
  /** Show letter spacing, baseline, and kerning controls. Default: false. */
  readonly showSpacing?: boolean;
};

// --- Paragraph formatting ---

export type HorizontalAlignment = "left" | "center" | "right" | "justify";

export type ParagraphFormatting = {
  /** Horizontal text alignment. */
  readonly alignment?: HorizontalAlignment;
  /** Left indentation in points. */
  readonly indentLeft?: number;
  /** Right indentation in points. */
  readonly indentRight?: number;
  /** First line indent in points. */
  readonly firstLineIndent?: number;
  /** Space before paragraph in points. */
  readonly spaceBefore?: number;
  /** Space after paragraph in points. */
  readonly spaceAfter?: number;
  /** Line spacing as multiplier (1.0 = single, 1.5 = 1.5x, 2.0 = double). */
  readonly lineSpacing?: number;
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
