/**
 * @file Scene Graph type definitions
 *
 * Format-agnostic intermediate representation for Figma rendering.
 * Both SVG and WebGL backends consume this scene graph.
 */

// =============================================================================
// Branded ID Type
// =============================================================================

export type SceneNodeId = string & { readonly __brand: "SceneNodeId" };

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
};

export type LinearGradientFill = {
  readonly type: "linear-gradient";
  readonly start: Point;
  readonly end: Point;
  readonly stops: readonly GradientStop[];
  readonly opacity: number;
};

export type RadialGradientFill = {
  readonly type: "radial-gradient";
  readonly center: Point;
  readonly radius: number;
  readonly stops: readonly GradientStop[];
  readonly opacity: number;
};

export type ImageFill = {
  readonly type: "image";
  readonly imageRef: string;
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly scaleMode: string;
  readonly opacity: number;
  readonly width?: number;
  readonly height?: number;
};

export type Fill = SolidFill | LinearGradientFill | RadialGradientFill | ImageFill;

// =============================================================================
// Stroke Types
// =============================================================================

export type Stroke = {
  readonly color: Color;
  readonly width: number;
  readonly opacity: number;
  readonly linecap: "butt" | "round" | "square";
  readonly linejoin: "miter" | "round" | "bevel";
  readonly dashPattern?: readonly number[];
};

// =============================================================================
// Effect Types
// =============================================================================

export type DropShadowEffect = {
  readonly type: "drop-shadow";
  readonly offset: Point;
  readonly radius: number;
  readonly color: Color;
};

export type InnerShadowEffect = {
  readonly type: "inner-shadow";
  readonly offset: Point;
  readonly radius: number;
  readonly color: Color;
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
  | { readonly type: "Z" };

export type PathContour = {
  readonly commands: readonly PathCommand[];
  readonly windingRule: "nonzero" | "evenodd";
};

// =============================================================================
// Clip & Mask Types
// =============================================================================

export type RectClip = {
  readonly type: "rect";
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: number;
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

export type FallbackTextLine = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
};

export type FallbackTextData = {
  readonly lines: readonly FallbackTextLine[];
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
};

export type GroupNode = SceneNodeBase & {
  readonly type: "group";
  readonly children: readonly SceneNode[];
};

export type FrameNode = SceneNodeBase & {
  readonly type: "frame";
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: number;
  readonly fills: readonly Fill[];
  readonly stroke?: Stroke;
  readonly clipsContent: boolean;
  readonly children: readonly SceneNode[];
};

export type RectNode = SceneNodeBase & {
  readonly type: "rect";
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: number;
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
};

export type PathNode = SceneNodeBase & {
  readonly type: "path";
  readonly contours: readonly PathContour[];
  readonly fills: readonly Fill[];
  readonly stroke?: Stroke;
};

export type TextNode = SceneNodeBase & {
  readonly type: "text";
  /** Bounding box width */
  readonly width: number;
  /** Bounding box height */
  readonly height: number;
  /** Pre-outlined glyph path contours (from opentype or derived data) */
  readonly glyphContours?: readonly PathContour[];
  /** Decoration paths (underlines, strikethroughs) as contours */
  readonly decorationContours?: readonly PathContour[];
  /** Fill color and opacity for text */
  readonly fill: { readonly color: Color; readonly opacity: number };
  /** Fallback text data when glyph outlines are not available */
  readonly fallbackText?: FallbackTextData;
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
