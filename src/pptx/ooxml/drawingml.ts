/**
 * @file DrawingML (a:) namespace element types
 *
 * DrawingML is the core drawing specification used across Office documents.
 * It defines text, shapes, transforms, and styling elements.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 * @see src/pptx/parser/simplify.ts - XML simplification process
 */

import type { OoxmlElement, OoxmlValElement, OoxmlChild, OoxmlTextElement } from "./base";
import type { ColorContainerNode, SolidFillElement } from "./color";


// =============================================================================
// Text Content Elements
// =============================================================================

/**
 * Text run element (a:r) - contains formatted text.
 *
 * @example
 * ```xml
 * <a:r>
 *   <a:rPr lang="en-US" sz="1800" b="1"/>
 *   <a:t>Hello World</a:t>
 * </a:r>
 * ```
 */
export type TextRunElement = OoxmlElement & {
  /** Run properties - formatting */
  "a:rPr"?: RunPropertiesElement;
  /** Text content */
  "a:t"?: OoxmlTextElement | string;
};

/**
 * Run properties element (a:rPr) - text formatting.
 *
 * @example
 * ```xml
 * <a:rPr lang="en-US" sz="1800" b="1" i="0" u="none">
 *   <a:solidFill>...</a:solidFill>
 *   <a:latin typeface="Arial"/>
 * </a:rPr>
 * ```
 */
export type RunPropertiesAttrs = {
  /** Language code */
  lang?: string;
  /** Alternative language */
  altLang?: string;
  /** Font size in hundredths of a point (e.g., 1800 = 18pt) */
  sz?: string;
  /** Bold: "1" or "0" */
  b?: string;
  /** Italic: "1" or "0" */
  i?: string;
  /** Underline style */
  u?: string;
  /** Strikethrough style */
  strike?: string;
  /** Kerning */
  kern?: string;
  /** Capitalization */
  cap?: string;
  /** Spacing between characters */
  spc?: string;
  /** Baseline offset for superscript/subscript */
  baseline?: string;
  /** No proofing flag */
  noProof?: string;
  /** Dirty flag (needs spell check) */
  dirty?: string;
  /** Error flag */
  err?: string;
  /** Smart tag clean flag */
  smtClean?: string;
  /** Smart tag ID */
  smtId?: string;
  /** Bookmark link target */
  bmk?: string;
};

export type RunPropertiesElement = OoxmlElement<RunPropertiesAttrs> & {
  /** Fill color */
  "a:solidFill"?: SolidFillElement;
  /** Latin font */
  "a:latin"?: FontElement;
  /** East Asian font */
  "a:ea"?: FontElement;
  /** Complex script font */
  "a:cs"?: FontElement;
  /** Symbol font */
  "a:sym"?: FontElement;
  /** Highlight color */
  "a:highlight"?: ColorContainerNode;
  /** Hyperlink click action */
  "a:hlinkClick"?: HyperlinkElement;
};

/**
 * Font reference element.
 *
 * @example
 * ```xml
 * <a:latin typeface="Arial" pitchFamily="34" charset="0"/>
 * <a:latin typeface="+mn-lt"/>  <!-- Theme minor font -->
 * ```
 */
export type FontAttrs = {
  /** Font name or theme reference (+mj-lt, +mn-lt, etc.) */
  typeface?: string;
  /** Pitch and family */
  pitchFamily?: string;
  /** Character set */
  charset?: string;
  /** Panose number */
  panose?: string;
};

export type FontElement = OoxmlElement<FontAttrs>;

/**
 * Hyperlink element.
 */
export type HyperlinkAttrs = {
  "r:id"?: string;
  invalidUrl?: string;
  action?: string;
  tgtFrame?: string;
  tooltip?: string;
  history?: string;
  highlightClick?: string;
  endSnd?: string;
};

export type HyperlinkElement = OoxmlElement<HyperlinkAttrs>;

/**
 * Paragraph element (a:p).
 *
 * @example
 * ```xml
 * <a:p>
 *   <a:pPr lvl="0" algn="l"/>
 *   <a:r>...</a:r>
 *   <a:endParaRPr lang="en-US"/>
 * </a:p>
 * ```
 */
export type ParagraphElement = OoxmlElement & {
  /** Paragraph properties */
  "a:pPr"?: ParagraphPropertiesElement;
  /** Text runs */
  "a:r"?: OoxmlChild<TextRunElement>;
  /** Field elements (date, slide number, etc.) */
  "a:fld"?: OoxmlChild<FieldElement>;
  /** Line breaks */
  "a:br"?: OoxmlChild<OoxmlElement>;
  /** End paragraph run properties */
  "a:endParaRPr"?: RunPropertiesElement;
};

/**
 * Paragraph properties (a:pPr).
 */
export type ParagraphPropertiesAttrs = {
  /** Paragraph level (0-8) */
  lvl?: string;
  /** Alignment: l, ctr, r, just, justLow, dist, thaiDist */
  algn?: string;
  /** Default tab size */
  defTabSz?: string;
  /** Right-to-left */
  rtl?: string;
  /** East Asian line break */
  eaLnBrk?: string;
  /** Font alignment */
  fontAlgn?: string;
  /** Latin line break */
  latinLnBrk?: string;
  /** Hanging punctuation */
  hangingPunct?: string;
  /** Left margin in EMU */
  marL?: string;
  /** Right margin in EMU */
  marR?: string;
  /** Indent in EMU */
  indent?: string;
};

export type ParagraphPropertiesElement = OoxmlElement<ParagraphPropertiesAttrs> & {
  /** Line spacing */
  "a:lnSpc"?: SpacingElement;
  /** Space before paragraph */
  "a:spcBef"?: SpacingElement;
  /** Space after paragraph */
  "a:spcAft"?: SpacingElement;
  /** Bullet character */
  "a:buChar"?: BulletCharElement;
  /** Bullet auto number */
  "a:buAutoNum"?: BulletAutoNumElement;
  /** Bullet image */
  "a:buBlip"?: OoxmlElement;
  /** Bullet color */
  "a:buClr"?: ColorContainerNode;
  /** Bullet size (generic) */
  "a:buSz"?: OoxmlElement;
  /** Bullet size in points (1/100 pt) */
  "a:buSzPts"?: OoxmlValElement;
  /** Bullet size as percentage */
  "a:buSzPct"?: OoxmlValElement;
  /** Bullet font */
  "a:buFont"?: FontElement;
  /** No bullet */
  "a:buNone"?: OoxmlElement;
  /** Default run properties for this paragraph level */
  "a:defRPr"?: RunPropertiesElement;
};

/**
 * Spacing element for line spacing/paragraph spacing.
 */
export type SpacingElement = OoxmlElement & {
  /** Spacing in points (1/100 pt) */
  "a:spcPts"?: OoxmlValElement;
  /** Spacing as percentage */
  "a:spcPct"?: OoxmlValElement;
};

/**
 * Bullet character element.
 */
export type BulletCharAttrs = {
  char?: string;
};

export type BulletCharElement = OoxmlElement<BulletCharAttrs>;

/**
 * Bullet auto number element.
 */
export type BulletAutoNumAttrs = {
  type?: string;
  startAt?: string;
};

export type BulletAutoNumElement = OoxmlElement<BulletAutoNumAttrs>;

/**
 * Field element (a:fld) - for dynamic content like dates, slide numbers.
 */
export type FieldAttrs = {
  type?: string;
  id?: string;
};

export type FieldElement = OoxmlElement<FieldAttrs> & {
  "a:rPr"?: RunPropertiesElement;
  "a:t"?: OoxmlTextElement | string;
};

// =============================================================================
// Text Body and List Style
// =============================================================================

/**
 * Text body element (p:txBody or a:txBody).
 *
 * Contains body properties, list style, and paragraphs.
 */
export type TextBodyElement = OoxmlElement & {
  /** Body properties */
  "a:bodyPr"?: BodyPropertiesElement;
  /** List style */
  "a:lstStyle"?: ListStyleElement;
  /** Paragraphs */
  "a:p"?: OoxmlChild<ParagraphElement>;
};

/**
 * Body properties element.
 */
export type BodyPropertiesAttrs = {
  /** Rotation angle */
  rot?: string;
  /** Paragraph spacing */
  spcFirstLastPara?: string;
  /** Vertical overflow */
  vertOverflow?: string;
  /** Horizontal overflow */
  horzOverflow?: string;
  /** Vertical text */
  vert?: string;
  /** Wrapping type */
  wrap?: string;
  /** Left inset */
  lIns?: string;
  /** Top inset */
  tIns?: string;
  /** Right inset */
  rIns?: string;
  /** Bottom inset */
  bIns?: string;
  /** Number of columns */
  numCol?: string;
  /** Space between columns */
  spcCol?: string;
  /** Right-to-left columns */
  rtlCol?: string;
  /** From word art */
  fromWordArt?: string;
  /** Anchor */
  anchor?: string;
  /** Anchor center */
  anchorCtr?: string;
  /** Force anti-alias */
  forceAA?: string;
  /** Upright */
  upright?: string;
  /** Compatible line spacing */
  compatLnSpc?: string;
};

export type BodyPropertiesElement = OoxmlElement<BodyPropertiesAttrs> & {
  /** Auto-fit text */
  "a:normAutofit"?: OoxmlElement;
  /** No auto-fit */
  "a:noAutofit"?: OoxmlElement;
  /** Shape auto-fit */
  "a:spAutoFit"?: OoxmlElement;
};

/**
 * List style element - defines paragraph level formatting.
 */
export type ListStyleElement = OoxmlElement & {
  /** Default paragraph properties */
  "a:defPPr"?: ParagraphPropertiesElement;
  /** Level 1-9 paragraph properties */
  "a:lvl1pPr"?: ParagraphPropertiesElement;
  "a:lvl2pPr"?: ParagraphPropertiesElement;
  "a:lvl3pPr"?: ParagraphPropertiesElement;
  "a:lvl4pPr"?: ParagraphPropertiesElement;
  "a:lvl5pPr"?: ParagraphPropertiesElement;
  "a:lvl6pPr"?: ParagraphPropertiesElement;
  "a:lvl7pPr"?: ParagraphPropertiesElement;
  "a:lvl8pPr"?: ParagraphPropertiesElement;
  "a:lvl9pPr"?: ParagraphPropertiesElement;
};

// =============================================================================
// Transform Elements
// =============================================================================

/**
 * 2D transform element (a:xfrm).
 */
export type TransformAttrs = {
  /** Rotation in 60000ths of a degree */
  rot?: string;
  /** Flip horizontal */
  flipH?: string;
  /** Flip vertical */
  flipV?: string;
};

export type TransformElement = OoxmlElement<TransformAttrs> & {
  /** Offset position */
  "a:off"?: OffsetElement;
  /** Extent (size) */
  "a:ext"?: ExtentElement;
  /** Child offset (for groups) */
  "a:chOff"?: OffsetElement;
  /** Child extent (for groups) */
  "a:chExt"?: ExtentElement;
};

/**
 * Offset element (position).
 */
export type OffsetAttrs = {
  /** X position in EMU */
  x: string;
  /** Y position in EMU */
  y: string;
};

export type OffsetElement = OoxmlElement<OffsetAttrs>;

/**
 * Extent element (size).
 */
export type ExtentAttrs = {
  /** Width in EMU */
  cx: string;
  /** Height in EMU */
  cy: string;
};

export type ExtentElement = OoxmlElement<ExtentAttrs>;

// =============================================================================
// Geometry Elements
// =============================================================================

/**
 * Preset geometry element.
 */
export type PresetGeometryAttrs = {
  /** Preset shape name (rect, ellipse, roundRect, etc.) */
  prst?: string;
};

/**
 * Shape guide element (a:gd) - defines formula-based adjustment values.
 */
export type ShapeGuideAttrs = {
  /** Guide name (e.g., "adj", "adj1", "adj2") */
  name?: string;
  /** Formula (e.g., "val 50000") */
  fmla?: string;
};

export type ShapeGuideElement = OoxmlElement<ShapeGuideAttrs>;

/**
 * Adjustment value list element (a:avLst).
 */
export type AdjustmentListElement = OoxmlElement & {
  /** Shape guides */
  "a:gd"?: OoxmlChild<ShapeGuideElement>;
};

export type PresetGeometryElement = OoxmlElement<PresetGeometryAttrs> & {
  /** Adjust values for shape */
  "a:avLst"?: AdjustmentListElement;
};

/**
 * Custom geometry element.
 */
export type CustomGeometryElement = OoxmlElement & {
  /** Adjust values */
  "a:avLst"?: OoxmlElement;
  /** Guide definitions */
  "a:gdLst"?: OoxmlElement;
  /** Connection sites */
  "a:cxnLst"?: OoxmlElement;
  /** Shape rectangle */
  "a:rect"?: OoxmlElement;
  /** Path list */
  "a:pathLst"?: PathListElement;
};

// =============================================================================
// Custom Geometry Path Elements
// =============================================================================

/**
 * Path list element (a:pathLst) - container for paths.
 */
export type PathListElement = OoxmlElement & {
  /** Path definitions */
  "a:path"?: OoxmlChild<PathElement>;
};

/**
 * Path element (a:path) - defines a shape path.
 */
export type PathAttrs = {
  /** Path coordinate width */
  w?: string;
  /** Path coordinate height */
  h?: string;
  /** Fill mode (none, norm, darken, lighten, etc.) */
  fill?: string;
  /** Stroke flag */
  stroke?: string;
  /** Extrustion OK */
  extrusionOk?: string;
};

export type PathElement = OoxmlElement<PathAttrs> & {
  /** Move to commands */
  "a:moveTo"?: OoxmlChild<MoveToElement>;
  /** Line to commands */
  "a:lnTo"?: OoxmlChild<LineToElement>;
  /** Cubic bezier commands */
  "a:cubicBezTo"?: OoxmlChild<CubicBezToElement>;
  /** Quad bezier commands */
  "a:quadBezTo"?: OoxmlChild<QuadBezToElement>;
  /** Arc to commands */
  "a:arcTo"?: OoxmlChild<ArcToElement>;
  /** Close commands */
  "a:close"?: OoxmlChild<CloseElement>;
};

/**
 * Move to element (a:moveTo).
 */
export type MoveToElement = OoxmlElement & {
  /** Point */
  "a:pt"?: OoxmlChild<PointElement>;
};

/**
 * Line to element (a:lnTo).
 */
export type LineToElement = OoxmlElement & {
  /** Point */
  "a:pt"?: OoxmlChild<PointElement>;
};

/**
 * Cubic bezier element (a:cubicBezTo) - requires 3 control points.
 */
export type CubicBezToElement = OoxmlElement & {
  /** Control points (3 required) */
  "a:pt"?: OoxmlChild<PointElement>;
};

/**
 * Quad bezier element (a:quadBezTo) - requires 2 control points.
 */
export type QuadBezToElement = OoxmlElement & {
  /** Control points (2 required) */
  "a:pt"?: OoxmlChild<PointElement>;
};

/**
 * Arc to element (a:arcTo).
 */
export type ArcToAttrs = {
  /** Horizontal radius */
  hR?: string;
  /** Vertical radius */
  wR?: string;
  /** Start angle in 60000ths of a degree */
  stAng?: string;
  /** Sweep angle in 60000ths of a degree */
  swAng?: string;
};

export type ArcToElement = OoxmlElement<ArcToAttrs>;

/**
 * Close element (a:close) - closes the current path.
 */
export type CloseElement = OoxmlElement;

/**
 * Point element (a:pt) - coordinate point.
 */
export type PointAttrs = {
  /** X coordinate */
  x?: string;
  /** Y coordinate */
  y?: string;
};

export type PointElement = OoxmlElement<PointAttrs>;

// =============================================================================
// Line/Outline Elements
// =============================================================================

/**
 * Line properties element (a:ln).
 */
export type LinePropertiesAttrs = {
  /** Line width in EMU */
  w?: string;
  /** Compound line type */
  cmpd?: string;
  /** Line cap */
  cap?: string;
  /** Pen alignment */
  algn?: string;
};

export type LinePropertiesElement = OoxmlElement<LinePropertiesAttrs> & {
  /** Solid fill for line */
  "a:solidFill"?: SolidFillElement;
  /** No fill (no line) */
  "a:noFill"?: OoxmlElement;
  /** Gradient fill */
  "a:gradFill"?: OoxmlElement;
  /** Pattern fill */
  "a:pattFill"?: OoxmlElement;
  /** Preset dash */
  "a:prstDash"?: OoxmlValElement;
  /** Custom dash */
  "a:custDash"?: OoxmlElement;
  /** Round line join */
  "a:round"?: OoxmlElement;
  /** Bevel line join */
  "a:bevel"?: OoxmlElement;
  /** Miter line join */
  "a:miter"?: OoxmlElement;
  /** Head end */
  "a:headEnd"?: LineEndElement;
  /** Tail end */
  "a:tailEnd"?: LineEndElement;
};

/**
 * Line end element (arrows).
 */
export type LineEndAttrs = {
  type?: string;
  w?: string;
  len?: string;
};

export type LineEndElement = OoxmlElement<LineEndAttrs>;

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Get the level-specific paragraph properties key.
 */
export type ListStyleLevelKey =
  | "a:lvl1pPr"
  | "a:lvl2pPr"
  | "a:lvl3pPr"
  | "a:lvl4pPr"
  | "a:lvl5pPr"
  | "a:lvl6pPr"
  | "a:lvl7pPr"
  | "a:lvl8pPr"
  | "a:lvl9pPr";

/**
 * Get the paragraph properties for a given level.
 */
export function getLevelParagraphProps(
  lstStyle: ListStyleElement | undefined,
  level: number,
): ParagraphPropertiesElement | undefined {
  if (lstStyle === undefined) {return undefined;}
  const key = `a:lvl${level + 1}pPr` as ListStyleLevelKey;
  return lstStyle[key];
}

// =============================================================================
// 3D Effect Elements
// =============================================================================

/**
 * Scene 3D element (a:scene3d) - camera and lighting setup.
 *
 * @example
 * ```xml
 * <a:scene3d>
 *   <a:camera prst="orthographicFront"/>
 *   <a:lightRig rig="threePt" dir="t"/>
 * </a:scene3d>
 * ```
 */
export type Scene3DElement = OoxmlElement & {
  /** Camera settings */
  "a:camera"?: CameraElement;
  /** Light rig settings */
  "a:lightRig"?: LightRigElement;
  /** Backdrop plane */
  "a:backdrop"?: OoxmlElement;
};

/**
 * Camera element (a:camera) - perspective and rotation.
 */
export type CameraAttrs = {
  /** Camera preset (orthographicFront, perspectiveFront, etc.) */
  prst?: string;
  /** Field of view in 60,000ths of a degree */
  fov?: string;
  /** Zoom percentage (100000 = 100%) */
  zoom?: string;
};

export type CameraElement = OoxmlElement<CameraAttrs> & {
  /** Rotation override */
  "a:rot"?: RotationElement;
};

/**
 * Rotation element (a:rot) - latitude, longitude, revolution.
 */
export type RotationAttrs = {
  /** Latitude in 60,000ths of a degree */
  lat?: string;
  /** Longitude in 60,000ths of a degree */
  lon?: string;
  /** Revolution in 60,000ths of a degree */
  rev?: string;
};

export type RotationElement = OoxmlElement<RotationAttrs>;

/**
 * Light rig element (a:lightRig) - lighting configuration.
 */
export type LightRigAttrs = {
  /** Light rig preset (threePt, balanced, soft, harsh, etc.) */
  rig?: string;
  /** Light direction (t, b, l, r, tl, tr, bl, br) */
  dir?: string;
};

export type LightRigElement = OoxmlElement<LightRigAttrs> & {
  /** Rotation override */
  "a:rot"?: RotationElement;
};

/**
 * Shape 3D element (a:sp3d) - extrusion, bevel, contour.
 *
 * @example
 * ```xml
 * <a:sp3d extrusionH="25400" contourW="12700" prstMaterial="metal">
 *   <a:bevelT prst="circle" w="38100" h="38100"/>
 *   <a:extrusionClr><a:srgbClr val="000000"/></a:extrusionClr>
 * </a:sp3d>
 * ```
 */
export type SP3DAttrs = {
  /** Extrusion height in EMU */
  extrusionH?: string;
  /** Contour width in EMU */
  contourW?: string;
  /** Material preset */
  prstMaterial?: string;
  /** Shape depth in EMU */
  z?: string;
};

export type SP3DElement = OoxmlElement<SP3DAttrs> & {
  /** Top bevel */
  "a:bevelT"?: BevelElement;
  /** Bottom bevel */
  "a:bevelB"?: BevelElement;
  /** Extrusion color */
  "a:extrusionClr"?: ColorContainerNode;
  /** Contour color */
  "a:contourClr"?: ColorContainerNode;
};

/**
 * Bevel element (a:bevelT, a:bevelB).
 */
export type BevelAttrs = {
  /** Bevel preset (circle, relaxedInset, slope, etc.) */
  prst?: string;
  /** Width in EMU */
  w?: string;
  /** Height in EMU */
  h?: string;
};

export type BevelElement = OoxmlElement<BevelAttrs>;
