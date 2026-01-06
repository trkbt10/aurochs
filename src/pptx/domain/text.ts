/**
 * @file Text domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 21.1.2 - Text
 */

import type { Color, Fill, Line } from "./color";
import type { Effects } from "./effects";
import type { Hyperlink, HyperlinkSound } from "./resource";
import type { Scene3d, Shape3d } from "./three-d";
import type { Degrees, Percent, Pixels, Points } from "./types";

// =============================================================================
// Text Alignment Types
// =============================================================================

/**
 * Horizontal text alignment
 * @see ECMA-376 Part 1, Section 21.1.2.1.25 (ST_TextAlignType)
 */
export type TextAlign = "left" | "center" | "right" | "justify" | "justifyLow" | "distributed" | "thaiDistributed";

/**
 * Vertical text anchor
 * @see ECMA-376 Part 1, Section 21.1.2.1.3 (ST_TextAnchoringType)
 */
export type TextAnchor = "top" | "center" | "bottom";

/**
 * Font style (normal/italic)
 */
export type FontStyle = "normal" | "italic";

/**
 * Text capitalization
 * @see ECMA-376 Part 1, Section 21.1.2.1.6 (ST_TextCapsType)
 */
export type TextCaps = "none" | "small" | "all";

/**
 * Vertical text alignment (superscript/subscript)
 * @see ECMA-376 Part 1, Section 21.1.2.3.3 (baseline attribute)
 */
export type VerticalAlign = "baseline" | "superscript" | "subscript";

/**
 * Text direction
 */
export type TextDirection = "ltr" | "rtl";

/**
 * Text typeface
 * @see ECMA-376 Part 1, Section 20.1.10.81 (ST_TextTypeface)
 */
export type TextTypeface = string;

/**
 * Preset text shape type
 * @see ECMA-376 Part 1, Section 20.1.10.76 (ST_TextShapeType)
 */
export type TextShapeType =
  | "textNoShape"
  | "textPlain"
  | "textStop"
  | "textTriangle"
  | "textTriangleInverted"
  | "textChevron"
  | "textChevronInverted"
  | "textRingInside"
  | "textRingOutside"
  | "textArchUp"
  | "textArchDown"
  | "textCircle"
  | "textButton"
  | "textArchUpPour"
  | "textArchDownPour"
  | "textCirclePour"
  | "textButtonPour"
  | "textCurveUp"
  | "textCurveDown"
  | "textCanUp"
  | "textCanDown"
  | "textWave1"
  | "textWave2"
  | "textDoubleWave1"
  | "textWave4"
  | "textInflate"
  | "textDeflate"
  | "textInflateBottom"
  | "textDeflateBottom"
  | "textInflateTop"
  | "textDeflateTop"
  | "textDeflateInflate"
  | "textDeflateInflateDeflate"
  | "textFadeRight"
  | "textFadeLeft"
  | "textFadeUp"
  | "textFadeDown"
  | "textSlantUp"
  | "textSlantDown"
  | "textCascadeUp"
  | "textCascadeDown";

// =============================================================================
// Text Body Types
// =============================================================================

/**
 * Text wrapping mode
 * @see ECMA-376 Part 1, Section 21.1.2.1.40 (ST_TextWrappingType)
 */
export type TextWrapping = "none" | "square";

/**
 * Text vertical type
 * @see ECMA-376 Part 1, Section 21.1.2.1.39 (ST_TextVerticalType)
 */
export type TextVerticalType =
  | "horz"
  | "vert"
  | "vert270"
  | "wordArtVert"
  | "eaVert"
  | "mongolianVert"
  | "wordArtVertRtl";

/**
 * Text anchoring type for overflow
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (ST_TextAnchoringType)
 */
export type TextOverflow = "overflow" | "ellipsis" | "clip";

/**
 * Auto-fit behavior
 * @see ECMA-376 Part 1, Section 21.1.2.1.1-3 (noAutofit/normAutofit/spAutoFit)
 */
export type AutoFit =
  | { readonly type: "none" }
  | { readonly type: "normal"; readonly fontScale?: Percent; readonly lineSpaceReduction?: Percent }
  | { readonly type: "shape" };

/**
 * Text vertical overflow type
 * @see ECMA-376 Part 1, Section 21.1.2.1.42 (ST_TextVertOverflowType)
 */
export type TextVerticalOverflow = "overflow" | "ellipsis" | "clip";

/**
 * Preset text warp adjust value
 * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
 */
export type TextWarpAdjustValue = {
  readonly name: string;
  readonly value: number;
};

/**
 * Preset text warp for curved/shaped text
 * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
 */
export type TextWarp = {
  /** Preset shape type for the text warp */
  readonly preset: TextShapeType;
  /** Adjust values for the warp shape */
  readonly adjustValues: readonly TextWarpAdjustValue[];
};

/**
 * Text body properties
 * All attributes are optional per ECMA-376
 * @see ECMA-376 Part 1, Section 21.1.2.1.1 (bodyPr)
 */
export type BodyProperties = {
  readonly rotation?: Degrees;
  readonly verticalType?: TextVerticalType;
  readonly wrapping?: TextWrapping;
  readonly anchor?: TextAnchor;
  readonly anchorCenter?: boolean;
  /** Horizontal overflow behavior */
  readonly overflow?: TextOverflow;
  /** Vertical overflow behavior @see ECMA-376 21.1.2.1.42 */
  readonly verticalOverflow?: TextVerticalOverflow;
  readonly autoFit?: AutoFit;
  readonly insets?: {
    readonly left: Pixels;
    readonly top: Pixels;
    readonly right: Pixels;
    readonly bottom: Pixels;
  };
  readonly columns?: number;
  readonly columnSpacing?: Pixels;
  readonly upright?: boolean;
  readonly compatibleLineSpacing?: boolean;
  /** Right-to-left columns @see ECMA-376 21.1.2.1.2 */
  readonly rtlColumns?: boolean;
  /** Apply space before/after to first/last paragraph @see ECMA-376 21.1.2.1.2 */
  readonly spaceFirstLastPara?: boolean;
  /** Force anti-aliasing @see ECMA-376 21.1.2.1.2 */
  readonly forceAntiAlias?: boolean;
  /** From WordArt @see ECMA-376 21.1.2.1.2 */
  readonly fromWordArt?: boolean;
  /** Text warp for curved/shaped text @see ECMA-376 21.1.2.1.28 */
  readonly textWarp?: TextWarp;
  /**
   * 3D scene properties for text body.
   * Defines camera, lighting, and backdrop for 3D text effects.
   *
   * @see ECMA-376 Part 1, Section 20.1.5.8 (a:scene3d)
   */
  readonly scene3d?: Scene3d;
  /**
   * 3D shape properties for text body.
   * Defines bevel, extrusion, contour, and material for 3D text effects.
   *
   * @see ECMA-376 Part 1, Section 20.1.5.9 (a:sp3d)
   */
  readonly shape3d?: Shape3d;
};

/**
 * Text body containing paragraphs
 * @see ECMA-376 Part 1, Section 21.1.2.1.40 (txBody)
 */
export type TextBody = {
  readonly bodyProperties: BodyProperties;
  readonly paragraphs: readonly Paragraph[];
};

// =============================================================================
// Paragraph Types
// =============================================================================

/**
 * Line spacing specification
 * @see ECMA-376 Part 1, Section 21.1.2.2.10 (lnSpc)
 */
export type LineSpacing =
  | { readonly type: "percent"; readonly value: Percent }
  | { readonly type: "points"; readonly value: Points };

/**
 * Tab stop
 * @see ECMA-376 Part 1, Section 21.1.2.2.14 (tab)
 */
export type TabStop = {
  readonly position: Pixels;
  readonly alignment: "left" | "center" | "right" | "decimal";
};

/**
 * Bullet type discriminator
 */
export type BulletType = "none" | "auto" | "char" | "blip";

/**
 * No bullet
 */
export type NoBullet = {
  readonly type: "none";
};

/**
 * Auto-numbered bullet
 * @see ECMA-376 Part 1, Section 21.1.2.4.1 (buAutoNum)
 */
export type AutoNumberBullet = {
  readonly type: "auto";
  readonly scheme: string; // e.g., "arabicPeriod", "alphaLcParenR"
  readonly startAt?: number;
};

/**
 * Character bullet
 * @see ECMA-376 Part 1, Section 21.1.2.4.4 (buChar)
 */
export type CharBullet = {
  readonly type: "char";
  readonly char: string;
};

/**
 * Picture bullet
 * @see ECMA-376 Part 1, Section 21.1.2.4.3 (buBlip)
 */
export type BlipBullet = {
  readonly type: "blip";
  readonly resourceId: string;
};

/**
 * Bullet specification
 */
export type Bullet = NoBullet | AutoNumberBullet | CharBullet | BlipBullet;

/**
 * Bullet style properties
 * @see ECMA-376 Part 1, Section 21.1.2.4 (bullet properties)
 */
export type BulletStyle = {
  readonly bullet: Bullet;
  readonly color?: Color;
  readonly colorFollowText: boolean;
  readonly sizePercent?: Percent;
  readonly sizePoints?: Points;
  readonly sizeFollowText: boolean;
  readonly font?: TextTypeface;
  readonly fontFollowText: boolean;
};

/**
 * Paragraph properties
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (pPr)
 */
export type ParagraphProperties = {
  readonly level?: number; // 0-8, optional per ECMA-376
  readonly alignment?: TextAlign; // optional per ECMA-376
  readonly defaultTabSize?: Pixels;
  readonly marginLeft?: Pixels;
  readonly marginRight?: Pixels;
  readonly indent?: Pixels;
  readonly lineSpacing?: LineSpacing;
  readonly spaceBefore?: LineSpacing;
  readonly spaceAfter?: LineSpacing;
  readonly bulletStyle?: BulletStyle;
  readonly tabStops?: readonly TabStop[];
  readonly rtl?: boolean;
  readonly fontAlignment?: "auto" | "top" | "center" | "base" | "bottom";
  /** East Asian line break @see ECMA-376 21.1.2.2.7 */
  readonly eaLineBreak?: boolean;
  /** Latin line break @see ECMA-376 21.1.2.2.7 */
  readonly latinLineBreak?: boolean;
  /** Hanging punctuation @see ECMA-376 21.1.2.2.7 */
  readonly hangingPunctuation?: boolean;
  /**
   * Default run properties (a:defRPr)
   * Defines default styling for text in this paragraph
   * @see ECMA-376 Part 1, Section 21.1.2.3.2 (a:defRPr)
   */
  readonly defaultRunProperties?: RunProperties;
};

/**
 * Paragraph containing text runs
 * @see ECMA-376 Part 1, Section 21.1.2.2.6 (p)
 */
export type Paragraph = {
  readonly properties: ParagraphProperties;
  readonly runs: readonly TextRun[];
  readonly endProperties?: RunProperties;
};

// =============================================================================
// Text Run Types
// =============================================================================

/**
 * Underline style
 * @see ECMA-376 Part 1, Section 21.1.2.3.32 (ST_TextUnderlineType)
 */
export type UnderlineStyle =
  | "none"
  | "words"
  | "sng"
  | "dbl"
  | "heavy"
  | "dotted"
  | "dottedHeavy"
  | "dash"
  | "dashHeavy"
  | "dashLong"
  | "dashLongHeavy"
  | "dotDash"
  | "dotDashHeavy"
  | "dotDotDash"
  | "dotDotDashHeavy"
  | "wavy"
  | "wavyHeavy"
  | "wavyDbl";

/**
 * Strike-through style
 * @see ECMA-376 Part 1, Section 21.1.2.3.26 (ST_TextStrikeType)
 */
export type StrikeStyle = "noStrike" | "sngStrike" | "dblStrike";

/**
 * Mouse over hyperlink
 * @see ECMA-376 Part 1, Section 21.1.2.3.6 (a:hlinkMouseOver)
 */
export type HyperlinkMouseOver = {
  readonly id?: string;
  readonly tooltip?: string;
  readonly action?: string;
  readonly highlightClick?: boolean;
  readonly endSound?: boolean;
  readonly sound?: HyperlinkSound;
};

/**
 * Text run properties
 * @see ECMA-376 Part 1, Section 21.1.2.3.18 (rPr)
 */
export type RunProperties = {
  readonly fontSize?: Points;
  readonly fontFamily?: TextTypeface;
  readonly fontFamilyPitchFamily?: number;
  readonly fontFamilyEastAsian?: TextTypeface;
  readonly fontFamilyEastAsianPitchFamily?: number;
  readonly fontFamilyComplexScript?: TextTypeface;
  readonly fontFamilyComplexScriptPitchFamily?: number;
  readonly fontFamilySymbol?: TextTypeface;
  readonly fontFamilySymbolPitchFamily?: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: UnderlineStyle;
  readonly underlineColor?: Color;
  readonly underlineFill?: Fill;
  readonly underlineLine?: Line;
  readonly underlineLineFollowText?: boolean;
  readonly underlineFillFollowText?: boolean;
  readonly strike?: StrikeStyle;
  readonly caps?: TextCaps;
  readonly baseline?: number; // Percent offset for super/subscript
  readonly spacing?: Pixels; // Letter spacing
  readonly kerning?: Points; // Minimum font size for kerning
  readonly color?: Color;
  /** Text fill (gradFill, blipFill, pattFill, noFill, grpFill) @see ECMA-376 20.1.8 */
  readonly fill?: Fill;
  readonly highlightColor?: Color;
  /** Text outline (stroke) @see ECMA-376 20.1.2.2.24 */
  readonly textOutline?: Line;
  /** Text effects (shadow, glow, etc.) @see ECMA-376 20.1.8.25 */
  readonly effects?: Effects;
  readonly outline?: boolean;
  readonly shadow?: boolean;
  readonly emboss?: boolean;
  readonly hyperlink?: Hyperlink;
  /** Mouse over hyperlink @see ECMA-376 21.1.2.3.6 */
  readonly hyperlinkMouseOver?: HyperlinkMouseOver;
  readonly language?: string;
  readonly altLanguage?: string;
  readonly noProof?: boolean;
  readonly dirty?: boolean;
  readonly smartTagClean?: boolean;
  readonly bookmark?: string;
  /** Error flag @see ECMA-376 21.1.2.3.9 */
  readonly error?: boolean;
  /** Kumimoji (East Asian combining) @see ECMA-376 21.1.2.3.9 */
  readonly kumimoji?: boolean;
  /** Normalize heights @see ECMA-376 21.1.2.3.9 */
  readonly normalizeHeights?: boolean;
  /** Smart tag ID @see ECMA-376 21.1.2.3.9 */
  readonly smartTagId?: number;
  /** Run-level RTL @see ECMA-376 21.1.2.3.12 */
  readonly rtl?: boolean;
  /**
   * Custom extension: optical kerning using measured glyph contours.
   * Web-pptx extension (wp:opticalKerning).
   */
  readonly wpOpticalKerning?: boolean;
};

/**
 * Regular text run
 * @see ECMA-376 Part 1, Section 21.1.2.3.13 (r)
 */
export type RegularRun = {
  readonly type: "text";
  readonly text: string;
  readonly properties?: RunProperties;
};

/**
 * Line break
 * @see ECMA-376 Part 1, Section 21.1.2.2.1 (br)
 */
export type LineBreakRun = {
  readonly type: "break";
  readonly properties?: RunProperties;
};

/**
 * Text field (date, slide number, etc.)
 * @see ECMA-376 Part 1, Section 21.1.2.2.4 (fld)
 */
export type FieldRun = {
  readonly type: "field";
  readonly fieldType: string;
  readonly id: string;
  readonly text: string;
  readonly properties?: RunProperties;
};

/**
 * Union of all text run types
 */
export type TextRun = RegularRun | LineBreakRun | FieldRun;
