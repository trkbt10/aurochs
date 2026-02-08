/**
 * @file Office Math (OMML) domain types
 *
 * Defines types for Office Math Markup Language (OMML) in WordprocessingML.
 * Based on ECMA-376 Part 1, Section 22.1 (Math).
 *
 * @see ECMA-376 Part 1, Section 22.1 (Office Open XML Math)
 */

import type { DocxRunProperties } from "./run";

// =============================================================================
// Math Run Properties
// =============================================================================

/**
 * Math run style types.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.100 (sty)
 */
export type DocxMathStyle = "p" | "b" | "i" | "bi";

/**
 * Math script types.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.95 (scr)
 */
export type DocxMathScript =
  | "roman"
  | "script"
  | "fraktur"
  | "double-struck"
  | "sans-serif"
  | "monospace";

/**
 * Math run properties.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.91 (rPr in math context)
 */
export type DocxMathRunProperties = {
  /** Math style (plain/bold/italic/bold-italic) */
  readonly sty?: DocxMathStyle;
  /** Script type */
  readonly scr?: DocxMathScript;
  /** Normal text (roman) */
  readonly nor?: boolean;
  /** Line break indicator */
  readonly brk?: number;
  /** Alignment break number */
  readonly aln?: boolean;
  /** Literal (don't apply math formatting) */
  readonly lit?: boolean;
};

// =============================================================================
// Math Text and Run
// =============================================================================

/**
 * Math text element.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.111 (t)
 */
export type DocxMathText = {
  readonly type: "mathText";
  /** The text content */
  readonly text: string;
};

/**
 * Math run (m:r).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.87 (r)
 */
export type DocxMathRun = {
  readonly type: "mathRun";
  /** Math run properties */
  readonly properties?: DocxMathRunProperties;
  /** Run properties from WordprocessingML */
  readonly rPr?: DocxRunProperties;
  /** Text content */
  readonly text: string;
};

// =============================================================================
// Fraction
// =============================================================================

/**
 * Fraction type.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.45 (fPr)
 */
export type DocxMathFractionType = "bar" | "skw" | "lin" | "noBar";

/**
 * Fraction element (m:f).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.36 (f)
 */
export type DocxMathFraction = {
  readonly type: "mathFraction";
  /** Fraction type (bar/skewed/linear/no bar) */
  readonly fracType?: DocxMathFractionType;
  /** Numerator content */
  readonly numerator: readonly DocxMathContent[];
  /** Denominator content */
  readonly denominator: readonly DocxMathContent[];
};

// =============================================================================
// Radical (Square Root, nth Root)
// =============================================================================

/**
 * Radical element (m:rad).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.89 (rad)
 */
export type DocxMathRadical = {
  readonly type: "mathRadical";
  /** Whether to hide the degree (for square root) */
  readonly hideDeg?: boolean;
  /** Degree content (for nth root) */
  readonly degree?: readonly DocxMathContent[];
  /** Base content under the radical */
  readonly base: readonly DocxMathContent[];
};

// =============================================================================
// N-ary Operator (Sum, Integral, Product)
// =============================================================================

/**
 * Limit location for n-ary operators.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.56 (limLoc)
 */
export type DocxMathLimitLocation = "subSup" | "undOvr";

/**
 * N-ary operator element (m:nary).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.70 (nary)
 */
export type DocxMathNary = {
  readonly type: "mathNary";
  /** Operator character (∑, ∫, ∏, etc.) */
  readonly char?: string;
  /** Limit location (subscript/superscript or under/over) */
  readonly limLoc?: DocxMathLimitLocation;
  /** Whether operator grows with content */
  readonly grow?: boolean;
  /** Hide subscript */
  readonly subHide?: boolean;
  /** Hide superscript */
  readonly supHide?: boolean;
  /** Subscript (lower limit) content */
  readonly subscript?: readonly DocxMathContent[];
  /** Superscript (upper limit) content */
  readonly superscript?: readonly DocxMathContent[];
  /** Base content */
  readonly base: readonly DocxMathContent[];
};

// =============================================================================
// Superscript and Subscript
// =============================================================================

/**
 * Superscript element (m:sSup).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.101 (sSup)
 */
export type DocxMathSuperscript = {
  readonly type: "mathSuperscript";
  /** Base content */
  readonly base: readonly DocxMathContent[];
  /** Superscript content */
  readonly superscript: readonly DocxMathContent[];
};

/**
 * Subscript element (m:sSub).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.99 (sSub)
 */
export type DocxMathSubscript = {
  readonly type: "mathSubscript";
  /** Base content */
  readonly base: readonly DocxMathContent[];
  /** Subscript content */
  readonly subscript: readonly DocxMathContent[];
};

/**
 * Subscript-Superscript element (m:sSubSup).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.102 (sSubSup)
 */
export type DocxMathSubSup = {
  readonly type: "mathSubSup";
  /** Base content */
  readonly base: readonly DocxMathContent[];
  /** Subscript content */
  readonly subscript: readonly DocxMathContent[];
  /** Superscript content */
  readonly superscript: readonly DocxMathContent[];
};

/**
 * Pre-Sub-Superscript element (m:sPre).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.98 (sPre)
 */
export type DocxMathPreSubSup = {
  readonly type: "mathPreSubSup";
  /** Subscript content (before base) */
  readonly subscript: readonly DocxMathContent[];
  /** Superscript content (before base) */
  readonly superscript: readonly DocxMathContent[];
  /** Base content */
  readonly base: readonly DocxMathContent[];
};

// =============================================================================
// Delimiter (Parentheses, Brackets)
// =============================================================================

/**
 * Delimiter element (m:d).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.24 (d)
 */
export type DocxMathDelimiter = {
  readonly type: "mathDelimiter";
  /** Opening character (e.g., "(", "[", "{") */
  readonly begChr?: string;
  /** Closing character (e.g., ")", "]", "}") */
  readonly endChr?: string;
  /** Separator character (e.g., "|", ",") */
  readonly sepChr?: string;
  /** Whether delimiter grows with content */
  readonly grow?: boolean;
  /** Shape (centered, match) */
  readonly shp?: "centered" | "match";
  /** Elements within the delimiter */
  readonly elements: readonly (readonly DocxMathContent[])[];
};

// =============================================================================
// Matrix
// =============================================================================

/**
 * Matrix row.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.69 (mr)
 */
export type DocxMathMatrixRow = {
  /** Cells in this row */
  readonly cells: readonly (readonly DocxMathContent[])[];
};

/**
 * Matrix element (m:m).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.60 (m)
 */
export type DocxMathMatrix = {
  readonly type: "mathMatrix";
  /** Matrix rows */
  readonly rows: readonly DocxMathMatrixRow[];
  /** Base justification */
  readonly baseJc?: "top" | "center" | "bottom";
  /** Row spacing */
  readonly rSp?: number;
  /** Row spacing rule */
  readonly rSpRule?: number;
  /** Column gap */
  readonly cGp?: number;
  /** Column gap rule */
  readonly cGpRule?: number;
};

// =============================================================================
// Limits
// =============================================================================

/**
 * Limit Lower element (m:limLow).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.54 (limLow)
 */
export type DocxMathLimitLower = {
  readonly type: "mathLimitLower";
  /** Base content */
  readonly base: readonly DocxMathContent[];
  /** Limit content (below base) */
  readonly limit: readonly DocxMathContent[];
};

/**
 * Limit Upper element (m:limUpp).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.55 (limUpp)
 */
export type DocxMathLimitUpper = {
  readonly type: "mathLimitUpper";
  /** Base content */
  readonly base: readonly DocxMathContent[];
  /** Limit content (above base) */
  readonly limit: readonly DocxMathContent[];
};

// =============================================================================
// Accent and Bar
// =============================================================================

/**
 * Accent element (m:acc).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.1 (acc)
 */
export type DocxMathAccent = {
  readonly type: "mathAccent";
  /** Accent character (^, ~, →, etc.) */
  readonly char?: string;
  /** Base content */
  readonly base: readonly DocxMathContent[];
};

/**
 * Bar position.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.85 (pos)
 */
export type DocxMathBarPosition = "top" | "bot";

/**
 * Bar element (m:bar) - overline/underline.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.7 (bar)
 */
export type DocxMathBar = {
  readonly type: "mathBar";
  /** Bar position (top/bottom) */
  readonly pos?: DocxMathBarPosition;
  /** Base content */
  readonly base: readonly DocxMathContent[];
};

// =============================================================================
// Box and Border Box
// =============================================================================

/**
 * Box element (m:box).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.13 (box)
 */
export type DocxMathBox = {
  readonly type: "mathBox";
  /** Base content */
  readonly base: readonly DocxMathContent[];
  /** Operator emulator */
  readonly opEmu?: boolean;
  /** No break */
  readonly noBreak?: boolean;
  /** Differential */
  readonly diff?: boolean;
  /** Break */
  readonly brk?: number;
  /** Alignment */
  readonly aln?: boolean;
};

/**
 * Border Box element (m:borderBox).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.11 (borderBox)
 */
export type DocxMathBorderBox = {
  readonly type: "mathBorderBox";
  /** Hide top border */
  readonly hideTop?: boolean;
  /** Hide bottom border */
  readonly hideBot?: boolean;
  /** Hide left border */
  readonly hideLeft?: boolean;
  /** Hide right border */
  readonly hideRight?: boolean;
  /** Strike horizontal */
  readonly strikeH?: boolean;
  /** Strike vertical */
  readonly strikeV?: boolean;
  /** Strike bottom-left to top-right */
  readonly strikeBLTR?: boolean;
  /** Strike top-left to bottom-right */
  readonly strikeTLBR?: boolean;
  /** Base content */
  readonly base: readonly DocxMathContent[];
};

// =============================================================================
// Function
// =============================================================================

/**
 * Function Application element (m:func).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.39 (func)
 */
export type DocxMathFunction = {
  readonly type: "mathFunction";
  /** Function name content */
  readonly functionName: readonly DocxMathContent[];
  /** Argument content */
  readonly base: readonly DocxMathContent[];
};

// =============================================================================
// Equation Array
// =============================================================================

/**
 * Equation Array element (m:eqArr).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.34 (eqArr)
 */
export type DocxMathEquationArray = {
  readonly type: "mathEquationArray";
  /** Base justification */
  readonly baseJc?: "top" | "center" | "bottom";
  /** Maximum distribution */
  readonly maxDist?: boolean;
  /** Object distribution */
  readonly objDist?: boolean;
  /** Row spacing */
  readonly rSp?: number;
  /** Row spacing rule */
  readonly rSpRule?: number;
  /** Equations (each is a row) */
  readonly equations: readonly (readonly DocxMathContent[])[];
};

// =============================================================================
// Grouping Character
// =============================================================================

/**
 * Grouping Character element (m:groupChr).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.41 (groupChr)
 */
export type DocxMathGroupChar = {
  readonly type: "mathGroupChar";
  /** Grouping character */
  readonly char?: string;
  /** Position (top/bottom) */
  readonly pos?: DocxMathBarPosition;
  /** Vertical justification */
  readonly vertJc?: "top" | "bot";
  /** Base content */
  readonly base: readonly DocxMathContent[];
};

// =============================================================================
// Phantom
// =============================================================================

/**
 * Phantom element (m:phant) - invisible spacing.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.81 (phant)
 */
export type DocxMathPhantom = {
  readonly type: "mathPhantom";
  /** Show phantom content */
  readonly show?: boolean;
  /** Zero width */
  readonly zeroWid?: boolean;
  /** Zero ascent */
  readonly zeroAsc?: boolean;
  /** Zero descent */
  readonly zeroDesc?: boolean;
  /** Transparent */
  readonly transp?: boolean;
  /** Base content */
  readonly base: readonly DocxMathContent[];
};

// =============================================================================
// Union Types
// =============================================================================

/**
 * All math element types.
 */
export type DocxMathElement =
  | DocxMathRun
  | DocxMathFraction
  | DocxMathRadical
  | DocxMathNary
  | DocxMathSuperscript
  | DocxMathSubscript
  | DocxMathSubSup
  | DocxMathPreSubSup
  | DocxMathDelimiter
  | DocxMathMatrix
  | DocxMathLimitLower
  | DocxMathLimitUpper
  | DocxMathAccent
  | DocxMathBar
  | DocxMathBox
  | DocxMathBorderBox
  | DocxMathFunction
  | DocxMathEquationArray
  | DocxMathGroupChar
  | DocxMathPhantom;

/**
 * Math content (text or element).
 */
export type DocxMathContent = DocxMathText | DocxMathElement;

// =============================================================================
// Math Containers
// =============================================================================

/**
 * Office Math element (m:oMath).
 *
 * Inline math expression.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.77 (oMath)
 */
export type DocxOfficeMath = {
  readonly type: "oMath";
  /** Math content */
  readonly content: readonly DocxMathContent[];
};

/**
 * Office Math Paragraph justification.
 *
 * @see ECMA-376 Part 1, Section 22.1.2.51 (jc)
 */
export type DocxMathJustification = "left" | "right" | "center" | "centerGroup";

/**
 * Office Math Paragraph element (m:oMathPara).
 *
 * Display math (block-level).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.78 (oMathPara)
 */
export type DocxOfficeMathPara = {
  readonly type: "oMathPara";
  /** Justification */
  readonly justification?: DocxMathJustification;
  /** Math expressions in this paragraph */
  readonly content: readonly DocxOfficeMath[];
};
