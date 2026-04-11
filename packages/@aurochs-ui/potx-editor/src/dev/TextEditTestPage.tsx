/**
 * @file Text Edit Test Page for potx-editor
 *
 * Dedicated page for verifying text editing behavior in the potx-editor.
 * Ensures that:
 * 1. Only ONE text rendering is visible at a time (uniqueness guarantee)
 * 2. editingShapeId is correctly passed to SlideRenderer
 * 3. Click-outside, commit, and cancel all work identically to pptx-editor
 */

import { useEffect, useState } from "react";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import { loadPptxFromUrl, convertToPresentationDocument, buildSlideLayoutOptions } from "@aurochs-office/pptx/app";
import { ThemeEditorProvider, useThemeEditor } from "../context";
import { usePresentationEditorOptional } from "@aurochs-ui/pptx-editor";
import { PotxEditor } from "../PotxEditor";

// =============================================================================
// Types
// =============================================================================

type Props = {
  readonly onBack?: () => void;
};

// =============================================================================
// State Inspector
// =============================================================================

function TextEditStateInspector() {
  const { state } = useThemeEditor();
  const { layoutEdit } = state;
  const presCtx = usePresentationEditorOptional();
  const textEdit = presCtx?.textEdit ?? { type: "inactive" as const };

  const editingShapeId = textEdit.type === "active" ? textEdit.shapeId : undefined;

  const statusColor = textEdit.type === "active" ? "#4caf50" : "#999";
  const statusLabel = textEdit.type === "active" ? "ACTIVE" : "INACTIVE";

  return (
    <div style={inspectorStyle}>
      <h3 style={inspectorTitleStyle}>Text Edit State Inspector</h3>

      <div style={statusRowStyle}>
        <span style={{ fontWeight: 600 }}>Status:</span>
        <span style={{ ...statusBadgeStyle, backgroundColor: statusColor }}>{statusLabel}</span>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>editingShapeId:</span>
        <code style={valueStyle}>{editingShapeId ?? "undefined"}</code>
      </div>

      {textEdit.type === "active" && (
        <>
          <div style={fieldStyle}>
            <span style={labelStyle}>bounds:</span>
            <code style={valueStyle}>
              {`x:${Number(textEdit.bounds.x).toFixed(0)} y:${Number(textEdit.bounds.y).toFixed(0)} w:${Number(textEdit.bounds.width).toFixed(0)} h:${Number(textEdit.bounds.height).toFixed(0)}`}
            </code>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>initialTextBody paragraphs:</span>
            <code style={valueStyle}>{textEdit.initialTextBody.paragraphs.length}</code>
          </div>
        </>
      )}

      <div style={fieldStyle}>
        <span style={labelStyle}>Selected shapes:</span>
        <code style={valueStyle}>{presCtx?.shapeSelection.selectedIds.length ?? 0}</code>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Total shapes:</span>
        <code style={valueStyle}>{layoutEdit.layoutShapes.length}</code>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>isDirty:</span>
        <span style={{
          ...valueBadgeStyle,
          backgroundColor: layoutEdit.isDirty ? "#ff9800" : "#999",
        }}>
          {layoutEdit.isDirty ? "YES" : "NO"}
        </span>
      </div>

      <div style={verificationSectionStyle}>
        <h4 style={{ margin: "0 0 8px", fontSize: "12px", color: "#666" }}>Rendering Source Verification</h4>
        <div style={infoStyle}>
          SlideRenderer must use reducer state (layoutEdit.layoutShapes), not the static pseudoSlide from loadLayoutWithContext.
          After text commit, isDirty should be YES and the new text should be visible.
        </div>
      </div>

      <div style={verificationSectionStyle}>
        <h4 style={{ margin: "0 0 8px", fontSize: "12px", color: "#666" }}>Uniqueness Verification</h4>
        <RenderedTextCounter editingShapeId={editingShapeId} />
      </div>
    </div>
  );
}

function getControllerBadgeColor(isEditing: boolean, isPresent: boolean): string {
  if (!isEditing) { return "#999"; }
  return isPresent ? "#4caf50" : "#f44336";
}

/**
 * Checks the DOM to verify text rendering uniqueness.
 * When editing: SlideRenderer should hide the shape's text (hideText=true),
 * and only TextEditController's text overlay should be visible.
 */
function RenderedTextCounter({ editingShapeId }: { readonly editingShapeId: ShapeId | undefined }) {
  const [counts, setCounts] = useState({ slideRendererTexts: 0, textEditControllerPresent: false });

  useEffect(() => {
    const check = () => {
      // Count text elements in SVG rendered by SlideRenderer
      const svgTexts = document.querySelectorAll("[data-shape-id] text");
      // Check if TextEditController overlay is present
      const textEditOverlay = document.querySelector("[data-testid='text-edit-controller']")
        ?? document.querySelector(".text-edit-controller");
      // Fallback: check for the textarea that TextEditController renders
      const textareaInOverlay = document.querySelector("textarea[style*='opacity: 0']")
        ?? document.querySelector("textarea[style*='position: absolute']");

      setCounts({
        slideRendererTexts: svgTexts.length,
        textEditControllerPresent: textEditOverlay !== null || (editingShapeId !== undefined && textareaInOverlay !== null),
      });
    };

    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [editingShapeId]);

  const isEditing = editingShapeId !== undefined;
  const hasIssue = isEditing && !counts.textEditControllerPresent;

  return (
    <div>
      <div style={fieldStyle}>
        <span style={labelStyle}>TextEditController:</span>
        <span style={{
          ...valueBadgeStyle,
          backgroundColor: getControllerBadgeColor(isEditing, counts.textEditControllerPresent),
        }}>
          {counts.textEditControllerPresent ? "PRESENT" : "ABSENT"}
        </span>
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>editingShapeId passed:</span>
        <span style={{
          ...valueBadgeStyle,
          backgroundColor: isEditing ? "#4caf50" : "#999",
        }}>
          {isEditing ? "YES" : "N/A"}
        </span>
      </div>
      {hasIssue && (
        <div style={errorStyle}>
          BUG: Editing active but TextEditController not detected in DOM
        </div>
      )}
      {isEditing && (
        <div style={infoStyle}>
          When editing, SlideRenderer should set hideText=true for shape {editingShapeId}.
          Only TextEditController&apos;s SVG text overlay should be visible.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Test Page
// =============================================================================

function TextEditTestPageInner() {
  return (
    <div style={pageStyle}>
      <div style={editorPaneStyle}>
        <PotxEditor />
      </div>
      <div style={inspectorPaneStyle}>
        <TextEditStateInspector />
        <div style={instructionsStyle}>
          <h4 style={{ margin: "0 0 8px", fontSize: "12px", color: "#666" }}>Test Scenarios</h4>
          <ol style={{ margin: 0, padding: "0 0 0 20px", fontSize: "12px", lineHeight: 1.8 }}>
            <li>Double-click a shape to enter text edit mode</li>
            <li>Verify &quot;Status: ACTIVE&quot; and &quot;editingShapeId&quot; shows the shape ID</li>
            <li>Verify &quot;TextEditController: PRESENT&quot; — text is rendered by edit overlay only</li>
            <li>Type text, then click outside the shape — verify cancel works</li>
            <li>Double-click again, type text, press Enter — verify commit works</li>
            <li>Press Escape during editing — verify cancel works</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/** Text edit test page with state inspector and uniqueness verification. */
export function TextEditTestPage({ onBack }: Props) {
  const [doc, setDoc] = useState<PresentationDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const demoUrl = (typeof import.meta !== "undefined" ? import.meta.env?.BASE_URL : "/") + "demo.pptx";

  useEffect(() => {
    loadPptxFromUrl(demoUrl)
      .then((loaded) => setDoc(convertToPresentationDocument(loaded)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [demoUrl]);

  if (error) {
    return <div style={{ padding: 20, color: "#f44336" }}>{error}</div>;
  }
  if (!doc) {
    return <div style={{ padding: 20, color: "#999" }}>Loading demo.pptx...</div>;
  }

  const layoutOptions = buildSlideLayoutOptions(doc.presentationFile!);

  return (
    <ThemeEditorProvider
      initProps={{
        colorScheme: doc.colorContext.colorScheme,
        fontScheme: doc.fontScheme,
        slideSize: { width: doc.slideWidth, height: doc.slideHeight },
        layoutOptions,
        presentationFile: doc.presentationFile,
      }}
    >
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={headerStyle}>
          {onBack && <button onClick={onBack} style={backButtonStyle}>Back</button>}
          <span style={{ fontWeight: 600 }}>potx-editor Text Edit Test</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <TextEditTestPageInner />
        </div>
      </div>
    </ThemeEditorProvider>
  );
}

// =============================================================================
// Styles
// =============================================================================

const pageStyle: React.CSSProperties = {
  display: "flex",
  height: "100%",
  overflow: "hidden",
};

const editorPaneStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
};

const inspectorPaneStyle: React.CSSProperties = {
  width: 300,
  borderLeft: "1px solid #333",
  backgroundColor: "#1a1a1a",
  overflow: "auto",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const inspectorStyle: React.CSSProperties = {
  backgroundColor: "#222",
  borderRadius: 8,
  padding: 12,
  fontSize: 12,
};

const inspectorTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 13,
  fontWeight: 600,
  color: "#ccc",
};

const statusRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  color: "#ccc",
};

const statusBadgeStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 4,
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
  color: "#aaa",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#888",
};

const valueStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#ddd",
  fontFamily: "monospace",
};

const valueBadgeStyle: React.CSSProperties = {
  padding: "1px 6px",
  borderRadius: 3,
  color: "#fff",
  fontSize: 10,
  fontWeight: 600,
};

const verificationSectionStyle: React.CSSProperties = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid #333",
};

const errorStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 8,
  backgroundColor: "rgba(244, 67, 54, 0.15)",
  borderRadius: 4,
  color: "#f44336",
  fontSize: 11,
  fontWeight: 600,
};

const infoStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 8,
  backgroundColor: "rgba(33, 150, 243, 0.1)",
  borderRadius: 4,
  color: "#90caf9",
  fontSize: 11,
  lineHeight: 1.5,
};

const instructionsStyle: React.CSSProperties = {
  backgroundColor: "#222",
  borderRadius: 8,
  padding: 12,
  color: "#aaa",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  borderBottom: "1px solid #333",
  backgroundColor: "#1a1a1a",
  color: "#ccc",
  fontSize: 14,
};

const backButtonStyle: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid #555",
  borderRadius: 4,
  backgroundColor: "transparent",
  color: "#ccc",
  cursor: "pointer",
  fontSize: 12,
};
