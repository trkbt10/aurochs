/**
 * @file Shape Editors Test
 *
 * Test component for shape-related editors (NonVisualProperties, Effects, Geometry, ShapeProperties).
 */

import { useState, type CSSProperties } from "react";
import {
  NonVisualPropertiesEditor,
  EffectsEditor,
  GeometryEditor,
  ShapePropertiesEditor,
  createDefaultNonVisualProperties,
  createDefaultEffects,
  createDefaultGeometry,
  createDefaultShapeProperties,
} from "@oxen-ui/pptx-editor";
import type { NonVisualProperties, ShapeProperties, Geometry } from "@oxen/pptx/domain/shape";
import type { Effects } from "@oxen/pptx/domain";

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
  maxHeight: "200px",
  overflow: "auto",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
  gap: "24px",
};

/**
 * Shape editors test component
 */
export function ShapeEditorsTest() {
  const [nonVisual, setNonVisual] = useState<NonVisualProperties>(
    createDefaultNonVisualProperties("1", "Test Shape")
  );
  const [effects, setEffects] = useState<Effects>(createDefaultEffects());
  const [geometry, setGeometry] = useState<Geometry>(createDefaultGeometry());
  const [shapeProps, setShapeProps] = useState<ShapeProperties>(createDefaultShapeProperties());

  return (
    <div style={gridStyle}>
      {/* NonVisualProperties Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Non-Visual Properties Editor</h2>
        <NonVisualPropertiesEditor value={nonVisual} onChange={setNonVisual} />
        <div style={valueDisplayStyle}>{JSON.stringify(nonVisual, null, 2)}</div>
      </div>

      {/* Effects Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Effects Editor</h2>
        <EffectsEditor value={effects} onChange={setEffects} />
        <div style={valueDisplayStyle}>{JSON.stringify(effects, null, 2)}</div>
      </div>

      {/* Geometry Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Geometry Editor</h2>
        <GeometryEditor value={geometry} onChange={setGeometry} />
        <div style={valueDisplayStyle}>{JSON.stringify(geometry, null, 2)}</div>
      </div>

      {/* ShapeProperties Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Shape Properties Editor</h2>
        <ShapePropertiesEditor value={shapeProps} onChange={setShapeProps} />
        <div style={valueDisplayStyle}>{JSON.stringify(shapeProps, null, 2)}</div>
      </div>
    </div>
  );
}
