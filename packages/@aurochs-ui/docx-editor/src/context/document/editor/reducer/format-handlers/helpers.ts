/**
 * @file Format Handlers Helpers
 *
 * Shared utility functions for format handlers.
 */

import type { DocxDocument, DocxBlockContent } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph, DocxParagraphProperties } from "@aurochs-office/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@aurochs-office/docx/domain/run";
import type { DocxTable, DocxTableProperties, DocxTableCellProperties } from "@aurochs-office/docx/domain/table";

// =============================================================================
// Selection Helpers
// =============================================================================

/**
 * Get selected element indices from selection state.
 */
export function getSelectedIndices(selectedIds: readonly string[], contentLength: number): number[] {
  const indices: number[] = [];
  for (const id of selectedIds) {
    const index = parseInt(id, 10);
    if (!Number.isNaN(index) && index >= 0 && index < contentLength) {
      indices.push(index);
    }
  }
  return indices;
}

// =============================================================================
// Run Helpers
// =============================================================================

/**
 * Apply run properties update to a run.
 */
export function applyRunPropsToRun(run: DocxRun, format: Partial<DocxRunProperties>): DocxRun {
  return {
    ...run,
    properties: {
      ...(run.properties ?? {}),
      ...format,
    },
  };
}

/**
 * Apply run format to all runs in a paragraph.
 */
export function applyRunFormatToParagraph(
  paragraph: DocxParagraph,
  format: Partial<DocxRunProperties>,
): DocxParagraph {
  const newContent = paragraph.content.map((item) => {
    if (item.type === "run") {
      return applyRunPropsToRun(item, format);
    }
    if (item.type === "hyperlink") {
      return {
        ...item,
        content: item.content.map((c) => (c.type === "run" ? applyRunPropsToRun(c, format) : c)),
      };
    }
    return item;
  });

  return {
    ...paragraph,
    content: newContent,
  };
}

/**
 * Get the first run's properties from a paragraph.
 */
export function getFirstRunProperties(paragraph: DocxParagraph): DocxRunProperties | undefined {
  for (const item of paragraph.content) {
    if (item.type === "run") {
      return item.properties;
    }
    if (item.type === "hyperlink") {
      const firstRun = item.content.find((c) => c.type === "run");
      if (firstRun) {
        return firstRun.properties;
      }
    }
  }
  return undefined;
}

/**
 * Clear all run formatting from a paragraph.
 */
export function clearRunFormatting(paragraph: DocxParagraph): DocxParagraph {
  const newContent = paragraph.content.map((item) => {
    if (item.type === "run") {
      return { ...item, properties: undefined };
    }
    if (item.type === "hyperlink") {
      return {
        ...item,
        content: item.content.map((c) => (c.type === "run" ? { ...c, properties: undefined } : c)),
      };
    }
    return item;
  });

  return {
    ...paragraph,
    content: newContent,
  };
}

// =============================================================================
// Paragraph Helpers
// =============================================================================

/**
 * Apply paragraph properties update to a paragraph.
 */
export function applyParagraphFormat(
  paragraph: DocxParagraph,
  format: Partial<DocxParagraphProperties>,
): DocxParagraph {
  return {
    ...paragraph,
    properties: {
      ...(paragraph.properties ?? {}),
      ...format,
    },
  };
}

/**
 * Clear paragraph formatting.
 */
export function clearParagraphFormatting(paragraph: DocxParagraph): DocxParagraph {
  const { properties: _removed, ...rest } = paragraph;
  return rest as DocxParagraph;
}

// =============================================================================
// Table Helpers
// =============================================================================

/**
 * Apply table properties update to a table.
 */
export function applyTableFormat(table: DocxTable, format: Partial<DocxTableProperties>): DocxTable {
  return {
    ...table,
    properties: {
      ...(table.properties ?? {}),
      ...format,
    },
  };
}

/**
 * Apply cell properties update to all cells in a table.
 */
export function applyTableCellFormat(table: DocxTable, format: Partial<DocxTableCellProperties>): DocxTable {
  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        properties: {
          ...(cell.properties ?? {}),
          ...format,
        },
      })),
    })),
  };
}

// =============================================================================
// Document Helpers
// =============================================================================

/**
 * Update document content at specific indices.
 */
export function updateDocumentContent(
  document: DocxDocument,
  indices: number[],
  updater: (element: DocxBlockContent) => DocxBlockContent,
): DocxDocument {
  const newContent = document.body.content.map((element, index) => {
    if (indices.includes(index)) {
      return updater(element);
    }
    return element;
  });

  return {
    ...document,
    body: {
      ...document.body,
      content: newContent,
    },
  };
}

/**
 * Get selected paragraphs from document.
 */
export function getSelectedParagraphs(
  document: DocxDocument,
  indices: number[],
): DocxParagraph[] {
  return indices
    .map((i) => document.body.content[i])
    .filter((el): el is DocxParagraph => el?.type === "paragraph");
}

/**
 * Get selected tables from document.
 */
export function getSelectedTables(
  document: DocxDocument,
  indices: number[],
): DocxTable[] {
  return indices
    .map((i) => document.body.content[i])
    .filter((el): el is DocxTable => el?.type === "table");
}
