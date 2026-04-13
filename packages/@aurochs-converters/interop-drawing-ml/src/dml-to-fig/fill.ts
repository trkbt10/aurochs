/**
 * @file DrawingML BaseFill → FigPaint[]
 *
 * PPTX has a single fill. Fig has an array of paints.
 * We produce a one-element array, or empty for noFill.
 *
 * solidFill → FigSolidPaint
 * gradientFill (linear) → FigGradientPaint GRADIENT_LINEAR
 * gradientFill (path: circle) → FigGradientPaint GRADIENT_RADIAL
 * blipFill → FigImagePaint
 * patternFill → FigSolidPaint using foreground color (approximation)
 * noFill / groupFill → []
 */

import type {
  BaseFill, SolidFill, GradientFill, GradientStop,
  BlipFill, PatternFill,
} from "@aurochs-office/drawing-ml/domain/fill";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type {
  FigPaint, FigSolidPaint, FigGradientPaint,
  FigImagePaint, FigGradientStop, FigVector,
} from "@aurochs/fig/types";
import { dmlColorToFig } from "./color";

export function dmlFillToFig(
  fill: BaseFill | undefined,
  colorContext?: ColorContext,
): readonly FigPaint[] {
  if (!fill) return [];

  switch (fill.type) {
    case "solidFill":
      return [convertSolid(fill, colorContext)];
    case "gradientFill":
      return [convertGradient(fill, colorContext)];
    case "blipFill":
      return [convertBlip(fill)];
    case "patternFill":
      return [convertPattern(fill, colorContext)];
    case "noFill":
    case "groupFill":
    default:
      return [];
  }
}

function convertSolid(fill: SolidFill, ctx?: ColorContext): FigSolidPaint {
  return {
    type: "SOLID",
    visible: true,
    opacity: 1,
    color: dmlColorToFig(fill.color, ctx),
  };
}

function convertGradient(fill: GradientFill, ctx?: ColorContext): FigGradientPaint {
  const stops = fill.stops.map((s): FigGradientStop => ({
    position: (s.position) / 100,
    color: dmlColorToFig(s.color, ctx),
  }));

  if (fill.linear) {
    return convertLinear(fill, stops);
  }
  if (fill.path) {
    return convertPath(fill, stops);
  }
  return convertLinear(fill, stops);
}

function convertLinear(fill: GradientFill, stops: readonly FigGradientStop[]): FigGradientPaint {
  const angleDeg = (fill.linear?.angle ?? 0);
  const angleRad = angleDeg * (Math.PI / 180);
  const dx = Math.cos(angleRad) * 0.5;
  const dy = Math.sin(angleRad) * 0.5;

  const handles: readonly FigVector[] = [
    { x: 0.5 - dx, y: 0.5 - dy },
    { x: 0.5 + dx, y: 0.5 + dy },
    { x: 0.5 - dy, y: 0.5 + dx },
  ];

  return {
    type: "GRADIENT_LINEAR",
    visible: true,
    opacity: 1,
    gradientHandlePositions: handles,
    gradientStops: stops,
  };
}

function convertPath(fill: GradientFill, stops: readonly FigGradientStop[]): FigGradientPaint {
  const rect = fill.path?.fillToRect;
  const cx = rect ? (rect.left) / 100 : 0.5;
  const cy = rect ? (rect.top) / 100 : 0.5;

  const handles: readonly FigVector[] = [
    { x: cx, y: cy },
    { x: 1, y: cy },
    { x: cx, y: 0 },
  ];

  return {
    type: "GRADIENT_RADIAL",
    visible: true,
    opacity: 1,
    gradientHandlePositions: handles,
    gradientStops: stops,
  };
}

function convertBlip(fill: BlipFill): FigImagePaint {
  return {
    type: "IMAGE",
    visible: true,
    opacity: 1,
    imageRef: fill.resourceId,
    scaleMode: fill.stretch ? "FILL" : fill.tile ? "TILE" : "FILL",
  };
}

function convertPattern(fill: PatternFill, ctx?: ColorContext): FigSolidPaint {
  return {
    type: "SOLID",
    visible: true,
    opacity: 1,
    color: dmlColorToFig(fill.foregroundColor, ctx),
  };
}
