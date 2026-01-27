/**
 * @file FillPreview component
 *
 * Pure visualization of a Fill value. Fills its container (100% x 100%).
 * No size or interaction props - parent controls those concerns.
 * Uses design tokens for consistent styling.
 */

import type { CSSProperties } from "react";
import type { GradientFill } from "@oxen/ooxml/domain/fill";
import type { Fill } from "@oxen/pptx/domain/color/types";
import { getHexFromColor, getStopHex } from "./fill/fill-utils";
import { colorTokens } from "@oxen-ui/ui-components/design-tokens";

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  borderRadius: "inherit",
  overflow: "hidden",
};

const checkerboardStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: [
    "linear-gradient(45deg, #808080 25%, transparent 25%)",
    "linear-gradient(-45deg, #808080 25%, transparent 25%)",
    "linear-gradient(45deg, transparent 75%, #808080 75%)",
    "linear-gradient(-45deg, transparent 75%, #808080 75%)",
  ].join(", "),
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
  backgroundColor: "#ffffff",
};

const noFillStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  border: `2px dashed var(--border-strong, ${colorTokens.border.strong})`,
  boxSizing: "border-box",
  borderRadius: "inherit",
};

function getSolidColorStyle(hex: string, alpha: number): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    backgroundColor: alpha < 1 ? `rgba(${hexToRgbCss(hex)}, ${alpha})` : `#${hex}`,
  };
}

function hexToRgbCss(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function buildGradientCss(fill: GradientFill): string {
  const angle = fill.linear?.angle ?? 0;
  const stops = fill.stops.map((s) => `#${getStopHex(s)} ${s.position}%`).join(", ");
  return `linear-gradient(${angle}deg, ${stops})`;
}

function getGradientStyle(fill: GradientFill): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    background: buildGradientCss(fill),
  };
}

function getAlphaFromColor(fill: Fill): number {
  if (fill.type !== "solidFill") {
    return 1;
  }
  return (fill.color.transform?.alpha ?? 100) / 100;
}

export type FillPreviewProps = {
  readonly fill: Fill;
};

/**
 * Visualizes a Fill value.
 *
 * - noFill: dashed border
 * - solidFill: solid color (with checkerboard for transparency)
 * - gradientFill: linear gradient
 *
 * Parent controls size and interaction.
 */
export function FillPreview({ fill }: FillPreviewProps) {
  if (fill.type === "noFill") {
    return <div style={noFillStyle} />;
  }

  if (fill.type === "solidFill") {
    const hex = getHexFromColor(fill.color);
    const alpha = getAlphaFromColor(fill);
    const showCheckerboard = alpha < 1;

    return (
      <div style={containerStyle}>
        {showCheckerboard && <div style={checkerboardStyle} />}
        <div style={getSolidColorStyle(hex, alpha)} />
      </div>
    );
  }

  if (fill.type === "gradientFill") {
    return <div style={getGradientStyle(fill)} />;
  }

  // Fallback for unsupported fill types (blipFill, patternFill, groupFill)
  return <div style={noFillStyle} />;
}
