/**
 * @file Slide Properties Test
 *
 * Test component for slide-level editors (Background, Transition) and OLE object editor.
 */

import { useState, type CSSProperties } from "react";
import {
  BackgroundEditor,
  TransitionEditor,
  OleObjectEditor,
  createDefaultBackground,
  createDefaultTransition,
  createDefaultOleReference,
} from "@aurochs-ui/pptx-editor";
import type { Background } from "@aurochs-office/pptx/domain/slide/types";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import type { OleReference } from "@aurochs-office/pptx/domain/shape";

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
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: "24px",
};

/**
 * Slide properties test component
 */
export function SlidePropertiesTest() {
  const [background, setBackground] = useState<Background>(createDefaultBackground());

  const [transition, setTransition] = useState<SlideTransition | undefined>(() => ({
    ...createDefaultTransition(),
    type: "fade",
    duration: 500,
  }));

  const [oleReference, setOleReference] = useState<OleReference>(() => ({
    ...createDefaultOleReference(),
    progId: "Excel.Sheet.12",
    name: "Budget 2024",
    resourceId: "rId5",
    imgW: 914400,
    imgH: 609600,
    followColorScheme: "full",
  }));

  return (
    <div style={gridStyle}>
      {/* Background Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Background Editor</h2>
        <BackgroundEditor value={background} onChange={setBackground} />
        <div style={valueDisplayStyle}>{JSON.stringify(background, null, 2)}</div>
      </div>

      {/* Transition Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Transition Editor</h2>
        <TransitionEditor value={transition} onChange={setTransition} />
        <div style={valueDisplayStyle}>{JSON.stringify(transition, null, 2)}</div>
      </div>

      {/* OLE Object Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>OLE Object Editor</h2>
        <OleObjectEditor value={oleReference} onChange={setOleReference} />
        <div style={valueDisplayStyle}>{JSON.stringify(oleReference, null, 2)}</div>
      </div>
    </div>
  );
}
