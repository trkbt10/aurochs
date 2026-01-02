/**
 * @file Shape domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.3.1 - Presentation ML Shapes
 * @see ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 */

import type { Chart } from "./chart";
import type { Fill, Line } from "./color";
import type {
  DiagramColorsDefinition,
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
} from "./diagram";
import type { Table } from "./table";
import type { TextBody } from "./text";
import type {
  AdjustValue,
  BlipCompression,
  ContentPart,
  Degrees,
  Effects,
  FontCollectionIndex,
  GroupLocks,
  LightRigDirection,
  LightRigType,
  PresetCameraType,
  PresetMaterialType,
  GroupTransform,
  Hyperlink,
  Percent,
  Pixels,
  PictureLocks,
  Point,
  PresetShapeType,
  ResourceId,
  ShapeLocks,
  ShapeId,
  StyleMatrixColumnIndex,
  Transform,
} from "./types";

// =============================================================================
// Shape Identity Types
// =============================================================================

/**
 * Non-visual properties common to all shapes
 * @see ECMA-376 Part 1, Section 19.3.1.12 (cNvPr)
 */
export type NonVisualProperties = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly title?: string;
  readonly hidden?: boolean;
  readonly hyperlink?: Hyperlink;
  readonly hyperlinkHover?: Hyperlink;
};

/**
 * Audio CD time specification.
 * @see ECMA-376 Part 1, Section 20.1.3.3 (end), 20.1.3.5 (st)
 */
export type AudioCdTime = {
  readonly track: number;
  readonly time?: number;
};

/**
 * Audio CD reference.
 * @see ECMA-376 Part 1, Section 20.1.3.1 (audioCd)
 */
export type AudioCd = {
  readonly start?: AudioCdTime;
  readonly end?: AudioCdTime;
};

/**
 * Linked media file reference.
 * @see ECMA-376 Part 1, Section 20.1.3.2 (audioFile), 20.1.3.4 (quickTimeFile), 20.1.3.6 (videoFile)
 */
export type LinkedMediaFile = {
  readonly link?: ResourceId;
  readonly contentType?: string;
};

/**
 * Embedded WAV audio file reference.
 * @see ECMA-376 Part 1, Section 20.1.3.7 (wavAudioFile)
 */
export type EmbeddedWavAudioFile = {
  readonly embed?: ResourceId;
  readonly name?: string;
};

/**
 * Media references attached to non-visual properties.
 * @see ECMA-376 Part 1, Section 20.1.3
 */
export type MediaReference = {
  readonly audioCd?: AudioCd;
  readonly audioFile?: LinkedMediaFile;
  readonly quickTimeFile?: LinkedMediaFile;
  readonly videoFile?: LinkedMediaFile;
  readonly wavAudioFile?: EmbeddedWavAudioFile;
};

/**
 * Placeholder type
 * @see ECMA-376 Part 1, Section 19.7.13 (ST_PlaceholderType)
 */
export type PlaceholderType =
  | "title"
  | "body"
  | "ctrTitle"
  | "subTitle"
  | "dt"
  | "sldNum"
  | "ftr"
  | "hdr"
  | "obj"
  | "chart"
  | "tbl"
  | "clipArt"
  | "dgm"
  | "media"
  | "sldImg"
  | "pic";

/**
 * Placeholder size
 * @see ECMA-376 Part 1, Section 19.7.9 (ST_PlaceholderSize)
 */
export type PlaceholderSize = "full" | "half" | "quarter";

/**
 * Placeholder properties
 * @see ECMA-376 Part 1, Section 19.3.1.36 (ph)
 */
export type Placeholder = {
  readonly type?: PlaceholderType;
  readonly idx?: number;
  readonly size?: PlaceholderSize;
  readonly hasCustomPrompt?: boolean;
};

// =============================================================================
// Geometry Types
// =============================================================================

/**
 * Path command types for custom geometry
 */
export type PathCommandType = "moveTo" | "lineTo" | "arcTo" | "quadBezierTo" | "cubicBezierTo" | "close";

/**
 * Move to command
 */
export type MoveToCommand = {
  readonly type: "moveTo";
  readonly point: Point;
};

/**
 * Line to command
 */
export type LineToCommand = {
  readonly type: "lineTo";
  readonly point: Point;
};

/**
 * Arc to command
 * @see ECMA-376 Part 1, Section 20.1.9.1 (arcTo)
 */
export type ArcToCommand = {
  readonly type: "arcTo";
  readonly widthRadius: Pixels;
  readonly heightRadius: Pixels;
  readonly startAngle: Degrees;
  readonly swingAngle: Degrees;
};

/**
 * Quadratic bezier command
 */
export type QuadBezierCommand = {
  readonly type: "quadBezierTo";
  readonly control: Point;
  readonly end: Point;
};

/**
 * Cubic bezier command
 */
export type CubicBezierCommand = {
  readonly type: "cubicBezierTo";
  readonly control1: Point;
  readonly control2: Point;
  readonly end: Point;
};

/**
 * Close path command
 */
export type CloseCommand = {
  readonly type: "close";
};

/**
 * Union of all path commands
 */
export type PathCommand =
  | MoveToCommand
  | LineToCommand
  | ArcToCommand
  | QuadBezierCommand
  | CubicBezierCommand
  | CloseCommand;

/**
 * Geometry path
 * @see ECMA-376 Part 1, Section 20.1.9.15 (path)
 */
export type GeometryPath = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly fill: "none" | "norm" | "lighten" | "lightenLess" | "darken" | "darkenLess";
  readonly stroke: boolean;
  readonly extrusionOk: boolean;
  readonly commands: readonly PathCommand[];
};

/**
 * Adjust handle definitions for custom geometry
 * @see ECMA-376 Part 1, Section 20.1.9.1 (ahLst)
 */
export type AdjustHandle = XYAdjustHandle | PolarAdjustHandle;

/**
 * XY adjust handle
 * @see ECMA-376 Part 1, Section 20.1.9.3 (ahXY)
 */
export type XYAdjustHandle = {
  readonly type: "xy";
  readonly position: Point;
  readonly guideX?: string;
  readonly guideY?: string;
  readonly minX?: number;
  readonly maxX?: number;
  readonly minY?: number;
  readonly maxY?: number;
};

/**
 * Polar adjust handle
 * @see ECMA-376 Part 1, Section 20.1.9.2 (ahPolar)
 */
export type PolarAdjustHandle = {
  readonly type: "polar";
  readonly position: Point;
  readonly guideAngle?: string;
  readonly guideRadius?: string;
  readonly minAngle?: Degrees | string;
  readonly maxAngle?: Degrees | string;
  readonly minRadius?: number;
  readonly maxRadius?: number;
};

/**
 * Preset geometry
 * @see ECMA-376 Part 1, Section 20.1.9.18 (prstGeom)
 */
export type PresetGeometry = {
  readonly type: "preset";
  readonly preset: PresetShapeType;
  readonly adjustValues: readonly AdjustValue[];
};

/**
 * Custom geometry
 * @see ECMA-376 Part 1, Section 20.1.9.8 (custGeom)
 */
export type CustomGeometry = {
  readonly type: "custom";
  readonly paths: readonly GeometryPath[];
  readonly adjustValues: readonly AdjustValue[];
  readonly adjustHandles: readonly AdjustHandle[];
  readonly guides: readonly GeometryGuide[];
  readonly connectionSites: readonly ConnectionSite[];
  readonly textRect?: TextRect;
};

/**
 * Geometry guide for calculations
 * @see ECMA-376 Part 1, Section 20.1.9.11 (gd)
 */
export type GeometryGuide = {
  readonly name: string;
  readonly formula: string;
};

/**
 * Connection site for connectors
 * @see ECMA-376 Part 1, Section 20.1.9.7 (cxn)
 */
export type ConnectionSite = {
  readonly angle: Degrees;
  readonly position: Point;
};

/**
 * Text rectangle within custom geometry
 * @see ECMA-376 Part 1, Section 20.1.9.22 (rect)
 */
export type TextRect = {
  readonly left: string; // Formula or value
  readonly top: string;
  readonly right: string;
  readonly bottom: string;
};

/**
 * Union of geometry types
 */
export type Geometry = PresetGeometry | CustomGeometry;

// =============================================================================
// Shape Property Types
// =============================================================================

/**
 * Shape visual properties
 * @see ECMA-376 Part 1, Section 19.3.1.44 (spPr)
 */
export type ShapeProperties = {
  readonly transform?: Transform;
  readonly geometry?: Geometry;
  readonly fill?: Fill;
  readonly line?: Line;
  readonly effects?: Effects;
  readonly scene3d?: Scene3d;
  readonly shape3d?: Shape3d;
};

/**
 * 3D scene properties
 * @see ECMA-376 Part 1, Section 20.1.5.8 (scene3d)
 */
export type Scene3d = {
  readonly camera: Camera3d;
  readonly lightRig: LightRig;
  readonly backdrop?: Backdrop3d;
  readonly flatTextZ?: Pixels;
};

/**
 * 3D camera
 * @see ECMA-376 Part 1, Section 20.1.5.2 (camera)
 */
export type Camera3d = {
  readonly preset: PresetCameraType;
  readonly fov?: Degrees;
  readonly zoom?: Percent;
  readonly rotation?: Rotation3d;
};

/**
 * 3D rotation
 */
export type Rotation3d = {
  readonly latitude: Degrees;
  readonly longitude: Degrees;
  readonly revolution: Degrees;
};

/**
 * 3D light rig
 * @see ECMA-376 Part 1, Section 20.1.5.6 (lightRig)
 */
export type LightRig = {
  readonly rig: LightRigType;
  readonly direction: LightRigDirection;
  readonly rotation?: Rotation3d;
};

/**
 * 3D backdrop
 */
export type Backdrop3d = {
  readonly anchor: Point;
  readonly normal: Point;
  readonly up: Point;
};

/**
 * 3D shape properties
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export type Shape3d = {
  readonly z?: Pixels;
  readonly extrusionHeight?: Pixels;
  readonly contourWidth?: Pixels;
  readonly preset?: PresetMaterialType;
  readonly extrusionColor?: Fill;
  readonly contourColor?: Fill;
  readonly bevel?: Bevel3d;
};

/**
 * 3D bevel
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */
export type Bevel3d = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly preset: BevelPresetType;
};

/**
 * Bevel preset types.
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
 */
export type BevelPresetType =
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

// =============================================================================
// Concrete Shape Types
// =============================================================================

/**
 * Standard shape (sp)
 * @see ECMA-376 Part 1, Section 19.3.1.43 (sp)
 * @see MS-ODRAWXML Section 2.4.2 (dsp:sp for diagram shapes)
 */
export type SpShape = {
  readonly type: "sp";
  readonly nonVisual: NonVisualProperties & {
    readonly textBox?: boolean;
    readonly shapeLocks?: ShapeLocks;
  };
  readonly placeholder?: Placeholder;
  readonly properties: ShapeProperties;
  readonly textBody?: TextBody;
  readonly style?: ShapeStyle;
  /** Use parent shape text rectangle for text shape (a:txSp). */
  readonly useShapeTextRect?: boolean;
  /**
   * Diagram model ID (from dsp:sp modelId attribute)
   * Links this shape to a node in the diagram data model
   * @see MS-ODRAWXML Section 2.4.2
   */
  readonly modelId?: string;
  /**
   * Text transform for diagram shapes (from dsp:txXfrm)
   * Defines the text area separately from the shape bounds
   * @see MS-ODRAWXML Section 2.4.4
   */
  readonly textTransform?: Transform;
};

/**
 * Shape style reference
 * @see ECMA-376 Part 1, Section 19.3.1.46 (style)
 */
export type ShapeStyle = {
  readonly lineReference?: StyleReference;
  readonly fillReference?: StyleReference;
  readonly effectReference?: StyleReference;
  readonly fontReference?: FontReference;
};

/**
 * Style matrix reference
 * @see ECMA-376 Part 1, Section 20.1.4.2.19 (lnRef/fillRef/effectRef)
 */
export type StyleReference = {
  readonly index: StyleMatrixColumnIndex;
  readonly color?: Fill;
};

/**
 * Font reference
 * @see ECMA-376 Part 1, Section 20.1.4.1.17 (fontRef)
 */
export type FontReference = {
  readonly index: FontCollectionIndex;
  readonly color?: Fill;
};

/**
 * Picture shape (pic)
 * @see ECMA-376 Part 1, Section 19.3.1.37 (pic)
 */
export type PicShape = {
  readonly type: "pic";
  readonly nonVisual: NonVisualProperties & {
    readonly preferRelativeResize?: boolean;
    readonly pictureLocks?: PictureLocks;
  };
  readonly blipFill: BlipFillProperties;
  readonly properties: ShapeProperties;
  readonly style?: ShapeStyle;
  readonly mediaType?: "video" | "audio";
  readonly media?: MediaReference;
};

/**
 * Blip fill for pictures
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type BlipFillProperties = {
  readonly resourceId: ResourceId;
  readonly compressionState?: BlipCompression;
  readonly sourceRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
  readonly stretch?: boolean;
  readonly tile?: {
    readonly tx: Pixels;
    readonly ty: Pixels;
    readonly sx: Percent;
    readonly sy: Percent;
    readonly flip: "none" | "x" | "y" | "xy";
    readonly alignment: string;
  };
  readonly rotateWithShape?: boolean;
  readonly dpi?: number;
};

/**
 * Group shape (grpSp)
 * @see ECMA-376 Part 1, Section 19.3.1.22 (grpSp)
 */
export type GrpShape = {
  readonly type: "grpSp";
  readonly nonVisual: NonVisualProperties & {
    readonly groupLocks?: GroupLocks;
  };
  readonly properties: GroupShapeProperties;
  readonly children: readonly Shape[];
};

/**
 * Group shape visual properties
 * @see ECMA-376 Part 1, Section 19.3.1.23 (grpSpPr)
 */
export type GroupShapeProperties = {
  readonly transform?: GroupTransform;
  readonly fill?: Fill;
  readonly effects?: Effects;
  readonly scene3d?: Scene3d;
};

/**
 * Connector shape (cxnSp)
 * @see ECMA-376 Part 1, Section 19.3.1.13 (cxnSp)
 */
export type CxnShape = {
  readonly type: "cxnSp";
  readonly nonVisual: NonVisualProperties & {
    readonly startConnection?: ConnectionTarget;
    readonly endConnection?: ConnectionTarget;
  };
  readonly properties: ShapeProperties;
  readonly style?: ShapeStyle;
};

/**
 * Connection target reference
 * @see ECMA-376 Part 1, Section 19.3.1.12 (stCxn/endCxn)
 */
export type ConnectionTarget = {
  readonly shapeId: string;
  readonly siteIndex: number;
};

/**
 * Graphic frame (graphicFrame)
 * @see ECMA-376 Part 1, Section 19.3.1.21 (graphicFrame)
 */
export type GraphicFrame = {
  readonly type: "graphicFrame";
  readonly nonVisual: NonVisualProperties & {
    readonly graphicFrameLocks?: GraphicFrameLocks;
  };
  readonly transform: Transform;
  readonly content: GraphicContent;
};

/**
 * Content part (contentPart)
 * @see ECMA-376 Part 1, Section 19.3.1.14 (contentPart)
 */
export type ContentPartShape = {
  readonly type: "contentPart";
  readonly contentPart: ContentPart;
};

/**
 * Graphic frame locks
 * @see ECMA-376 Part 1, Section 20.1.2.2.19 (graphicFrameLocks)
 */
export type GraphicFrameLocks = {
  readonly noGrp?: boolean;
  readonly noDrilldown?: boolean;
  readonly noSelect?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
};

/**
 * Graphic content types
 */
export type GraphicContent =
  | { readonly type: "table"; readonly data: TableReference }
  | { readonly type: "chart"; readonly data: ChartReference }
  | { readonly type: "diagram"; readonly data: DiagramReference }
  | { readonly type: "oleObject"; readonly data: OleReference }
  | { readonly type: "unknown"; readonly uri: string };

/**
 * Table data embedded in graphicFrame
 * @see ECMA-376 Part 1, Section 21.1.3.13 (tbl)
 */
export type TableReference = {
  readonly table: Table;
};

/**
 * Chart reference (actual chart data in chart.ts)
 *
 * The parsedChart field is populated in the integration layer
 * to allow render to render without calling parser directly.
 */
export type ChartReference = {
  readonly resourceId: ResourceId;
  /** Pre-parsed chart data (populated by integration layer) */
  readonly parsedChart?: Chart;
};

/**
 * Diagram content (parsed shapes from drawing)
 *
 * This type represents the result of parsing a diagram drawing.
 * It contains the shapes rendered by the diagram layout engine.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML - Diagrams
 */
export type DiagramContent = {
  readonly shapes: readonly Shape[];
};

/**
 * Diagram reference (SmartArt)
 *
 * The parsedContent field is populated in the integration layer
 * to allow render to render without calling parser directly.
 */
export type DiagramReference = {
  readonly dataResourceId?: ResourceId;
  readonly layoutResourceId?: ResourceId;
  readonly styleResourceId?: ResourceId;
  readonly colorResourceId?: ResourceId;
  /** Pre-parsed diagram content (populated by integration layer) */
  readonly parsedContent?: DiagramContent;
  /** Parsed diagram data model (dgm:dataModel) */
  readonly dataModel?: DiagramDataModel;
  /** Parsed diagram layout definition (dgm:layoutDef) */
  readonly layoutDefinition?: DiagramLayoutDefinition;
  /** Parsed diagram style definition (dgm:styleDef) */
  readonly styleDefinition?: DiagramStyleDefinition;
  /** Parsed diagram color definition (dgm:colorsDef) */
  readonly colorsDefinition?: DiagramColorsDefinition;
};

/**
 * OLE object reference
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 * @see MS-OE376 Part 4 Section 4.4.2.4
 */
export type OleReference = {
  /** Relationship ID to OLE binary (r:id) */
  readonly resourceId?: ResourceId;
  /** Program ID (e.g., "PowerPoint.Slide.8", "Equation.3") */
  readonly progId?: string;
  /** Object name */
  readonly name?: string;
  /** VML shape ID for legacy drawing reference */
  readonly spid?: ShapeId;
  /** Preview image width in EMU */
  readonly imgW?: number;
  /** Preview image height in EMU */
  readonly imgH?: number;
  /** Whether to show as icon */
  readonly showAsIcon?: boolean;
  /** Follow presentation color scheme */
  readonly followColorScheme?: OleObjectFollowColorScheme;
  /** Preview picture (ECMA-376-1:2016 format) */
  readonly pic?: BlipFillProperties;
  /** Pre-resolved preview image data URL (populated by integration layer) */
  readonly previewImageUrl?: string;
};

/**
 * OLE object follow color scheme
 * @see ECMA-376 Part 1, Section 19.7.6 (ST_OleObjectFollowColorScheme)
 */
export type OleObjectFollowColorScheme = "full" | "none" | "textAndBackground";

/**
 * Union of all shape types
 */
export type Shape = SpShape | PicShape | GrpShape | CxnShape | GraphicFrame | ContentPartShape;
