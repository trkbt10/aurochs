/**
 * @file Placeholder component for unsupported graphic frame content
 *
 * Renders a placeholder rectangle with label for content types that
 * cannot be rendered (e.g., missing data, unsupported format).
 */

import { memo } from "react";

/**
 * Props for Placeholder component
 */
export type PlaceholderProps = {
  readonly width: number;
  readonly height: number;
  readonly label: string;
};

/**
 * Renders a placeholder for unsupported content.
 */
export const Placeholder = memo(function Placeholder({
  width,
  height,
  label,
}: PlaceholderProps) {
  return (
    <>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#f0f0f0"
        stroke="#cccccc"
      />
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#999999"
      >
        [{label}]
      </text>
    </>
  );
});
