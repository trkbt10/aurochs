/**
 * @file Build command type definitions
 */

/**
 * All supported preset shape types
 * Based on ECMA-376 Part 1: §20.1.10.56 ST_ShapeType
 */
export type PresetShapeType =
  // Basic shapes
  | "rectangle" | "ellipse" | "triangle" | "rtTriangle" | "diamond"
  | "pentagon" | "hexagon" | "heptagon" | "octagon" | "decagon" | "dodecagon"
  | "parallelogram" | "trapezoid"
  | "teardrop" | "halfFrame" | "corner" | "diagStripe" | "chord"
  | "funnel" | "gear6" | "gear9" | "pie" | "pieWedge" | "blockArc"
  // Rounded/Snipped rectangles
  | "roundRect" | "round1Rect" | "round2SameRect" | "round2DiagRect"
  | "snip1Rect" | "snip2SameRect" | "snip2DiagRect" | "snipRoundRect"
  // Block arrows
  | "rightArrow" | "leftArrow" | "upArrow" | "downArrow"
  | "leftRightArrow" | "upDownArrow" | "bentArrow" | "uturnArrow"
  | "chevron" | "notchedRightArrow" | "stripedRightArrow"
  | "quadArrow" | "quadArrowCallout" | "leftRightUpArrow" | "leftUpArrow" | "bentUpArrow"
  | "curvedLeftArrow" | "curvedRightArrow" | "curvedUpArrow" | "curvedDownArrow"
  | "circularArrow" | "swooshArrow" | "leftCircularArrow" | "leftRightCircularArrow"
  | "leftArrowCallout" | "rightArrowCallout" | "upArrowCallout" | "downArrowCallout"
  | "leftRightArrowCallout" | "upDownArrowCallout"
  // Stars & Banners
  | "star4" | "star5" | "star6" | "star7" | "star8" | "star10" | "star12" | "star16" | "star24" | "star32"
  | "ribbon" | "ribbon2" | "ellipseRibbon" | "ellipseRibbon2"
  | "verticalScroll" | "horizontalScroll" | "wave" | "doubleWave"
  | "irregularSeal1" | "irregularSeal2"
  // Callouts
  | "wedgeRectCallout" | "wedgeRoundRectCallout" | "wedgeEllipseCallout" | "cloudCallout"
  | "borderCallout1" | "borderCallout2" | "borderCallout3"
  | "accentCallout1" | "accentCallout2" | "accentCallout3"
  | "accentBorderCallout1" | "accentBorderCallout2" | "accentBorderCallout3"
  | "callout1" | "callout2" | "callout3"
  // Flowchart shapes
  | "flowChartProcess" | "flowChartDecision" | "flowChartTerminator"
  | "flowChartDocument" | "flowChartData" | "flowChartConnector"
  | "flowChartAlternateProcess" | "flowChartSort" | "flowChartExtract" | "flowChartMerge"
  | "flowChartOnlineStorage" | "flowChartMagneticTape" | "flowChartMagneticDisk" | "flowChartMagneticDrum"
  | "flowChartDisplay" | "flowChartDelay" | "flowChartPreparation"
  | "flowChartManualInput" | "flowChartManualOperation"
  | "flowChartPunchedCard" | "flowChartPunchedTape"
  | "flowChartSummingJunction" | "flowChartOr" | "flowChartCollate"
  | "flowChartInternalStorage" | "flowChartMultidocument"
  | "flowChartOffpageConnector" | "flowChartPredefinedProcess"
  // Math shapes
  | "mathPlus" | "mathMinus" | "mathMultiply" | "mathDivide" | "mathEqual" | "mathNotEqual"
  // Braces & Brackets
  | "leftBrace" | "rightBrace" | "leftBracket" | "rightBracket" | "bracePair" | "bracketPair"
  // Action Buttons
  | "actionButtonBackPrevious" | "actionButtonBeginning" | "actionButtonBlank" | "actionButtonDocument"
  | "actionButtonEnd" | "actionButtonForwardNext" | "actionButtonHelp" | "actionButtonHome"
  | "actionButtonInformation" | "actionButtonMovie" | "actionButtonReturn" | "actionButtonSound"
  // Misc shapes
  | "heart" | "lightning" | "lightningBolt" | "sun" | "moon" | "cloud" | "arc" | "donut"
  | "frame" | "cube" | "can" | "foldedCorner" | "smileyFace" | "noSmoking"
  | "plus" | "cross" | "homePlate" | "plaque" | "bevel" | "rect" | "line";

// =============================================================================
// Line Types
// =============================================================================

/**
 * Line dash style
 * Based on ECMA-376 Part 1: §20.1.10.49 ST_PresetLineDashVal
 */
export type LineDashStyle =
  | "solid"
  | "dash"
  | "dashDot"
  | "dot"
  | "lgDash"
  | "lgDashDot"
  | "lgDashDotDot"
  | "sysDash"
  | "sysDashDot"
  | "sysDashDotDot"
  | "sysDot";

/**
 * Line cap style
 */
export type LineCapStyle = "flat" | "round" | "square";

/**
 * Line join style
 */
export type LineJoinStyle = "bevel" | "miter" | "round";

/**
 * Compound line style
 * Based on ECMA-376 Part 1: §20.1.10.33 ST_CompoundLine
 */
export type LineCompoundStyle = "single" | "double" | "thickThin" | "thinThick" | "triple";

/**
 * Line end type
 */
export type LineEndType = "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";

/**
 * Line end size
 */
export type LineEndSize = "sm" | "med" | "lg";

/**
 * Line end specification
 */
export type LineEndSpec = {
  readonly type: LineEndType;
  readonly width?: LineEndSize;
  readonly length?: LineEndSize;
};

// =============================================================================
// Fill Types
// =============================================================================

/**
 * Gradient stop specification
 */
export type GradientStopSpec = {
  readonly position: number; // 0-100 percentage
  readonly color: string; // hex color
};

/**
 * Gradient fill specification
 */
export type GradientFillSpec = {
  readonly type: "gradient";
  readonly gradientType: "linear" | "radial" | "path";
  readonly angle?: number; // degrees for linear gradient
  readonly stops: readonly GradientStopSpec[];
};

/**
 * Pattern preset type
 * Based on ECMA-376 Part 1: §20.1.10.51 ST_PresetPatternVal
 */
export type PatternPreset =
  | "pct5" | "pct10" | "pct20" | "pct25" | "pct30" | "pct40"
  | "pct50" | "pct60" | "pct70" | "pct75" | "pct80" | "pct90"
  | "horz" | "vert" | "ltHorz" | "ltVert" | "dkHorz" | "dkVert"
  | "narHorz" | "narVert" | "dashHorz" | "dashVert"
  | "cross" | "dnDiag" | "upDiag" | "ltDnDiag" | "ltUpDiag"
  | "dkDnDiag" | "dkUpDiag" | "wdDnDiag" | "wdUpDiag"
  | "dashDnDiag" | "dashUpDiag" | "diagCross" | "smCheck"
  | "lgCheck" | "smGrid" | "lgGrid" | "dotGrid"
  | "smConfetti" | "lgConfetti" | "horzBrick" | "diagBrick"
  | "solidDmnd" | "openDmnd" | "dotDmnd" | "plaid" | "sphere"
  | "weave" | "divot" | "shingle" | "wave" | "trellis" | "zigZag";

/**
 * Pattern fill specification
 */
export type PatternFillSpec = {
  readonly type: "pattern";
  readonly preset: PatternPreset;
  readonly fgColor: string; // foreground hex color
  readonly bgColor: string; // background hex color
};

/**
 * Solid fill specification (explicit)
 */
export type SolidFillSpec = {
  readonly type: "solid";
  readonly color: string; // hex color
};

/**
 * Fill specification union type
 */
export type FillSpec = string | SolidFillSpec | GradientFillSpec | PatternFillSpec;

// =============================================================================
// Effect Types
// =============================================================================

/**
 * Shadow effect specification
 * Based on ECMA-376 Part 1: §20.1.8.49 (outerShdw)
 */
export type ShadowEffectSpec = {
  readonly color: string; // hex color
  readonly blur?: number; // blur radius in pixels
  readonly distance?: number; // distance in pixels
  readonly direction?: number; // direction in degrees (0-360)
};

/**
 * Glow effect specification
 * Based on ECMA-376 Part 1: §20.1.8.32 (glow)
 */
export type GlowEffectSpec = {
  readonly color: string; // hex color
  readonly radius: number; // radius in pixels
};

/**
 * Soft edge effect specification
 * Based on ECMA-376 Part 1: §20.1.8.53 (softEdge)
 */
export type SoftEdgeEffectSpec = {
  readonly radius: number; // radius in pixels
};

/**
 * Combined effects specification
 */
export type EffectsSpec = {
  readonly shadow?: ShadowEffectSpec;
  readonly glow?: GlowEffectSpec;
  readonly softEdge?: SoftEdgeEffectSpec;
};

// =============================================================================
// 3D Types
// =============================================================================

/**
 * Bevel preset type
 * Based on ECMA-376 Part 1: §20.1.10.9 ST_BevelPresetType
 */
export type BevelPreset =
  | "angle"
  | "artDeco"
  | "circle"
  | "convex"
  | "coolSlant"
  | "cross"
  | "divot"
  | "hardEdge"
  | "relaxedInset"
  | "riblet"
  | "slope"
  | "softRound";

/**
 * Bevel specification
 */
export type BevelSpec = {
  readonly preset?: BevelPreset;
  readonly width?: number; // in pixels
  readonly height?: number; // in pixels
};

/**
 * Material preset type
 * Based on ECMA-376 Part 1: §20.1.10.50 ST_PresetMaterialType
 */
export type MaterialPreset =
  | "matte"
  | "warmMatte"
  | "plastic"
  | "metal"
  | "powder"
  | "flat"
  | "softEdge"
  | "clear";

/**
 * 3D shape properties specification
 */
export type Shape3dSpec = {
  readonly bevelTop?: BevelSpec;
  readonly bevelBottom?: BevelSpec;
  readonly material?: MaterialPreset;
  readonly extrusionHeight?: number; // depth in pixels
};

// =============================================================================
// Text Types
// =============================================================================

/**
 * Text alignment
 */
export type TextAlignment = "left" | "center" | "right" | "justify";

/**
 * Underline style
 */
export type UnderlineStyle = "none" | "single" | "double" | "heavy" | "dotted" | "dashed" | "wavy";

/**
 * Strikethrough style
 */
export type StrikeStyle = "none" | "single" | "double";

/**
 * Text capitalization style
 * Based on ECMA-376 Part 1: §21.1.2.1.6 ST_TextCapsType
 */
export type TextCapsStyle = "none" | "small" | "all";

/**
 * Text vertical position (superscript/subscript)
 */
export type TextVerticalPosition = "normal" | "superscript" | "subscript";

/**
 * Bullet type
 */
export type BulletType = "none" | "char" | "autoNum";

/**
 * Bullet specification
 */
export type BulletSpec = {
  readonly type: BulletType;
  readonly char?: string; // for char bullet type
  readonly autoNumType?: string; // for autoNum type (e.g., "arabicPeriod", "romanUcPeriod")
};

/**
 * Text effect specification (shadow, glow for text)
 */
export type TextEffectSpec = {
  readonly shadow?: ShadowEffectSpec;
  readonly glow?: GlowEffectSpec;
};

/**
 * Text outline specification
 */
export type TextOutlineSpec = {
  readonly color: string; // hex color
  readonly width?: number; // in pixels
};

/**
 * Text run specification - a portion of text with specific formatting
 */
export type TextRunSpec = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: UnderlineStyle;
  readonly strikethrough?: StrikeStyle;
  readonly caps?: TextCapsStyle; // all caps, small caps
  readonly verticalPosition?: TextVerticalPosition; // superscript, subscript
  readonly letterSpacing?: number; // in pixels (can be negative)
  readonly fontSize?: number; // in points
  readonly fontFamily?: string;
  readonly color?: string; // hex color
  readonly outline?: TextOutlineSpec; // text stroke
  readonly effects?: TextEffectSpec;
};

/**
 * Line spacing specification
 */
export type LineSpacingSpec =
  | { readonly type: "percent"; readonly value: number } // e.g., 150 for 1.5x
  | { readonly type: "points"; readonly value: number }; // e.g., 18 for 18pt

/**
 * Text paragraph specification
 */
export type TextParagraphSpec = {
  readonly runs: readonly TextRunSpec[];
  readonly alignment?: TextAlignment;
  readonly bullet?: BulletSpec;
  readonly level?: number; // indent level (0-8)
  readonly lineSpacing?: LineSpacingSpec; // line height
  readonly spaceBefore?: number; // points before paragraph
  readonly spaceAfter?: number; // points after paragraph
  readonly indent?: number; // first line indent in pixels
  readonly marginLeft?: number; // left margin in pixels
};

/**
 * Rich text body specification - array of paragraphs
 */
export type RichTextSpec = readonly TextParagraphSpec[];

/**
 * Text specification - can be simple string or rich text
 */
export type TextSpec = string | RichTextSpec;

// =============================================================================
// Shape Specification
// =============================================================================

/**
 * Shape specification for building
 */
export type ShapeSpec = {
  readonly type: PresetShapeType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  // Text - can be simple string or rich text paragraphs
  readonly text?: TextSpec;
  // Transform properties
  readonly rotation?: number; // degrees 0-360
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  // Fill - can be hex string or structured fill spec
  readonly fill?: FillSpec;
  // Line properties
  readonly lineColor?: string;
  readonly lineWidth?: number;
  readonly lineDash?: LineDashStyle;
  readonly lineCap?: LineCapStyle;
  readonly lineJoin?: LineJoinStyle;
  readonly lineCompound?: LineCompoundStyle;
  readonly lineHeadEnd?: LineEndSpec;
  readonly lineTailEnd?: LineEndSpec;
  // Effects
  readonly effects?: EffectsSpec;
  // 3D properties
  readonly shape3d?: Shape3dSpec;
};

/**
 * Image specification for building
 */
export type ImageSpec = {
  readonly type: "image";
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Connector specification for building
 */
export type ConnectorSpec = {
  readonly type: "connector";
  readonly preset?: "straightConnector1" | "bentConnector3" | "curvedConnector3";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly startShapeId?: string;
  readonly startSiteIndex?: number;
  readonly endShapeId?: string;
  readonly endSiteIndex?: number;
  readonly lineColor?: string;
  readonly lineWidth?: number;
};

/**
 * Group specification for building
 */
export type GroupSpec = {
  readonly type: "group";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly children: readonly (ShapeSpec | GroupSpec)[];
  readonly fill?: string;
};

/**
 * Table cell specification
 */
export type TableCellSpec = {
  readonly text: string;
};

/**
 * Table specification
 */
export type TableSpec = {
  readonly type: "table";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rows: readonly (readonly TableCellSpec[])[];
};

/**
 * Slide modification specification
 */
export type SlideModSpec = {
  readonly slideNumber: number;
  readonly addShapes?: readonly ShapeSpec[];
  readonly addImages?: readonly ImageSpec[];
  readonly addConnectors?: readonly ConnectorSpec[];
  readonly addGroups?: readonly GroupSpec[];
  readonly addTables?: readonly TableSpec[];
};

/**
 * Build specification
 */
export type BuildSpec = {
  readonly template: string;
  readonly output: string;
  readonly slides?: readonly SlideModSpec[];
};

/**
 * Build result
 */
export type BuildData = {
  readonly outputPath: string;
  readonly slideCount: number;
  readonly shapesAdded: number;
};
