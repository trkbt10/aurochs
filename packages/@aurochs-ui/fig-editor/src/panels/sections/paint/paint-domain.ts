/** @file Paint editing domain shared by fill and stroke property sections. */
/* eslint-disable jsdoc/require-jsdoc -- Exported operation names form the paint mutation contract and are covered by colocated specs. */

import type { FigColor, FigImageScaleMode, FigPaint, FigPaintType } from "@aurochs/fig/types";

export type PaintListKind = "fill" | "stroke";

export type PaintOperation =
  | { readonly type: "set-color"; readonly hex: string }
  | { readonly type: "set-opacity"; readonly opacity: number }
  | { readonly type: "set-type"; readonly paintType: FigPaint["type"]; readonly kind: PaintListKind }
  | { readonly type: "set-image-ref"; readonly imageRef: string }
  | { readonly type: "set-image-scale-mode"; readonly scaleMode: FigImageScaleMode }
  | { readonly type: "set-image-scale"; readonly scale: number }
  | { readonly type: "set-image-rotation-deg"; readonly rotationDeg: number }
  | { readonly type: "replace"; readonly paint: FigPaint };

export type PaintListOperation =
  | { readonly type: "update"; readonly index: number; readonly operation: PaintOperation }
  | { readonly type: "remove"; readonly index: number }
  | { readonly type: "add"; readonly kind: PaintListKind };

export const paintTypeOptions = [
  { value: "SOLID", label: "Solid" },
  { value: "GRADIENT_LINEAR", label: "Linear" },
  { value: "GRADIENT_RADIAL", label: "Radial" },
  { value: "GRADIENT_ANGULAR", label: "Angular" },
  { value: "GRADIENT_DIAMOND", label: "Diamond" },
  { value: "IMAGE", label: "Image" },
] as const;

export function colorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

export function getPaintColor(paint: FigPaint): FigColor | undefined {
  if ("color" in paint && paint.color) {
    return paint.color;
  }
  return undefined;
}

export function getPaintOpacity(paint: FigPaint): number {
  if ("opacity" in paint && typeof paint.opacity === "number") {
    return paint.opacity;
  }
  return 1;
}

export function createDefaultPaint(kind: PaintListKind, type: FigPaint["type"] = "SOLID"): FigPaint {
  if (type === "SOLID") {
    return createDefaultSolidPaint(kind);
  }
  if (type === "IMAGE") {
    return createDefaultImagePaint();
  }
  return createDefaultGradientPaint(kind, type);
}

export function applyPaintListOperation(
  paints: readonly FigPaint[],
  operation: PaintListOperation,
): readonly FigPaint[] {
  switch (operation.type) {
    case "add":
      return [...paints, createDefaultPaint(operation.kind)];
    case "remove":
      return paints.filter((_paint, index) => index !== operation.index);
    case "update":
      return paints.map((paint, index) => {
        return index === operation.index ? applyPaintOperation(paint, operation.operation) : paint;
      });
  }
}

export function applyPaintOperation(paint: FigPaint, operation: PaintOperation): FigPaint {
  switch (operation.type) {
    case "set-color": {
      if (!("color" in paint)) {
        return paint;
      }
      const alpha = getPaintColor(paint)?.a ?? 1;
      return { ...paint, color: hexToColor(operation.hex, alpha) };
    }
    case "set-opacity":
      return { ...paint, opacity: operation.opacity };
    case "set-type":
      return {
        ...createDefaultPaint(operation.kind, operation.paintType),
        opacity: getPaintOpacity(paint),
        visible: paint.visible,
      };
    case "set-image-ref":
      if (paint.type !== "IMAGE") {
        return paint;
      }
      return { ...paint, imageRef: operation.imageRef };
    case "set-image-scale-mode":
      if (paint.type !== "IMAGE") {
        return paint;
      }
      return { ...paint, scaleMode: operation.scaleMode, imageScaleMode: operation.scaleMode };
    case "set-image-scale":
      if (paint.type !== "IMAGE") {
        return paint;
      }
      return { ...paint, scalingFactor: operation.scale, scale: operation.scale };
    case "set-image-rotation-deg":
      if (paint.type !== "IMAGE") {
        return paint;
      }
      return { ...paint, rotation: operation.rotationDeg * (Math.PI / 180) };
    case "replace":
      return operation.paint;
  }
}

function createDefaultSolidPaint(kind: PaintListKind): FigPaint {
  return {
    type: "SOLID",
    color: kind === "fill" ? { r: 0.85, g: 0.85, b: 0.85, a: 1 } : { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
  };
}

function createDefaultGradientPaint(kind: PaintListKind, type: Extract<FigPaintType, `GRADIENT_${string}`>): FigPaint {
  const firstColor = kind === "fill" ? { r: 0.2, g: 0.45, b: 1, a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
  const secondColor = kind === "fill" ? { r: 0.8, g: 0.25, b: 0.9, a: 1 } : { r: 0.2, g: 0.45, b: 1, a: 1 };
  return {
    type,
    visible: true,
    opacity: 1,
    gradientStops: [
      { position: 0, color: firstColor },
      { position: 1, color: secondColor },
    ],
    gradientHandlePositions: [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 0, y: 1 },
    ],
  };
}

function createDefaultImagePaint(): FigPaint {
  return {
    type: "IMAGE",
    visible: true,
    opacity: 1,
    imageRef: "",
    scaleMode: "FILL",
  };
}

function hexToColor(hex: string, alpha = 1): FigColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: alpha,
  };
}
