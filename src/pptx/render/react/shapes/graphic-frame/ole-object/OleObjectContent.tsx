/**
 * @file OLE object content renderer for GraphicFrame
 *
 * Renders OLE object content within a graphic frame using the useOlePreview hook
 * for preview image resolution.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 */

import { memo } from "react";
import type { OleReference } from "../../../../../domain";
import { useOlePreview } from "./useOlePreview";
import { Placeholder } from "../shared";
import type { ContentProps } from "../types";

/**
 * Props for OleObjectContent component
 */
export type OleObjectContentProps = ContentProps<OleReference>;

/**
 * Get application name from progId for display
 * @example "Excel.Sheet.12" -> "Excel"
 * @example "PowerPoint.Slide.8" -> "PowerPoint"
 * @example "Equation.3" -> "Equation"
 */
function getAppNameFromProgId(progId: string | undefined): string {
  if (!progId) {
    return "Object";
  }
  // Extract first part before the dot
  const parts = progId.split(".");
  return parts[0] || "Object";
}

/**
 * Renders an icon representation for OLE objects when showAsIcon is true
 */
function OleIconView({
  width,
  height,
  objectName,
  progId,
}: {
  width: number;
  height: number;
  objectName: string | undefined;
  progId: string | undefined;
}) {
  const iconSize = Math.min(width, height) * 0.4;
  const iconX = (width - iconSize) / 2;
  const iconY = height * 0.2;
  const fontSize = Math.min(12, height * 0.1);
  const labelY = iconY + iconSize + fontSize * 1.5;
  const displayName = objectName || getAppNameFromProgId(progId);

  return (
    <g>
      {/* Background */}
      <rect x={0} y={0} width={width} height={height} fill="#F5F5F5" />

      {/* Document icon */}
      <g transform={`translate(${iconX}, ${iconY})`}>
        {/* Document body */}
        <rect
          x={0}
          y={0}
          width={iconSize}
          height={iconSize}
          fill="#FFFFFF"
          stroke="#4A90D9"
          strokeWidth={iconSize * 0.02}
          rx={iconSize * 0.05}
        />
        {/* Folded corner */}
        <path
          d={`M${iconSize * 0.65} 0 L${iconSize} ${iconSize * 0.35} L${iconSize * 0.65} ${iconSize * 0.35} Z`}
          fill="#D0E4F7"
          stroke="#4A90D9"
          strokeWidth={iconSize * 0.015}
        />
        {/* Lines to simulate content */}
        <line
          x1={iconSize * 0.15}
          y1={iconSize * 0.5}
          x2={iconSize * 0.75}
          y2={iconSize * 0.5}
          stroke="#CCCCCC"
          strokeWidth={iconSize * 0.03}
        />
        <line
          x1={iconSize * 0.15}
          y1={iconSize * 0.65}
          x2={iconSize * 0.65}
          y2={iconSize * 0.65}
          stroke="#CCCCCC"
          strokeWidth={iconSize * 0.03}
        />
        <line
          x1={iconSize * 0.15}
          y1={iconSize * 0.8}
          x2={iconSize * 0.55}
          y2={iconSize * 0.8}
          stroke="#CCCCCC"
          strokeWidth={iconSize * 0.03}
        />
      </g>

      {/* Label */}
      <text
        x={width / 2}
        y={labelY}
        fontSize={fontSize}
        fontFamily="sans-serif"
        fill="#333333"
        textAnchor="middle"
      >
        {displayName}
      </text>
    </g>
  );
}

/**
 * Renders OLE object content within a GraphicFrame.
 *
 * Uses useOlePreview hook to encapsulate resource resolution,
 * ensuring correct preview image is displayed.
 *
 * When showAsIcon is true, renders an icon representation instead of preview.
 */
export const OleObjectContent = memo(function OleObjectContent({
  data,
  width,
  height,
}: OleObjectContentProps) {
  const { previewUrl, hasPreview, showAsIcon, objectName, progId } = useOlePreview(data);

  // Show as icon mode: render icon representation
  if (showAsIcon) {
    return (
      <OleIconView
        width={width}
        height={height}
        objectName={objectName}
        progId={progId}
      />
    );
  }

  // Normal mode: show preview image
  if (!hasPreview || previewUrl === undefined) {
    return <Placeholder width={width} height={height} label="OLE Object" />;
  }

  return (
    <image
      href={previewUrl}
      x={0}
      y={0}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
    />
  );
});
