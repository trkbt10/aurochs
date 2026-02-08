/**
 * @file PresetShapePreview component for displaying preset shape previews
 */

import type { Fill, Line } from "@aurochs-office/pptx/domain";
import { useShapeStyle } from "@aurochs-renderer/pptx/react";

/**
 * Preset shape preview using SVG path
 */
export function PresetShapePreview({
  pathData,
  fill,
  line,
  label,
  viewBox = "0 0 100 70",
  width = 100,
  height = 70,
}: {
  pathData: string;
  fill?: Fill;
  line?: Line;
  label: string;
  viewBox?: string;
  width?: number;
  height?: number;
}) {
  const style = useShapeStyle({
    fill: fill ?? { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } },
    line,
    width,
    height,
  });

  return (
    <div className="shape-preview">
      <svg width={width} height={height} viewBox={viewBox}>
        <defs>{style.defs}</defs>
        <path d={pathData} {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}
