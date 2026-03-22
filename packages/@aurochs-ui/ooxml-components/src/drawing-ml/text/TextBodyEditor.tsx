/**
 * @file TextBodyEditor - Editor for text body
 *
 * Displays paragraph list and edits selected paragraph properties.
 */

import { useCallback, useState, type CSSProperties, type KeyboardEvent } from "react";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { ParagraphPropertiesEditor, createDefaultParagraphProperties } from "./ParagraphPropertiesEditor";
import type { TextBody, Paragraph, ParagraphProperties, TextRun } from "@aurochs-office/pptx/domain/text";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

// =============================================================================
// Types
// =============================================================================

export type TextBodyEditorProps = EditorProps<TextBody> & {
  readonly style?: CSSProperties;
  /** Show default run properties in paragraph editor */
  readonly showDefaultRunProperties?: boolean;
  /** Maximum preview length for paragraph text */
  readonly maxPreviewLength?: number;
};

type ParagraphListItemProps = {
  readonly paragraph: Paragraph;
  readonly index: number;
  readonly isSelected: boolean;
  readonly disabled?: boolean;
  readonly maxPreviewLength: number;
  readonly onSelect: (index: number) => void;
};

type ParagraphListProps = {
  readonly paragraphs: readonly Paragraph[];
  readonly selectedIndex: number | null;
  readonly disabled?: boolean;
  readonly maxPreviewLength: number;
  readonly onSelect: (index: number) => void;
};

type PropertiesPanelProps = {
  readonly paragraph: Paragraph | null;
  readonly paragraphIndex: number | null;
  readonly disabled?: boolean;
  readonly showDefaultRunProperties: boolean;
  readonly onChange: (properties: ParagraphProperties) => void;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const paragraphListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

const paragraphItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  transition: "background-color 150ms ease",
};

const paragraphItemSelectedStyle: CSSProperties = {
  ...paragraphItemStyle,
  backgroundColor: "var(--accent-blue, #0070f3)",
  color: "var(--text-primary, #fafafa)",
};

const paragraphItemUnselectedStyle: CSSProperties = {
  ...paragraphItemStyle,
  backgroundColor: "transparent",
  color: "var(--text-secondary, #a1a1a1)",
};

const paragraphIndexStyle: CSSProperties = {
  minWidth: "24px",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 600,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: "4px",
  flexShrink: 0,
};

const paragraphTextStyle: CSSProperties = {
  flex: 1,
  fontSize: "13px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const emptyTextStyle: CSSProperties = {
  fontStyle: "italic",
  opacity: 0.5,
};

const sectionStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

const noSelectionStyle: CSSProperties = {
  padding: "20px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "13px",
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract plain text from text runs
 */
function getPlainText(runs: readonly TextRun[], maxLength: number): string {
  const texts: string[] = [];
  for (const run of runs) {
    if (run.type === "text") {
      texts.push(run.text);
    } else if (run.type === "break") {
      texts.push(" ");
    } else if (run.type === "field") {
      texts.push(run.text);
    }

    const currentLength = texts.join("").length;
    if (currentLength >= maxLength) {
      break;
    }
  }

  const text = texts.join("");
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "…";
  }
  return text;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Single paragraph list item
 */
function ParagraphListItem({
  paragraph,
  index,
  isSelected,
  disabled,
  maxPreviewLength,
  onSelect,
}: ParagraphListItemProps) {
  const plainText = getPlainText(paragraph.runs, maxPreviewLength);
  const itemStyle = isSelected ? paragraphItemSelectedStyle : paragraphItemUnselectedStyle;
  const textStyleFinal = plainText ? paragraphTextStyle : { ...paragraphTextStyle, ...emptyTextStyle };
  const tabIndexValue = disabled ? -1 : 0;

  const handleClick = () => {
    if (!disabled) {
      onSelect(index);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      onSelect(index);
    }
  };

  return (
    <div
      style={itemStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={tabIndexValue}
      aria-selected={isSelected}
    >
      <span style={paragraphIndexStyle}>{index + 1}</span>
      <span style={textStyleFinal}>{plainText || "(empty)"}</span>
    </div>
  );
}

/**
 * Paragraph list component
 */
function ParagraphList({ paragraphs, selectedIndex, disabled, maxPreviewLength, onSelect }: ParagraphListProps) {
  if (paragraphs.length === 0) {
    return <div style={noSelectionStyle}>No paragraphs</div>;
  }

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <ParagraphListItem
          key={index}
          paragraph={paragraph}
          index={index}
          isSelected={selectedIndex === index}
          disabled={disabled}
          maxPreviewLength={maxPreviewLength}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

/**
 * Properties panel for selected paragraph
 */
function PropertiesPanel({
  paragraph,
  paragraphIndex,
  disabled,
  showDefaultRunProperties,
  onChange,
}: PropertiesPanelProps) {
  if (!paragraph) {
    return (
      <div style={sectionStyle}>
        <div style={noSelectionStyle}>Select a paragraph to edit its properties</div>
      </div>
    );
  }

  const paragraphNumber = (paragraphIndex ?? 0) + 1;

  return (
    <div style={sectionStyle}>
      <FieldGroup label={`Paragraph ${paragraphNumber} Properties`}>
        <ParagraphPropertiesEditor
          value={paragraph.properties}
          onChange={onChange}
          disabled={disabled}
          showDefaultRunProperties={showDefaultRunProperties}
        />
      </FieldGroup>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for text body (paragraph list with property editing)
 */
export function TextBodyEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showDefaultRunProperties = false,
  maxPreviewLength = 50,
}: TextBodyEditorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(value.paragraphs?.length > 0 ? 0 : null);

  const handleParagraphSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleParagraphPropertiesChange = useCallback(
    (properties: ParagraphProperties) => {
      if (selectedIndex === null) {
        return;
      }

      const newParagraphs = value.paragraphs.map((para, idx) => {
        if (idx === selectedIndex) {
          return { ...para, properties };
        }
        return para;
      });

      onChange({
        ...value,
        paragraphs: newParagraphs,
      });
    },
    [value, onChange, selectedIndex],
  );

  const getSelectedParagraph = (): Paragraph | null => {
    if (selectedIndex === null || !value.paragraphs || selectedIndex >= value.paragraphs.length) {
      return null;
    }
    return value.paragraphs[selectedIndex];
  };

  const selectedParagraph = getSelectedParagraph();

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldGroup label="Paragraphs">
        <div style={paragraphListStyle}>
          <ParagraphList
            paragraphs={value.paragraphs}
            selectedIndex={selectedIndex}
            disabled={disabled}
            maxPreviewLength={maxPreviewLength}
            onSelect={handleParagraphSelect}
          />
        </div>
      </FieldGroup>

      <PropertiesPanel
        paragraph={selectedParagraph}
        paragraphIndex={selectedIndex}
        disabled={disabled}
        showDefaultRunProperties={showDefaultRunProperties}
        onChange={handleParagraphPropertiesChange}
      />
    </div>
  );
}

/**
 * Create default TextBody value
 */
export function createDefaultTextBody(): TextBody {
  return {
    bodyProperties: {
      verticalType: "horz",
      wrapping: "square",
      anchor: "top",
      anchorCenter: false,
      overflow: "overflow",
      autoFit: { type: "none" },
      insets: {
        left: 0 as never,
        top: 0 as never,
        right: 0 as never,
        bottom: 0 as never,
      },
    },
    paragraphs: [
      {
        properties: createDefaultParagraphProperties(),
        runs: [
          {
            type: "text",
            text: "Sample text",
          },
        ],
      },
    ],
  };
}
