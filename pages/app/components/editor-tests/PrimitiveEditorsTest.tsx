/**
 * @file Primitive Editors Test
 *
 * Test component for primitive value editors (Pixels, Degrees, Percent, Points, Transform).
 */

import { useState, type CSSProperties } from "react";
import {
  TransformEditor,
  PixelsEditor,
  DegreesEditor,
  PercentEditor,
  PointsEditor,
  FieldGroup,
  createDefaultTransform,
} from "@lib/pptx-editor";
import type { Transform, Pixels, Degrees, Percent, Points } from "@lib/pptx/domain/types";
import { px, deg, pct, pt } from "@lib/pptx/domain/types";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid var(--border-subtle)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const valueDisplayStyle: CSSProperties = {
  marginTop: "16px",
  padding: "12px",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-tertiary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "24px",
};

/**
 * Primitive editors test component
 */
export function PrimitiveEditorsTest() {
  const [pixels, setPixels] = useState<Pixels>(px(100));
  const [degrees, setDegrees] = useState<Degrees>(deg(45));
  const [percent, setPercent] = useState<Percent>(pct(75));
  const [points, setPoints] = useState<Points>(pt(16));
  const [transform, setTransform] = useState<Transform>(createDefaultTransform());

  return (
    <div style={gridStyle}>
      {/* Primitive Editors */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Primitive Editors</h2>

        <FieldGroup label="Pixels">
          <PixelsEditor value={pixels} onChange={setPixels} />
        </FieldGroup>

        <div style={{ marginTop: "12px" }}>
          <FieldGroup label="Degrees">
            <DegreesEditor value={degrees} onChange={setDegrees} />
          </FieldGroup>
        </div>

        <div style={{ marginTop: "12px" }}>
          <FieldGroup label="Percent (Slider)">
            <PercentEditor value={percent} onChange={setPercent} slider />
          </FieldGroup>
        </div>

        <div style={{ marginTop: "12px" }}>
          <FieldGroup label="Points">
            <PointsEditor value={points} onChange={setPoints} />
          </FieldGroup>
        </div>

        <div style={valueDisplayStyle}>
          pixels: {pixels}px{"\n"}
          degrees: {degrees}°{"\n"}
          percent: {percent}%{"\n"}
          points: {points}pt
        </div>
      </div>

      {/* Transform Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Transform Editor</h2>
        <TransformEditor value={transform} onChange={setTransform} />
        <div style={valueDisplayStyle}>{JSON.stringify(transform, null, 2)}</div>
      </div>
    </div>
  );
}
