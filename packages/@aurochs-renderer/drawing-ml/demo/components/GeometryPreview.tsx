/**
 * @file GeometryPreview component for displaying geometry shape previews
 */

import type { Fill } from "@aurochs-office/pptx/domain";
import { useShapeStyle } from "@aurochs-renderer/pptx/react";

/**
 * Geometry shape preview
 */
export function GeometryPreview({
  shape,
  fill,
  label,
}: {
  shape: "rect" | "ellipse" | "roundRect" | "triangle" | "diamond";
  fill: Fill;
  label: string;
}) {
  const style = useShapeStyle({ fill, width: 80, height: 60 });

  const renderShape = () => {
    switch (shape) {
      case "rect":
        return <rect x="10" y="10" width="80" height="50" {...style.svgProps} />;
      case "ellipse":
        return <ellipse cx="50" cy="35" rx="40" ry="25" {...style.svgProps} />;
      case "roundRect":
        return <rect x="10" y="10" width="80" height="50" rx="12" {...style.svgProps} />;
      case "triangle":
        return <polygon points="50,5 95,60 5,60" {...style.svgProps} />;
      case "diamond":
        return <polygon points="50,5 95,35 50,65 5,35" {...style.svgProps} />;
    }
  };

  return (
    <div className="shape-preview">
      <svg width="100" height="70" viewBox="0 0 100 70">
        <defs>{style.defs}</defs>
        {renderShape()}
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}
