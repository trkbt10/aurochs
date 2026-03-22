/**
 * @file TextPropertyPanel - Property panel for text editing mode
 *
 * Delegates to MixedRunPropertiesEditor and MixedParagraphPropertiesEditor
 * which are the single source of truth for text property editing UI.
 */

import { useMemo, useCallback, type CSSProperties } from "react";
import type { RunProperties, ParagraphProperties } from "@aurochs-office/pptx/domain/text";
import { useTextEditContext } from "@aurochs-ui/pptx-slide-canvas/context/slide/TextEditContext";
import type { TextEditContextValue } from "@aurochs-ui/pptx-slide-canvas/context/slide/TextEditContext";
import type { MixedRunProperties, MixedParagraphProperties } from "../../editors/text/mixed-properties";
import { extractTextProperties } from "../../editors/text/text-property-extractor";
import { MixedRunPropertiesEditor } from "../../editors/text/MixedRunPropertiesEditor";
import { MixedParagraphPropertiesEditor } from "../../editors/text/MixedParagraphPropertiesEditor";

// =============================================================================
// Types
// =============================================================================

export type TextPropertyPanelProps = {
  readonly className?: string;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0",
};

const noContextStyle: CSSProperties = {
  padding: "20px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "13px",
};

// =============================================================================
// Helpers
// =============================================================================

type ExtractedProperties = {
  readonly runProperties: MixedRunProperties;
  readonly paragraphProperties: MixedParagraphProperties;
};

/** Extract mixed properties from the text edit context. */
function getExtractedProperties(context: TextEditContextValue): ExtractedProperties | null {
  const { currentTextBody, selectionContext } = context;
  if (!currentTextBody) { return null; }
  const extracted = extractTextProperties(currentTextBody, selectionContext);
  return {
    runProperties: extracted.runProperties,
    paragraphProperties: extracted.paragraphProperties,
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Text property panel for text editing mode.
 *
 * Composes MixedRunPropertiesEditor and MixedParagraphPropertiesEditor,
 * which internally use react-editor-ui sections + PPTX-specific controls.
 */
export function TextPropertyPanel({ className, style }: TextPropertyPanelProps) {
  const textEditContext = useTextEditContext();

  const extractedProperties = useMemo(() => {
    if (!textEditContext || textEditContext.selectionContext.type === "none") {
      return null;
    }
    return getExtractedProperties(textEditContext);
  }, [textEditContext]);

  const handleRunChange = useCallback(
    (update: Partial<RunProperties>) => { textEditContext?.applyRunProperties(update); },
    [textEditContext],
  );

  const handleParagraphChange = useCallback(
    (update: Partial<ParagraphProperties>) => { textEditContext?.applyParagraphProperties(update); },
    [textEditContext],
  );

  if (!textEditContext || textEditContext.selectionContext.type === "none" || !extractedProperties) {
    return (
      <div className={className} style={{ ...containerStyle, ...style }}>
        <div style={noContextStyle}>Click on text to start editing</div>
      </div>
    );
  }

  const { runProperties, paragraphProperties } = extractedProperties;

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <MixedRunPropertiesEditor
        value={runProperties}
        onChange={handleRunChange}
      />
      <MixedParagraphPropertiesEditor
        value={paragraphProperties}
        onChange={handleParagraphChange}
      />
    </div>
  );
}
