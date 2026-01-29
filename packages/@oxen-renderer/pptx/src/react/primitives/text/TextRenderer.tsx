/**
 * @file Text Renderer Component
 *
 * Main React component for rendering text content as SVG elements.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

import { useMemo } from "react";
import type { TextBody } from "@oxen-office/pptx/domain/text";
import { layoutTextBody, toLayoutInput } from "../../../text-layout";
import { createLayoutParagraphMeasurer } from "../../text-measure/layout-bridge";
import { px, deg } from "@oxen-office/ooxml/domain/units";
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
type ApplyBodyRotationArgs = [content: React.ReactNode, rotation: number, width: number, height: number];

function applyBodyRotation(...args: ApplyBodyRotationArgs): React.ReactNode {
  const [content, rotation, width, height] = args;
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
type ApplyOverflowClipArgs = [
  content: React.ReactNode,
  width: number,
  height: number,
  clipId: string,
  addDef: (id: string, content: React.ReactNode) => void,
  hasDef: (id: string) => boolean,
];

function applyOverflowClip(...args: ApplyOverflowClipArgs): React.ReactNode {
  const [content, width, height, clipId, addDef, hasDef] = args;
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
 * Apply vertical text transformation based on verticalType.
 *
 * Per ECMA-376 Part 1, Section 21.1.2.1.39:
 * - "vert": 90 degree clockwise rotation, text flows top-to-bottom
 * - "vert270": 270 degree (or -90) rotation
 * - "eaVert": Same as vert, but CJK glyphs may remain upright
 * - "wordArtVert": Characters stacked vertically (no rotation)
 * - "mongolianVert": Similar to wordArtVert
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.39 (ST_TextVerticalType)
 */
type ApplyVerticalTextTransformArgs = [
  content: React.ReactNode,
  bodyProps: TextBody["bodyProperties"],
  width: number,
  height: number,
];

function applyVerticalTextTransform(...args: ApplyVerticalTextTransformArgs): React.ReactNode {
  const [content, bodyProps, width, height] = args;
  const verticalType = bodyProps.verticalType ?? "horz";

  if (verticalType === "horz") {
    return content;
  }

  // CSS-based upright mode (glyphs remain upright in vertical layout)
  if (bodyProps.upright === true) {
    return (
      <g style={{ textOrientation: "upright", writingMode: "vertical-rl" }}>
        {content}
      </g>
    );
  }

  // SVG transform-based vertical text
  switch (verticalType) {
    case "vert":
    case "eaVert": {
      // 90° clockwise: translate to right edge, then rotate
      // The layout engine swapped dimensions, so we use original width (now height) for translation
      return (
        <g transform={`translate(${width}, 0) rotate(90)`}>
          {content}
        </g>
      );
    }
    case "vert270": {
      // -90° (270°): translate to bottom edge, then rotate
      return (
        <g transform={`translate(0, ${height}) rotate(-90)`}>
          {content}
        </g>
      );
    }
    case "wordArtVert":
    case "mongolianVert":
    case "wordArtVertRtl": {
      // Characters stacked vertically - use CSS approach
      return (
        <g style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
          {content}
        </g>
      );
    }
    default:
      return content;
  }
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
  const finalContent = applyTextTransforms({
    content,
    textBody,
    width,
    height,
    scene3d,
    shape3d,
    defs,
  });

  return <>{finalContent}</>;
}

/**
 * Render text using WebGL 3D renderer.
 */
type RenderWebGL3DTextArgs = [
  textBody: TextBody,
  width: number,
  height: number,
  colorContext: Parameters<typeof extractText3DRuns>[3],
  fontScheme: Parameters<typeof extractText3DRuns>[4],
  options: Parameters<typeof extractText3DRuns>[5],
  resources: { resolve: (id: string) => string | undefined },
  scene3d: TextBody["bodyProperties"]["scene3d"],
  shape3d: TextBody["bodyProperties"]["shape3d"],
];

function renderWebGL3DText(...args: RenderWebGL3DTextArgs): React.ReactNode {
  const [textBody, width, height, colorContext, fontScheme, options, resources, scene3d, shape3d] = args;
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
type ApplyTextTransformsArgs = {
  readonly content: React.ReactNode;
  readonly textBody: TextBody;
  readonly width: number;
  readonly height: number;
  readonly scene3d: TextBody["bodyProperties"]["scene3d"];
  readonly shape3d: TextBody["bodyProperties"]["shape3d"];
  readonly defs: {
    readonly getNextId: (prefix: string) => string;
    readonly addDef: (id: string, content: React.ReactNode) => void;
    readonly hasDef: (id: string) => boolean;
  };
};

function applyTextTransforms(args: ApplyTextTransformsArgs): React.ReactNode {
  const { content, textBody, width, height, scene3d, shape3d, defs } = args;
  const bodyProps = textBody.bodyProperties;

  // Get body rotation
  const bodyRotation = bodyProps.rotation ?? deg(0);

  // Apply body rotation
  const rotatedContent = applyBodyRotation(content, bodyRotation, width, height);

  // Apply 3D transforms (scene3d/shape3d) - uses SVG fallback if WebGL not used
  const content3d = apply3dEffectsIfNeeded({
    content: rotatedContent,
    scene3d,
    shape3d,
    width,
    height,
    defs,
  });

  // Apply overflow clip
  const clippedContent = applyOverflowClipIfNeeded({
    content: content3d,
    bodyProps,
    width,
    height,
    defs,
  });

  // Apply force anti-alias
  const antiAliasedContent = applyAntiAliasIfNeeded(clippedContent, bodyProps);

  // Apply vertical text transform
  const finalContent = applyVerticalTextTransform(antiAliasedContent, bodyProps, width, height);

  return finalContent;
}

/**
 * Apply 3D effects if scene3d/shape3d are present.
 */
type Apply3dEffectsIfNeededArgs = {
  readonly content: React.ReactNode;
  readonly scene3d: TextBody["bodyProperties"]["scene3d"];
  readonly shape3d: TextBody["bodyProperties"]["shape3d"];
  readonly width: number;
  readonly height: number;
  readonly defs: ApplyTextTransformsArgs["defs"];
};

function apply3dEffectsIfNeeded(args: Apply3dEffectsIfNeededArgs): React.ReactNode {
  const { content, scene3d, shape3d, width, height, defs } = args;
  if (!has3dEffects(scene3d, shape3d)) {
    return content;
  }

  return render3dTextEffects({ content, scene3d, shape3d, width, height, defs });
}

/**
 * Apply overflow clip if needed.
 */
type ApplyOverflowClipIfNeededArgs = {
  readonly content: React.ReactNode;
  readonly bodyProps: TextBody["bodyProperties"];
  readonly width: number;
  readonly height: number;
  readonly defs: ApplyTextTransformsArgs["defs"];
};

function applyOverflowClipIfNeeded(args: ApplyOverflowClipIfNeededArgs): React.ReactNode {
  const { content, bodyProps, width, height, defs } = args;
  const horzOverflow = bodyProps.overflow;
  const vertOverflow = bodyProps.verticalOverflow ?? "overflow";

  if (horzOverflow !== "clip" && vertOverflow !== "clip") {
    return content;
  }

  return applyOverflowClip(content, width, height, defs.getNextId("text-clip"), defs.addDef, defs.hasDef);
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
