/**
 * @file Build specification type definitions
 *
 * This module defines PPTX-specific spec types for the builder.
 * Common types (Color, Fill, Line, Effects, Text) are imported from @aurochs-builder/drawing-ml.
 *
 * NOTE: Consumers should import common types directly from @aurochs-builder/drawing-ml:
 * - Color types: ColorSpec, ThemeColorSpec, isThemeColor
 * - Fill types: FillSpec, SolidFillSpec, GradientFillSpec, PatternFillSpec, ThemeFillSpec, GradientStopSpec
 * - Line types: LineEndSpec, LineSpec, DashStyle, LineCap, LineJoin, CompoundLine
 * - Effect types: EffectsSpec, ShadowEffectSpec, GlowEffectSpec, SoftEdgeEffectSpec, ReflectionEffectSpec
 * - 3D types: BevelSpec, Shape3dSpec, BevelPresetType, PresetMaterialType
 * - Text types: TextSpec, TextRunSpec, TextParagraphSpec, RichTextSpec, TextBodyPropertiesSpec, etc.
 */

// =============================================================================
// Imports from @aurochs-builder/drawing-ml (shared DrawingML types)
// =============================================================================

import type {
  // Color types
  ColorSpec,
  // Fill types
  FillSpec,
  GradientStopSpec,
  // Line types
  LineEndSpec,
  DashStyle,
  // Effect types
  EffectsSpec,
  // 3D types
  Shape3dSpec,
  // Text types
  TextSpec,
  TextBodyPropertiesSpec,
} from "@aurochs-builder/drawing-ml";
import type { LineCap, LineJoin, CompoundLine } from "@aurochs-office/drawing-ml/domain/line";

// =============================================================================
// Imports from @aurochs-office packages (PPTX-specific domain types)
// =============================================================================

// Chart types from @aurochs-builder/chart
import type {
  BuildableChartType,
  Grouping,
  BarGrouping,
  ScatterStyle,
  RadarStyle,
  OfPieType,
} from "@aurochs-builder/chart";

// Shape types from @aurochs-office/pptx/domain
import type { PresetShapeType, PlaceholderType, TransitionType } from "@aurochs-office/pptx/domain";

// Animation types from @aurochs-builder/pptx/patcher
import type {
  AnimationTrigger,
  AnimationDirection,
  SimpleCommentSpec,
  SimpleNotesSpec,
} from "@aurochs-builder/pptx/patcher";

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
  /** File path (CLI usage). Either `path` or `data` must be provided. */
  readonly path?: string;
  /** In-memory image bytes (MCP / browser usage). */
  readonly data?: Uint8Array;
  /** MIME type (required when `data` is provided, e.g. "image/png"). */
  readonly mimeType?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Rotation in degrees (0-360) */
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
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
  /** File path (CLI usage). Either `path` or `data` must be provided. */
  readonly path?: string;
  /** In-memory media bytes (MCP / browser usage). */
  readonly data?: Uint8Array;
  /** MIME type (required when `data` is provided). */
  readonly mimeType?: string;
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
  /** Rotation in degrees (0-360) */
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
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
  /** Rotation in degrees (0-360) */
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  readonly children: readonly (ShapeSpec | GroupSpec)[];
  readonly fill?: string;
};

/**
 * Table cell specification (for new tables).
 * Either `text` (plain string) or `content` (rich text) must be provided.
 */
export type TableCellSpec = {
  /** Plain text content */
  readonly text?: string;
  /** Rich text content (alternative to text) */
  readonly content?: TableTextBodySpec;
  /** Cell background fill (hex color) */
  readonly fill?: string;
  /** Border color applied to all sides (hex color) */
  readonly borderColor?: string;
  /** Border width in points */
  readonly borderWidth?: number;
  /** Vertical text alignment within the cell */
  readonly verticalAlignment?: "top" | "middle" | "bottom";
  /** Cell padding in EMUs */
  readonly marginLeft?: number;
  readonly marginRight?: number;
  readonly marginTop?: number;
  readonly marginBottom?: number;
  /** Horizontal merge span (number of columns this cell spans) */
  readonly gridSpan?: number;
  /** Vertical merge span (number of rows this cell spans) */
  readonly rowSpan?: number;
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
  /** File path (CLI usage). Either `path` or `data` must be provided. */
  readonly path?: string;
  /** In-memory image bytes (MCP / browser usage). */
  readonly data?: Uint8Array;
  /** MIME type (required when `data` is provided). */
  readonly mimeType?: string;
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
 * Alias for SimpleCommentSpec from @aurochs-builder/pptx/patcher.
 */
export type CommentSpec = SimpleCommentSpec;

// =============================================================================
// Notes Types (alias)
// =============================================================================

/**
 * Speaker notes specification.
 * Alias for SimpleNotesSpec from @aurochs-builder/pptx/patcher.
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
import type { SlideAddSpec, SlideRemoveSpec, SlideReorderSpec, SlideDuplicateSpec } from "../slide-ops";

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
