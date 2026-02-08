/**
 * @file PPTX editor page.
 *
 * Wraps PresentationEditor with a header bar and back navigation.
 */

import { type CSSProperties } from "react";
import { PresentationEditor } from "@aurochs-ui/pptx-editor";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import { ChevronLeftIcon } from "../components/ui";

type Props = {
  readonly document: PresentationDocument;
  readonly fileName: string;
  readonly onBack: () => void;
  readonly backLabel?: string;
};

// =============================================================================
// Styles
// =============================================================================

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "12px 16px",
  background: "var(--bg-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
  flexShrink: 0,
};

const backButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: "6px",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "13px",
};

const titleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--text-primary)",
};

const editorContainerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

// =============================================================================
// Component
// =============================================================================

/** PPTX editor page with header and PresentationEditor. */
export function PptxEditorPage({ document, fileName, onBack, backLabel = "Back" }: Props) {
  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button style={backButtonStyle} onClick={onBack}>
          <ChevronLeftIcon size={16} />
          <span>{backLabel}</span>
        </button>
        <span style={titleStyle}>{fileName}</span>
      </header>
      <div style={editorContainerStyle}>
        <PresentationEditor initialDocument={document} showPropertyPanel showLayerPanel showToolbar />
      </div>
    </div>
  );
}
