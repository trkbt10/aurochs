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

export type {
  Brand,
  Pixels,
  Degrees,
  Percent,
  Points,
  EMU,
  RelationshipId,
  HexColor,
} from "./types";

export { px, deg, pct, pt, emu, rId, hexColor } from "./types";

// =============================================================================
// OPC Infrastructure Types
// =============================================================================

export type {
  ZipFile,
  ZipEntry,
  ResourceMap,
  PlaceholderTable,
} from "./opc";

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
// Resource Types
// =============================================================================

export type {
  ResourceId,
  ResourcePath,
  Hyperlink,
  HyperlinkSound,
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
  BlipCompression,
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
// Resolution Context Types (shared between parser and render)
// =============================================================================

export type {
  ColorScheme,
  ColorMap,
  ColorContext,
  FontSpec,
  FontScheme,
} from "./resolution";

export { resolveThemeFont } from "./resolution";

// =============================================================================
// Color Types
// =============================================================================

export type {
  // Color specifications
  ResolvedColor,
  SrgbColor,
  SchemeColor,
  SystemColor,
  PresetColor,
  HslColor,
  ColorTransform,
  ColorSpec,
  Color,
  // Fill types
  NoFill,
  SolidFill,
  GradientStop,
  LinearGradient,
  PathGradient,
  GradientFill,
  TileFlipMode,
  StretchFill,
  TileFill,
  BlipFill,
  PatternType,
  PatternFill,
  GroupFill,
  Fill,
  // Line types
  LineEnd,
  CustomDash,
  Line,
  // Color mapping
  ColorMapping,
  ColorMapOverride,
} from "./color";

export { color, PATTERN_PRESETS } from "./color";

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
  Scene3d,
  Camera3d,
  Rotation3d,
  LightRig,
  Backdrop3d,
  Shape3d,
  Bevel3d,
  BevelPresetType,
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
} from "./table";

// =============================================================================
// Chart Types
// =============================================================================

export type {
  // Chart types
  ChartType,
  BarDirection,
  BarGrouping,
  Grouping,
  ScatterStyle,
  RadarStyle,
  // Chart structure
  Chart,
  ChartTitle,
  Layout,
  ManualLayout,
  PlotArea,
  // Chart series
  ChartSeriesBase,
  AreaChartSeries,
  BarChartSeries,
  LineChartSeries,
  PieChartSeries,
  OfPieChartSeries,
  ScatterChartSeries,
  RadarChartSeries,
  BubbleChartSeries,
  StockChartSeries,
  SurfaceChartSeries,
  ChartSeries,
  // Individual series
  SeriesText,
  AreaSeries,
  BarSeries,
  LineSeries,
  PieSeries,
  ScatterSeries,
  RadarSeries,
  BubbleSeries,
  SurfaceSeries,
  // Data types
  DataReference,
  NumericReference,
  StringReference,
  NumericCache,
  StringCache,
  NumericLiteral,
  StringLiteral,
  NumericPoint,
  StringPoint,
  DataPoint,
  // Chart components
  Marker,
  DataLabel,
  DataLabels,
  ChartLines,
  UpDownBars,
  Legend,
  DataTable,
  View3D,
  ChartSurface,
  PictureOptions,
  PictureFormat,
  BandFormat,
  PivotSource,
  PivotFormat,
  PivotFormats,
  ChartProtection,
  HeaderFooter,
  PageMargins,
  PageSetup,
  PrintSettings,
  // Axis types
  AxisType,
  AxisPosition,
  AxisOrientation,
  TickMark,
  TickLabelPosition,
  CrossBetween,
  Crosses,
  AxisBase,
  CategoryAxis,
  ValueAxis,
  DateAxis,
  SeriesAxis,
  DisplayUnits,
  Axis,
  // Chart shape properties
  ChartShapeProperties,
  ChartEffects,
} from "./chart";

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

export type {
  DiagramCategory,
  DiagramVariable,
  DiagramAnimLvlStr,
  DiagramAnimOneStr,
  DiagramArrowheadStyle,
  DiagramAutoTextRotation,
  DiagramAxisType,
  DiagramAxisTypes,
  DiagramBendPoint,
  DiagramBooleans,
  DiagramBoolOperator,
  DiagramBreakpoint,
  DiagramCenterShapeMapping,
  DiagramChildAlignment,
  DiagramChildDirection,
  DiagramChildOrderType,
  DiagramClrAppMethod,
  DiagramConnectorDimension,
  DiagramConnectorPoint,
  DiagramConnectorRouting,
  DiagramConstraintRelationship,
  DiagramConstraintType,
  DiagramContinueDirection,
  DiagramCxnType,
  DiagramHorizontalAlignment,
  DiagramNodeHorizontalAlignment,
  DiagramNodeVerticalAlignment,
  DiagramOffset,
  DiagramTextAlignment,
  DiagramDirection,
  DiagramElementType,
  DiagramElementTypes,
  DiagramFallbackDimension,
  DiagramFlowDirection,
  DiagramLinearDirection,
  DiagramVariableType,
  DiagramFunctionArgument,
  DiagramFunctionOperator,
  DiagramFunctionType,
  DiagramHierBranchStyle,
  DiagramResizeHandlesStr,
  DiagramFunctionValue,
  DiagramGrowDirection,
  DiagramHierarchyAlignment,
  DiagramHueDir,
  DiagramIndex1,
  DiagramInts,
  DiagramModelId,
  DiagramNodeCount,
  DiagramUnsignedInts,
  DiagramVariableList,
  DiagramExtension,
  DiagramDataModelExtension,
  DiagramDataModel,
  DiagramPoint,
  DiagramConnection,
  DiagramBackground,
  DiagramWhole,
  DiagramPropertySet,
  DiagramLayoutDefinition,
  DiagramLayoutDefinitionHeader,
  DiagramLayoutDefinitionHeaderList,
  DiagramLayoutNode,
  DiagramLayoutContent,
  DiagramAlgorithmType,
  DiagramAlgorithm,
  DiagramAlgorithmParam,
  DiagramParameterId,
  DiagramParameterValue,
  DiagramPyramidAccentPosition,
  DiagramPyramidAccentTextMargin,
  DiagramRotationPath,
  DiagramSecondaryChildAlignment,
  DiagramSecondaryLinearDirection,
  DiagramStartingElement,
  DiagramTextAnchorHorizontal,
  DiagramTextAnchorVertical,
  DiagramTextBlockDirection,
  DiagramTextDirection,
  DiagramVerticalAlignment,
  DiagramPrSetCustVal,
  DiagramOutputShapeType,
  DiagramLayoutShapeType,
  DiagramLayoutShape,
  DiagramAdjust,
  DiagramPresentationOf,
  DiagramConstraint,
  DiagramRule,
  DiagramForEach,
  DiagramChoose,
  DiagramIf,
  DiagramElse,
  DiagramStyleDefinition,
  DiagramStyleDefinitionHeader,
  DiagramStyleDefinitionHeaderList,
  DiagramStyleLabel,
  DiagramColorsDefinition,
  DiagramColorsDefinitionHeader,
  DiagramColorsDefinitionHeaderList,
  DiagramColorStyleLabel,
  DiagramColorList,
} from "./diagram";

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
} from "./presentation";

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
} from "./slide";
