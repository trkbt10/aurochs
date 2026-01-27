/**
 * @file Autofill internal types
 *
 * Shared types/constants for the XLSX editor fill-handle implementation.
 */

import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import type { Formula } from "@oxen/xlsx/domain/cell/formula";
import type { CellValue } from "@oxen/xlsx/domain/cell/types";

export type FillDirection = "up" | "down" | "left" | "right";

export type RangeBounds = {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
};

export type PatternCell = {
  readonly value: CellValue;
  readonly formula: Formula | undefined;
  readonly effectiveStyleId: number | undefined;
  readonly origin: CellAddress;
};

export type PatternSeries =
  | { readonly type: "numeric"; readonly stepForward: number; readonly stepBackward: number; readonly first: number; readonly last: number }
  | { readonly type: "date"; readonly stepForwardDays: number; readonly stepBackwardDays: number; readonly first: Date; readonly last: Date }
  | { readonly type: "repeat" };

export const EMPTY_VALUE: CellValue = { type: "empty" };
