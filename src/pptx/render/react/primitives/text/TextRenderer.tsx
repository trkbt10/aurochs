/**
 * @file Text Renderer Component
 *
 * Main React component for rendering text content as SVG elements.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

import { useMemo } from "react";
import type { TextBody } from "../../../../domain/text";
import { layoutTextBody, toLayoutInput } from "../../../text-layout";
import { createLayoutParagraphMeasurer } from "../../text-measure/layout-bridge";
import { px, deg } from "../../../../domain/types";
import { useRenderContext } from "../../context";
import { useSvgDefs } from "../../hooks/useSvgDefs";
import { has3dEffects } from "../../../svg/effects3d";
import { Text3DRenderer, shouldRender3DText } from "../../../webgl/text3d";
import { render3dTextEffects } from "../../drawing-ml/text-3d";
import { renderLayoutResult } from "./layout-render";
import { extractText3DRuns } from "./extract-3d-runs";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for TextRenderer component
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
// Content Wrappers
// =============================================================================

/**
 * Apply body rotation transform.
 */
function applyBodyRotation(
  content: React.ReactNode,
  rotation: number,
  width: number,
  height: number,
): React.ReactNode {
  if (rotation === 0) {
    return content;
  }

  const centerX = width / 2;
  const centerY = height / 2;

  return (
    <g transform={`rotate(${rotation}, ${centerX}, ${centerY})`}>
      {content}
    </g>
  );
}

/**
 * Apply overflow clip.
 */
function applyOverflowClip(
  content: React.ReactNode,
  width: number,
  height: number,
  clipId: string,
  addDef: (id: string, content: React.ReactNode) => void,
  hasDef: (id: string) => boolean,
): React.ReactNode {
  if (!hasDef(clipId)) {
    addDef(
      clipId,
      <clipPath id={clipId}>
        <rect x={0} y={0} width={width} height={height} />
      </clipPath>,
    );
  }

  return (
    <g clipPath={`url(#${clipId})`}>{content}</g>
  );
}

/**
 * Apply force anti-alias.
 */
function applyForceAntiAlias(content: React.ReactNode): React.ReactNode {
  return (
    <g textRendering="geometricPrecision">{content}</g>
  );
}

/**
 * Apply upright text for vertical types.
 */
function applyUprightText(content: React.ReactNode): React.ReactNode {
  return (
    <g style={{ textOrientation: "upright", writingMode: "vertical-rl" }}>
      {content}
    </g>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Renders text content as React SVG elements.
 *
 * When complex 3D effects are present (bevel, extrusion, non-front camera),
 * uses WebGL rendering via Three.js for true 3D output.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */
export function TextRenderer({ textBody, width, height }: TextRendererProps) {
  const { colorContext, fontScheme, options, resources } = useRenderContext();
  const { getNextId, addDef, hasDef } = useSvgDefs();
  const paragraphMeasurer = useMemo(() => createLayoutParagraphMeasurer(), []);

  if (textBody.paragraphs.length === 0) {
    return null;
  }

  // Check if WebGL 3D rendering should be used
  const scene3d = textBody.bodyProperties.scene3d;
  const shape3d = textBody.bodyProperties.shape3d;
  const useWebGL3D = options?.enable3DText !== false && shouldRender3DText(scene3d, shape3d);

  if (useWebGL3D) {
    return renderWebGL3DText(textBody, width, height, colorContext, fontScheme, options, resources, scene3d, shape3d);
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
  const layoutResult = layoutTextBody({
    ...layoutInput,
    measureParagraph: paragraphMeasurer ?? undefined,
  });

  // Render layout result
  const defs = { getNextId, addDef, hasDef };
  const content = renderLayoutResult(layoutResult, defs);

  // Apply transforms and effects
  const finalContent = applyTextTransforms(
    content,
    textBody,
    width,
    height,
    scene3d,
    shape3d,
    getNextId,
    addDef,
    hasDef,
  );

  return <>{finalContent}</>;
}

/**
 * Render text using WebGL 3D renderer.
 */
function renderWebGL3DText(
  textBody: TextBody,
  width: number,
  height: number,
  colorContext: Parameters<typeof extractText3DRuns>[3],
  fontScheme: Parameters<typeof extractText3DRuns>[4],
  options: Parameters<typeof extractText3DRuns>[5],
  resources: { resolve: (id: string) => string | undefined },
  scene3d: TextBody["bodyProperties"]["scene3d"],
  shape3d: TextBody["bodyProperties"]["shape3d"],
): React.ReactNode {
  const resourceResolver = (resourceId: string) => resources.resolve(resourceId);
  const runs = extractText3DRuns(
    textBody,
    width,
    height,
    colorContext,
    fontScheme,
    options,
    resourceResolver,
  );

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

/**
 * Apply all text transforms and effects.
 */
function applyTextTransforms(
  content: React.ReactNode,
  textBody: TextBody,
  width: number,
  height: number,
  scene3d: TextBody["bodyProperties"]["scene3d"],
  shape3d: TextBody["bodyProperties"]["shape3d"],
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: React.ReactNode) => void,
  hasDef: (id: string) => boolean,
): React.ReactNode {
  const bodyProps = textBody.bodyProperties;

  // Get body rotation
  const bodyRotation = bodyProps.rotation ?? deg(0);

  // Apply body rotation
  const rotatedContent = applyBodyRotation(content, bodyRotation, width, height);

  // Apply 3D transforms (scene3d/shape3d) - uses SVG fallback if WebGL not used
  const content3d = apply3dEffectsIfNeeded(
    rotatedContent,
    scene3d,
    shape3d,
    width,
    height,
    getNextId,
    addDef,
    hasDef,
  );

  // Apply overflow clip
  const clippedContent = applyOverflowClipIfNeeded(
    content3d,
    bodyProps,
    width,
    height,
    getNextId,
    addDef,
    hasDef,
  );

  // Apply force anti-alias
  const antiAliasedContent = applyAntiAliasIfNeeded(clippedContent, bodyProps);

  // Apply upright text
  const finalContent = applyUprightIfNeeded(antiAliasedContent, bodyProps);

  return finalContent;
}

/**
 * Apply 3D effects if scene3d/shape3d are present.
 */
function apply3dEffectsIfNeeded(
  content: React.ReactNode,
  scene3d: TextBody["bodyProperties"]["scene3d"],
  shape3d: TextBody["bodyProperties"]["shape3d"],
  width: number,
  height: number,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: React.ReactNode) => void,
  hasDef: (id: string) => boolean,
): React.ReactNode {
  if (!has3dEffects(scene3d, shape3d)) {
    return content;
  }

  return render3dTextEffects(content, scene3d, shape3d, width, height, getNextId, addDef, hasDef);
}

/**
 * Apply overflow clip if needed.
 */
function applyOverflowClipIfNeeded(
  content: React.ReactNode,
  bodyProps: TextBody["bodyProperties"],
  width: number,
  height: number,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: React.ReactNode) => void,
  hasDef: (id: string) => boolean,
): React.ReactNode {
  const horzOverflow = bodyProps.overflow;
  const vertOverflow = bodyProps.verticalOverflow ?? "overflow";

  if (horzOverflow !== "clip" && vertOverflow !== "clip") {
    return content;
  }

  return applyOverflowClip(content, width, height, getNextId("text-clip"), addDef, hasDef);
}

/**
 * Apply anti-alias if enabled.
 */
function applyAntiAliasIfNeeded(
  content: React.ReactNode,
  bodyProps: TextBody["bodyProperties"],
): React.ReactNode {
  if (bodyProps.forceAntiAlias !== true) {
    return content;
  }

  return applyForceAntiAlias(content);
}

/**
 * Apply upright text if needed for vertical types.
 */
function applyUprightIfNeeded(
  content: React.ReactNode,
  bodyProps: TextBody["bodyProperties"],
): React.ReactNode {
  if (bodyProps.upright !== true || bodyProps.verticalType === "horz") {
    return content;
  }

  return applyUprightText(content);
}
