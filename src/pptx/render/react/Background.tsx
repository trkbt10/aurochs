/**
 * @file Background Renderer
 *
 * Renders slide backgrounds as React SVG elements.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import type { ReactNode } from "react";
import type { Background as BackgroundType, SlideSize } from "../../domain";
import type { ResolvedBackgroundFill } from "../context";
import { useRenderContext } from "./context";
import { useSvgDefs } from "./hooks/useSvgDefs";
import { resolveFill } from "../core/fill";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for BackgroundRenderer (using resolved background)
 */
export type ResolvedBackgroundRendererProps = {
  /** Pre-resolved background fill */
  readonly resolvedBackground: ResolvedBackgroundFill;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
};

/**
 * Props for BackgroundRenderer (using Background domain object)
 */
export type BackgroundRendererProps = {
  /** Background definition */
  readonly background?: BackgroundType;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
};

// =============================================================================
// Components
// =============================================================================

/**
 * Render pre-resolved background.
 * Used when background has been resolved through inheritance chain.
 */
export function ResolvedBackgroundRenderer({
  resolvedBackground,
  slideSize,
}: ResolvedBackgroundRendererProps) {
  const { width, height } = slideSize;
  const { getNextId, addDef, hasDef } = useSvgDefs();

  switch (resolvedBackground.type) {
    case "solid":
      return (
        <rect
          width={width as number}
          height={height as number}
          fill={resolvedBackground.color}
        />
      );

    case "gradient": {
      const gradId = getNextId("bg-grad");
      if (!hasDef(gradId)) {
        addDef(gradId, createGradientDef(resolvedBackground, gradId));
      }
      return (
        <rect
          width={width as number}
          height={height as number}
          fill={`url(#${gradId})`}
        />
      );
    }

    case "image": {
      const aspectRatio = resolvedBackground.mode === "stretch" ? "none" : "xMidYMid slice";
      return (
        <image
          href={resolvedBackground.dataUrl}
          width={width as number}
          height={height as number}
          preserveAspectRatio={aspectRatio}
        />
      );
    }
  }
}

/**
 * Render background from Background domain object.
 */
export function BackgroundRenderer({
  background,
  slideSize,
}: BackgroundRendererProps) {
  const { width, height } = slideSize;
  const { colorContext, resources, warnings } = useRenderContext();
  const { getNextId, addDef, hasDef } = useSvgDefs();

  // Default white background
  if (background === undefined || background.fill === undefined) {
    return (
      <rect
        width={width as number}
        height={height as number}
        fill="#ffffff"
      />
    );
  }

  const fill = background.fill;

  switch (fill.type) {
    case "noFill":
      return (
        <rect
          width={width as number}
          height={height as number}
          fill="transparent"
        />
      );

    case "solidFill": {
      const resolved = resolveFill(fill, colorContext);
      const fillColor = resolved.type === "solid" ? `#${resolved.color.hex}` : "#ffffff";
      return (
        <rect
          width={width as number}
          height={height as number}
          fill={fillColor}
        />
      );
    }

    case "gradientFill": {
      const resolved = resolveFill(fill, colorContext);
      if (resolved.type === "gradient" && resolved.stops.length > 0) {
        const gradId = getNextId("bg-grad");
        if (!hasDef(gradId)) {
          addDef(gradId, createCoreGradientDef(resolved, gradId));
        }
        return (
          <rect
            width={width as number}
            height={height as number}
            fill={`url(#${gradId})`}
          />
        );
      }
      return (
        <rect
          width={width as number}
          height={height as number}
          fill="#ffffff"
        />
      );
    }

    case "blipFill": {
      const imagePath = resources.resolve(fill.resourceId);
      if (imagePath !== undefined) {
        const aspectRatio = fill.stretch !== undefined ? "none" : "xMidYMid slice";
        return (
          <image
            href={imagePath}
            width={width as number}
            height={height as number}
            preserveAspectRatio={aspectRatio}
          />
        );
      }
      return (
        <rect
          width={width as number}
          height={height as number}
          fill="#ffffff"
        />
      );
    }

    case "patternFill":
    case "groupFill":
    default:
      warnings.add({
        type: "unsupported",
        message: `Unsupported background fill type: ${fill.type}`,
      });
      return (
        <rect
          width={width as number}
          height={height as number}
          fill="#ffffff"
        />
      );
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

type GradientStop = { position: number; color: string };

/**
 * Create gradient definition element from resolved background
 */
function createGradientDef(
  resolved: { stops: readonly GradientStop[]; angle: number; isRadial?: boolean; radialCenter?: { cx: number; cy: number } },
  id: string,
): ReactNode {
  const stops = resolved.stops.map((s, i) => (
    <stop key={i} offset={`${s.position}%`} stopColor={s.color} />
  ));

  if (resolved.isRadial === true) {
    const cx = resolved.radialCenter?.cx ?? 50;
    const cy = resolved.radialCenter?.cy ?? 50;
    return (
      <radialGradient
        id={id}
        cx={`${cx}%`}
        cy={`${cy}%`}
        r="70.7%"
        fx={`${cx}%`}
        fy={`${cy}%`}
      >
        {stops}
      </radialGradient>
    );
  }

  // Linear gradient
  const x1 = 50 - 50 * Math.cos((resolved.angle * Math.PI) / 180);
  const y1 = 50 - 50 * Math.sin((resolved.angle * Math.PI) / 180);
  const x2 = 50 + 50 * Math.cos((resolved.angle * Math.PI) / 180);
  const y2 = 50 + 50 * Math.sin((resolved.angle * Math.PI) / 180);

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
 * Create gradient definition from core ResolvedGradientFill
 */
function createCoreGradientDef(
  resolved: { stops: readonly { color: { hex: string; alpha: number }; position: number }[]; angle: number; isRadial: boolean; radialCenter?: { cx: number; cy: number } },
  id: string,
): ReactNode {
  const stops = resolved.stops.map((s, i) => (
    <stop
      key={i}
      offset={`${s.position}%`}
      stopColor={`#${s.color.hex}`}
      stopOpacity={s.color.alpha < 1 ? s.color.alpha : undefined}
    />
  ));

  if (resolved.isRadial) {
    const cx = resolved.radialCenter?.cx ?? 50;
    const cy = resolved.radialCenter?.cy ?? 50;
    return (
      <radialGradient
        id={id}
        cx={`${cx}%`}
        cy={`${cy}%`}
        r="70.7%"
        fx={`${cx}%`}
        fy={`${cy}%`}
      >
        {stops}
      </radialGradient>
    );
  }

  // Linear gradient - convert OOXML angle to SVG coordinates
  const rad = ((resolved.angle - 90) * Math.PI) / 180;
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
