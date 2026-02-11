/**
 * @file DocumentInfoPanel
 *
 * Panel for displaying document-level information and quick actions:
 * - Document statistics (paragraph/table/character counts)
 * - Style list (apply styles)
 * - Section properties (basic viewer/editor)
 */

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo } from "react";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxStyle } from "@aurochs-office/docx/domain/styles";
import type { DocxSectionProperties } from "@aurochs-office/docx/domain/section";
import type { DocxStyleId } from "@aurochs-office/docx/domain/types";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import { Button, Select } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, Section } from "@aurochs-ui/ui-components/layout";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { useDocumentEditor } from "../context/document/DocumentEditorContext";
import { getPlainTextFromParagraph } from "../text-edit/cursor";

// =============================================================================
// Types
// =============================================================================

export type DocumentInfoPanelProps = {
  readonly className?: string;
  readonly style?: CSSProperties;
};

export type DocumentStats = {
  readonly paragraphCount: number;
  readonly tableCount: number;
  readonly characterCount: number;
};

// =============================================================================
// Helpers
// =============================================================================

function mergeClassName(...parts: readonly (string | undefined)[]): string | undefined {
  const merged = parts.filter((p) => p && p.trim().length > 0).join(" ");
  return merged.length > 0 ? merged : undefined;
}

function countCharactersFromParagraph(paragraph: DocxParagraph): number {
  return getPlainTextFromParagraph(paragraph).length;
}

function countCharactersFromTable(table: DocxTable): number {
  return table.rows.reduce((rowTotal, row) => {
    return row.cells.reduce((cellTotal, cell) => {
      return cell.content.reduce((contentTotal, cellContent) => {
        if (cellContent.type === "paragraph") {
          return contentTotal + countCharactersFromParagraph(cellContent);
        }
        if (cellContent.type === "table") {
          return contentTotal + countCharactersFromTable(cellContent);
        }
        return contentTotal;
      }, cellTotal);
    }, rowTotal);
  }, 0);
}

/**
 * Calculate document statistics (paragraph count, table count, character count).
 */
export function calculateDocumentStats(document: DocxDocument): DocumentStats {
  return document.body.content.reduce(
    (acc, content) => {
      if (content.type === "paragraph") {
        return {
          paragraphCount: acc.paragraphCount + 1,
          tableCount: acc.tableCount,
          characterCount: acc.characterCount + countCharactersFromParagraph(content),
        };
      }
      if (content.type === "table") {
        return {
          paragraphCount: acc.paragraphCount,
          tableCount: acc.tableCount + 1,
          characterCount: acc.characterCount + countCharactersFromTable(content),
        };
      }
      return acc;
    },
    { paragraphCount: 0, tableCount: 0, characterCount: 0 },
  );
}

/**
 * Hook to compute document statistics with memoization.
 */
export function useDocumentStats(document: DocxDocument): DocumentStats {
  return useMemo(() => calculateDocumentStats(document), [document]);
}

function collectUsedStyleIdsFromParagraph(paragraph: DocxParagraph, used: Set<DocxStyleId>) {
  if (paragraph.properties?.pStyle) {
    used.add(paragraph.properties.pStyle);
  }
  if (paragraph.properties?.rPr?.rStyle) {
    used.add(paragraph.properties.rPr.rStyle);
  }
  for (const content of paragraph.content) {
    if (content.type === "run") {
      if (content.properties?.rStyle) {
        used.add(content.properties.rStyle);
      }
      continue;
    }
    if (content.type === "hyperlink") {
      for (const run of content.content) {
        if (run.properties?.rStyle) {
          used.add(run.properties.rStyle);
        }
      }
    }
  }
}

function collectUsedStyleIdsFromTable(table: DocxTable, used: Set<DocxStyleId>) {
  if (table.properties?.tblStyle) {
    used.add(table.properties.tblStyle);
  }
  for (const row of table.rows) {
    for (const cell of row.cells) {
      for (const cellContent of cell.content) {
        if (cellContent.type === "paragraph") {
          collectUsedStyleIdsFromParagraph(cellContent, used);
        } else if (cellContent.type === "table") {
          collectUsedStyleIdsFromTable(cellContent, used);
        }
      }
    }
  }
}

function useUsedStyles(document: DocxDocument): readonly DocxStyle[] {
  return useMemo(() => {
    const styles = document.styles?.style ?? [];
    const used = new Set<DocxStyleId>();

    for (const content of document.body.content) {
      if (content.type === "paragraph") {
        collectUsedStyleIdsFromParagraph(content, used);
      } else if (content.type === "table") {
        collectUsedStyleIdsFromTable(content, used);
      }
    }

    if (used.size === 0) {
      return styles;
    }
    return styles.filter((s) => used.has(s.styleId));
  }, [document]);
}

// =============================================================================
// Sub-components
// =============================================================================

type PanelSectionProps = {
  readonly title: string;
  readonly children: ReactNode;
};

function PanelSection({ title, children }: PanelSectionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>
      <Section>{children}</Section>
    </div>
  );
}

type StyleListProps = {
  readonly styles: readonly DocxStyle[];
  readonly onStyleSelect: (style: DocxStyle) => void;
  readonly disabled?: boolean;
};

function StyleList({ styles, onStyleSelect, disabled }: StyleListProps) {
  if (styles.length === 0) {
    return (
      <div data-testid="docx-document-info-style-list-empty" style={{ fontSize: 12, opacity: 0.8 }}>
        No styles
      </div>
    );
  }

  return (
    <div data-testid="docx-document-info-style-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {styles.map((s) => (
        <Button
          key={s.styleId}
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => onStyleSelect(s)}
          style={{ justifyContent: "space-between" }}
          title={s.styleId}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.name?.val ?? s.styleId}
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>{s.type}</span>
        </Button>
      ))}
    </div>
  );
}

type SectionBreakTypeValue = "" | Exclude<DocxSectionProperties["type"], undefined>;

const SECTION_BREAK_TYPE_OPTIONS: readonly SelectOption<SectionBreakTypeValue>[] = [
  { value: "", label: "(Auto)" },
  { value: "continuous", label: "continuous" },
  { value: "nextPage", label: "nextPage" },
  { value: "evenPage", label: "evenPage" },
  { value: "oddPage", label: "oddPage" },
  { value: "nextColumn", label: "nextColumn" },
];

type SectionPropertiesViewerProps = {
  readonly section: DocxSectionProperties | undefined;
  readonly onChange: (next: DocxSectionProperties | undefined) => void;
  readonly disabled?: boolean;
};

function SectionPropertiesViewer({ section, onChange, disabled }: SectionPropertiesViewerProps) {
  const currentType: SectionBreakTypeValue = section?.type ?? "";

  const handleTypeChange = useCallback(
    (nextType: SectionBreakTypeValue) => {
      if (nextType === "") {
        if (!section) {
          return;
        }
        const { type: _removed, ...rest } = section;
        void _removed;
        onChange(Object.keys(rest).length > 0 ? rest : undefined);
        return;
      }
      onChange({ ...(section ?? {}), type: nextType });
    },
    [onChange, section],
  );

  return (
    <div data-testid="docx-document-info-section" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <FieldGroup label="Section Break" inline labelWidth={90}>
        <Select
          value={currentType}
          onChange={handleTypeChange}
          options={SECTION_BREAK_TYPE_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Panel displaying document-level information including statistics, styles, and section properties.
 */
export function DocumentInfoPanel({ className, style }: DocumentInfoPanelProps) {
  const { document, dispatch, editorMode } = useDocumentEditor();

  const { paragraphCount, tableCount, characterCount } = useDocumentStats(document);
  const usedStyles = useUsedStyles(document);

  const activeSection = document.body.sectPr;

  const canEdit = editorMode === "editing";

  const handleStyleSelect = useCallback(
    (styleToApply: DocxStyle) => {
      if (styleToApply.type === "paragraph") {
        dispatch({ type: "APPLY_PARAGRAPH_FORMAT", format: { pStyle: styleToApply.styleId } });
        return;
      }
      if (styleToApply.type === "character") {
        dispatch({ type: "APPLY_RUN_FORMAT", format: { rStyle: styleToApply.styleId } });
        return;
      }
      if (styleToApply.type === "table") {
        dispatch({ type: "APPLY_TABLE_FORMAT", format: { tblStyle: styleToApply.styleId } });
        return;
      }
    },
    [dispatch],
  );

  const handleSectionChange = useCallback(
    (nextSectPr: DocxSectionProperties | undefined) => {
      const nextDoc: DocxDocument = {
        ...document,
        body: {
          ...document.body,
          ...(nextSectPr ? { sectPr: nextSectPr } : { sectPr: undefined }),
        },
      };
      dispatch({ type: "REPLACE_DOCUMENT", document: nextDoc });
    },
    [dispatch, document],
  );

  return (
    <div
      data-testid="docx-document-info-panel"
      className={mergeClassName("document-info-panel", className)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        overflow: "auto",
        ...style,
      }}
    >
      <PanelSection title="統計">
        <FieldGroup label="段落数" inline labelWidth={90}>
          <div>{paragraphCount}</div>
        </FieldGroup>
        <FieldGroup label="テーブル数" inline labelWidth={90}>
          <div>{tableCount}</div>
        </FieldGroup>
        <FieldGroup label="文字数" inline labelWidth={90}>
          <div>{characterCount}</div>
        </FieldGroup>
      </PanelSection>

      <PanelSection title="スタイル">
        <StyleList styles={usedStyles} onStyleSelect={handleStyleSelect} disabled={!canEdit} />
      </PanelSection>

      <PanelSection title="セクション">
        <SectionPropertiesViewer section={activeSection} onChange={handleSectionChange} disabled={!canEdit} />
      </PanelSection>
    </div>
  );
}
