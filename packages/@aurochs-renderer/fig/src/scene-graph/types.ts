/**
 * @file Scene Graph type definitions
 *
 * Format-agnostic intermediate representation for Figma rendering.
 * Both SVG and WebGL backends consume this scene graph.
 *
 * ## Parity contract
 *
 * Every visual property that the old SVG renderer (svg/renderer.ts +
 * svg/nodes/) handles MUST have a corresponding field in these types.
 * The builder-feature-parity.spec.ts test enforces this mapping.
 */

import type { TextAutoResize } from "../text/layout/types";

// =============================================================================
// Branded ID Type
// =============================================================================

export type SceneNodeId = string & { readonly __brand: "SceneNodeId" };

/** Create a unique node identifier string */
export function createNodeId(id: string): SceneNodeId {
  return id as SceneNodeId;
}

// =============================================================================
// Primitive Types
// =============================================================================

export type Point = { readonly x: number; readonly y: number };

export type AffineMatrix = {
  readonly m00: number;
  readonly m01: number;
  readonly m02: number;
  readonly m10: number;
  readonly m11: number;
  readonly m12: number;
};

export type Color = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

// =============================================================================
// Blend Mode
// =============================================================================

/**
 * CSS mix-blend-mode values corresponding to Figma blend modes.
 * PASS_THROUGH and NORMAL produce undefined (no explicit CSS needed).
 */
export type BlendMode =
  | "darken"
  | "multiply"
  | "plus-darker"     // LINEAR_BURN
  | "color-burn"
  | "lighten"
  | "screen"
  | "plus-lighter"    // LINEAR_DODGE
  | "color-dodge"
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

// =============================================================================
// Fill Types
// =============================================================================

export type GradientStop = {
  readonly position: number;
  readonly color: Color;
};

export type SolidFill = {
  readonly type: "solid";
  readonly color: Color;
  readonly opacity: number;
  /** Paint-level blend mode (Figma supports per-paint blend) */
  readonly blendMode?: BlendMode;
};

export type LinearGradientFill = {
  readonly type: "linear-gradient";
  readonly start: Point;
  readonly end: Point;
  readonly stops: readonly GradientStop[];
  readonly opacity: number;
  readonly blendMode?: BlendMode;
  /**
   * Original Figma paint transform matrix.
   * Preserved for accurate SVG gradientTransform generation.
   * When absent, start/end coordinates define the gradient direction directly.
   */
  readonly gradientTransform?: AffineMatrix;
};

export type RadialGradientFill = {
  readonly type: "radial-gradient";
  readonly center: Point;
  readonly radius: number;
  readonly stops: readonly GradientStop[];
  readonly opacity: number;
  readonly blendMode?: BlendMode;
  /**
   * Original Figma paint transform matrix.
   * Required for elliptical and rotated radial gradients.
   * The 2x2 rotation+scale part encodes the ellipse shape.
   */
  readonly gradientTransform?: AffineMatrix;
};

/**
 * Angular (conic) gradient fill.
 * Rendered via CSS conic-gradient in foreignObject (SVG)
 * or shader (WebGL).
 */
export type AngularGradientFill = {
  readonly type: "angular-gradient";
  readonly center: Point;
  readonly stops: readonly GradientStop[];
  readonly opacity: number;
  readonly blendMode?: BlendMode;
  /** Rotation angle in radians (Figma gradient handle angle) */
  readonly rotation: number;
};

/**
 * Diamond gradient fill.
 * Rendered via four mirrored gradient rects (SVG) or shader (WebGL).
 */
export type DiamondGradientFill = {
  readonly type: "diamond-gradient";
  readonly center: Point;
  readonly stops: readonly GradientStop[];
  readonly opacity: number;
  readonly blendMode?: BlendMode;
};

export type ImageFill = {
  readonly type: "image";
  readonly imageRef: string;
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly scaleMode: string;
  readonly opacity: number;
  readonly blendMode?: BlendMode;
  readonly width?: number;
  readonly height?: number;
  /** Natural image dimensions (from PNG/JPEG header) */
  readonly naturalWidth?: number;
  readonly naturalHeight?: number;
  /** Image transform (for non-FILL scale modes) */
  readonly imageTransform?: AffineMatrix;
};

export type Fill =
  | SolidFill
  | LinearGradientFill
  | RadialGradientFill
  | AngularGradientFill
  | DiamondGradientFill
  | ImageFill;

// =============================================================================
// Stroke Types
// =============================================================================

/**
 * A single stroke layer.
 *
 * Figma supports multiple stroke paints, each potentially with a gradient
 * fill and blend mode. The scene-graph stores each as a StrokeLayer,
 * and the Stroke type wraps them with shared geometric properties.
 */
export type StrokeLayer = {
  /** Stroke color (for solid strokes) */
  readonly color: Color;
  readonly opacity: number;
  /** Gradient fill reference — when set, color is ignored */
  readonly gradientFill?: LinearGradientFill | RadialGradientFill;
  readonly blendMode?: BlendMode;
};

export type Stroke = {
  readonly width: number;
  readonly linecap: "butt" | "round" | "square";
  readonly linejoin: "miter" | "round" | "bevel";
  readonly dashPattern?: readonly number[];
  /** Primary layer (first visible stroke paint) */
  readonly color: Color;
  readonly opacity: number;
  /** All stroke layers (for multi-paint stroke rendering) */
  readonly layers?: readonly StrokeLayer[];
};

// =============================================================================
// Effect Types
// =============================================================================

export type DropShadowEffect = {
  readonly type: "drop-shadow";
  readonly offset: Point;
  readonly radius: number;
  readonly color: Color;
  /** Shadow spread (positive = dilate, negative = erode) */
  readonly spread?: number;
  readonly blendMode?: BlendMode;
};

export type InnerShadowEffect = {
  readonly type: "inner-shadow";
  readonly offset: Point;
  readonly radius: number;
  readonly color: Color;
  readonly spread?: number;
  readonly blendMode?: BlendMode;
};

export type LayerBlurEffect = {
  readonly type: "layer-blur";
  readonly radius: number;
};

export type BackgroundBlurEffect = {
  readonly type: "background-blur";
  readonly radius: number;
};

export type Effect =
  | DropShadowEffect
  | InnerShadowEffect
  | LayerBlurEffect
  | BackgroundBlurEffect;

// =============================================================================
// Path Types
// =============================================================================

export type PathCommand =
  | { readonly type: "M"; readonly x: number; readonly y: number }
  | { readonly type: "L"; readonly x: number; readonly y: number }
  | {
      readonly type: "C";
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "Q";
      readonly x1: number;
      readonly y1: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "A";
      readonly rx: number;
      readonly ry: number;
      readonly rotation: number;
      readonly largeArc: boolean;
      readonly sweep: boolean;
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: "Z" };

export type PathContour = {
  readonly commands: readonly PathCommand[];
  readonly windingRule: "nonzero" | "evenodd";
  /** Per-contour fill override (for vector nodes with styleOverrideTable) */
  readonly fillOverride?: Fill;
};

// =============================================================================
// Corner Radius
// =============================================================================

/**
 * Corner radius for rectangular shapes.
 * - number: uniform radius on all corners
 * - [tl, tr, br, bl]: per-corner radii
 */
export type CornerRadius = number | readonly [number, number, number, number];

// =============================================================================
// Arc Data (for ellipse partial arcs and donuts)
// =============================================================================

/**
 * Parametric arc data for ellipses.
 * When present, the ellipse is a partial arc and/or donut.
 */
export type ArcData = {
  /** Starting angle in radians (0 = 3 o'clock, clockwise) */
  readonly startingAngle: number;
  /** Ending angle in radians */
  readonly endingAngle: number;
  /** Inner radius ratio (0..1, 0 = no hole = pie slice, >0 = donut) */
  readonly innerRadius: number;
};

// =============================================================================
// Clip & Mask Types
// =============================================================================

export type RectClip = {
  readonly type: "rect";
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
};

export type PathClip = {
  readonly type: "path";
  readonly contours: readonly PathContour[];
};

export type ClipShape = RectClip | PathClip;

export type MaskNode = {
  readonly maskId: SceneNodeId;
  /** SVG content of the mask (for SVG backend) or node reference (for WebGL) */
  readonly maskContent: SceneNode;
};

// =============================================================================
// Text Types
// =============================================================================

export type TextLineBounds = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
};

export type TextLineLayout = {
  readonly lines: readonly TextLineBounds[];
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight?: number;
  readonly fontStyle?: string;
  readonly letterSpacing?: number;
  readonly lineHeight: number;
  readonly textAnchor: "start" | "middle" | "end";
  readonly textDecoration?: "underline" | "strikethrough";
};

// =============================================================================
// Scene Node Types (Discriminated Union)
// =============================================================================

export type SceneNodeBase = {
  readonly id: SceneNodeId;
  readonly name?: string;
  readonly transform: AffineMatrix;
  readonly opacity: number;
  readonly visible: boolean;
  readonly effects: readonly Effect[];
  readonly clip?: ClipShape;
  readonly mask?: MaskNode;
  /** CSS mix-blend-mode (undefined = normal) */
  readonly blendMode?: BlendMode;
};

export type GroupNode = SceneNodeBase & {
  readonly type: "group";
  readonly children: readonly SceneNode[];
};

export type FrameNode = SceneNodeBase & {
  readonly type: "frame";
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
  readonly fills: readonly Fill[];
  readonly stroke?: Stroke;
  readonly clipsContent: boolean;
  readonly children: readonly SceneNode[];
};

export type RectNode = SceneNodeBase & {
  readonly type: "rect";
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
  readonly fills: readonly Fill[];
  readonly stroke?: Stroke;
};

export type EllipseNode = SceneNodeBase & {
  readonly type: "ellipse";
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly fills: readonly Fill[];
  readonly stroke?: Stroke;
  /** Parametric arc data for partial arcs and donuts */
  readonly arcData?: ArcData;
};

export type PathNode = SceneNodeBase & {
  readonly type: "path";
  readonly contours: readonly PathContour[];
  readonly fills: readonly Fill[];
  readonly stroke?: Stroke;
  /** Bounding box size from the Figma node (for gradient coordinate computation) */
  readonly width?: number;
  readonly height?: number;
};

export type TextNode = SceneNodeBase & {
  readonly type: "text";
  /** Bounding box width */
  readonly width: number;
  /** Bounding box height */
  readonly height: number;
  /** Text auto-resize mode — determines wrapping and overflow behavior */
  readonly textAutoResize: TextAutoResize;
  /** Pre-outlined glyph path contours (from opentype or derived data) */
  readonly glyphContours?: readonly PathContour[];
  /** Decoration paths (underlines, strikethroughs) as contours */
  readonly decorationContours?: readonly PathContour[];
  /** Fill color and opacity for text */
  readonly fill: { readonly color: Color; readonly opacity: number };
  /** Text line layout for SVG <text> rendering */
  readonly textLineLayout?: TextLineLayout;
};

export type ImageNode = SceneNodeBase & {
  readonly type: "image";
  readonly width: number;
  readonly height: number;
  readonly imageRef: string;
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly scaleMode: string;
};

export type SceneNode =
  | GroupNode
  | FrameNode
  | RectNode
  | EllipseNode
  | PathNode
  | TextNode
  | ImageNode;

// =============================================================================
// Scene Graph Root
// =============================================================================

export type SceneGraph = {
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: Color;
  readonly root: GroupNode;
  readonly defs?: readonly string[];
  readonly version: number;
};
