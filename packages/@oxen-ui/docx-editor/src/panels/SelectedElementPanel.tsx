/**
 * @file SelectedElementPanel
 *
 * Property panel for editing the currently selected DOCX element.
 * Supports paragraph (run + paragraph properties) and table (table + cell properties).
 */

import type { CSSProperties } from "react";
import { useCallback, useMemo } from "react";
import type { DocxBlockContent } from "@oxen/docx/domain/document";
import type { DocxParagraph, DocxParagraphProperties } from "@oxen/docx/domain/paragraph";
import type { DocxRunProperties } from "@oxen/docx/domain/run";
import type { DocxTable, DocxTableCellProperties, DocxTableProperties } from "@oxen/docx/domain/table";
import { useDocumentEditor } from "../context/document/DocumentEditorContext";
import {
  RunPropertiesEditor,
  type RunPropertiesMixedState,
} from "../editors/text/RunPropertiesEditor";
import { ParagraphPropertiesEditor } from "../editors/paragraph/ParagraphPropertiesEditor";
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
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
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

function getMixedRunProperties(
  selectedElements: readonly DocxBlockContent[]
): { readonly value: DocxRunProperties; readonly mixed: RunPropertiesMixedState } {
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

  const mixed: RunPropertiesMixedState = {
    ...(b.mixed ? { b: true } : {}),
    ...(i.mixed ? { i: true } : {}),
    ...(u.mixed ? { u: true } : {}),
    ...(strike.mixed ? { strike: true } : {}),
    ...(sz.mixed ? { sz: true } : {}),
    ...(rFonts.mixed ? { rFonts: true } : {}),
  };

  return { value, mixed };
}

function diffObject<T extends object>(prev: T, next: T): Partial<T> {
  const prevRecord = prev as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const changed: Record<string, unknown> = {};
  const keys = new Set<string>([
    ...Object.keys(prevRecord),
    ...Object.keys(nextRecord),
  ]);
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
// Sub-components
// =============================================================================

function NoSelectionState() {
  return (
    <div
      data-testid="docx-selected-element-panel-empty"
      style={{
        padding: "var(--spacing-lg)",
        color: "var(--text-secondary)",
        fontSize: "var(--font-size-md)",
      }}
    >
      No selection
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
    [selectedElements]
  );

  const paragraphValue = paragraph.properties ?? {};

  const handleRunChange = useCallback(
    (next: DocxRunProperties) => {
      onRunPropertiesChange(diffObject(runValue, next));
    },
    [onRunPropertiesChange, runValue]
  );

  const handleParagraphChange = useCallback(
    (next: DocxParagraphProperties) => {
      onParagraphPropertiesChange(diffObject(paragraphValue, next));
    },
    [onParagraphPropertiesChange, paragraphValue]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-md)",
        padding: "var(--spacing-md)",
      }}
    >
      <RunPropertiesEditor value={runValue} mixed={runMixed} onChange={handleRunChange} />
      <ParagraphPropertiesEditor value={paragraphValue} onChange={handleParagraphChange} />
    </div>
  );
}

type TableInspectorProps = {
  readonly table: DocxTable;
  readonly onTablePropertiesChange: (props: Partial<DocxTableProperties>) => void;
  readonly onTableCellPropertiesChange: (props: Partial<DocxTableCellProperties>) => void;
};

function TableInspector({
  table,
  onTablePropertiesChange,
  onTableCellPropertiesChange,
}: TableInspectorProps) {
  const tableValue = table.properties ?? {};
  const cellValue = table.rows[0]?.cells[0]?.properties ?? {};

  const handleTableChange = useCallback(
    (next: DocxTableProperties) => {
      onTablePropertiesChange(diffObject(tableValue, next));
    },
    [onTablePropertiesChange, tableValue]
  );

  const handleCellChange = useCallback(
    (next: DocxTableCellProperties) => {
      onTableCellPropertiesChange(diffObject(cellValue, next));
    },
    [onTableCellPropertiesChange, cellValue]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-md)",
        padding: "var(--spacing-md)",
      }}
    >
      <TablePropertiesEditor value={tableValue} onChange={handleTableChange} />
      <TableCellPropertiesEditor value={cellValue} onChange={handleCellChange} />
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SelectedElementPanel({ className, style }: SelectedElementPanelProps) {
  const { primaryElement, selectedElements, state, dispatch } = useDocumentEditor();
  const selection = state.selection;
  void selection;

  if (!primaryElement) {
    return <NoSelectionState />;
  }

  if (primaryElement.type === "paragraph") {
    return (
      <div className={className} style={style}>
        <ParagraphInspector
          paragraph={primaryElement}
          selectedElements={selectedElements}
          onRunPropertiesChange={(props) =>
            dispatch({ type: "APPLY_RUN_FORMAT", format: props })
          }
          onParagraphPropertiesChange={(props) =>
            dispatch({ type: "APPLY_PARAGRAPH_FORMAT", format: props })
          }
        />
      </div>
    );
  }

  if (primaryElement.type === "table") {
    return (
      <div className={className} style={style}>
        <TableInspector
          table={primaryElement}
          onTablePropertiesChange={(props) =>
            dispatch({ type: "APPLY_TABLE_FORMAT", format: props })
          }
          onTableCellPropertiesChange={(props) =>
            dispatch({ type: "APPLY_TABLE_CELL_FORMAT", format: props })
          }
        />
      </div>
    );
  }

  return null;
}
