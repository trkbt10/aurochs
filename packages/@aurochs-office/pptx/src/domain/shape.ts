/**
 * @file Shape domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.3.1 - Presentation ML Shapes
 * @see ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 */

import type { Fill, Line, BlipEffects } from "./color/types";
import type { Table } from "./table/types";
import type { TextBody } from "./text";
import type { Percent, Pixels, Degrees } from "@aurochs-office/drawing-ml/domain/units";
import type { Point, Transform, GroupTransform } from "./geometry";
import type { Effects } from "./effects";
import type { Hyperlink, ResourceId } from "./resource";
import type { GroupLocks, PictureLocks, ShapeLocks } from "./shape-locks";
import type { ContentPart } from "./anchor";
import type { BlipCompression } from "@aurochs-office/ooxml/domain/drawing";
import type { FontCollectionIndex, StyleMatrixColumnIndex, ShapeId } from "./style-ref";
import type { Scene3d, Shape3d } from "./three-d";
import type { Geometry } from "@aurochs-office/drawing-ml/domain/geometry";

// Re-export geometry types from DrawingML for backward compatibility
export type {
  PresetShapeType,
  AdjustValue,
  PathCommandType,
  MoveToCommand,
  LineToCommand,
  ArcToCommand,
  QuadBezierCommand,
  CubicBezierCommand,
  CloseCommand,
  PathCommand,
  PathFillMode,
  GeometryPath,
  AdjustHandle,
  XYAdjustHandle,
  PolarAdjustHandle,
  GeometryGuide,
  ConnectionSite,
  TextRect,
  PresetGeometry,
  CustomGeometry,
  Geometry,
} from "@aurochs-office/drawing-ml/domain/geometry";

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
  /**
   * Resource ID (relationship ID, e.g., "rId2") or pre-resolved data URL.
   */
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
  /**
   * Effects applied to the blip image (color transforms).
   * @see ECMA-376 Part 1, Section 20.1.8.13 (CT_Blip)
   */
  readonly blipEffects?: BlipEffects;
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
  /**
   * Binary data of the OLE object (for newly created objects).
   *
   * This is used when creating new OLE objects in the editor.
   * The exporter embeds this data into the PPTX package.
   * NOT populated from parsing - parsed OLE objects have their data in the PPTX file.
   */
  readonly embedData?: ArrayBuffer;
  /**
   * Original filename (for newly created objects).
   *
   * Used to determine the OLE type and for naming the embedded file.
   * NOT populated from parsing.
   */
  readonly originalFilename?: string;
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
