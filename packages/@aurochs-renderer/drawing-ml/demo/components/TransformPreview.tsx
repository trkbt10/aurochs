/**
 * @file TransformPreview component for displaying transform previews
 */

import type { Fill } from "@aurochs-office/pptx/domain";
import { useShapeStyle } from "@aurochs-renderer/pptx/react";

/**
 * Transform preview showing rotation/flip effects
 */
export function TransformPreview({ transform, fill, label }: { transform: string; fill?: Fill; label: string }) {
  const style = useShapeStyle({
    fill: fill ?? { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } },
    width: 60,
    height: 40,
  });

  return (
    <div className="shape-preview">
      <svg width="100" height="70" viewBox="0 0 100 70">
        <defs>{style.defs}</defs>
        <g transform={transform}>
          <rect x="20" y="15" width="60" height="40" {...style.svgProps} />
        </g>
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}
