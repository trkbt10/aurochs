/**
 * @file MixedTextBodyEditor - Editor for text body with Mixed property support
 *
 * Unlike TextBodyEditor (which shows per-paragraph editing), this editor
 * shows aggregated Mixed properties for the entire text body.
 * Used when a shape is selected but not in text editing mode.
 */

import { useMemo, type CSSProperties } from "react";
import { Accordion } from "@oxen-ui/ui-components/layout";
import { MixedRunPropertiesEditor } from "./MixedRunPropertiesEditor";
import { MixedParagraphPropertiesEditor } from "./MixedParagraphPropertiesEditor";
import {
  extractMixedRunProperties,
  extractMixedParagraphProperties,
  mergeRunProperties,
} from "./mixed-properties";
import type { TextBody, RunProperties, ParagraphProperties, Paragraph, TextRun } from "@oxen/pptx/domain/text";
import type { EditorProps } from "@oxen-ui/ui-components/types";

// =============================================================================
// Types
// =============================================================================

export type MixedTextBodyEditorProps = EditorProps<TextBody> & {
  readonly style?: CSSProperties;
  /** Show spacing controls in character editor */
  readonly showCharacterSpacing?: boolean;
  /** Show spacing controls in paragraph editor */
  readonly showParagraphSpacing?: boolean;
  /** Show indentation controls in paragraph editor */
  readonly showIndentation?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0",
};

const summaryStyle: CSSProperties = {
  padding: "12px 16px",
  fontSize: "12px",
  color: "var(--text-tertiary, #737373)",
  borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))",
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract all RunProperties from all paragraphs
 */
function getAllRunProperties(textBody: TextBody): RunProperties[] {
  const properties: RunProperties[] = [];

  for (const paragraph of textBody.paragraphs) {
    for (const run of paragraph.runs) {
      if (run.type === "text" || run.type === "field") {
        properties.push(run.properties ?? {});
      }
    }
  }

  return properties;
}

/**
 * Extract all ParagraphProperties from all paragraphs
 */
function getAllParagraphProperties(textBody: TextBody): ParagraphProperties[] {
  return textBody.paragraphs.map((p) => p.properties);
}

/**
 * Apply run property updates to all text runs
 */
function applyRunPropertiesToAll(
  textBody: TextBody,
  update: Partial<RunProperties>
): TextBody {
  const newParagraphs = textBody.paragraphs.map((paragraph): Paragraph => {
    const newRuns = paragraph.runs.map((run): TextRun => {
      if (run.type === "text" || run.type === "field") {
        const currentProps = run.properties ?? {};
        const mergedProps = mergeRunProperties(currentProps, update);
        return { ...run, properties: mergedProps };
      }
      return run;
    });

    return { ...paragraph, runs: newRuns };
  });

  return { ...textBody, paragraphs: newParagraphs };
}

/**
 * Apply paragraph property updates to all paragraphs
 */
function applyParagraphPropertiesToAll(
  textBody: TextBody,
  update: Partial<ParagraphProperties>
): TextBody {
  const newParagraphs = textBody.paragraphs.map((paragraph): Paragraph => {
    const currentProps = paragraph.properties;
    const newProps: ParagraphProperties = { ...currentProps };

    // Apply updates, removing undefined values
    for (const [key, value] of Object.entries(update)) {
      if (value === undefined) {
        delete (newProps as Record<string, unknown>)[key];
      } else {
        (newProps as Record<string, unknown>)[key] = value;
      }
    }

    return { ...paragraph, properties: newProps };
  });

  return { ...textBody, paragraphs: newParagraphs };
}

/**
 * Get text content summary
 */
function getTextSummary(textBody: TextBody): string {
  const paragraphCount = textBody.paragraphs.length;
  let charCount = 0;

  for (const paragraph of textBody.paragraphs) {
    for (const run of paragraph.runs) {
      if (run.type === "text") {
        charCount += run.text.length;
      } else if (run.type === "field") {
        charCount += run.text.length;
      }
    }
  }

  const paraText = paragraphCount === 1 ? "paragraph" : "paragraphs";
  const charText = charCount === 1 ? "character" : "characters";

  return `${paragraphCount} ${paraText}, ${charCount} ${charText}`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for text body with Mixed property support.
 *
 * Shows aggregated properties for the entire text body with "Mixed" indicators
 * when values differ across runs or paragraphs.
 *
 * Use this when a shape is selected but not in text editing mode.
 * For text editing mode with cursor/selection, use TextPropertyPanel.
 */
export function MixedTextBodyEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showCharacterSpacing = false,
  showParagraphSpacing = true,
  showIndentation = true,
}: MixedTextBodyEditorProps) {
  // Extract all properties
  const allRunProperties = useMemo(
    () => getAllRunProperties(value),
    [value]
  );

  const allParagraphProperties = useMemo(
    () => getAllParagraphProperties(value),
    [value]
  );

  // Compute Mixed properties
  const mixedRunProperties = useMemo(
    () => extractMixedRunProperties(allRunProperties),
    [allRunProperties]
  );

  const mixedParagraphProperties = useMemo(
    () => extractMixedParagraphProperties(allParagraphProperties),
    [allParagraphProperties]
  );

  // Text summary
  const summary = useMemo(() => getTextSummary(value), [value]);

  // Handle run property changes
  const handleRunPropertiesChange = (update: Partial<RunProperties>) => {
    if (disabled) {return;}
    const newTextBody = applyRunPropertiesToAll(value, update);
    onChange(newTextBody);
  };

  // Handle paragraph property changes
  const handleParagraphPropertiesChange = (update: Partial<ParagraphProperties>) => {
    if (disabled) {return;}
    const newTextBody = applyParagraphPropertiesToAll(value, update);
    onChange(newTextBody);
  };

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      {/* Text Summary */}
      <div style={summaryStyle}>{summary}</div>

      {/* Character Properties */}
      <Accordion title="Character" defaultExpanded>
        <MixedRunPropertiesEditor
          value={mixedRunProperties}
          onChange={handleRunPropertiesChange}
          disabled={disabled}
          showSpacing={showCharacterSpacing}
        />
      </Accordion>

      {/* Paragraph Properties */}
      <Accordion title="Paragraph" defaultExpanded={false}>
        <MixedParagraphPropertiesEditor
          value={mixedParagraphProperties}
          onChange={handleParagraphPropertiesChange}
          disabled={disabled}
          showSpacing={showParagraphSpacing}
          showIndentation={showIndentation}
        />
      </Accordion>
    </div>
  );
}
