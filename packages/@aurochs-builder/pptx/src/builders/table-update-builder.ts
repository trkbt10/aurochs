/**
 * @file Table update builder for build command
 *
 * Handles updates to existing tables in slides using patcher APIs.
 */

import { type XmlDocument, type XmlElement, getByPath, getChildren, isXmlElement } from "@aurochs/xml";
import { patchTable, patchTableStyleId, type TableChange } from "@aurochs-builder/pptx/patcher";
import type { TextBody, Paragraph, TextRun, ParagraphProperties } from "@aurochs-office/pptx/domain/text";
import type { TableColumn, TableRow, TableCell, TableCellProperties } from "@aurochs-office/pptx/domain/table/types";
import type { Pixels, Points } from "@aurochs-office/drawing-ml/domain/units";
import { setChildren } from "./xml-utils";
import type {
  TableUpdateSpec,
  TableRowAddSpec,
  TableColumnAddSpec,
  TableTextBodySpec,
  TableParagraphSpec,
  TableTextRunSpec,
} from "../types";

// =============================================================================
// Type Conversion Helpers
// =============================================================================

function textRunSpecToTextRun(spec: TableTextRunSpec): TextRun {
  const properties: TextRun["properties"] = {
    ...(spec.bold !== undefined && { bold: spec.bold }),
    ...(spec.italic !== undefined && { italic: spec.italic }),
    ...(spec.fontSize !== undefined && { fontSize: spec.fontSize as Points }),
    ...(spec.fontFamily !== undefined && { fontFamily: spec.fontFamily }),
    ...(spec.color !== undefined && { color: { spec: { type: "srgb" as const, value: spec.color } } }),
  };

  return {
    type: "text",
    text: spec.text,
    properties,
  };
}

function paragraphSpecToParagraph(spec: TableParagraphSpec): Paragraph {
  const props: ParagraphProperties = {
    ...(spec.alignment && { alignment: spec.alignment }),
  };

  return {
    runs: spec.runs.map(textRunSpecToTextRun),
    properties: props,
  };
}

/** Convert string or TableTextBodySpec to a TextBody domain object */
export function contentToTextBody(content: string | TableTextBodySpec): TextBody {
  if (typeof content === "string") {
    return {
      bodyProperties: {},
      paragraphs: [
        {
          runs: [{ type: "text", text: content, properties: {} }],
          properties: {},
        },
      ],
    };
  }

  return {
    bodyProperties: {},
    paragraphs: content.paragraphs.map(paragraphSpecToParagraph),
  };
}

function cellSpecToTableCell(content: string | TableTextBodySpec): TableCell {
  return {
    properties: {} as TableCellProperties,
    textBody: contentToTextBody(content),
  };
}

function rowSpecToTableRow(spec: TableRowAddSpec, colCount: number): TableRow {
  // Ensure we have the right number of cells
  const cells: TableCell[] = [];
  for (let i = 0; i < colCount; i++) {
    const content = spec.cells[i];
    if (content !== undefined) {
      cells.push(cellSpecToTableCell(content));
    } else {
      cells.push({ properties: {} as TableCellProperties });
    }
  }

  return {
    height: spec.height as Pixels,
    cells,
  };
}

function colSpecToTableColumn(spec: TableColumnAddSpec): TableColumn {
  return {
    width: spec.width as Pixels,
  };
}

// =============================================================================
// Table Finding Helpers
// =============================================================================

function findGraphicFrameById(spTree: XmlElement, shapeId: string): XmlElement | null {
  const children = spTree.children.filter(isXmlElement);

  for (const child of children) {
    if (child.name !== "p:graphicFrame") {
      continue;
    }

    const nvGraphicFramePr = getChildren(child, "p:nvGraphicFramePr")[0];
    if (!nvGraphicFramePr) {
      continue;
    }

    const cNvPr = getChildren(nvGraphicFramePr, "p:cNvPr")[0];
    if (!cNvPr) {
      continue;
    }

    if (cNvPr.attrs.id === shapeId) {
      return child;
    }
  }

  return null;
}

function getTableFromGraphicFrame(graphicFrame: XmlElement): XmlElement | null {
  const graphic = getChildren(graphicFrame, "a:graphic")[0];
  if (!graphic) {
    return null;
  }

  const graphicData = getChildren(graphic, "a:graphicData")[0];
  if (!graphicData) {
    return null;
  }

  return getChildren(graphicData, "a:tbl")[0] ?? null;
}

function getColumnCount(table: XmlElement): number {
  const tblGrid = getChildren(table, "a:tblGrid")[0];
  if (!tblGrid) {
    return 0;
  }
  return getChildren(tblGrid, "a:gridCol").length;
}

// =============================================================================
// XML Update Helpers
// =============================================================================

function replaceTableInGraphicFrame(graphicFrame: XmlElement, newTable: XmlElement): XmlElement {
  const graphic = getChildren(graphicFrame, "a:graphic")[0];
  if (!graphic) {
    return graphicFrame;
  }

  const graphicData = getChildren(graphic, "a:graphicData")[0];
  if (!graphicData) {
    return graphicFrame;
  }

  // Replace table in graphicData
  const newGraphicDataChildren = graphicData.children.map((c) => {
    if (isXmlElement(c) && c.name === "a:tbl") {
      return newTable;
    }
    return c;
  });
  const newGraphicData = setChildren(graphicData, newGraphicDataChildren);

  // Replace graphicData in graphic
  const newGraphicChildren = graphic.children.map((c) => {
    if (isXmlElement(c) && c.name === "a:graphicData") {
      return newGraphicData;
    }
    return c;
  });
  const newGraphic = setChildren(graphic, newGraphicChildren);

  // Replace graphic in graphicFrame
  const newGraphicFrameChildren = graphicFrame.children.map((c) => {
    if (isXmlElement(c) && c.name === "a:graphic") {
      return newGraphic;
    }
    return c;
  });

  return setChildren(graphicFrame, newGraphicFrameChildren);
}

function getGraphicFrameId(frame: XmlElement): string | null {
  const nvGraphicFramePr = getChildren(frame, "p:nvGraphicFramePr")[0];
  if (!nvGraphicFramePr) {
    return null;
  }
  const cNvPr = getChildren(nvGraphicFramePr, "p:cNvPr")[0];
  if (!cNvPr) {
    return null;
  }
  return cNvPr.attrs.id ?? null;
}

function replaceGraphicFrameInSpTree(spTree: XmlElement, shapeId: string, newFrame: XmlElement): XmlElement {
  const newChildren = spTree.children.map((c) => {
    if (!isXmlElement(c) || c.name !== "p:graphicFrame") {
      return c;
    }
    const frameId = getGraphicFrameId(c);
    if (frameId === shapeId) {
      return newFrame;
    }
    return c;
  });
  return setChildren(spTree, newChildren);
}

// =============================================================================
// Main Entry Point
// =============================================================================

export type ApplyTableUpdatesResult = {
  readonly doc: XmlDocument;
  readonly updated: number;
};

function buildTableChanges(spec: TableUpdateSpec, colCount: number): TableChange[] {
  const cellChanges: TableChange[] = (spec.updateCells ?? []).map((cellUpdate) => ({
    type: "cell" as const,
    row: cellUpdate.row,
    col: cellUpdate.col,
    content: contentToTextBody(cellUpdate.content),
  }));

  const addRowChanges: TableChange[] = (spec.addRows ?? []).map((rowSpec) => ({
    type: "addRow" as const,
    row: rowSpecToTableRow(rowSpec, colCount),
    position: rowSpec.position,
  }));

  const removeRowChanges: TableChange[] = [...(spec.removeRows ?? [])]
    .sort((a, b) => b - a)
    .map((rowIndex) => ({ type: "removeRow" as const, rowIndex }));

  const addColChanges: TableChange[] = (spec.addColumns ?? []).map((colSpec) => ({
    type: "addColumn" as const,
    column: colSpecToTableColumn(colSpec),
    position: colSpec.position,
  }));

  const removeColChanges: TableChange[] = [...(spec.removeColumns ?? [])]
    .sort((a, b) => b - a)
    .map((colIndex) => ({ type: "removeColumn" as const, colIndex }));

  return [...cellChanges, ...addRowChanges, ...removeRowChanges, ...addColChanges, ...removeColChanges];
}

function applyTablePatch(table: XmlElement, changes: TableChange[], styleId: string | undefined): XmlElement {
  const patched = changes.length > 0 ? patchTable(table, changes) : table;
  return styleId !== undefined ? patchTableStyleId(patched, styleId) : patched;
}

type TableUpdateAccumulator = {
  readonly spTree: XmlElement;
  readonly updated: number;
};

function processTableUpdate(acc: TableUpdateAccumulator, spec: TableUpdateSpec): TableUpdateAccumulator {
  const graphicFrame = findGraphicFrameById(acc.spTree, spec.shapeId);
  if (!graphicFrame) {
    return acc;
  }

  const table = getTableFromGraphicFrame(graphicFrame);
  if (!table) {
    return acc;
  }

  const colCount = getColumnCount(table);
  const changes = buildTableChanges(spec, colCount);
  const updatedTable = applyTablePatch(table, changes, spec.styleId);
  const updatedFrame = replaceTableInGraphicFrame(graphicFrame, updatedTable);
  const newSpTree = replaceGraphicFrameInSpTree(acc.spTree, spec.shapeId, updatedFrame);

  return { spTree: newSpTree, updated: acc.updated + 1 };
}

/**
 * Apply table updates to a slide document.
 */
export function applyTableUpdates(slideDoc: XmlDocument, updates: readonly TableUpdateSpec[]): ApplyTableUpdatesResult {
  if (updates.length === 0) {
    return { doc: slideDoc, updated: 0 };
  }

  const spTree = getByPath(slideDoc, ["p:sld", "p:cSld", "p:spTree"]);
  if (!spTree) {
    return { doc: slideDoc, updated: 0 };
  }

  const { spTree: currentSpTree, updated } = updates.reduce(processTableUpdate, { spTree, updated: 0 });

  // Replace spTree in document
  const cSld = getByPath(slideDoc, ["p:sld", "p:cSld"]);
  if (!cSld) {
    return { doc: slideDoc, updated };
  }

  const newCsldChildren = cSld.children.map((c) => {
    if (isXmlElement(c) && c.name === "p:spTree") {
      return currentSpTree;
    }
    return c;
  });
  const newCsld = setChildren(cSld, newCsldChildren);

  const sld = getByPath(slideDoc, ["p:sld"]);
  if (!sld) {
    return { doc: slideDoc, updated };
  }

  const newSldChildren = sld.children.map((c) => {
    if (isXmlElement(c) && c.name === "p:cSld") {
      return newCsld;
    }
    return c;
  });
  const newSld = setChildren(sld, newSldChildren);

  return {
    doc: {
      children: slideDoc.children.map((c) => {
        if (isXmlElement(c) && c.name === "p:sld") {
          return newSld;
        }
        return c;
      }),
    },
    updated,
  };
}
