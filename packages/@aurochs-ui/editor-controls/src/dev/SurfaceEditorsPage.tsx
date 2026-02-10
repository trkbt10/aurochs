/**
 * @file Surface editors preview page
 *
 * Demonstrates FillFormattingEditor and OutlineFormattingEditor
 * with interactive state display.
 */

import { useState, type CSSProperties } from "react";
import { FillFormattingEditor } from "../surface/FillFormattingEditor";
import { OutlineFormattingEditor } from "../surface/OutlineFormattingEditor";
import type { FillFormatting, OutlineFormatting } from "../surface/types";

// =============================================================================
// Styles
// =============================================================================

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: 16,
};

const cardStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: 12,
  padding: 20,
  border: "1px solid var(--border-subtle)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const cardTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const valueDisplayStyle: CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--font-mono, monospace)",
  color: "var(--text-tertiary)",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: 8,
  padding: 12,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: 200,
  overflow: "auto",
};

// =============================================================================
// Default values
// =============================================================================

const defaultFillNone: FillFormatting = { type: "none" };

const defaultFillSolid: FillFormatting = { type: "solid", color: "#4A90D9" };

const defaultOutline: OutlineFormatting = {
  width: 1,
  color: "#000000",
  style: "solid",
};

// =============================================================================
// Component
// =============================================================================

/** Interactive preview page for fill and outline editors. */
export function SurfaceEditorsPage() {
  const [fillNone, setFillNone] = useState<FillFormatting>(defaultFillNone);
  const [fillSolid, setFillSolid] = useState<FillFormatting>(defaultFillSolid);
  const [outline, setOutline] = useState<OutlineFormatting>(defaultOutline);

  return (
    <div style={gridStyle}>
      {/* FillFormattingEditor: none → solid */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>FillFormattingEditor (none)</div>
        <FillFormattingEditor value={fillNone} onChange={setFillNone} />
        <div style={valueDisplayStyle}>{JSON.stringify(fillNone, null, 2)}</div>
      </div>

      {/* FillFormattingEditor: solid */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>FillFormattingEditor (solid)</div>
        <FillFormattingEditor value={fillSolid} onChange={setFillSolid} />
        <div style={valueDisplayStyle}>{JSON.stringify(fillSolid, null, 2)}</div>
      </div>

      {/* OutlineFormattingEditor */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>OutlineFormattingEditor</div>
        <OutlineFormattingEditor
          value={outline}
          onChange={(update) => setOutline((prev) => ({ ...prev, ...update }))}
        />
        <div style={valueDisplayStyle}>{JSON.stringify(outline, null, 2)}</div>
      </div>
    </div>
  );
}
