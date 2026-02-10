/**
 * @file Text editors preview page
 *
 * Demonstrates TextFormattingEditor and ParagraphFormattingEditor
 * with interactive state display.
 */

import { useState, type CSSProperties } from "react";
import { TextFormattingEditor } from "../text/TextFormattingEditor";
import { ParagraphFormattingEditor } from "../text/ParagraphFormattingEditor";
import type { TextFormatting, ParagraphFormatting } from "../text/types";

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

const defaultText: TextFormatting = {
  fontFamily: "Arial",
  fontSize: 12,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  textColor: "#FFFFFF",
};

const defaultParagraph: ParagraphFormatting = {
  alignment: "left",
  lineSpacing: 1.0,
  spaceBefore: 0,
  spaceAfter: 0,
  indentLeft: 0,
  indentRight: 0,
  firstLineIndent: 0,
};

// =============================================================================
// Component
// =============================================================================

/** Interactive preview page for text and paragraph editors. */
export function TextEditorsPage() {
  const [text, setText] = useState<TextFormatting>(defaultText);
  const [textFull, setTextFull] = useState<TextFormatting>({
    ...defaultText,
    highlightColor: "#FFFF00",
    superscript: false,
    subscript: false,
  });
  const [paragraph, setParagraph] = useState<ParagraphFormatting>(defaultParagraph);

  return (
    <div style={gridStyle}>
      {/* TextFormattingEditor: basic */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>TextFormattingEditor</div>
        <TextFormattingEditor
          value={text}
          onChange={(update) => setText((prev) => ({ ...prev, ...update }))}
        />
        <div style={valueDisplayStyle}>{JSON.stringify(text, null, 2)}</div>
      </div>

      {/* TextFormattingEditor: all features */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>TextFormattingEditor (all features)</div>
        <TextFormattingEditor
          value={textFull}
          onChange={(update) => setTextFull((prev) => ({ ...prev, ...update }))}
          features={{
            showFontFamily: true,
            showFontSize: true,
            showBold: true,
            showItalic: true,
            showUnderline: true,
            showStrikethrough: true,
            showTextColor: true,
            showHighlight: true,
            showSuperSubscript: true,
          }}
        />
        <div style={valueDisplayStyle}>{JSON.stringify(textFull, null, 2)}</div>
      </div>

      {/* ParagraphFormattingEditor: all features */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>ParagraphFormattingEditor</div>
        <ParagraphFormattingEditor
          value={paragraph}
          onChange={(update) => setParagraph((prev) => ({ ...prev, ...update }))}
          features={{
            showAlignment: true,
            showLineSpacing: true,
            showSpacing: true,
            showIndentation: true,
          }}
        />
        <div style={valueDisplayStyle}>{JSON.stringify(paragraph, null, 2)}</div>
      </div>
    </div>
  );
}
