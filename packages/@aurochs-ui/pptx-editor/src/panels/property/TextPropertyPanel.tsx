/**
 * @file TextPropertyPanel - Property panel for text editing mode
 *
 * Displays paragraph and character property editors with Mixed support
 * when in text editing mode. Uses TextEditContext for selection-aware
 * property extraction and formatting application.
 */

import { useMemo, type CSSProperties } from "react";
import { Accordion } from "@aurochs-ui/ui-components/layout";
import { MixedRunPropertiesEditor } from "../../editors/text/MixedRunPropertiesEditor";
import { MixedParagraphPropertiesEditor } from "../../editors/text/MixedParagraphPropertiesEditor";
import { useTextEditContext } from "../../context/slide/TextEditContext";
import type { RunProperties, ParagraphProperties } from "@aurochs-office/pptx/domain/text";

// =============================================================================
// Types
// =============================================================================

export type TextPropertyPanelProps = {
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
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

const infoStyle: CSSProperties = {
  padding: "12px 16px",
  fontSize: "12px",
  color: "var(--text-tertiary, #737373)",
  borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))",
};

const noContextStyle: CSSProperties = {
  padding: "20px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "13px",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Text property panel for text editing mode.
 *
 * Shows paragraph and character properties with Mixed support based on
 * the current text selection. Changes are applied via TextEditContext.
 */
export function TextPropertyPanel({ className, style }: TextPropertyPanelProps) {
  const textEditContext = useTextEditContext();

  // Selection info for display
  const selectionInfo = useMemo(() => {
    if (!textEditContext) {
      return null;
    }

    const { selectionContext } = textEditContext;

    switch (selectionContext.type) {
      case "none":
        return "No text selected";
      case "cursor": {
        const { position } = selectionContext;
        return `Cursor at paragraph ${position.paragraphIndex + 1}, character ${position.charOffset}`;
      }
      case "selection": {
        const { selection } = selectionContext;
        // Calculate selection span info
        if (selection.start.paragraphIndex === selection.end.paragraphIndex) {
          const length = Math.abs(selection.end.charOffset - selection.start.charOffset);
          return `${length} character${length !== 1 ? "s" : ""} selected`;
        }
        const paragraphCount = Math.abs(selection.end.paragraphIndex - selection.start.paragraphIndex) + 1;
        return `Selection across ${paragraphCount} paragraph${paragraphCount !== 1 ? "s" : ""}`;
      }
      case "shape":
        return "Entire text body";
      default:
        return null;
    }
  }, [textEditContext]);

  // If no context, show placeholder
  if (!textEditContext) {
    return (
      <div className={className} style={{ ...containerStyle, ...style }}>
        <div style={noContextStyle}>Not in text editing mode</div>
      </div>
    );
  }

  const { selectionContext, applyRunProperties, applyParagraphProperties } = textEditContext;

  // Get extracted properties from context
  const extractedProperties = selectionContext.type !== "none" ? getExtractedProperties(textEditContext) : null;

  // Handle run property changes
  const handleRunPropertiesChange = (update: Partial<RunProperties>) => {
    applyRunProperties(update);
  };

  // Handle paragraph property changes
  const handleParagraphPropertiesChange = (update: Partial<ParagraphProperties>) => {
    applyParagraphProperties(update);
  };

  // If selection context is "none", show a message
  if (selectionContext.type === "none") {
    return (
      <div className={className} style={{ ...containerStyle, ...style }}>
        <div style={noContextStyle}>Click on text to start editing</div>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      {/* Selection Info */}
      {selectionInfo && <div style={infoStyle}>{selectionInfo}</div>}

      {/* Character Properties */}
      <Accordion title="Character" defaultExpanded>
        {extractedProperties?.runProperties && (
          <MixedRunPropertiesEditor
            value={extractedProperties.runProperties}
            onChange={handleRunPropertiesChange}
            showSpacing={false}
          />
        )}
      </Accordion>

      {/* Paragraph Properties */}
      <Accordion title="Paragraph" defaultExpanded={false}>
        {extractedProperties?.paragraphProperties && (
          <MixedParagraphPropertiesEditor
            value={extractedProperties.paragraphProperties}
            onChange={handleParagraphPropertiesChange}
            showSpacing={true}
            showIndentation={true}
          />
        )}
      </Accordion>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

import type { TextEditContextValue } from "../../context/slide/TextEditContext";
import type { MixedRunProperties, MixedParagraphProperties } from "../../editors/text/mixed-properties";
import { extractTextProperties } from "../../editors/text/text-property-extractor";

type ExtractedProperties = {
  runProperties: MixedRunProperties;
  paragraphProperties: MixedParagraphProperties;
};

/**
 * Extract properties from the text edit context.
 */
function getExtractedProperties(context: TextEditContextValue): ExtractedProperties | null {
  const { currentTextBody, selectionContext } = context;

  if (!currentTextBody) {
    return null;
  }

  const extracted = extractTextProperties(currentTextBody, selectionContext);

  return {
    runProperties: extracted.runProperties,
    paragraphProperties: extracted.paragraphProperties,
  };
}
