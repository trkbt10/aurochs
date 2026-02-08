/**
 * @file Shared formula expansion
 *
 * Expands SpreadsheetML shared formulas (`<f t="shared" si="...">`) into per-cell formula text.
 *
 * In OOXML, the base cell provides the formula expression, and other cells in the shared range
 * reference it by `si` without repeating the text. For evaluation and editor UX, we normalize this
 * into a concrete `Formula.expression` for every cell by shifting relative references.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.40 (f - Formula)
 */

import type { CellAddress } from "../domain/cell/address";
import type { Cell } from "../domain/cell/types";
import type { Formula } from "../domain/cell/formula";
import type { XlsxRow } from "../domain/workbook";
import { shiftFormulaReferences } from "../formula/shift";

type SharedFormulaSeed = {
  readonly baseAddress: CellAddress;
  readonly expression: string;
};

function hasExpression(formula: Formula): boolean {
  return formula.expression.trim().length > 0;
}

function collectSharedFormulaSeeds(rows: readonly XlsxRow[]): ReadonlyMap<number, SharedFormulaSeed> {
  const seeds = new Map<number, SharedFormulaSeed>();
  for (const row of rows) {
    for (const cell of row.cells) {
      const formula = cell.formula;
      const sharedIndex = formula?.sharedIndex;
      if (!formula || formula.type !== "shared" || sharedIndex === undefined) {
        continue;
      }
      if (!hasExpression(formula)) {
        continue;
      }
      if (seeds.has(sharedIndex)) {
        continue;
      }
      seeds.set(sharedIndex, { baseAddress: cell.address, expression: formula.expression });
    }
  }
  return seeds;
}

function expandSharedFormulaCell(cell: Cell, seeds: ReadonlyMap<number, SharedFormulaSeed>): Cell {
  const formula = cell.formula;
  const sharedIndex = formula?.sharedIndex;
  if (!formula || formula.type !== "shared" || sharedIndex === undefined) {
    return cell;
  }
  if (hasExpression(formula)) {
    return cell;
  }

  const seed = seeds.get(sharedIndex);
  if (!seed) {
    return cell;
  }

  const deltaCols = (cell.address.col as number) - (seed.baseAddress.col as number);
  const deltaRows = (cell.address.row as number) - (seed.baseAddress.row as number);
  const shifted = shiftFormulaReferences(seed.expression, deltaCols, deltaRows);
  if (shifted === formula.expression) {
    return cell;
  }

  return { ...cell, formula: { ...formula, expression: shifted } };
}

/**
 * Expand shared formulas in parsed rows.
 *
 * @param rows - Parsed worksheet rows
 * @returns Rows where shared formulas have concrete expression text
 */
export function expandSharedFormulas(rows: readonly XlsxRow[]): readonly XlsxRow[] {
  const seeds = collectSharedFormulaSeeds(rows);
  if (seeds.size === 0) {
    return rows;
  }

  const nextRows = rows.map((row) => {
    const nextCells = row.cells.map((cell) => expandSharedFormulaCell(cell, seeds));
    const changed = nextCells.some((cell, index) => cell !== row.cells[index]);
    return changed ? { ...row, cells: nextCells } : row;
  });

  const anyRowChanged = nextRows.some((row, index) => row !== rows[index]);
  return anyRowChanged ? nextRows : rows;
}

