/**
 * @file ShapePreview component for displaying fill previews
 */

import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { useShapeStyle } from "@aurochs-renderer/pptx/react";

/**
 * Shape preview with fill
 */
export function ShapePreview({ fill, label }: { fill: BaseFill; label: string }) {
  const style = useShapeStyle({ fill, width: 100, height: 60 });
  return (
    <div className="shape-preview">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <defs>{style.defs}</defs>
        <rect x="5" y="5" width="90" height="50" rx="6" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}
