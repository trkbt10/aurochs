/**
 * @file Domain Objects for PPTX processing
 *
 * This module provides type-safe domain objects that represent PPTX content
 * in a renderer-agnostic way. These types are:
 *
 * 1. **Immutable** - All properties are readonly
 * 2. **Self-contained** - No references to XML elements
 * 3. **ECMA-376 compliant** - Based on the Office Open XML specification
 * 4. **Unit-converted** - All measurements in CSS-friendly units (px, degrees, etc.)
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
 * │   Parse Layer   │ ──→ │  Domain Objects  │ ──→ │  Render Layer   │
 * │   (XmlElement)  │     │  (these types)   │     │  (HTML/SVG)     │
 * └─────────────────┘     └──────────────────┘     └─────────────────┘
 * ```
 *
 * @see ECMA-376 Part 1 - Office Open XML File Formats
 */

// =============================================================================
// Base Types (Measurement Units)
// =============================================================================
// OOXML unit types: import directly from "@/ooxml/domain/units"
// (Brand, Pixels, Degrees, Percent, Points, EMU, px, deg, pct, pt, emu)

// PPTX-specific branded types only
export type { RelationshipId, HexColor } from "./types";

export { rId, hexColor } from "./types";

// =============================================================================
// Defaults and Constants
// =============================================================================

export {
  DEFAULT_FONT_SIZE_PT,
  DEFAULT_FONT_SIZE_CENTIPOINTS,
  FONT_SIZE_CENTIPOINTS_TO_PT,
  DEFAULT_LINE_SPACING_PCT,
  DEFAULT_PARAGRAPH_SPACING_PT,
  DEFAULT_TEXT_MARGIN_EMU,
  DEFAULT_MARGIN_LEFT_EMU,
  DEFAULT_INDENT_EMU,
  EMU_PER_INCH,
  STANDARD_DPI,
  EMU_PER_PIXEL,
  POINTS_PER_INCH,
  OOXML_PERCENT_FACTOR,
  DEFAULT_SERVER_ZOOM,
  DEFAULT_FIRST_SLIDE_NUM,
  DEFAULT_SHOW_SPECIAL_PLS_ON_TITLE_SLD,
  DEFAULT_RTL,
  DEFAULT_REMOVE_PERSONAL_INFO_ON_SAVE,
  DEFAULT_COMPAT_MODE,
  DEFAULT_STRICT_FIRST_AND_LAST_CHARS,
  DEFAULT_EMBED_TRUETYPE_FONTS,
  DEFAULT_SAVE_SUBSET_FONTS,
  DEFAULT_AUTO_COMPRESS_PICTURES,
  DEFAULT_BOOKMARK_ID_SEED,
} from "./defaults";

export { RTL_LANGUAGES } from "./rtl-languages";

// =============================================================================
// Unit Conversions
// =============================================================================

export {
  SLIDE_FACTOR,
  FONT_SIZE_FACTOR,
  PT_TO_PX,
  angleToDegrees,
  degreesToRadians,
} from "./unit-conversion";

// =============================================================================
// OPC Infrastructure Types
// =============================================================================

export type {
  PresentationFile,
  PlaceholderTable,
} from "./opc";

export { createZipAdapter } from "./zip-adapter";

// =============================================================================
// Content Types (PPTX-specific)
// =============================================================================

export type { ContentTypes, SlideFileInfo } from "./content-types";
export {
  CONTENT_TYPES,
  parseContentTypes,
  extractSlideNumber,
  buildSlideFileInfoList,
} from "./content-types";

export type { RelationshipType } from "./relationships";
export {
  RELATIONSHIP_TYPES,
  createEmptyResourceMap,
  createResourceMap,
  isImageRelationship,
  isHyperlinkRelationship,
  isMediaRelationship,
} from "./relationships";

// =============================================================================
// Theme Types (with XmlElement references)
// =============================================================================

export type {
  CustomColor,
  ExtraColorScheme,
  ObjectDefaults,
  FormatScheme,
  Theme,
  RawMasterTextStyles,
} from "./theme";

// =============================================================================
// Geometry Types
// =============================================================================

export type {
  Point,
  Size,
  Bounds,
  EffectExtent,
  Transform,
  GroupTransform,
} from "./geometry";

// =============================================================================
// Shape Geometry Calculations
// =============================================================================

export type { GuideContext, ResolvedTextRect, ResolvedConnectionSite, ConnectionSiteLookup } from "./shape-geometry";
export {
  createGuideContext,
  evaluateGuides,
  evaluateExpression,
  angleUnitsToDegrees,
  degreesToAngleUnits,
  normalizeAngle,
  calculateTextRect,
  isInsideTextRect,
  applyTextInsets,
  calculateConnectionSites,
  getConnectionPoint,
  transformConnectionPoint,
} from "./shape-geometry";

// =============================================================================
// Resource Types
// =============================================================================

export type {
  ResourceId,
  ResourcePath,
  Hyperlink,
  HyperlinkSound,
  ResolvedBlipResource,
} from "./resource";

// =============================================================================
// Line Property Types
// =============================================================================

export type {
  LineEndType,
  LineEndSize,
  LineCap,
  LineJoin,
  CompoundLine,
  DashStyle,
} from "./line";

// =============================================================================
// Shape Lock Types
// =============================================================================

export type {
  GroupLocks,
  ConnectorLocks,
  PictureLocks,
  ShapeLocks,
  ContentPartLocks,
} from "./shape-locks";

// =============================================================================
// Positioning Types
// =============================================================================

export type {
  AlignH,
  AlignV,
  RelFromH,
  PositionH,
  RelFromV,
  PositionV,
  WrapPolygon,
  WrapText,
  WrapDistance,
  WrapSquare,
  WrapThrough,
  WrapTight,
  WrapTopAndBottom,
} from "./positioning";

// =============================================================================
// Anchor Types
// =============================================================================

export type {
  AbsoluteAnchor,
  AnchorClientData,
  AnchorMarker,
  OneCellAnchor,
  TwoCellAnchor,
  EditAs,
  ContentPart,
  LinkedTextbox,
  TextboxInfo,
} from "./anchor";

// =============================================================================
// Appearance Types
// =============================================================================

export type {
  BlackWhiteMode,
  OnOffStyleType,
  RectAlignment,
  FillEffectType,
} from "./appearance";

// =============================================================================
// Style Reference Types
// =============================================================================

export type {
  ColorSchemeIndex,
  SchemeColorValue,
  FontCollectionIndex,
  StyleMatrixColumnIndex,
  ShapeId,
} from "./style-ref";

// =============================================================================
// 3D Types
// =============================================================================

export type {
  LightRigDirection,
  LightRigType,
  PresetCameraType,
  PresetMaterialType,
  BevelPresetType,
  Rotation3d,
  Camera3d,
  LightRig,
  Backdrop3d,
  Scene3d,
  Bevel3d,
  Shape3d,
} from "./three-d";

// =============================================================================
// Effect Types
// =============================================================================

export type {
  ShadowEffect,
  GlowEffect,
  ReflectionEffect,
  SoftEdgeEffect,
  AlphaBiLevelEffect,
  AlphaCeilingEffect,
  AlphaFloorEffect,
  AlphaInverseEffect,
  AlphaModulateEffect,
  AlphaModulateFixedEffect,
  AlphaOutsetEffect,
  AlphaReplaceEffect,
  BiLevelEffect,
  BlendEffect,
  BlendMode,
  EffectContainerType,
  EffectContainerKind,
  EffectContainer,
  ColorChangeEffect,
  ColorReplaceEffect,
  DuotoneEffect,
  FillOverlayEffect,
  GrayscaleEffect,
  PresetShadowEffect,
  PresetShadowValue,
  RelativeOffsetEffect,
  Effects,
} from "./effects";

// =============================================================================
// OOXML Shared Types - DO NOT RE-EXPORT
// =============================================================================

// Color types: import directly from "@/ooxml/domain/color"
// Fill types: import directly from "@/ooxml/domain/fill"
// Unit types: import directly from "@/ooxml/domain/units"
// DrawingML shared types: import directly from "@/ooxml/domain/*"
// =============================================================================

// =============================================================================
// PPTX-specific Color/Fill Types
// =============================================================================

export type {
  // PPTX-specific color
  ResolvedColor,
  // PPTX-specific fill types
  StretchFill,
  TileFill,
  BlipEffects,
  BlipFill,
  Fill,
  // Line types
  LineEnd,
  CustomDash,
  Line,
  // Color mapping
  ColorMapping,
  ColorMapOverride,
} from "./color/types";

export { color } from "./color/types";

// =============================================================================
// Text Types
// =============================================================================

export type {
  // Text alignment types
  TextAlign,
  TextAnchor,
  FontStyle,
  TextCaps,
  VerticalAlign,
  TextDirection,
  TextTypeface,
  TextShapeType,
  // Text body
  TextWrapping,
  TextVerticalType,
  TextOverflow,
  TextVerticalOverflow,
  AutoFit,
  TextWarpAdjustValue,
  TextWarp,
  BodyProperties,
  TextBody,
  // Paragraph
  LineSpacing,
  TabStop,
  BulletType,
  NoBullet,
  AutoNumberBullet,
  CharBullet,
  BlipBullet,
  Bullet,
  BulletStyle,
  ParagraphProperties,
  Paragraph,
  // Text run
  UnderlineStyle,
  StrikeStyle,
  HyperlinkMouseOver,
  RunProperties,
  RegularRun,
  LineBreakRun,
  FieldRun,
  TextRun,
} from "./text";

// =============================================================================
// Text Style Types
// =============================================================================

export type {
  MasterTextStyles,
  TextStyleLevels,
  TextLevelStyle,
} from "./text-style";

// =============================================================================
// Shape Types
// =============================================================================

export type {
  // Preset shape types
  PresetShapeType,
  AdjustValue,
  // Shape identity
  NonVisualProperties,
  AudioCdTime,
  AudioCd,
  LinkedMediaFile,
  EmbeddedWavAudioFile,
  MediaReference,
  PlaceholderType,
  PlaceholderSize,
  Placeholder,
  // Geometry
  PathCommandType,
  MoveToCommand,
  LineToCommand,
  ArcToCommand,
  QuadBezierCommand,
  CubicBezierCommand,
  CloseCommand,
  PathCommand,
  GeometryPath,
  AdjustHandle,
  XYAdjustHandle,
  PolarAdjustHandle,
  PresetGeometry,
  CustomGeometry,
  GeometryGuide,
  ConnectionSite,
  TextRect,
  Geometry,
  // Shape properties
  ShapeProperties,
  GraphicFrameLocks,
  // Concrete shapes
  SpShape,
  ShapeStyle,
  StyleReference,
  FontReference,
  PicShape,
  BlipFillProperties,
  GrpShape,
  GroupShapeProperties,
  CxnShape,
  ConnectionTarget,
  GraphicFrame,
  GraphicContent,
  ContentPartShape,
  TableReference,
  ChartReference,
  DiagramContent,
  DiagramReference,
  OleReference,
  OleObjectFollowColorScheme,
  Shape,
} from "./shape";

// =============================================================================
// Table Types
// =============================================================================

export type {
  // Table structure
  Table,
  TableProperties,
  TableGrid,
  TableColumn,
  TableRow,
  TableCell,
  // Cell properties
  CellMargin,
  CellAnchor,
  CellHorzOverflow,
  CellVerticalType,
  TableCellProperties,
  CellBorders,
  // Table styles
  TableStyle,
  TablePartStyle,
  Cell3d,
  TableTextProperties,
} from "./table/types";

// =============================================================================
// Animation Types
// =============================================================================

export type {
  // Core types
  Timing,
  BuildEntry as AnimationBuildEntry,
  TemplateEffect,
  BuildType,
  ParaBuildType,
  TLTime,
  TLTimeAnimateValueTime,
  ChartBuildStep,
  DgmBuildStep,
  AnimationChartOnlyBuildType,
  AnimationChartBuildType,
  AnimationDgmOnlyBuildType,
  AnimationDgmBuildType,
  AnimationOleChartBuildType,
  ChartBuild,
  DgmBuild,
  OleChartBuild,
  GraphicBuild,
  // Time node types
  TimeNodeBase,
  ParallelTimeNode,
  SequenceTimeNode,
  ExclusiveTimeNode,
  AnimateBehavior,
  SetBehavior,
  AnimateEffectBehavior,
  AnimateMotionBehavior,
  AnimateRotationBehavior,
  AnimateScaleBehavior,
  AnimateColorBehavior,
  AnimateColorDirection,
  AnimateColorSpace,
  AnimateMotionOrigin,
  AnimateMotionPathEditMode,
  ChartSubelementType,
  CommandType,
  NextActionType,
  PreviousActionType,
  AudioBehavior,
  VideoBehavior,
  CommandBehavior,
  TimeNodeId,
  TimeNode,
  // Target types
  AnimationTarget,
  ShapeTarget,
  TextElementTarget,
  GraphicElementTarget,
  OleChartElementTarget,
  SlideTarget,
  SoundTarget,
  InkTarget,
  // Keyframe types
  Keyframe,
  AnimateValue,
  Point as AnimationPoint,
  Condition,
  ConditionEvent,
  TriggerEvent,
  TriggerRuntimeNode,
  // Enumerations
  TimeNodeFillType,
  FillBehavior,
  RestartBehavior,
  TimeNodeRestartType,
  TimeNodeSyncType,
  TimeNodeMasterRelation,
  TimeNodeType,
  PresetInfo,
  TimeNodePresetClassType,
  PresetClass,
  CalcMode,
  ValueType,
  AccumulateMode,
  OverrideMode,
  TransformType,
  AdditiveMode,
} from "./animation";

// =============================================================================
// Diagram Types
// =============================================================================

// =============================================================================
// Transition Types
// =============================================================================

export type {
  TransitionType,
  TransitionSound,
  TransitionCornerDirectionType,
  TransitionSideDirectionType,
  TransitionEightDirectionType,
  TransitionInOutDirectionType,
  TransitionSpeed,
  SlideTransition,
} from "./transition";

// =============================================================================
// View Types
// =============================================================================

export type {
  ViewScaleRatio,
  ViewScale,
  ViewOrigin,
  CommonViewProperties,
  Guide,
  GuideList,
  Direction,
  CommonSlideViewProperties,
  NormalViewPortion,
  NormalViewProperties,
  SplitterBarState,
  OutlineViewSlide,
  OutlineViewSlideList,
  OutlineViewProperties,
  NotesTextViewProperties,
  NotesViewProperties,
  SlideViewProperties,
  SorterViewProperties,
  GridSpacing,
  ViewProperties,
  ViewType,
} from "./view";

// =============================================================================
// Presentation Types
// =============================================================================

export type {
  CustomShow,
  SlideShowRange,
  BrowseShowProperties,
  KioskShowProperties,
  PresentShowProperties,
  ShowProperties,
  PresentationProperties,
  SlideSyncProperties,
  ModifyVerifier,
  PhotoAlbum,
  PhotoAlbumFrameShape,
  PhotoAlbumLayout,
  SmartTags,
  Presentation,
} from "./presentation/types";

// =============================================================================
// Print Types
// =============================================================================

export type {
  PrintColorMode,
  PrintWhat,
  PrintProperties,
} from "./print";

// =============================================================================
// Comment Types
// =============================================================================

export type {
  CommentAuthor,
  CommentAuthorList,
  CommentPosition,
  Comment,
  CommentList,
} from "./comment";

// =============================================================================
// Metadata Types
// =============================================================================

export type {
  CustomerData,
  ProgrammableTag,
  ProgrammableTagList,
} from "./metadata";

// =============================================================================
// Embedded Font Types
// =============================================================================

export type {
  EmbeddedFontReference,
  EmbeddedFontTypeface,
  EmbeddedFont,
} from "./embedded-font";

// =============================================================================
// Slide Types
// =============================================================================

export type {
  // Slide
  SlideSize,
  SlideSizeType,
  Background,
  SlideTiming,
  BuildEntry,
  AnimationSequence,
  Animation,
  Slide,
  // Slide layout
  SlideLayout,
  SlideLayoutType,
  SlideLayoutId,
  // Slide master
  SlideMaster,
  HandoutMaster,
  NotesMaster,
  // Slide indexing (pure domain type only; IndexTables is in parser/slide/shape-tree-indexer)
  SlideNodeType,
} from "./slide";

// =============================================================================
// Shape Utilities
// =============================================================================

export { isPlaceholder, getNonPlaceholderShapes } from "./shape-utils";

// =============================================================================
// Resource Resolution Types
// =============================================================================

export type {
  ResourceRelationshipResolver,
  ResourceResolverFn,
  ResourceResolver,
} from "./resource-resolver";

export {
  createEmptyResourceResolver,
  createEmptyRelationshipResolver,
  toResolverFn,
  toRelationshipResolver,
} from "./resource-resolver";
