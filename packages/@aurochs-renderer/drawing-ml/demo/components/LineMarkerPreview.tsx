/**
 * @file LineMarkerPreview component for displaying line marker previews
 */

import type { Line } from "@aurochs-office/pptx/domain";
import { useShapeStyle } from "@aurochs-renderer/pptx/react";

/**
 * Line with markers preview
 */
export function LineMarkerPreview({ line, label }: { line: Line; label: string }) {
  const style = useShapeStyle({
    fill: { type: "noFill" },
    line,
    width: 120,
    height: 40,
  });

  return (
    <div className="shape-preview">
      <svg width="120" height="50" viewBox="0 0 120 50">
        <defs>{style.defs}</defs>
        <line x1="20" y1="25" x2="100" y2="25" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}
