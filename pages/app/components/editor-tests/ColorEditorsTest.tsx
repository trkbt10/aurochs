/**
 * @file Color Editors Test
 *
 * Test component for color-related editors (Color, Fill, Line).
 */

import { useState, type CSSProperties } from "react";
import {
  ColorEditor,
  FillEditor,
  LineEditor,
  createDefaultColor,
  createDefaultSolidFill,
  createDefaultLine,
} from "@lib/pptx-editor";
import type { Color, Fill, Line } from "@lib/pptx/domain/color";

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
 * Color editors test component
 */
export function ColorEditorsTest() {
  const [color, setColor] = useState<Color>(createDefaultColor("0070f3"));
  const [fill, setFill] = useState<Fill>(createDefaultSolidFill("ff0080"));
  const [line, setLine] = useState<Line>(createDefaultLine());

  return (
    <div style={gridStyle}>
      {/* Color Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Color Editor</h2>
        <ColorEditor value={color} onChange={setColor} />
        <div style={valueDisplayStyle}>{JSON.stringify(color, null, 2)}</div>
      </div>

      {/* Fill Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Fill Editor</h2>
        <FillEditor value={fill} onChange={setFill} />
        <div style={valueDisplayStyle}>{JSON.stringify(fill, null, 2)}</div>
      </div>

      {/* Line Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Line Editor</h2>
        <LineEditor value={line} onChange={setLine} />
        <div style={valueDisplayStyle}>{JSON.stringify(line, null, 2)}</div>
      </div>
    </div>
  );
}
