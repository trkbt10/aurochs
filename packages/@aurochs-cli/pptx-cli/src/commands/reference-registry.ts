/**
 * @file Exhaustive field registry for PPTX reference documentation verification.
 *
 * Each exported constant maps every field of a spec type to the documentation
 * section name in pptx.md where it must appear. The `satisfies Record<keyof T, string>`
 * pattern ensures that adding a field to any type causes a compile error here,
 * forcing the developer to update both the registry and the documentation.
 */

import type {
  // Shape types
  PlaceholderSpec,
  ShapeSpec,
  CustomGeometrySpec,
  GeometryPathSpec,
  MoveToSpec,
  LineToSpec,
  ArcToSpec,
  QuadBezierToSpec,
  CubicBezierToSpec,
  CloseSpec,
  // Image types
  BlipEffectSpec,
  ImageSpec,
  MediaEmbedSpec,
  // Connector / Group types
  ConnectorSpec,
  GroupSpec,
  // Table types
  TableSpec,
  TableCellSpec,
  TableTextBodySpec,
  TableParagraphSpec,
  TableTextRunSpec,
  TableUpdateSpec,
  TableCellUpdateSpec,
  TableRowAddSpec,
  TableColumnAddSpec,
  // Chart types
  ChartAddSpec,
  ChartDataSpec,
  ChartSeriesSpec,
  ChartOptionsSpec,
  ChartUpdateSpec,
  ChartTransformSpec,
  // Background types
  BackgroundSolidSpec,
  BackgroundGradientSpec,
  BackgroundImageSpec,
  // Transition / Animation types
  SlideTransitionSpec,
  AnimationSpec,
  // Comment / Notes types
  CommentSpec,
  NotesSpec,
  // SmartArt types
  DiagramNodeTextUpdateSpec,
  DiagramNodeAddSpec,
  DiagramNodeRemoveSpec,
  DiagramConnectionSpec,
  SmartArtUpdateSpec,
  // Slide modification
  SlideModSpec,
  // Build types
  BuildSpec,
  BuildData,
  // Theme types
  ThemeEditSpec,
  ThemeFontSpec,
  ThemeFontSchemeEditSpec,
  // Slide operations
  SlideAddSpec,
  SlideRemoveSpec,
  SlideReorderSpec,
  SlideDuplicateSpec,
  // Patch types
  TextReplacePatch,
  PptxPatchSpec,
  PptxPatchData,
} from "@aurochs-builder/pptx";

import type {
  TestCaseSpec,
  SlideExpectation,
  ExpectedShape,
  ExpectedTable,
  Assertion,
} from "./verify";

// ---------------------------------------------------------------------------
// Shape types
// ---------------------------------------------------------------------------

export const PLACEHOLDER_SPEC_FIELDS = {
  type: "Placeholder spec",
  idx: "Placeholder spec",
} satisfies Record<keyof PlaceholderSpec, string>;

export const SHAPE_SPEC_FIELDS = {
  type: "addShapes",
  x: "addShapes",
  y: "addShapes",
  width: "addShapes",
  height: "addShapes",
  placeholder: "addShapes",
  customGeometry: "addShapes",
  text: "addShapes",
  textBody: "addShapes",
  rotation: "addShapes",
  flipH: "addShapes",
  flipV: "addShapes",
  fill: "addShapes",
  lineColor: "addShapes",
  lineWidth: "addShapes",
  lineDash: "addShapes",
  lineCap: "addShapes",
  lineJoin: "addShapes",
  lineCompound: "addShapes",
  lineHeadEnd: "addShapes",
  lineTailEnd: "addShapes",
  effects: "addShapes",
  shape3d: "addShapes",
} satisfies Record<keyof ShapeSpec, string>;

export const CUSTOM_GEOMETRY_SPEC_FIELDS = {
  paths: "Custom geometry",
} satisfies Record<keyof CustomGeometrySpec, string>;

export const GEOMETRY_PATH_SPEC_FIELDS = {
  width: "Custom geometry",
  height: "Custom geometry",
  fill: "Custom geometry",
  stroke: "Custom geometry",
  extrusionOk: "Custom geometry",
  commands: "Custom geometry",
} satisfies Record<keyof GeometryPathSpec, string>;

// PathCommandSpec union variants
export const MOVE_TO_SPEC_FIELDS = {
  type: "Custom geometry",
  x: "Custom geometry",
  y: "Custom geometry",
} satisfies Record<keyof MoveToSpec, string>;

export const LINE_TO_SPEC_FIELDS = {
  type: "Custom geometry",
  x: "Custom geometry",
  y: "Custom geometry",
} satisfies Record<keyof LineToSpec, string>;

export const ARC_TO_SPEC_FIELDS = {
  type: "Custom geometry",
  widthRadius: "Custom geometry",
  heightRadius: "Custom geometry",
  startAngle: "Custom geometry",
  swingAngle: "Custom geometry",
} satisfies Record<keyof ArcToSpec, string>;

export const QUAD_BEZIER_TO_SPEC_FIELDS = {
  type: "Custom geometry",
  control: "Custom geometry",
  end: "Custom geometry",
} satisfies Record<keyof QuadBezierToSpec, string>;

export const CUBIC_BEZIER_TO_SPEC_FIELDS = {
  type: "Custom geometry",
  control1: "Custom geometry",
  control2: "Custom geometry",
  end: "Custom geometry",
} satisfies Record<keyof CubicBezierToSpec, string>;

export const CLOSE_SPEC_FIELDS = {
  type: "Custom geometry",
} satisfies Record<keyof CloseSpec, string>;

// ---------------------------------------------------------------------------
// Image types
// ---------------------------------------------------------------------------

export const BLIP_EFFECT_SPEC_FIELDS = {
  alphaBiLevel: "Blip effects",
  alphaCeiling: "Blip effects",
  alphaFloor: "Blip effects",
  alphaInv: "Blip effects",
  alphaMod: "Blip effects",
  grayscale: "Blip effects",
  duotone: "Blip effects",
  tint: "Blip effects",
  luminance: "Blip effects",
  hsl: "Blip effects",
  blur: "Blip effects",
  alphaModFix: "Blip effects",
  alphaRepl: "Blip effects",
  biLevel: "Blip effects",
  colorChange: "Blip effects",
  colorReplace: "Blip effects",
} satisfies Record<keyof BlipEffectSpec, string>;

export const IMAGE_SPEC_FIELDS = {
  type: "addImages",
  path: "addImages",
  data: "addImages",
  mimeType: "addImages",
  x: "addImages",
  y: "addImages",
  width: "addImages",
  height: "addImages",
  rotation: "addImages",
  flipH: "addImages",
  flipV: "addImages",
  effects: "addImages",
  media: "addImages",
} satisfies Record<keyof ImageSpec, string>;

export const MEDIA_EMBED_SPEC_FIELDS = {
  type: "Media embedding",
  path: "Media embedding",
  data: "Media embedding",
  mimeType: "Media embedding",
} satisfies Record<keyof MediaEmbedSpec, string>;

// ---------------------------------------------------------------------------
// Connector / Group types
// ---------------------------------------------------------------------------

export const CONNECTOR_SPEC_FIELDS = {
  type: "addConnectors",
  preset: "addConnectors",
  x: "addConnectors",
  y: "addConnectors",
  width: "addConnectors",
  height: "addConnectors",
  rotation: "addConnectors",
  flipH: "addConnectors",
  flipV: "addConnectors",
  startShapeId: "addConnectors",
  startSiteIndex: "addConnectors",
  endShapeId: "addConnectors",
  endSiteIndex: "addConnectors",
  lineColor: "addConnectors",
  lineWidth: "addConnectors",
} satisfies Record<keyof ConnectorSpec, string>;

export const GROUP_SPEC_FIELDS = {
  type: "addGroups",
  x: "addGroups",
  y: "addGroups",
  width: "addGroups",
  height: "addGroups",
  rotation: "addGroups",
  flipH: "addGroups",
  flipV: "addGroups",
  children: "addGroups",
  fill: "addGroups",
} satisfies Record<keyof GroupSpec, string>;

// ---------------------------------------------------------------------------
// Table types
// ---------------------------------------------------------------------------

export const TABLE_SPEC_FIELDS = {
  type: "addTables",
  x: "addTables",
  y: "addTables",
  width: "addTables",
  height: "addTables",
  rows: "addTables",
} satisfies Record<keyof TableSpec, string>;

export const TABLE_CELL_SPEC_FIELDS = {
  text: "addTables",
  content: "addTables",
  fill: "addTables",
  borderColor: "addTables",
  borderWidth: "addTables",
  verticalAlignment: "addTables",
  marginLeft: "addTables",
  marginRight: "addTables",
  marginTop: "addTables",
  marginBottom: "addTables",
  gridSpan: "addTables",
  rowSpan: "addTables",
} satisfies Record<keyof TableCellSpec, string>;

export const TABLE_TEXT_BODY_SPEC_FIELDS = {
  paragraphs: "addTables",
} satisfies Record<keyof TableTextBodySpec, string>;

export const TABLE_PARAGRAPH_SPEC_FIELDS = {
  runs: "addTables",
  alignment: "addTables",
} satisfies Record<keyof TableParagraphSpec, string>;

export const TABLE_TEXT_RUN_SPEC_FIELDS = {
  text: "addTables",
  bold: "addTables",
  italic: "addTables",
  fontSize: "addTables",
  fontFamily: "addTables",
  color: "addTables",
} satisfies Record<keyof TableTextRunSpec, string>;

export const TABLE_UPDATE_SPEC_FIELDS = {
  shapeId: "updateTables",
  updateCells: "updateTables",
  addRows: "updateTables",
  removeRows: "updateTables",
  addColumns: "updateTables",
  removeColumns: "updateTables",
  styleId: "updateTables",
} satisfies Record<keyof TableUpdateSpec, string>;

export const TABLE_CELL_UPDATE_SPEC_FIELDS = {
  row: "updateTables",
  col: "updateTables",
  content: "updateTables",
} satisfies Record<keyof TableCellUpdateSpec, string>;

export const TABLE_ROW_ADD_SPEC_FIELDS = {
  height: "updateTables",
  cells: "updateTables",
  position: "updateTables",
} satisfies Record<keyof TableRowAddSpec, string>;

export const TABLE_COLUMN_ADD_SPEC_FIELDS = {
  width: "updateTables",
  position: "updateTables",
} satisfies Record<keyof TableColumnAddSpec, string>;

// ---------------------------------------------------------------------------
// Chart types
// ---------------------------------------------------------------------------

export const CHART_ADD_SPEC_FIELDS = {
  chartType: "addCharts",
  x: "addCharts",
  y: "addCharts",
  width: "addCharts",
  height: "addCharts",
  title: "addCharts",
  data: "addCharts",
  styleId: "addCharts",
  options: "addCharts",
} satisfies Record<keyof ChartAddSpec, string>;

export const CHART_DATA_SPEC_FIELDS = {
  categories: "addCharts",
  series: "addCharts",
} satisfies Record<keyof ChartDataSpec, string>;

export const CHART_SERIES_SPEC_FIELDS = {
  name: "addCharts",
  values: "addCharts",
} satisfies Record<keyof ChartSeriesSpec, string>;

export const CHART_OPTIONS_SPEC_FIELDS = {
  barDirection: "Chart options",
  barGrouping: "Chart options",
  grouping: "Chart options",
  scatterStyle: "Chart options",
  radarStyle: "Chart options",
  holeSize: "Chart options",
  ofPieType: "Chart options",
  bubbleScale: "Chart options",
  sizeRepresents: "Chart options",
  wireframe: "Chart options",
} satisfies Record<keyof ChartOptionsSpec, string>;

export const CHART_UPDATE_SPEC_FIELDS = {
  resourceId: "updateCharts",
  title: "updateCharts",
  data: "updateCharts",
  styleId: "updateCharts",
  transform: "updateCharts",
} satisfies Record<keyof ChartUpdateSpec, string>;

export const CHART_TRANSFORM_SPEC_FIELDS = {
  x: "updateCharts",
  y: "updateCharts",
  width: "updateCharts",
  height: "updateCharts",
  rotation: "updateCharts",
  flipH: "updateCharts",
  flipV: "updateCharts",
} satisfies Record<keyof ChartTransformSpec, string>;

// ---------------------------------------------------------------------------
// Background types (union variants)
// ---------------------------------------------------------------------------

export const BACKGROUND_SOLID_SPEC_FIELDS = {
  type: "Background",
  color: "Background",
} satisfies Record<keyof BackgroundSolidSpec, string>;

export const BACKGROUND_GRADIENT_SPEC_FIELDS = {
  type: "Background",
  stops: "Background",
  angle: "Background",
} satisfies Record<keyof BackgroundGradientSpec, string>;

export const BACKGROUND_IMAGE_SPEC_FIELDS = {
  type: "Background",
  path: "Background",
  data: "Background",
  mimeType: "Background",
  mode: "Background",
} satisfies Record<keyof BackgroundImageSpec, string>;

// ---------------------------------------------------------------------------
// Transition / Animation types
// ---------------------------------------------------------------------------

export const SLIDE_TRANSITION_SPEC_FIELDS = {
  type: "Transition",
  duration: "Transition",
  advanceOnClick: "Transition",
  advanceAfter: "Transition",
  direction: "Transition",
  orientation: "Transition",
  spokes: "Transition",
  inOutDirection: "Transition",
} satisfies Record<keyof SlideTransitionSpec, string>;

export const ANIMATION_SPEC_FIELDS = {
  shapeId: "addAnimations",
  class: "addAnimations",
  effect: "addAnimations",
  trigger: "addAnimations",
  duration: "addAnimations",
  delay: "addAnimations",
  direction: "addAnimations",
  repeat: "addAnimations",
  autoReverse: "addAnimations",
} satisfies Record<keyof AnimationSpec, string>;

// ---------------------------------------------------------------------------
// Comment / Notes types
// ---------------------------------------------------------------------------

export const COMMENT_SPEC_FIELDS = {
  authorName: "addComments",
  authorInitials: "addComments",
  text: "addComments",
  x: "addComments",
  y: "addComments",
} satisfies Record<keyof CommentSpec, string>;

export const NOTES_SPEC_FIELDS = {
  text: "Speaker notes",
} satisfies Record<keyof NotesSpec, string>;

// ---------------------------------------------------------------------------
// SmartArt / Diagram types (union variants)
// ---------------------------------------------------------------------------

export const DIAGRAM_NODE_TEXT_UPDATE_SPEC_FIELDS = {
  type: "updateSmartArt",
  nodeId: "updateSmartArt",
  text: "updateSmartArt",
} satisfies Record<keyof DiagramNodeTextUpdateSpec, string>;

export const DIAGRAM_NODE_ADD_SPEC_FIELDS = {
  type: "updateSmartArt",
  parentId: "updateSmartArt",
  nodeId: "updateSmartArt",
  text: "updateSmartArt",
} satisfies Record<keyof DiagramNodeAddSpec, string>;

export const DIAGRAM_NODE_REMOVE_SPEC_FIELDS = {
  type: "updateSmartArt",
  nodeId: "updateSmartArt",
} satisfies Record<keyof DiagramNodeRemoveSpec, string>;

export const DIAGRAM_CONNECTION_SPEC_FIELDS = {
  type: "updateSmartArt",
  srcId: "updateSmartArt",
  destId: "updateSmartArt",
  connectionType: "updateSmartArt",
} satisfies Record<keyof DiagramConnectionSpec, string>;

export const SMART_ART_UPDATE_SPEC_FIELDS = {
  resourceId: "updateSmartArt",
  changes: "updateSmartArt",
} satisfies Record<keyof SmartArtUpdateSpec, string>;

// ---------------------------------------------------------------------------
// Slide modification
// ---------------------------------------------------------------------------

export const SLIDE_MOD_SPEC_FIELDS = {
  slideNumber: "Slide modification",
  background: "Slide modification",
  transition: "Slide modification",
  addCharts: "Slide modification",
  updateCharts: "Slide modification",
  addShapes: "Slide modification",
  addImages: "Slide modification",
  addConnectors: "Slide modification",
  addGroups: "Slide modification",
  addTables: "Slide modification",
  updateTables: "Slide modification",
  addAnimations: "Slide modification",
  addComments: "Slide modification",
  speakerNotes: "Slide modification",
  updateSmartArt: "Slide modification",
} satisfies Record<keyof SlideModSpec, string>;

// ---------------------------------------------------------------------------
// Build types
// ---------------------------------------------------------------------------

export const BUILD_SPEC_FIELDS = {
  template: "Build spec",
  output: "Build spec",
  theme: "Build spec",
  addSlides: "Build spec",
  duplicateSlides: "Build spec",
  reorderSlides: "Build spec",
  removeSlides: "Build spec",
  slides: "Build spec",
} satisfies Record<keyof BuildSpec, string>;

export const BUILD_DATA_FIELDS = {
  outputPath: "Build spec",
  slideCount: "Build spec",
  shapesAdded: "Build spec",
} satisfies Record<keyof BuildData, string>;

// ---------------------------------------------------------------------------
// Theme types
// ---------------------------------------------------------------------------

export const THEME_EDIT_SPEC_FIELDS = {
  path: "Theme editing",
  colorScheme: "Theme editing",
  fontScheme: "Theme editing",
} satisfies Record<keyof ThemeEditSpec, string>;

export const THEME_FONT_SPEC_FIELDS = {
  latin: "Theme editing",
  eastAsian: "Theme editing",
  complexScript: "Theme editing",
} satisfies Record<keyof ThemeFontSpec, string>;

export const THEME_FONT_SCHEME_EDIT_SPEC_FIELDS = {
  majorFont: "Theme editing",
  minorFont: "Theme editing",
} satisfies Record<keyof ThemeFontSchemeEditSpec, string>;

// ---------------------------------------------------------------------------
// Slide operations
// ---------------------------------------------------------------------------

export const SLIDE_ADD_SPEC_FIELDS = {
  layoutPath: "Slide operations",
  insertAt: "Slide operations",
} satisfies Record<keyof SlideAddSpec, string>;

export const SLIDE_REMOVE_SPEC_FIELDS = {
  slideNumber: "Slide operations",
} satisfies Record<keyof SlideRemoveSpec, string>;

export const SLIDE_REORDER_SPEC_FIELDS = {
  from: "Slide operations",
  to: "Slide operations",
} satisfies Record<keyof SlideReorderSpec, string>;

export const SLIDE_DUPLICATE_SPEC_FIELDS = {
  sourceSlideNumber: "Slide operations",
  insertAt: "Slide operations",
} satisfies Record<keyof SlideDuplicateSpec, string>;

// ---------------------------------------------------------------------------
// Patch types
// ---------------------------------------------------------------------------

export const TEXT_REPLACE_PATCH_FIELDS = {
  type: "Patch spec",
  search: "Patch spec",
  replace: "Patch spec",
  replaceAll: "Patch spec",
  slides: "Patch spec",
} satisfies Record<keyof TextReplacePatch, string>;

export const PPTX_PATCH_SPEC_FIELDS = {
  source: "Patch spec",
  output: "Patch spec",
  patches: "Patch spec",
} satisfies Record<keyof PptxPatchSpec, string>;

export const PPTX_PATCH_DATA_FIELDS = {
  sourcePath: "Patch spec",
  outputPath: "Patch spec",
  patchCount: "Patch spec",
  slidesModified: "Patch spec",
  textReplacements: "Patch spec",
} satisfies Record<keyof PptxPatchData, string>;

// ---------------------------------------------------------------------------
// Verify types
// ---------------------------------------------------------------------------

export const TEST_CASE_SPEC_FIELDS = {
  name: "Verify spec",
  description: "Verify spec",
  tags: "Verify spec",
  input: "Verify spec",
  expected: "Verify spec",
} satisfies Record<keyof TestCaseSpec, string>;

export const SLIDE_EXPECTATION_FIELDS = {
  slideNumber: "Verify spec",
  shapeCount: "Verify spec",
  shapes: "Verify spec",
} satisfies Record<keyof SlideExpectation, string>;

export const EXPECTED_SHAPE_FIELDS = {
  index: "Verify spec",
  type: "Verify spec",
  bounds: "Verify spec",
  rotation: "Verify spec",
  flipH: "Verify spec",
  flipV: "Verify spec",
  geometry: "Verify spec",
  fill: "Verify spec",
  line: "Verify spec",
  effects: "Verify spec",
  shape3d: "Verify spec",
  text: "Verify spec",
  content: "Verify spec",
} satisfies Record<keyof ExpectedShape, string>;

export const EXPECTED_TABLE_FIELDS = {
  rows: "Verify spec",
  cols: "Verify spec",
  cells: "Verify spec",
} satisfies Record<keyof ExpectedTable, string>;

export const ASSERTION_FIELDS = {
  path: "Verify spec",
  expected: "Verify spec",
  actual: "Verify spec",
  passed: "Verify spec",
} satisfies Record<keyof Assertion, string>;

// ---------------------------------------------------------------------------
// CLI commands
// ---------------------------------------------------------------------------

export const CLI_COMMANDS = [
  "info",
  "list",
  "show",
  "extract",
  "theme",
  "build",
  "patch",
  "verify",
  "preview",
  "inventory",
  "tables",
  "images",
  "diff",
] as const;

// ---------------------------------------------------------------------------
// All registries (for iteration in tests)
// ---------------------------------------------------------------------------

export const ALL_REGISTRIES = [
  // Shape types
  ["PlaceholderSpec", PLACEHOLDER_SPEC_FIELDS],
  ["ShapeSpec", SHAPE_SPEC_FIELDS],
  ["CustomGeometrySpec", CUSTOM_GEOMETRY_SPEC_FIELDS],
  ["GeometryPathSpec", GEOMETRY_PATH_SPEC_FIELDS],
  ["MoveToSpec", MOVE_TO_SPEC_FIELDS],
  ["LineToSpec", LINE_TO_SPEC_FIELDS],
  ["ArcToSpec", ARC_TO_SPEC_FIELDS],
  ["QuadBezierToSpec", QUAD_BEZIER_TO_SPEC_FIELDS],
  ["CubicBezierToSpec", CUBIC_BEZIER_TO_SPEC_FIELDS],
  ["CloseSpec", CLOSE_SPEC_FIELDS],
  // Image types
  ["BlipEffectSpec", BLIP_EFFECT_SPEC_FIELDS],
  ["ImageSpec", IMAGE_SPEC_FIELDS],
  ["MediaEmbedSpec", MEDIA_EMBED_SPEC_FIELDS],
  // Connector / Group
  ["ConnectorSpec", CONNECTOR_SPEC_FIELDS],
  ["GroupSpec", GROUP_SPEC_FIELDS],
  // Table types
  ["TableSpec", TABLE_SPEC_FIELDS],
  ["TableCellSpec", TABLE_CELL_SPEC_FIELDS],
  ["TableTextBodySpec", TABLE_TEXT_BODY_SPEC_FIELDS],
  ["TableParagraphSpec", TABLE_PARAGRAPH_SPEC_FIELDS],
  ["TableTextRunSpec", TABLE_TEXT_RUN_SPEC_FIELDS],
  ["TableUpdateSpec", TABLE_UPDATE_SPEC_FIELDS],
  ["TableCellUpdateSpec", TABLE_CELL_UPDATE_SPEC_FIELDS],
  ["TableRowAddSpec", TABLE_ROW_ADD_SPEC_FIELDS],
  ["TableColumnAddSpec", TABLE_COLUMN_ADD_SPEC_FIELDS],
  // Chart types
  ["ChartAddSpec", CHART_ADD_SPEC_FIELDS],
  ["ChartDataSpec", CHART_DATA_SPEC_FIELDS],
  ["ChartSeriesSpec", CHART_SERIES_SPEC_FIELDS],
  ["ChartOptionsSpec", CHART_OPTIONS_SPEC_FIELDS],
  ["ChartUpdateSpec", CHART_UPDATE_SPEC_FIELDS],
  ["ChartTransformSpec", CHART_TRANSFORM_SPEC_FIELDS],
  // Background variants
  ["BackgroundSolidSpec", BACKGROUND_SOLID_SPEC_FIELDS],
  ["BackgroundGradientSpec", BACKGROUND_GRADIENT_SPEC_FIELDS],
  ["BackgroundImageSpec", BACKGROUND_IMAGE_SPEC_FIELDS],
  // Transition / Animation
  ["SlideTransitionSpec", SLIDE_TRANSITION_SPEC_FIELDS],
  ["AnimationSpec", ANIMATION_SPEC_FIELDS],
  // Comment / Notes
  ["CommentSpec", COMMENT_SPEC_FIELDS],
  ["NotesSpec", NOTES_SPEC_FIELDS],
  // SmartArt / Diagram variants
  ["DiagramNodeTextUpdateSpec", DIAGRAM_NODE_TEXT_UPDATE_SPEC_FIELDS],
  ["DiagramNodeAddSpec", DIAGRAM_NODE_ADD_SPEC_FIELDS],
  ["DiagramNodeRemoveSpec", DIAGRAM_NODE_REMOVE_SPEC_FIELDS],
  ["DiagramConnectionSpec", DIAGRAM_CONNECTION_SPEC_FIELDS],
  ["SmartArtUpdateSpec", SMART_ART_UPDATE_SPEC_FIELDS],
  // Slide modification
  ["SlideModSpec", SLIDE_MOD_SPEC_FIELDS],
  // Build
  ["BuildSpec", BUILD_SPEC_FIELDS],
  ["BuildData", BUILD_DATA_FIELDS],
  // Theme
  ["ThemeEditSpec", THEME_EDIT_SPEC_FIELDS],
  ["ThemeFontSpec", THEME_FONT_SPEC_FIELDS],
  ["ThemeFontSchemeEditSpec", THEME_FONT_SCHEME_EDIT_SPEC_FIELDS],
  // Slide operations
  ["SlideAddSpec", SLIDE_ADD_SPEC_FIELDS],
  ["SlideRemoveSpec", SLIDE_REMOVE_SPEC_FIELDS],
  ["SlideReorderSpec", SLIDE_REORDER_SPEC_FIELDS],
  ["SlideDuplicateSpec", SLIDE_DUPLICATE_SPEC_FIELDS],
  // Patch
  ["TextReplacePatch", TEXT_REPLACE_PATCH_FIELDS],
  ["PptxPatchSpec", PPTX_PATCH_SPEC_FIELDS],
  ["PptxPatchData", PPTX_PATCH_DATA_FIELDS],
  // Verify
  ["TestCaseSpec", TEST_CASE_SPEC_FIELDS],
  ["SlideExpectation", SLIDE_EXPECTATION_FIELDS],
  ["ExpectedShape", EXPECTED_SHAPE_FIELDS],
  ["ExpectedTable", EXPECTED_TABLE_FIELDS],
  ["Assertion", ASSERTION_FIELDS],
] as const;
