/**
 * @file SelectedElementPanel
 *
 * Property panel for editing the currently selected DOCX element.
 * Uses shared editor-controls components (TextFormattingEditor, ParagraphFormattingEditor).
 */

import type { CSSProperties } from "react";
import { useCallback, useMemo } from "react";
import type { DocxBlockContent } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph, DocxParagraphProperties } from "@aurochs-office/docx/domain/paragraph";
import type { DocxRunProperties } from "@aurochs-office/docx/domain/run";
import type { DocxTable, DocxTableCellProperties, DocxTableProperties } from "@aurochs-office/docx/domain/table";
import { Accordion, spacingTokens, fontTokens, colorTokens } from "@aurochs-ui/ui-components";
import { TextFormattingEditor, ParagraphFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting, ParagraphFormatting } from "@aurochs-ui/editor-controls/text";
import type { MixedContext } from "@aurochs-ui/editor-controls/mixed-state";
import { useDocumentEditor } from "../context/document/DocumentEditorContext";
import { docxTextAdapter } from "../adapters/editor-controls/docx-text-adapter";
import { docxParagraphAdapter } from "../adapters/editor-controls/docx-paragraph-adapter";
import { TablePropertiesEditor } from "../editors/table/TablePropertiesEditor";
import { TableCellPropertiesEditor } from "../editors/table/TableCellPropertiesEditor";

// =============================================================================
// Types
// =============================================================================

export type SelectedElementPanelProps = {
  readonly className?: string;
  readonly style?: CSSProperties;
};

// =============================================================================
// Helpers
// =============================================================================

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (a === null || b === null) {
    return a === b;
  }
  if (typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) {
      return false;
    }
    if (!deepEqual(objA[key], objB[key])) {
      return false;
    }
  }
  return true;
}

type MixedExtraction<T> = {
  readonly value: T | undefined;
  readonly mixed: boolean;
};

function extractMixed<T>(values: readonly (T | undefined)[]): MixedExtraction<T> {
  if (values.length === 0) {
    return { value: undefined, mixed: false };
  }
  const first = values[0];
  for (let i = 1; i < values.length; i++) {
    if (!deepEqual(first, values[i])) {
      return { value: undefined, mixed: true };
    }
  }
  return { value: first, mixed: false };
}

function getParagraphRepresentativeRunProperties(paragraph: DocxParagraph): DocxRunProperties | undefined {
  for (const content of paragraph.content) {
    if (content.type === "run") {
      return content.properties ?? paragraph.properties?.rPr;
    }
    if (content.type === "hyperlink") {
      const firstRun = content.content.find((r) => r.type === "run");
      if (firstRun) {
        return firstRun.properties ?? paragraph.properties?.rPr;
      }
    }
  }
  return paragraph.properties?.rPr;
}

function getMixedRunProperties(selectedElements: readonly DocxBlockContent[]): {
  readonly value: DocxRunProperties;
  readonly mixed: MixedContext;
} {
  const paragraphs = selectedElements.filter((el): el is DocxParagraph => el.type === "paragraph");
  const extracted = paragraphs.map((p) => getParagraphRepresentativeRunProperties(p) ?? {});

  const b = extractMixed(extracted.map((p) => p.b));
  const i = extractMixed(extracted.map((p) => p.i));
  const u = extractMixed(extracted.map((p) => p.u));
  const strike = extractMixed(extracted.map((p) => p.strike));
  const sz = extractMixed(extracted.map((p) => p.sz));
  const rFonts = extractMixed(extracted.map((p) => p.rFonts));

  const value: DocxRunProperties = {
    ...(!b.mixed && b.value !== undefined ? { b: b.value } : {}),
    ...(!i.mixed && i.value !== undefined ? { i: i.value } : {}),
    ...(!u.mixed && u.value !== undefined ? { u: u.value } : {}),
    ...(!strike.mixed && strike.value !== undefined ? { strike: strike.value } : {}),
    ...(!sz.mixed && sz.value !== undefined ? { sz: sz.value } : {}),
    ...(!rFonts.mixed && rFonts.value !== undefined ? { rFonts: rFonts.value } : {}),
  };

  // Convert to MixedContext for shared editor
  const mixedFields = new Set<string>();
  if (b.mixed) {
    mixedFields.add("bold");
  }
  if (i.mixed) {
    mixedFields.add("italic");
  }
  if (u.mixed) {
    mixedFields.add("underline");
  }
  if (strike.mixed) {
    mixedFields.add("strikethrough");
  }
  if (sz.mixed) {
    mixedFields.add("fontSize");
  }
  if (rFonts.mixed) {
    mixedFields.add("fontFamily");
  }

  const mixed: MixedContext = mixedFields.size > 0 ? { mixedFields } : {};

  return { value, mixed };
}

function diffObject<T extends object>(prev: T, next: T): Partial<T> {
  const prevRecord = prev as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const changed: Record<string, unknown> = {};
  const keys = new Set<string>([...Object.keys(prevRecord), ...Object.keys(nextRecord)]);
  for (const key of keys) {
    const prevValue = prevRecord[key];
    const nextValue = nextRecord[key];
    if (!deepEqual(prevValue, nextValue)) {
      changed[key] = nextValue;
    }
  }
  return changed as Partial<T>;
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  fontSize: fontTokens.size.md,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  flexShrink: 0,
};

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

const emptyStyle: CSSProperties = {
  padding: spacingTokens.md,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
};

// =============================================================================
// Sub-components
// =============================================================================

function NoSelectionState() {
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Format</div>
      <div style={emptyStyle} data-testid="docx-selected-element-panel-empty">
        Click on text to edit formatting
      </div>
    </div>
  );
}

type ParagraphInspectorProps = {
  readonly paragraph: DocxParagraph;
  readonly selectedElements: readonly DocxBlockContent[];
  readonly onRunPropertiesChange: (props: Partial<DocxRunProperties>) => void;
  readonly onParagraphPropertiesChange: (props: Partial<DocxParagraphProperties>) => void;
};

function ParagraphInspector({
  paragraph,
  selectedElements,
  onRunPropertiesChange,
  onParagraphPropertiesChange,
}: ParagraphInspectorProps) {
  const { value: runValue, mixed: runMixed } = useMemo(
    () => getMixedRunProperties(selectedElements),
    [selectedElements],
  );

  const paragraphValue = paragraph.properties ?? {};

  // Convert to generic types for shared editors
  const textFormatting = useMemo<TextFormatting>(
    () => docxTextAdapter.toGeneric(runValue),
    [runValue],
  );

  const paragraphFormatting = useMemo<ParagraphFormatting>(
    () => docxParagraphAdapter.toGeneric(paragraphValue),
    [paragraphValue],
  );

  const handleTextChange = useCallback(
    (update: Partial<TextFormatting>) => {
      const newRunProps = docxTextAdapter.applyUpdate(runValue, update);
      onRunPropertiesChange(diffObject(runValue, newRunProps));
    },
    [onRunPropertiesChange, runValue],
  );

  const handleParagraphChange = useCallback(
    (update: Partial<ParagraphFormatting>) => {
      const newParaProps = docxParagraphAdapter.applyUpdate(paragraphValue, update);
      onParagraphPropertiesChange(diffObject(paragraphValue, newParaProps));
    },
    [onParagraphPropertiesChange, paragraphValue],
  );

  return (
    <>
      <Accordion title="Text" defaultExpanded>
        <TextFormattingEditor
          value={textFormatting}
          onChange={handleTextChange}
          mixed={runMixed}
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
      </Accordion>

      <Accordion title="Paragraph" defaultExpanded>
        <ParagraphFormattingEditor
          value={paragraphFormatting}
          onChange={handleParagraphChange}
          features={{
            showAlignment: true,
            showIndentation: true,
            showSpacing: true,
            showLineSpacing: true,
          }}
        />
      </Accordion>
    </>
  );
}

type TableInspectorProps = {
  readonly table: DocxTable;
  readonly onTablePropertiesChange: (props: Partial<DocxTableProperties>) => void;
  readonly onTableCellPropertiesChange: (props: Partial<DocxTableCellProperties>) => void;
};

function TableInspector({ table, onTablePropertiesChange, onTableCellPropertiesChange }: TableInspectorProps) {
  const tableValue = table.properties ?? {};
  const cellValue = table.rows[0]?.cells[0]?.properties ?? {};

  const handleTableChange = useCallback(
    (next: DocxTableProperties) => {
      onTablePropertiesChange(diffObject(tableValue, next));
    },
    [onTablePropertiesChange, tableValue],
  );

  const handleCellChange = useCallback(
    (next: DocxTableCellProperties) => {
      onTableCellPropertiesChange(diffObject(cellValue, next));
    },
    [onTableCellPropertiesChange, cellValue],
  );

  return (
    <>
      <Accordion title="Table" defaultExpanded>
        <TablePropertiesEditor value={tableValue} onChange={handleTableChange} />
      </Accordion>
      <Accordion title="Cell" defaultExpanded>
        <TableCellPropertiesEditor value={cellValue} onChange={handleCellChange} />
      </Accordion>
    </>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Property panel for editing the currently selected DOCX element.
 */
export function SelectedElementPanel({ className, style }: SelectedElementPanelProps) {
  const { primaryElement, selectedElements, dispatch } = useDocumentEditor();

  if (!primaryElement) {
    return <NoSelectionState />;
  }

  const mergedContainerStyle: CSSProperties = { ...containerStyle, ...style };

  if (primaryElement.type === "paragraph") {
    return (
      <div className={className} style={mergedContainerStyle}>
        <div style={headerStyle}>Format</div>
        <div style={contentStyle}>
          <ParagraphInspector
            paragraph={primaryElement}
            selectedElements={selectedElements}
            onRunPropertiesChange={(props) => dispatch({ type: "APPLY_RUN_FORMAT", format: props })}
            onParagraphPropertiesChange={(props) => dispatch({ type: "APPLY_PARAGRAPH_FORMAT", format: props })}
          />
        </div>
      </div>
    );
  }

  if (primaryElement.type === "table") {
    return (
      <div className={className} style={mergedContainerStyle}>
        <div style={headerStyle}>Format</div>
        <div style={contentStyle}>
          <TableInspector
            table={primaryElement}
            onTablePropertiesChange={(props) => dispatch({ type: "APPLY_TABLE_FORMAT", format: props })}
            onTableCellPropertiesChange={(props) => dispatch({ type: "APPLY_TABLE_CELL_FORMAT", format: props })}
          />
        </div>
      </div>
    );
  }

  return null;
}
