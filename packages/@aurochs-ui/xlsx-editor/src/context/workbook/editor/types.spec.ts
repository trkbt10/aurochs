/**
 * @file XLSX Editor types tests
 */

import {
  createEmptyCellSelection,
} from "./types";
import { createIdleDragState } from "@aurochs-ui/editor-core/drag-state";

describe("createEmptyCellSelection", () => {
  it("creates an empty selection", () => {
    expect(createEmptyCellSelection()).toEqual({
      selectedRange: undefined,
      activeCell: undefined,
      multiRanges: undefined,
    });
  });
});

describe("createIdleDragState", () => {
  it("creates an idle drag state", () => {
    expect(createIdleDragState()).toEqual({ type: "idle" });
  });
});

