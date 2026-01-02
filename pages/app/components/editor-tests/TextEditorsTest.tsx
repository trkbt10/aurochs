/**
 * @file Text Editors Test
 *
 * Test component for text-related editors (RunProperties, LineSpacing, BulletStyle, ParagraphProperties, TextBody).
 */

import { useState, type CSSProperties } from "react";
import {
  RunPropertiesEditor,
  LineSpacingEditor,
  BulletStyleEditor,
  ParagraphPropertiesEditor,
  TextBodyEditor,
  createDefaultRunProperties,
  createDefaultLineSpacing,
  createDefaultBulletStyle,
  createDefaultParagraphProperties,
  createDefaultTextBody,
} from "@lib/pptx-editor";
import type {
  RunProperties,
  LineSpacing,
  BulletStyle,
  ParagraphProperties,
  TextBody,
} from "@lib/pptx/domain/text";

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
 * Text editors test component
 */
export function TextEditorsTest() {
  const [runProperties, setRunProperties] = useState<RunProperties>(createDefaultRunProperties());
  const [lineSpacing, setLineSpacing] = useState<LineSpacing | undefined>(createDefaultLineSpacing());
  const [bulletStyle, setBulletStyle] = useState<BulletStyle | undefined>(createDefaultBulletStyle());
  const [paragraphProperties, setParagraphProperties] = useState<ParagraphProperties>(
    createDefaultParagraphProperties()
  );
  const [textBody, setTextBody] = useState<TextBody>(createDefaultTextBody());

  return (
    <div style={gridStyle}>
      {/* RunProperties Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Run Properties Editor</h2>
        <RunPropertiesEditor value={runProperties} onChange={setRunProperties} compact />
        <div style={valueDisplayStyle}>{JSON.stringify(runProperties, null, 2)}</div>
      </div>

      {/* LineSpacing Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Line Spacing Editor</h2>
        <LineSpacingEditor value={lineSpacing} onChange={setLineSpacing} />
        <div style={valueDisplayStyle}>{JSON.stringify(lineSpacing, null, 2)}</div>
      </div>

      {/* BulletStyle Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Bullet Style Editor</h2>
        <BulletStyleEditor value={bulletStyle} onChange={setBulletStyle} />
        <div style={valueDisplayStyle}>{JSON.stringify(bulletStyle, null, 2)}</div>
      </div>

      {/* ParagraphProperties Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Paragraph Properties Editor</h2>
        <ParagraphPropertiesEditor value={paragraphProperties} onChange={setParagraphProperties} />
        <div style={valueDisplayStyle}>{JSON.stringify(paragraphProperties, null, 2)}</div>
      </div>

      {/* TextBody Editor */}
      <div style={{ ...cardStyle, gridColumn: "span 2" }}>
        <h2 style={cardTitleStyle}>Text Body Editor</h2>
        <TextBodyEditor value={textBody} onChange={setTextBody} />
        <div style={valueDisplayStyle}>{JSON.stringify(textBody, null, 2)}</div>
      </div>
    </div>
  );
}
