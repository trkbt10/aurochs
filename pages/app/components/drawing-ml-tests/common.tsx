/**
 * @file Shared types, fixtures, and components for DrawingML tests
 */

import type { ReactNode } from "react";
import type { Fill, Line, SchemeColorValue } from "@oxen-office/pptx/domain";
import type { GradientFill } from "@oxen-office/ooxml/domain/fill";
import type { Effects } from "@oxen-office/pptx/domain/effects";
import type { Pixels } from "@oxen-office/ooxml/domain/units";
import { px, deg, pct } from "@oxen-office/ooxml/domain/units";
import { useShapeStyle } from "@oxen-renderer/pptx/react";

// =============================================================================
// Types
// =============================================================================

export type CheckItem = {
  readonly label: string;
  readonly status: "pass" | "partial" | "pending";
  readonly notes?: string;
};

// =============================================================================
// Test Fixtures
// =============================================================================

export const testSlideSize = {
  width: px(960) as Pixels,
  height: px(540) as Pixels,
};

export const testColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "1F497D",
    lt2: "EEECE1",
    accent1: "4F81BD",
    accent2: "C0504D",
    accent3: "9BBB59",
    accent4: "8064A2",
    accent5: "4BACC6",
    accent6: "F79646",
    hlink: "0000FF",
    folHlink: "800080",
  },
  colorMap: {
    tx1: "dk1",
    tx2: "dk2",
    bg1: "lt1",
    bg2: "lt2",
  },
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Helper to create valid GradientFill objects
 */
export function makeGradient(
  angleDeg: number,
  ...colors: Array<{ pos: number; color: string | { scheme: SchemeColorValue } }>
): GradientFill {
  function toColorSpec(c: string | { scheme: SchemeColorValue }) {
    if (typeof c === "string") {
      return { type: "srgb" as const, value: c };
    }
    return { type: "scheme" as const, value: c.scheme };
  }
  return {
    type: "gradientFill",
    stops: colors.map((c) => ({
      position: pct(c.pos),
      color: { spec: toColorSpec(c.color) },
    })),
    linear: { angle: deg(angleDeg), scaled: true },
    rotWithShape: true,
  };
}

// =============================================================================
// Shared Components
// =============================================================================

/**
 * Checkbox indicator for test coverage
 */
export function CheckBox({ status }: { status: CheckItem["status"] }) {
  const colors = {
    pass: "#10b981",
    partial: "#f59e0b",
    pending: "#6b7280",
  };
  const icons = {
    pass: "✓",
    partial: "◐",
    pending: "○",
  };
  return (
    <span style={{ color: colors[status], marginRight: 8, fontFamily: "monospace" }}>
      {icons[status]}
    </span>
  );
}

/**
 * Subsection with checklist header
 */
export function TestSubsection({
  title,
  items,
  children,
}: {
  title: string;
  items: CheckItem[];
  children: ReactNode;
}) {
  const passCount = items.filter((i) => i.status === "pass").length;
  return (
    <div className="test-subsection">
      <h4>
        {title}
        <span className="check-count">
          ({passCount}/{items.length})
        </span>
      </h4>
      <div className="check-list">
        {items.map((item, i) => (
          <div key={i} className="check-item">
            <CheckBox status={item.status} />
            <span>{item.label}</span>
            {item.notes && <span className="check-notes">({item.notes})</span>}
          </div>
        ))}
      </div>
      <div className="test-examples">{children}</div>
    </div>
  );
}

/**
 * Shape preview with fill
 */
export function ShapePreview({ fill, label }: { fill: Fill; label: string }) {
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

/**
 * Transform preview showing rotation/flip effects
 */
export function TransformPreview({
  transform,
  fill,
  label,
}: {
  transform: string;
  fill?: Fill;
  label: string;
}) {
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

/**
 * Line with markers preview
 */
export function LineMarkerPreview({
  line,
  label,
}: {
  line: Line;
  label: string;
}) {
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
