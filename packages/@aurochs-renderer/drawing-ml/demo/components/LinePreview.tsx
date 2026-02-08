/**
 * @file LinePreview component for displaying line style previews
 */

import type { Line } from "@aurochs-office/pptx/domain";
import { useShapeStyle } from "@aurochs-renderer/pptx/react";

/**
 * Line preview with stroke styles
 */
export function LinePreview({ line, label }: { line: Line; label: string }) {
  const style = useShapeStyle({
    fill: { type: "noFill" },
    line,
    width: 120,
    height: 40,
  });
  return (
    <div className="shape-preview">
      <svg width="120" height="40" viewBox="0 0 120 40">
        <defs>{style.defs}</defs>
        <line x1="10" y1="20" x2="110" y2="20" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}
