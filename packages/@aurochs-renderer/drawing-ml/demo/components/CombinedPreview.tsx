/**
 * @file CombinedPreview component for displaying combined shape previews
 */

import type { Fill, Line } from "@aurochs-office/pptx/domain";
import type { Effects } from "@aurochs-office/pptx/domain/effects";
import { useShapeStyle } from "@aurochs-renderer/pptx/react";

/**
 * Combined shape preview
 */
export function CombinedPreview({
  fill,
  line,
  effects,
  label,
}: {
  fill: Fill;
  line?: Line;
  effects?: Effects;
  label: string;
}) {
  const style = useShapeStyle({ fill, line, effects, width: 120, height: 80 });
  return (
    <div className="combined-preview">
      <svg width="140" height="100" viewBox="0 0 140 100">
        <defs>{style.defs}</defs>
        <rect x="15" y="15" width="110" height="70" rx="8" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}
