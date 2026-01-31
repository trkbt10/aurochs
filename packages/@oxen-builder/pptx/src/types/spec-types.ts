/**
 * @file Build specification type definitions
 *
 * This module defines spec types for the PPTX builder.
 * Types are imported from @oxen-office packages and used internally.
 *
 * NOTE: This module does NOT re-export types from @oxen-office packages.
 * Consumers should import domain types directly from:
 * - @oxen-office/chart: BuildableChartType, Grouping, BarGrouping, ScatterStyle, RadarStyle, OfPieType
 * - @oxen-office/ooxml: SchemeColorValue, PatternType
 * - @oxen-office/pptx/domain: LineEndType, LineEndSize, LineCap, LineJoin, CompoundLine, DashStyle,
 *   TextAlign, TextAnchor, TextVerticalType, UnderlineStyle, StrikeStyle, TextCaps,
 *   PresetShapeType, PlaceholderType, BevelPresetType, PresetMaterialType, TransitionType
 * - @oxen-builder/pptx/patcher: AnimationTrigger, AnimationDirection, SimpleCommentSpec, SimpleNotesSpec
 */

// =============================================================================
// Imports from @oxen-office packages (for internal use)
// =============================================================================

// Chart types from @oxen-builder/chart
import type {
  BuildableChartType,
  Grouping,
  BarGrouping,
  ScatterStyle,
  RadarStyle,
  OfPieType,
} from "@oxen-builder/chart";

// Color/Fill types from @oxen-office/ooxml
import type { SchemeColorValue, PatternType } from "@oxen-office/ooxml";

// Domain types from @oxen-office/pptx/domain
import type {
  // Line types
  LineEndType,
  LineEndSize,
  LineCap,
  LineJoin,
  CompoundLine,
  DashStyle,
  // Text types
  TextAlign,
  TextAnchor,
  TextVerticalType,
  UnderlineStyle,
  StrikeStyle,
  TextCaps,
  // Shape types
  PresetShapeType,
  PlaceholderType,
  // 3D types
  BevelPresetType,
  PresetMaterialType,
  // Transition types
  TransitionType,
} from "@oxen-office/pptx/domain";

// Animation types from @oxen-builder/pptx/patcher
import type {
  AnimationTrigger,
  AnimationDirection,
  SimpleCommentSpec,
  SimpleNotesSpec,
} from "@oxen-builder/pptx/patcher";

// =============================================================================
// Line Spec Types
// =============================================================================

/**
 * Line end specification
 */
export type LineEndSpec = {
  readonly type: LineEndType;
  readonly width?: LineEndSize;
  readonly length?: LineEndSize;
};

// =============================================================================
// Color Types (simplified color specs)
// =============================================================================

/**
 * Theme color specification with optional luminance modifiers
 */
export type ThemeColorSpec = {
  readonly theme: SchemeColorValue;
  readonly lumMod?: number; // luminance modulate (0-100, percentage)
  readonly lumOff?: number; // luminance offset (-100 to 100, percentage)
  readonly tint?: number;   // tint (0-100, percentage)
  readonly shade?: number;  // shade (0-100, percentage)
};

/**
 * Color specification - can be hex string or theme color reference
 */
export type ColorSpec = string | ThemeColorSpec;

/**
 * Check if a color spec is a theme color
 */
export function isThemeColor(color: ColorSpec): color is ThemeColorSpec {
  return typeof color === "object" && "theme" in color;
}

// =============================================================================
// Fill Types (simplified fill specs)
// =============================================================================

/**
 * Gradient stop specification
 */
export type GradientStopSpec = {
  readonly position: number; // 0-100 percentage
  readonly color: ColorSpec; // hex color or theme color
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
 * Pattern fill specification
 */
export type PatternFillSpec = {
  readonly type: "pattern";
  readonly preset: PatternType;
  readonly fgColor: ColorSpec; // foreground color (hex or theme)
  readonly bgColor: ColorSpec; // background color (hex or theme)
};

/**
 * Solid fill specification (explicit)
 */
export type SolidFillSpec = {
  readonly type: "solid";
  readonly color: ColorSpec; // hex color or theme color
};

/**
 * Theme fill specification (shorthand for solid theme color fill)
 */
export type ThemeFillSpec = {
  readonly type: "theme";
  readonly theme: SchemeColorValue;
  readonly lumMod?: number;
  readonly lumOff?: number;
  readonly tint?: number;
  readonly shade?: number;
};

/**
 * Fill specification union type
 */
export type FillSpec = string | SolidFillSpec | GradientFillSpec | PatternFillSpec | ThemeFillSpec;

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
 * Reflection effect specification
 * Based on ECMA-376 Part 1: §20.1.8.50 (reflection)
 */
export type ReflectionEffectSpec = {
  readonly blurRadius?: number; // blur radius in pixels (default: 0)
  readonly startOpacity?: number; // start opacity 0-100 (default: 100)
  readonly endOpacity?: number; // end opacity 0-100 (default: 0)
  readonly distance?: number; // distance in pixels (default: 0)
  readonly direction?: number; // direction in degrees (default: 0)
  readonly fadeDirection?: number; // fade direction in degrees (default: 90)
  readonly scaleX?: number; // horizontal scale 0-100 (default: 100)
  readonly scaleY?: number; // vertical scale 0-100 (default: -100 for mirror)
};

/**
 * Combined effects specification
 */
export type EffectsSpec = {
  readonly shadow?: ShadowEffectSpec;
  readonly glow?: GlowEffectSpec;
  readonly softEdge?: SoftEdgeEffectSpec;
  readonly reflection?: ReflectionEffectSpec;
};

// =============================================================================
// 3D Types
// =============================================================================

/**
 * Bevel specification
 */
export type BevelSpec = {
  readonly preset?: BevelPresetType;
  readonly width?: number; // in pixels
  readonly height?: number; // in pixels
};

/**
 * 3D shape properties specification
 */
export type Shape3dSpec = {
  readonly bevelTop?: BevelSpec;
  readonly bevelBottom?: BevelSpec;
  readonly material?: PresetMaterialType;
  readonly extrusionHeight?: number; // depth in pixels
};

// =============================================================================
// Text Types
// =============================================================================

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
 * Hyperlink specification
 */
export type HyperlinkSpec = {
  readonly url: string;
  readonly tooltip?: string;
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
  readonly caps?: TextCaps;
  readonly verticalPosition?: TextVerticalPosition; // superscript, subscript
  readonly letterSpacing?: number; // in pixels (can be negative)
  readonly fontSize?: number; // in points
  readonly fontFamily?: string;
  readonly color?: string; // hex color
  readonly outline?: TextOutlineSpec; // text stroke
  readonly effects?: TextEffectSpec;
  readonly hyperlink?: HyperlinkSpec; // clickable hyperlink
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
  readonly alignment?: TextAlign;
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

/**
 * Text wrapping mode
 */
export type TextWrapping = "none" | "square";

/**
 * Text body properties specification
 */
export type TextBodyPropertiesSpec = {
  readonly anchor?: TextAnchor; // vertical alignment: top, center, bottom
  readonly verticalType?: TextVerticalType; // text orientation
  readonly wrapping?: TextWrapping;
  readonly anchorCenter?: boolean; // center text horizontally
  readonly insetLeft?: number; // left margin in pixels
  readonly insetTop?: number; // top margin in pixels
  readonly insetRight?: number; // right margin in pixels
  readonly insetBottom?: number; // bottom margin in pixels
};

// =============================================================================
// Shape Specification
// =============================================================================

export type PlaceholderSpec = {
  readonly type: PlaceholderType;
  readonly idx?: number;
};

/**
 * Shape specification for building
 */
export type ShapeSpec = {
  readonly type: PresetShapeType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly placeholder?: PlaceholderSpec;
  /**
   * Custom geometry definition (a:custGeom).
   * When provided, this overrides the preset geometry.
   */
  readonly customGeometry?: CustomGeometrySpec;
  // Text - can be simple string or rich text paragraphs
  readonly text?: TextSpec;
  // Text body properties (vertical alignment, orientation, margins)
  readonly textBody?: TextBodyPropertiesSpec;
  // Transform properties
  readonly rotation?: number; // degrees 0-360
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  // Fill - can be hex string or structured fill spec
  readonly fill?: FillSpec;
  // Line properties
  readonly lineColor?: string;
  readonly lineWidth?: number;
  readonly lineDash?: DashStyle;
  readonly lineCap?: LineCap;
  readonly lineJoin?: LineJoin;
  readonly lineCompound?: CompoundLine;
  readonly lineHeadEnd?: LineEndSpec;
  readonly lineTailEnd?: LineEndSpec;
  // Effects
  readonly effects?: EffectsSpec;
  // 3D properties
  readonly shape3d?: Shape3dSpec;
};

// =============================================================================
// Custom Geometry Types
// =============================================================================

export type CustomGeometrySpec = {
  readonly paths: readonly GeometryPathSpec[];
};

export type GeometryPathFillMode = "none" | "norm" | "lighten" | "lightenLess" | "darken" | "darkenLess";

export type GeometryPathSpec = {
  readonly width: number;
  readonly height: number;
  readonly fill: GeometryPathFillMode;
  readonly stroke: boolean;
  readonly extrusionOk: boolean;
  readonly commands: readonly PathCommandSpec[];
};

export type MoveToSpec = { readonly type: "moveTo"; readonly x: number; readonly y: number };
export type LineToSpec = { readonly type: "lineTo"; readonly x: number; readonly y: number };
export type ArcToSpec = {
  readonly type: "arcTo";
  readonly widthRadius: number;
  readonly heightRadius: number;
  readonly startAngle: number;
  readonly swingAngle: number;
};
export type QuadBezierToSpec = {
  readonly type: "quadBezierTo";
  readonly control: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
};
export type CubicBezierToSpec = {
  readonly type: "cubicBezierTo";
  readonly control1: { readonly x: number; readonly y: number };
  readonly control2: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
};
export type CloseSpec = { readonly type: "close" };

export type PathCommandSpec = MoveToSpec | LineToSpec | ArcToSpec | QuadBezierToSpec | CubicBezierToSpec | CloseSpec;

// =============================================================================
// Blip Effects Types
// =============================================================================

/**
 * Blip effect specification for image color transforms
 * Based on ECMA-376 Part 1: §20.1.8.13 CT_Blip
 */
export type BlipEffectSpec = {
  /** Alpha bi-level effect (threshold 0-100) */
  readonly alphaBiLevel?: { readonly threshold: number };
  /** Alpha ceiling effect */
  readonly alphaCeiling?: boolean;
  /** Alpha floor effect */
  readonly alphaFloor?: boolean;
  /** Alpha invert effect */
  readonly alphaInv?: boolean;
  /** Alpha modulation effect */
  readonly alphaMod?: boolean;
  /** Convert to grayscale */
  readonly grayscale?: boolean;
  /** Duotone effect with two colors */
  readonly duotone?: { readonly colors: readonly [ColorSpec, ColorSpec] };
  /** Tint effect (hue in degrees, amount 0-100) */
  readonly tint?: { readonly hue: number; readonly amount: number };
  /** Luminance adjustment (brightness and contrast -100 to 100) */
  readonly luminance?: { readonly brightness: number; readonly contrast: number };
  /** HSL adjustment (hue in degrees, saturation and luminance 0-100) */
  readonly hsl?: { readonly hue: number; readonly saturation: number; readonly luminance: number };
  /** Blur effect (radius in pixels) */
  readonly blur?: { readonly radius: number };
  /** Alpha modulation (0-100) */
  readonly alphaModFix?: number;
  /** Alpha replacement (alpha 0-100) */
  readonly alphaRepl?: { readonly alpha: number };
  /** Bi-level effect (threshold 0-100) */
  readonly biLevel?: { readonly threshold: number };
  /** Color change effect */
  readonly colorChange?: { readonly from: ColorSpec; readonly to: ColorSpec; readonly useAlpha?: boolean };
  /** Color replace effect */
  readonly colorReplace?: { readonly color: ColorSpec };
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
  /** Image effects (grayscale, tint, etc.) */
  readonly effects?: BlipEffectSpec;
  /**
   * Optional embedded media attached to the picture shape (e.g., video).
   * The image acts as a poster frame.
   */
  readonly media?: MediaEmbedSpec;
};

export type MediaEmbedSpec = {
  readonly type: "video" | "audio";
  readonly path: string;
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
 * Table cell specification (for new tables)
 */
export type TableCellSpec = {
  readonly text: string;
};

/**
 * Table specification (for new tables)
 */
export type TableSpec = {
  readonly type: "table";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rows: readonly (readonly TableCellSpec[])[];
};

// =============================================================================
// Table Update Types (for existing tables)
// =============================================================================

/**
 * Text run for table cell content
 */
export type TableTextRunSpec = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly color?: string;
};

/**
 * Paragraph for table cell content
 */
export type TableParagraphSpec = {
  readonly runs: readonly TableTextRunSpec[];
  readonly alignment?: "left" | "center" | "right" | "justify";
};

/**
 * Rich text content for table cells
 */
export type TableTextBodySpec = {
  readonly paragraphs: readonly TableParagraphSpec[];
};

/**
 * Cell update specification
 */
export type TableCellUpdateSpec = {
  readonly row: number;
  readonly col: number;
  readonly content: string | TableTextBodySpec;
};

/**
 * Row to add to a table
 */
export type TableRowAddSpec = {
  readonly height: number;
  readonly cells: readonly (string | TableTextBodySpec)[];
  readonly position?: number;
};

/**
 * Column to add to a table
 */
export type TableColumnAddSpec = {
  readonly width: number;
  readonly position?: number;
};

/**
 * Table update specification
 */
export type TableUpdateSpec = {
  /** Shape ID of the table (graphicFrame id) */
  readonly shapeId: string;
  /** Cell content updates */
  readonly updateCells?: readonly TableCellUpdateSpec[];
  /** Rows to add */
  readonly addRows?: readonly TableRowAddSpec[];
  /** Row indices to remove (0-indexed) */
  readonly removeRows?: readonly number[];
  /** Columns to add */
  readonly addColumns?: readonly TableColumnAddSpec[];
  /** Column indices to remove (0-indexed) */
  readonly removeColumns?: readonly number[];
  /** Table style ID */
  readonly styleId?: string;
};

// =============================================================================
// Chart Types (patch existing embedded charts)
// =============================================================================

export type ChartSeriesSpec = {
  readonly name: string;
  readonly values: readonly number[];
};

export type ChartDataSpec = {
  readonly categories: readonly string[];
  readonly series: readonly ChartSeriesSpec[];
};

export type ChartTransformSpec = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
};

export type ChartUpdateSpec = {
  /** Relationship ID referenced from the slide (e.g., "rId2") */
  readonly resourceId: string;
  readonly title?: string;
  readonly data?: ChartDataSpec;
  readonly styleId?: number;
  readonly transform?: ChartTransformSpec;
};

/**
 * Chart type-specific options
 */
export type ChartOptionsSpec = {
  /** Bar direction (column or bar). Applicable for barChart/bar3DChart. */
  readonly barDirection?: "col" | "bar";
  /** Grouping style for bar charts. */
  readonly barGrouping?: BarGrouping;
  /** Grouping style for line/area charts. */
  readonly grouping?: Grouping;
  /** Style for scatter charts. */
  readonly scatterStyle?: ScatterStyle;
  /** Style for radar charts. */
  readonly radarStyle?: RadarStyle;
  /** Hole size for doughnut charts (0-90 percent). */
  readonly holeSize?: number;
  /** Type for of-pie charts (pie-of-pie or bar-of-pie). */
  readonly ofPieType?: OfPieType;
  /** Scale for bubble charts (percent). */
  readonly bubbleScale?: number;
  /** What bubble size represents. */
  readonly sizeRepresents?: "area" | "w";
  /** Whether surface chart is wireframe. */
  readonly wireframe?: boolean;
};

export type ChartAddSpec = {
  readonly chartType: BuildableChartType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title?: string;
  readonly data: ChartDataSpec;
  readonly styleId?: number;
  /** Chart type-specific options */
  readonly options?: ChartOptionsSpec;
};

// =============================================================================
// Background Types
// =============================================================================

/**
 * Solid background fill specification
 */
export type BackgroundSolidSpec = {
  readonly type: "solid";
  readonly color: string; // hex color
};

/**
 * Gradient background fill specification
 */
export type BackgroundGradientSpec = {
  readonly type: "gradient";
  readonly stops: readonly GradientStopSpec[];
  readonly angle?: number; // degrees for linear gradient
};

/**
 * Image background fill specification
 */
export type BackgroundImageSpec = {
  readonly type: "image";
  readonly path: string;
  readonly mode?: "stretch" | "tile" | "cover";
};

/**
 * Background fill specification union type
 * Can be a hex color string for solid fill, or structured spec
 */
export type BackgroundFillSpec =
  | string // hex color for solid fill
  | BackgroundSolidSpec
  | BackgroundGradientSpec
  | BackgroundImageSpec;

// =============================================================================
// Transition Types
// =============================================================================

export type SlideTransitionSpec = {
  readonly type: TransitionType;
  readonly duration?: number; // milliseconds
  readonly advanceOnClick?: boolean;
  readonly advanceAfter?: number; // milliseconds
  readonly direction?: "l" | "r" | "u" | "d" | "ld" | "lu" | "rd" | "ru";
  readonly orientation?: "horz" | "vert";
  readonly spokes?: 1 | 2 | 3 | 4 | 8;
  readonly inOutDirection?: "in" | "out";
};

// =============================================================================
// Animation Types
// =============================================================================

/**
 * Animation effect class
 */
export type AnimationClassSpec = "entrance" | "exit" | "emphasis" | "motion";

/**
 * Animation specification for adding to slides
 */
export type AnimationSpec = {
  /** Target shape ID */
  readonly shapeId: string;
  /** Preset class (entrance, exit, emphasis, motion) */
  readonly class: AnimationClassSpec;
  /** Effect type (e.g., "fade", "fly", "wipe", "zoom", "pulse", "spin") */
  readonly effect: string;
  /** Trigger type */
  readonly trigger?: AnimationTrigger;
  /** Duration in milliseconds */
  readonly duration?: number;
  /** Delay before animation starts (milliseconds) */
  readonly delay?: number;
  /** Direction for directional effects */
  readonly direction?: AnimationDirection;
  /** Repeat count (or "indefinite") */
  readonly repeat?: number | "indefinite";
  /** Auto-reverse */
  readonly autoReverse?: boolean;
};

// =============================================================================
// Comment Types (alias)
// =============================================================================

/**
 * Comment specification for adding to slides.
 * Alias for SimpleCommentSpec from @oxen-builder/pptx/patcher.
 */
export type CommentSpec = SimpleCommentSpec;

// =============================================================================
// Notes Types (alias)
// =============================================================================

/**
 * Speaker notes specification.
 * Alias for SimpleNotesSpec from @oxen-builder/pptx/patcher.
 */
export type NotesSpec = SimpleNotesSpec;

// =============================================================================
// SmartArt/Diagram Types
// =============================================================================

/**
 * Update node text in a SmartArt diagram
 */
export type DiagramNodeTextUpdateSpec = {
  readonly type: "nodeText";
  /** Node model ID */
  readonly nodeId: string;
  /** New text content */
  readonly text: string;
};

/**
 * Add a node to a SmartArt diagram
 */
export type DiagramNodeAddSpec = {
  readonly type: "addNode";
  /** Parent node model ID */
  readonly parentId: string;
  /** New node model ID */
  readonly nodeId: string;
  /** Node text content */
  readonly text: string;
};

/**
 * Remove a node from a SmartArt diagram
 */
export type DiagramNodeRemoveSpec = {
  readonly type: "removeNode";
  /** Node model ID to remove */
  readonly nodeId: string;
};

/**
 * Set connection between diagram nodes
 */
export type DiagramConnectionSpec = {
  readonly type: "setConnection";
  /** Source node ID */
  readonly srcId: string;
  /** Destination node ID */
  readonly destId: string;
  /** Connection type (e.g., "parOf") */
  readonly connectionType: string;
};

/**
 * Union of all diagram change types
 */
export type DiagramChangeSpec =
  | DiagramNodeTextUpdateSpec
  | DiagramNodeAddSpec
  | DiagramNodeRemoveSpec
  | DiagramConnectionSpec;

/**
 * SmartArt update specification
 */
export type SmartArtUpdateSpec = {
  /** Relationship ID of the diagram (e.g., "rId3") */
  readonly resourceId: string;
  /** Changes to apply to the diagram */
  readonly changes: readonly DiagramChangeSpec[];
};

/**
 * Slide modification specification
 */
export type SlideModSpec = {
  readonly slideNumber: number;
  readonly background?: BackgroundFillSpec;
  readonly transition?: SlideTransitionSpec;
  readonly addCharts?: readonly ChartAddSpec[];
  readonly updateCharts?: readonly ChartUpdateSpec[];
  readonly addShapes?: readonly ShapeSpec[];
  readonly addImages?: readonly ImageSpec[];
  readonly addConnectors?: readonly ConnectorSpec[];
  readonly addGroups?: readonly GroupSpec[];
  readonly addTables?: readonly TableSpec[];
  readonly updateTables?: readonly TableUpdateSpec[];
  /** Add animations to shapes on this slide */
  readonly addAnimations?: readonly AnimationSpec[];
  /** Add comments to this slide */
  readonly addComments?: readonly CommentSpec[];
  /** Set speaker notes for this slide */
  readonly speakerNotes?: NotesSpec;
  /** Update SmartArt diagrams on this slide */
  readonly updateSmartArt?: readonly SmartArtUpdateSpec[];
};

// =============================================================================
// Slide Operation Types (imported from slide-ops for use in BuildSpec)
// =============================================================================

// Import slide operation types from the slide-ops module
// These are used in BuildSpec but exported from the slide-ops module
import type {
  SlideAddSpec,
  SlideRemoveSpec,
  SlideReorderSpec,
  SlideDuplicateSpec,
} from "../slide-ops";

/**
 * Build specification
 */
export type BuildSpec = {
  readonly template: string;
  readonly output: string;
  /**
   * Theme edits applied to a specific theme XML part (e.g., ppt/theme/theme1.xml).
   * This is applied before any slide modifications.
   */
  readonly theme?: ThemeEditSpec;
  /**
   * Slide structure operations (add, remove, reorder, duplicate).
   * These are applied BEFORE slide content modifications.
   * The order of operations is: add → duplicate → reorder → remove
   */
  readonly addSlides?: readonly SlideAddSpec[];
  readonly duplicateSlides?: readonly SlideDuplicateSpec[];
  readonly reorderSlides?: readonly SlideReorderSpec[];
  readonly removeSlides?: readonly SlideRemoveSpec[];
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

// =============================================================================
// Theme Editing Types
// =============================================================================

/**
 * Theme color scheme slot names (the 12 entries in a:clrScheme)
 */
export type ThemeSchemeColorName =
  | "dk1"
  | "lt1"
  | "dk2"
  | "lt2"
  | "accent1"
  | "accent2"
  | "accent3"
  | "accent4"
  | "accent5"
  | "accent6"
  | "hlink"
  | "folHlink";

/**
 * Color scheme edit - partial updates to a:clrScheme entries using hex colors.
 */
export type ThemeColorSchemeEditSpec = Partial<Record<ThemeSchemeColorName, string>>;

/**
 * Font spec edit for major/minor fonts
 */
export type ThemeFontSpec = {
  readonly latin?: string;
  readonly eastAsian?: string;
  readonly complexScript?: string;
};

/**
 * Font scheme edit - partial updates to major/minor fonts
 */
export type ThemeFontSchemeEditSpec = {
  readonly majorFont?: ThemeFontSpec;
  readonly minorFont?: ThemeFontSpec;
};

/**
 * Theme editing specification
 */
export type ThemeEditSpec = {
  /**
   * Target theme XML part path inside the PPTX zip (e.g., "ppt/theme/theme1.xml").
   * Required when theme edits are specified.
   */
  readonly path?: string;
  readonly colorScheme?: ThemeColorSchemeEditSpec;
  readonly fontScheme?: ThemeFontSchemeEditSpec;
};
