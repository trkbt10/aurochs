/**
 * @file EffectPreview component for displaying effect previews
 */

import type { Effects } from "@aurochs-office/pptx/domain/effects";
import { useShapeStyle } from "@aurochs-renderer/pptx/react";

/**
 * Effect preview
 */
export function EffectPreview({ effects, label }: { effects: Effects; label: string }) {
  const style = useShapeStyle({
    fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } },
    effects,
    width: 80,
    height: 50,
  });
  return (
    <div className="effect-preview">
      <svg width="100" height="70" viewBox="0 0 100 70">
        <defs>{style.defs}</defs>
        <rect x="15" y="15" width="70" height="40" rx="6" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}
