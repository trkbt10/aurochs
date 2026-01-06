/**
 * @file Text Rendering Primitives for React SVG Renderer
 *
 * Renders text content using the text-layout engine
 * and outputs React SVG elements.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

import type { ReactNode } from "react";
import type { TextBody, TextRun, RunProperties, Paragraph } from "../../../domain/text";
import type { FontScheme } from "../../../domain/theme";
import type { Scene3d, Shape3d } from "../../../domain/three-d";
import type { LayoutResult, LayoutLine, PositionedSpan, LayoutParagraphResult } from "../../text-layout";
import type { TextEffectsConfig, TextPatternFillConfig, TextImageFillConfig } from "../../../domain/drawing-ml";
import type { Color } from "../../../domain/color";
import type { ColorContext } from "../../../domain/resolution";
import { layoutTextBody, toLayoutInput } from "../../text-layout";
import { px, deg } from "../../../domain/types";
import { resolveColor } from "../../core/drawing-ml/color";
import { PT_TO_PX } from "../../../domain/unit-conversion";
import { useRenderContext } from "../context";
import { useSvgDefs } from "../hooks/useSvgDefs";
import { calculateCameraTransform, has3dEffects } from "../../svg/effects3d";
import { Text3DRenderer, shouldRender3DText, type Text3DRunConfig } from "../../webgl/text3d";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for TextRenderer
 */
export type TextRendererProps = {
  /** Text body to render */
  readonly textBody: TextBody;
  /** Box width in pixels */
  readonly width: number;
  /** Box height in pixels */
  readonly height: number;
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Renders text content as React SVG elements.
 *
 * When complex 3D effects are present (bevel, extrusion, non-front camera),
 * uses WebGL rendering via Three.js for true 3D output.
 */
export function TextRenderer({ textBody, width, height }: TextRendererProps) {
  const { colorContext, fontScheme, options, resources } = useRenderContext();
  const { getNextId, addDef, hasDef } = useSvgDefs();

  if (textBody.paragraphs.length === 0) {
    return null;
  }

  // Check if WebGL 3D rendering should be used
  const scene3d = textBody.bodyProperties.scene3d;
  const shape3d = textBody.bodyProperties.shape3d;
  const useWebGL3D = options?.enable3DText !== false && shouldRender3DText(scene3d, shape3d);

  if (useWebGL3D) {
    // Use WebGL 3D renderer for complex 3D text
    // Convert all text runs to 3D run configurations
    const runs = extractText3DRuns(textBody, colorContext, fontScheme);

    return (
      <foreignObject x={0} y={0} width={width} height={height}>
        <Text3DRenderer
          runs={runs}
          scene3d={scene3d}
          shape3d={shape3d}
          width={width}
          height={height}
        />
      </foreignObject>
    );
  }

  // Convert TextBody to layout input
  const resourceResolver = (resourceId: string) => resources.resolve(resourceId);
  const layoutInput = toLayoutInput({
    body: textBody,
    width: px(width),
    height: px(height),
    colorContext,
    fontScheme,
    renderOptions: options,
    resourceResolver,
  });

  // Run the layout engine
  const layoutResult = layoutTextBody(layoutInput);

  // Render layout result
  const content = renderLayoutResult(layoutResult, getNextId, addDef, hasDef);

  // Get body rotation
  const bodyRotation = textBody.bodyProperties.rotation ?? deg(0);

  // Apply body rotation
  let wrappedContent = content;
  if (bodyRotation !== 0) {
    const centerX = width / 2;
    const centerY = height / 2;
    wrappedContent = (
      <g transform={`rotate(${bodyRotation}, ${centerX}, ${centerY})`}>
        {content}
      </g>
    );
  }

  // Apply 3D transforms (scene3d/shape3d) - uses SVG fallback if WebGL not used
  if (has3dEffects(scene3d, shape3d)) {
    const text3dContent = render3dTextEffects(
      wrappedContent,
      scene3d,
      shape3d,
      width,
      height,
      getNextId,
      addDef,
      hasDef,
    );
    wrappedContent = text3dContent;
  }

  // Apply overflow clip
  const horzOverflow = textBody.bodyProperties.overflow;
  const vertOverflow = textBody.bodyProperties.verticalOverflow ?? "overflow";
  if (horzOverflow === "clip" || vertOverflow === "clip") {
    const clipId = getNextId("text-clip");
    if (!hasDef(clipId)) {
      addDef(
        clipId,
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>,
      );
    }
    wrappedContent = (
      <g clipPath={`url(#${clipId})`}>{wrappedContent}</g>
    );
  }

  // Apply force anti-alias
  if (textBody.bodyProperties.forceAntiAlias === true) {
    wrappedContent = (
      <g textRendering="geometricPrecision">{wrappedContent}</g>
    );
  }

  // Apply upright text
  const vertType = textBody.bodyProperties.verticalType;
  if (textBody.bodyProperties.upright === true && vertType !== "horz") {
    wrappedContent = (
      <g style={{ textOrientation: "upright", writingMode: "vertical-rl" }}>
        {wrappedContent}
      </g>
    );
  }

  return <>{wrappedContent}</>;
}

// =============================================================================
// Layout Result Rendering
// =============================================================================

/**
 * Render layout result to React elements
 */
function renderLayoutResult(
  layoutResult: LayoutResult,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: ReactNode) => void,
  hasDef: (id: string) => boolean,
): ReactNode {
  const elements: ReactNode[] = [];
  let key = 0;

  for (const para of layoutResult.paragraphs) {
    // Render bullet if present
    if (para.bullet !== undefined && para.lines.length > 0) {
      const bulletElement = renderBullet(para, key++);
      if (bulletElement) {
        elements.push(bulletElement);
      }
    }

    // Render each line
    for (const line of para.lines) {
      const lineElements = renderLine(line, para.fontAlignment, key, getNextId, addDef, hasDef);
      elements.push(...lineElements);
      key += line.spans.length + 1;
    }
  }

  return <>{elements}</>;
}

/**
 * Render bullet
 */
function renderBullet(para: LayoutParagraphResult, key: number): ReactNode {
  if (para.bullet === undefined || para.lines.length === 0) {
    return null;
  }

  const firstLine = para.lines[0];
  const bulletX = (firstLine.x as number) - (para.bulletWidth as number);
  const bulletY = firstLine.y as number;
  const bulletFontSize = (para.bullet.fontSize as number) * PT_TO_PX;

  // Picture bullet
  if (para.bullet.imageUrl !== undefined) {
    const imageSize = bulletFontSize;
    const imageY = bulletY - imageSize * 0.8;
    return (
      <image
        key={`bullet-${key}`}
        href={para.bullet.imageUrl}
        x={bulletX}
        y={imageY}
        width={imageSize}
        height={imageSize}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  // Character bullet
  return (
    <text
      key={`bullet-${key}`}
      x={bulletX}
      y={bulletY}
      fontSize={`${bulletFontSize}px`}
      fill={para.bullet.color}
      fontFamily={para.bullet.fontFamily}
    >
      {para.bullet.char}
    </text>
  );
}

/**
 * Render a line to React elements
 */
function renderLine(
  line: LayoutLine,
  fontAlignment: "auto" | "top" | "center" | "base" | "bottom",
  startKey: number,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: ReactNode) => void,
  hasDef: (id: string) => boolean,
): ReactNode[] {
  const elements: ReactNode[] = [];
  let cursorX = line.x as number;
  let key = startKey;

  const dominantBaseline = toSvgDominantBaseline(fontAlignment);

  for (const span of line.spans) {
    if (span.text.length === 0) {
      continue;
    }

    const spanElement = renderSpan(
      span,
      cursorX,
      line.y as number,
      dominantBaseline,
      key++,
      getNextId,
      addDef,
      hasDef,
    );
    elements.push(spanElement);

    cursorX += (span.width as number) + (span.dx as number);
  }

  return elements;
}

/**
 * Render a single span
 */
function renderSpan(
  span: PositionedSpan,
  x: number,
  lineY: number,
  dominantBaseline: string | undefined,
  key: number,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: ReactNode) => void,
  hasDef: (id: string) => boolean,
): ReactNode {
  const fontSizePx = (span.fontSize as number) * PT_TO_PX;
  const elements: ReactNode[] = [];

  // Handle highlight background
  if (span.highlightColor !== undefined) {
    const spanWidth = span.width as number;
    elements.push(
      <rect
        key={`highlight-${key}`}
        x={x}
        y={lineY - fontSizePx * 0.8}
        width={spanWidth}
        height={fontSizePx}
        fill={span.highlightColor}
      />,
    );
  }

  // Build text props
  const textProps: Record<string, string | number | undefined> = {
    x,
    y: applyVerticalAlign(lineY, fontSizePx, span.verticalAlign),
    fontSize: `${fontSizePx}px`,
    fontFamily: buildFontFamily(span),
    dominantBaseline,
  };

  // Handle fill
  if (span.textFill !== undefined) {
    switch (span.textFill.type) {
      case "gradient": {
        const gradId = getNextId("text-grad");
        if (!hasDef(gradId)) {
          addDef(gradId, createTextGradientDef(span.textFill, gradId));
        }
        textProps.fill = `url(#${gradId})`;
        break;
      }
      case "pattern": {
        const patternId = getNextId("text-patt");
        if (!hasDef(patternId)) {
          addDef(patternId, createTextPatternDef(span.textFill, patternId));
        }
        textProps.fill = `url(#${patternId})`;
        break;
      }
      case "image": {
        const imageId = getNextId("text-img");
        if (!hasDef(imageId)) {
          addDef(imageId, createTextImageFillDef(span.textFill, imageId));
        }
        textProps.fill = `url(#${imageId})`;
        break;
      }
      case "noFill":
        textProps.fill = "none";
        break;
      case "solid":
        textProps.fill = span.textFill.color;
        if (span.textFill.alpha < 1) {
          textProps.fillOpacity = span.textFill.alpha;
        }
        break;
    }
  } else {
    textProps.fill = span.color;
  }

  // Font styling
  if (span.fontWeight !== 400) {
    textProps.fontWeight = span.fontWeight;
  }
  if (span.fontStyle !== "normal") {
    textProps.fontStyle = span.fontStyle;
  }
  if (span.textDecoration !== undefined) {
    textProps.textDecoration = span.textDecoration;
  }

  // Letter spacing
  if (span.letterSpacing !== undefined && (span.letterSpacing as number) !== 0) {
    textProps.letterSpacing = `${span.letterSpacing}px`;
  }

  // Kerning
  if (span.kerning !== undefined) {
    const fontSize = span.fontSize as number;
    textProps.fontKerning = fontSize >= (span.kerning as number) ? "normal" : "none";
  }

  // Direction
  if (span.direction === "rtl") {
    textProps.direction = "rtl";
    textProps.unicodeBidi = "bidi-override";
  }

  // Text outline
  if (span.textOutline !== undefined) {
    textProps.stroke = span.textOutline.color;
    textProps.strokeWidth = span.textOutline.width;
    textProps.strokeLinecap = span.textOutline.cap;
    textProps.strokeLinejoin = span.textOutline.join;
    textProps.paintOrder = "stroke fill";
  }

  // Text effects (shadow, glow, soft edge, reflection)
  let effectsFilterUrl: string | undefined;
  if (span.effects !== undefined) {
    const effectsId = getNextId("text-effect");
    if (!hasDef(effectsId)) {
      addDef(effectsId, createTextEffectsFilterDef(span.effects, effectsId));
    }
    effectsFilterUrl = `url(#${effectsId})`;
  }

  // Apply text transform
  const textContent = applyTextTransform(span.text, span.textTransform);

  // Create text element
  const textElement = (
    <text
      key={`text-${key}`}
      {...textProps}
      filter={effectsFilterUrl}
    >
      {textContent}
    </text>
  );

  // Wrap with link if needed
  if (span.linkId) {
    elements.push(
      <g
        key={`link-${key}`}
        style={{ cursor: "pointer" }}
        data-link-id={span.linkId}
      >
        {span.linkTooltip && <title>{span.linkTooltip}</title>}
        {textElement}
      </g>,
    );
  } else {
    elements.push(textElement);
  }

  return <>{elements}</>;
}

// =============================================================================
// Utility Functions
// =============================================================================

function toSvgDominantBaseline(
  fontAlignment: "auto" | "top" | "center" | "base" | "bottom",
): string | undefined {
  switch (fontAlignment) {
    case "top":
      return "text-top";
    case "center":
      return "central";
    case "bottom":
      return "text-bottom";
    case "auto":
    case "base":
    default:
      return undefined;
  }
}

function buildFontFamily(span: PositionedSpan): string {
  const families = [span.fontFamily];
  if (span.fontFamilyEastAsian !== undefined) {
    families.push(span.fontFamilyEastAsian);
  }
  if (span.fontFamilyComplexScript !== undefined && span.fontFamilyComplexScript !== span.fontFamily) {
    families.push(span.fontFamilyComplexScript);
  }
  if (span.fontFamilySymbol !== undefined && span.fontFamilySymbol !== span.fontFamily) {
    families.push(span.fontFamilySymbol);
  }
  return families.join(", ");
}

function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | undefined,
): string {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  return text;
}

function applyVerticalAlign(
  lineY: number,
  fontSizePx: number,
  verticalAlign: "baseline" | "superscript" | "subscript",
): number {
  if (verticalAlign === "superscript") {
    return lineY - fontSizePx * 0.3;
  }
  if (verticalAlign === "subscript") {
    return lineY + fontSizePx * 0.3;
  }
  return lineY;
}

type TextGradientFill = {
  type: "gradient";
  stops: ReadonlyArray<{ color: string; position: number; alpha: number }>;
  angle: number;
};

function createTextGradientDef(fill: TextGradientFill, id: string): ReactNode {
  const stops = fill.stops.map((stop, index) => (
    <stop
      key={index}
      offset={`${stop.position}%`}
      stopColor={stop.color}
      stopOpacity={stop.alpha < 1 ? stop.alpha : undefined}
    />
  ));

  // Convert angle to SVG coordinates
  const rad = ((fill.angle - 90) * Math.PI) / 180;
  const x1 = 50 - 50 * Math.cos(rad);
  const y1 = 50 - 50 * Math.sin(rad);
  const x2 = 50 + 50 * Math.cos(rad);
  const y2 = 50 + 50 * Math.sin(rad);

  return (
    <linearGradient
      id={id}
      x1={`${x1}%`}
      y1={`${y1}%`}
      x2={`${x2}%`}
      y2={`${y2}%`}
    >
      {stops}
    </linearGradient>
  );
}

/**
 * Create SVG pattern definition for text pattern fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (a:pattFill)
 */
function createTextPatternDef(
  fill: TextPatternFillConfig,
  id: string,
): ReactNode {
  const { preset, fgColor, bgColor } = fill;
  const size = getPatternSize(preset);

  return (
    <pattern
      id={id}
      width={size}
      height={size}
      patternUnits="userSpaceOnUse"
    >
      {/* Background */}
      <rect width={size} height={size} fill={bgColor} />
      {/* Pattern content */}
      {renderPatternContent(preset, fgColor, size)}
    </pattern>
  );
}

/**
 * Get pattern size based on preset type.
 */
function getPatternSize(preset: string): number {
  // Most patterns use 8x8 or 10x10 tiles
  if (preset.startsWith("pct")) {
    return 4; // Percentage patterns use smaller tiles
  }
  if (preset.includes("sm") || preset.includes("nar")) {
    return 4; // Small/narrow patterns
  }
  if (preset.includes("lg") || preset.includes("wd")) {
    return 10; // Large/wide patterns
  }
  return 8; // Default size
}

/**
 * Render pattern content based on preset type.
 */
function renderPatternContent(
  preset: string,
  fgColor: string,
  size: number,
): ReactNode {
  // Horizontal patterns
  if (preset === "horz" || preset === "ltHorz" || preset === "dkHorz" || preset === "narHorz") {
    const strokeWidth = preset === "dkHorz" ? 2 : preset === "ltHorz" ? 0.5 : 1;
    return <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={fgColor} strokeWidth={strokeWidth} />;
  }

  // Vertical patterns
  if (preset === "vert" || preset === "ltVert" || preset === "dkVert" || preset === "narVert") {
    const strokeWidth = preset === "dkVert" ? 2 : preset === "ltVert" ? 0.5 : 1;
    return <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={fgColor} strokeWidth={strokeWidth} />;
  }

  // Grid patterns
  if (preset === "smGrid" || preset === "lgGrid" || preset === "cross") {
    return (
      <>
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={fgColor} strokeWidth={0.5} />
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={fgColor} strokeWidth={0.5} />
      </>
    );
  }

  // Diagonal up patterns
  if (preset === "upDiag" || preset === "ltUpDiag" || preset === "dkUpDiag" || preset === "wdUpDiag") {
    const strokeWidth = preset === "dkUpDiag" ? 2 : preset === "wdUpDiag" ? 3 : preset === "ltUpDiag" ? 0.5 : 1;
    return <line x1={0} y1={size} x2={size} y2={0} stroke={fgColor} strokeWidth={strokeWidth} />;
  }

  // Diagonal down patterns
  if (preset === "dnDiag" || preset === "ltDnDiag" || preset === "dkDnDiag" || preset === "wdDnDiag") {
    const strokeWidth = preset === "dkDnDiag" ? 2 : preset === "wdDnDiag" ? 3 : preset === "ltDnDiag" ? 0.5 : 1;
    return <line x1={0} y1={0} x2={size} y2={size} stroke={fgColor} strokeWidth={strokeWidth} />;
  }

  // Diagonal cross
  if (preset === "diagCross") {
    return (
      <>
        <line x1={0} y1={0} x2={size} y2={size} stroke={fgColor} strokeWidth={0.5} />
        <line x1={0} y1={size} x2={size} y2={0} stroke={fgColor} strokeWidth={0.5} />
      </>
    );
  }

  // Dot grid
  if (preset === "dotGrid") {
    return <circle cx={size / 2} cy={size / 2} r={1} fill={fgColor} />;
  }

  // Percentage patterns (dots)
  if (preset.startsWith("pct")) {
    const pct = parseInt(preset.replace("pct", ""), 10);
    const dotSize = Math.max(0.5, (pct / 100) * 2);
    return <circle cx={size / 2} cy={size / 2} r={dotSize} fill={fgColor} />;
  }

  // Check patterns
  if (preset === "smCheck" || preset === "lgCheck") {
    const half = size / 2;
    return (
      <>
        <rect x={0} y={0} width={half} height={half} fill={fgColor} />
        <rect x={half} y={half} width={half} height={half} fill={fgColor} />
      </>
    );
  }

  // Default: solid fill with foreground
  return <rect width={size} height={size} fill={fgColor} />;
}

/**
 * Create SVG pattern definition for text image fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (a:blipFill)
 */
function createTextImageFillDef(
  fill: TextImageFillConfig,
  id: string,
): ReactNode {
  if (fill.mode === "tile") {
    const scaleX = fill.tileScale?.x ?? 1;
    const scaleY = fill.tileScale?.y ?? 1;
    const tileSize = 50; // Base tile size

    return (
      <pattern
        id={id}
        width={tileSize * scaleX}
        height={tileSize * scaleY}
        patternUnits="userSpaceOnUse"
      >
        <image
          href={fill.imageUrl}
          width={tileSize * scaleX}
          height={tileSize * scaleY}
          preserveAspectRatio="none"
        />
      </pattern>
    );
  }

  // Stretch mode uses objectBoundingBox
  return (
    <pattern
      id={id}
      width="100%"
      height="100%"
      patternUnits="objectBoundingBox"
    >
      <image
        href={fill.imageUrl}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      />
    </pattern>
  );
}

// =============================================================================
// 3D Text Effects
// =============================================================================

/**
 * Render 3D effects for text body.
 *
 * Applies camera transform, bevel, and extrusion effects to simulate 3D text.
 * Since SVG is 2D, this uses transforms and gradients to approximate 3D.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */
function render3dTextEffects(
  content: ReactNode,
  scene3d: Scene3d | undefined,
  shape3d: Shape3d | undefined,
  width: number,
  height: number,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: ReactNode) => void,
  hasDef: (id: string) => boolean,
): ReactNode {
  const centerX = width / 2;
  const centerY = height / 2;
  const elements: ReactNode[] = [];

  // Get camera transform
  const cameraPreset = scene3d?.camera?.preset ?? "orthographicFront";
  const cameraTransform = calculateCameraTransform(cameraPreset, scene3d?.camera?.fov);

  // Get light direction for bevel
  const lightDirection = scene3d?.lightRig?.direction ?? "tl";

  // Render extrusion effect (behind main text)
  if (shape3d?.extrusionHeight && shape3d.extrusionHeight > 0) {
    const extrusionLayers = renderTextExtrusion(
      content,
      shape3d.extrusionHeight as number,
      cameraPreset,
      centerX,
      centerY,
    );
    elements.push(extrusionLayers);
  }

  // Main text content with camera transform
  let mainContent = content;
  if (cameraTransform.transform !== "") {
    mainContent = (
      <g transform={`translate(${centerX}, ${centerY}) ${cameraTransform.transform} translate(${-centerX}, ${-centerY})`}>
        {content}
      </g>
    );
  }

  // Apply bevel effect (lighting gradient overlay)
  if (shape3d?.bevel) {
    const bevelFilterId = getNextId("text-bevel");
    if (!hasDef(bevelFilterId)) {
      addDef(bevelFilterId, createTextBevelFilterDef(shape3d.bevel, lightDirection, bevelFilterId));
    }
    mainContent = (
      <g filter={`url(#${bevelFilterId})`}>
        {mainContent}
      </g>
    );
  }

  elements.push(mainContent);

  return <>{elements}</>;
}

/**
 * Render extrusion layers for text.
 *
 * Creates multiple offset copies of the text to simulate depth.
 */
function renderTextExtrusion(
  content: ReactNode,
  extrusionHeight: number,
  cameraPreset: string,
  centerX: number,
  centerY: number,
): ReactNode {
  // Calculate extrusion direction based on camera
  const { offsetX, offsetY } = getExtrusionOffset(cameraPreset, extrusionHeight);

  // Create multiple layers for depth effect
  const layers = Math.min(Math.ceil(extrusionHeight / 3), 8);
  const elements: ReactNode[] = [];

  for (let i = layers; i > 0; i--) {
    const layerOffset = i / layers;
    const x = offsetX * layerOffset;
    const y = offsetY * layerOffset;
    const opacity = 0.4 + 0.3 * (1 - layerOffset);

    elements.push(
      <g
        key={`extrusion-${i}`}
        transform={`translate(${centerX}, ${centerY}) translate(${x}, ${y}) translate(${-centerX}, ${-centerY})`}
        opacity={opacity}
        style={{ fill: "#666666" }}
      >
        {content}
      </g>,
    );
  }

  return <>{elements}</>;
}

/**
 * Get extrusion offset direction based on camera.
 */
function getExtrusionOffset(
  camera: string,
  height: number,
): { offsetX: number; offsetY: number } {
  const depth = height * 0.5;

  switch (camera) {
    case "isometricTopUp":
    case "isometricTopDown":
      return { offsetX: depth * 0.5, offsetY: depth * 0.5 };
    case "obliqueTopLeft":
    case "perspectiveAboveLeftFacing":
      return { offsetX: -depth, offsetY: -depth };
    case "obliqueTopRight":
    case "perspectiveAboveRightFacing":
      return { offsetX: depth, offsetY: -depth };
    case "obliqueBottomLeft":
      return { offsetX: -depth, offsetY: depth };
    case "obliqueBottomRight":
      return { offsetX: depth, offsetY: depth };
    case "obliqueTop":
    case "perspectiveAbove":
      return { offsetX: 0, offsetY: -depth };
    case "obliqueBottom":
    case "perspectiveBelow":
      return { offsetX: 0, offsetY: depth };
    case "obliqueLeft":
    case "perspectiveLeft":
      return { offsetX: -depth, offsetY: 0 };
    case "obliqueRight":
    case "perspectiveRight":
      return { offsetX: depth, offsetY: 0 };
    default:
      return { offsetX: depth * 0.3, offsetY: depth * 0.3 };
  }
}

/**
 * Create SVG filter for text bevel effect.
 *
 * Uses Gaussian blur and compositing to simulate bevel edges.
 */
function createTextBevelFilterDef(
  bevel: { width: number; height: number; preset: string },
  lightDirection: string,
  id: string,
): ReactNode {
  const blurAmount = Math.min(bevel.width as number, bevel.height as number) / 3;

  // Calculate highlight/shadow offsets based on light direction
  const { highlightOffset, shadowOffset } = getBevelOffsets(lightDirection);

  return (
    <filter
      id={id}
      x="-20%"
      y="-20%"
      width="140%"
      height="140%"
    >
      {/* Create highlight (light edge) */}
      <feGaussianBlur in="SourceAlpha" stdDeviation={blurAmount / 2} result="blurAlpha" />
      <feOffset dx={highlightOffset.x} dy={highlightOffset.y} in="blurAlpha" result="highlightOffset" />
      <feFlood floodColor="white" floodOpacity="0.3" result="highlightColor" />
      <feComposite in="highlightColor" in2="highlightOffset" operator="in" result="highlight" />

      {/* Create shadow (dark edge) */}
      <feOffset dx={shadowOffset.x} dy={shadowOffset.y} in="blurAlpha" result="shadowOffset" />
      <feFlood floodColor="black" floodOpacity="0.25" result="shadowColor" />
      <feComposite in="shadowColor" in2="shadowOffset" operator="in" result="shadow" />

      {/* Merge all layers */}
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="highlight" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/**
 * Get bevel highlight and shadow offsets based on light direction.
 */
function getBevelOffsets(direction: string): {
  highlightOffset: { x: number; y: number };
  shadowOffset: { x: number; y: number };
} {
  switch (direction) {
    case "tl":
      return {
        highlightOffset: { x: -1, y: -1 },
        shadowOffset: { x: 1, y: 1 },
      };
    case "t":
      return {
        highlightOffset: { x: 0, y: -1 },
        shadowOffset: { x: 0, y: 1 },
      };
    case "tr":
      return {
        highlightOffset: { x: 1, y: -1 },
        shadowOffset: { x: -1, y: 1 },
      };
    case "l":
      return {
        highlightOffset: { x: -1, y: 0 },
        shadowOffset: { x: 1, y: 0 },
      };
    case "r":
      return {
        highlightOffset: { x: 1, y: 0 },
        shadowOffset: { x: -1, y: 0 },
      };
    case "bl":
      return {
        highlightOffset: { x: -1, y: 1 },
        shadowOffset: { x: 1, y: -1 },
      };
    case "b":
      return {
        highlightOffset: { x: 0, y: 1 },
        shadowOffset: { x: 0, y: -1 },
      };
    case "br":
      return {
        highlightOffset: { x: 1, y: 1 },
        shadowOffset: { x: -1, y: -1 },
      };
    default:
      return {
        highlightOffset: { x: -1, y: -1 },
        shadowOffset: { x: 1, y: 1 },
      };
  }
}

/**
 * Create SVG filter definition for text effects.
 *
 * Supports: shadow, glow, soft edge, and reflection effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */
/**
 * Resolve a Color to a hex string suitable for WebGL rendering.
 *
 * @param color - Color domain object
 * @param context - Color resolution context
 * @returns CSS hex color string with # prefix
 */
function resolveColorForWebGL(color: Color | undefined, context: ColorContext): string {
  if (!color) {
    return "#000000";
  }
  const resolved = resolveColor(color, context);
  return resolved ? `#${resolved}` : "#000000";
}

/**
 * Extract Text3DRunConfig array from TextBody.
 *
 * Converts each text run to a 3D run configuration with its own styling.
 * This enables proper 3D rendering of text with mixed styles.
 */
function extractText3DRuns(
  textBody: TextBody,
  colorContext: ColorContext,
  fontScheme: FontScheme | undefined,
): Text3DRunConfig[] {
  const runs: Text3DRunConfig[] = [];
  const defaultFontFamily = fontScheme?.majorFont?.latin ?? "Arial";

  for (const paragraph of textBody.paragraphs) {
    const defaultRunProps = paragraph.properties.defaultRunProperties;

    for (const run of paragraph.runs) {
      // Skip line breaks for 3D rendering (TODO: handle multiline properly)
      if (run.type === "break") {
        continue;
      }

      // Get text content
      const text = run.type === "text" || run.type === "field" ? run.text : "";
      if (text.length === 0) {
        continue;
      }

      // Get run properties, falling back to paragraph defaults
      const runProps = run.properties ?? defaultRunProps;

      // Extract styling with fallbacks
      const fontSize = runProps?.fontSize
        ? (runProps.fontSize as number) * PT_TO_PX
        : 24;
      const fontFamily = runProps?.fontFamily ?? defaultFontFamily;
      const fontWeight = runProps?.bold === true ? 700 : 400;
      const fontStyle = runProps?.italic === true ? "italic" : "normal";
      const color = runProps?.color
        ? resolveColorForWebGL(runProps.color, colorContext)
        : "#000000";

      runs.push({
        text,
        color,
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
      });
    }
  }

  return runs;
}

function createTextEffectsFilterDef(
  effects: TextEffectsConfig,
  id: string,
): ReactNode {
  const hasShadow = effects.shadow !== undefined;
  const hasGlow = effects.glow !== undefined;
  const hasSoftEdge = effects.softEdge !== undefined;
  const hasReflection = effects.reflection !== undefined;

  // Determine filter bounds based on effects
  // Larger bounds needed for glow and shadow
  const filterPadding = "-50%";
  const filterSize = "200%";

  return (
    <filter
      id={id}
      x={filterPadding}
      y={filterPadding}
      width={filterSize}
      height={filterSize}
    >
      {/* Glow effect (rendered behind everything) */}
      {hasGlow && effects.glow && (
        <>
          <feGaussianBlur
            in="SourceAlpha"
            stdDeviation={effects.glow.radius / 2}
            result="glowBlur"
          />
          <feFlood
            floodColor={effects.glow.color}
            floodOpacity={effects.glow.opacity}
            result="glowColor"
          />
          <feComposite
            in="glowColor"
            in2="glowBlur"
            operator="in"
            result="glow"
          />
        </>
      )}

      {/* Shadow effect */}
      {hasShadow && effects.shadow && effects.shadow.type === "outer" && (
        <feDropShadow
          dx={effects.shadow.dx}
          dy={effects.shadow.dy}
          stdDeviation={effects.shadow.blurRadius / 2}
          floodColor={effects.shadow.color}
          floodOpacity={effects.shadow.opacity}
          result="shadow"
        />
      )}

      {/* Inner shadow (more complex) */}
      {hasShadow && effects.shadow && effects.shadow.type === "inner" && (
        <>
          <feGaussianBlur
            in="SourceAlpha"
            stdDeviation={effects.shadow.blurRadius / 2}
            result="innerBlur"
          />
          <feOffset
            dx={effects.shadow.dx}
            dy={effects.shadow.dy}
            result="innerOffset"
          />
          <feFlood
            floodColor={effects.shadow.color}
            floodOpacity={effects.shadow.opacity}
            result="innerColor"
          />
          <feComposite
            in="innerColor"
            in2="innerOffset"
            operator="in"
            result="innerShadow"
          />
          <feComposite
            in="innerShadow"
            in2="SourceAlpha"
            operator="in"
            result="innerClipped"
          />
        </>
      )}

      {/* Soft edge effect */}
      {hasSoftEdge && effects.softEdge && (
        <>
          <feGaussianBlur
            in="SourceAlpha"
            stdDeviation={effects.softEdge.radius / 2}
            result="softBlur"
          />
          <feComposite
            in="SourceGraphic"
            in2="softBlur"
            operator="in"
            result="softEdge"
          />
        </>
      )}

      {/* Reflection effect */}
      {hasReflection && effects.reflection && (
        <>
          {/* Create flipped copy */}
          <feOffset
            in="SourceGraphic"
            dy={effects.reflection.distance}
            result="reflectOffset"
          />
          <feGaussianBlur
            in="reflectOffset"
            stdDeviation={effects.reflection.blurRadius / 2}
            result="reflectBlur"
          />
          {/* Apply gradient fade */}
          <feComponentTransfer in="reflectBlur" result="reflectFade">
            <feFuncA
              type="linear"
              slope={effects.reflection.endOpacity / 100}
              intercept={0}
            />
          </feComponentTransfer>
        </>
      )}

      {/* Merge all effects */}
      <feMerge>
        {hasGlow && <feMergeNode in="glow" />}
        {hasShadow && effects.shadow?.type === "outer" && <feMergeNode in="shadow" />}
        {hasReflection && <feMergeNode in="reflectFade" />}
        <feMergeNode in={hasSoftEdge ? "softEdge" : (hasShadow && effects.shadow?.type === "inner" ? "innerClipped" : "SourceGraphic")} />
        {hasShadow && effects.shadow?.type === "inner" && !hasSoftEdge && <feMergeNode in="SourceGraphic" />}
      </feMerge>
    </filter>
  );
}
