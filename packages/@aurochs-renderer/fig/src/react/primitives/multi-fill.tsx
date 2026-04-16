/**
 * @file Multi-paint fill layer rendering for React
 *
 * When a node has multiple fills (multi-paint), each fill is rendered
 * as a separate stacked shape element. This is the React SoT for
 * multi-fill layer rendering.
 *
 * Figma stacks fills bottom-to-top: fills[0] is bottommost.
 * Each fill layer can have its own blend mode (paint-level blend).
 */

import type { ReactNode } from "react";
import type { ResolvedFillLayer } from "../../scene-graph/render-tree";
import type { ResolvedStrokeAttrs, ResolvedStrokeLayer } from "../../scene-graph/render";
import type { CornerRadius, BlendMode } from "../../scene-graph/types";
import { RectShape } from "./rect-shape";

function blendModeStyle(bm: BlendMode | undefined): React.CSSProperties | undefined {
  return bm ? { mixBlendMode: bm as React.CSSProperties["mixBlendMode"] } : undefined;
}

type MultiFillRectLayersProps = {
  readonly layers: readonly ResolvedFillLayer[];
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
  readonly stroke?: ResolvedStrokeAttrs;
};

export function MultiFillRectLayers({ layers, width, height, cornerRadius, stroke }: MultiFillRectLayersProps): ReactNode {
  return (
    <>
      {layers.map((layer, i) => (
        <RectShape
          key={i}
          width={width}
          height={height}
          cornerRadius={cornerRadius}
          fill={layer.attrs.fill}
          fillOpacity={layer.attrs.fillOpacity}
          style={blendModeStyle(layer.blendMode)}
          {...(i === layers.length - 1 && stroke ? stroke : {})}
        />
      ))}
    </>
  );
}

type MultiFillEllipseLayersProps = {
  readonly layers: readonly ResolvedFillLayer[];
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly stroke?: ResolvedStrokeAttrs;
};

export function MultiFillEllipseLayers({ layers, cx, cy, rx, ry, stroke }: MultiFillEllipseLayersProps): ReactNode {
  return (
    <>
      {layers.map((layer, i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={layer.attrs.fill}
          fillOpacity={layer.attrs.fillOpacity}
          style={blendModeStyle(layer.blendMode)}
          {...(i === layers.length - 1 && stroke ? stroke : {})}
        />
      ))}
    </>
  );
}

type MultiFillPathLayersProps = {
  readonly layers: readonly ResolvedFillLayer[];
  readonly paths: readonly { d: string; fillRule?: "evenodd" }[];
  readonly stroke?: ResolvedStrokeAttrs;
};

export function MultiFillPathLayers({ layers, paths, stroke }: MultiFillPathLayersProps): ReactNode {
  const elements: ReactNode[] = [];
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const sAttrs = li === layers.length - 1 && stroke ? stroke : {};
    for (let pi = 0; pi < paths.length; pi++) {
      const p = paths[pi];
      elements.push(
        <path
          key={`${li}-${pi}`}
          d={p.d}
          fillRule={p.fillRule}
          fill={layer.attrs.fill}
          fillOpacity={layer.attrs.fillOpacity}
          style={blendModeStyle(layer.blendMode)}
          {...sAttrs}
        />,
      );
    }
  }
  return <>{elements}</>;
}

// =============================================================================
// Multi-stroke Layer Components
// =============================================================================

type MultiStrokeRectLayersProps = {
  readonly layers: readonly ResolvedStrokeLayer[];
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
};

export function MultiStrokeRectLayers({ layers, width, height, cornerRadius }: MultiStrokeRectLayersProps): ReactNode {
  return (
    <>
      {layers.map((layer, i) => (
        <RectShape
          key={`stroke-${i}`}
          width={width}
          height={height}
          cornerRadius={cornerRadius}
          fill="none"
          style={blendModeStyle(layer.blendMode)}
          {...layer.attrs}
        />
      ))}
    </>
  );
}

type MultiStrokeEllipseLayersProps = {
  readonly layers: readonly ResolvedStrokeLayer[];
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
};

export function MultiStrokeEllipseLayers({ layers, cx, cy, rx, ry }: MultiStrokeEllipseLayersProps): ReactNode {
  return (
    <>
      {layers.map((layer, i) => (
        <ellipse
          key={`stroke-${i}`}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          style={blendModeStyle(layer.blendMode)}
          {...layer.attrs}
        />
      ))}
    </>
  );
}

type MultiStrokePathLayersProps = {
  readonly layers: readonly ResolvedStrokeLayer[];
  readonly paths: readonly { d: string; fillRule?: "evenodd" }[];
};

export function MultiStrokePathLayers({ layers, paths }: MultiStrokePathLayersProps): ReactNode {
  const elements: ReactNode[] = [];
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    for (let pi = 0; pi < paths.length; pi++) {
      const p = paths[pi];
      elements.push(
        <path
          key={`stroke-${li}-${pi}`}
          d={p.d}
          fillRule={p.fillRule}
          fill="none"
          style={blendModeStyle(layer.blendMode)}
          {...layer.attrs}
        />,
      );
    }
  }
  return <>{elements}</>;
}
