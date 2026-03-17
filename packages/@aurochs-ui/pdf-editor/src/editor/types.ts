/**
 * @file PDF Editor types
 *
 * State types for the PDF editor built on shared editor-core infrastructure.
 */

import type { PdfDocument, PdfElement } from "@aurochs/pdf";
import { decomposeMatrix } from "@aurochs/pdf";
import { computeTextSvgBounds } from "@aurochs-renderer/pdf/svg";
import type { SelectionState } from "@aurochs-ui/editor-core/selection";
import type { UndoRedoHistory } from "@aurochs-ui/editor-core/history";
import type { DragState } from "@aurochs-ui/editor-core/drag-state";
import type { ClipboardContent } from "@aurochs-ui/editor-core/clipboard";

// =============================================================================
// Element ID
// =============================================================================

/**
 * Element identifier: page index + element index within the page.
 * PDF elements don't have intrinsic IDs, so we use positional identifiers.
 */
export type PdfElementId = `${number}:${number}`;

/** Create an element ID from page and element indices. */
export function createElementId(pageIndex: number, elementIndex: number): PdfElementId {
  return `${pageIndex}:${elementIndex}`;
}

/** Parse an element ID back to indices. */
export function parseElementId(id: PdfElementId): { pageIndex: number; elementIndex: number } {
  const [p, e] = id.split(":");
  return { pageIndex: Number(p), elementIndex: Number(e) };
}

// =============================================================================
// Element Bounds (SVG coordinates, top-left origin)
// =============================================================================

/** Bounds of a PDF element in SVG coordinate space (top-left origin). */
export type PdfElementBounds = {
  readonly id: PdfElementId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Rotation in degrees (0 = no rotation). */
  readonly rotation: number;
};

/** Extract rotation in radians from a PDF element's CTM. */
export function getElementRotationRad(element: PdfElement): number {
  return decomposeMatrix(element.graphicsState.ctm).rotation;
}

/** Extract rotation in degrees from a PDF element's graphics state CTM. */
function getElementRotationDeg(element: PdfElement): number {
  const deg = (getElementRotationRad(element) * 180) / Math.PI;
  const normalized = ((deg % 360) + 360) % 360;
  // Snap near-zero and near-360 to 0
  if (Math.abs(normalized) < 0.01 || Math.abs(normalized - 360) < 0.01) return 0;
  return normalized;
}

/**
 * Apply a rotation delta (in radians) to a PDF element by recomposing its CTM.
 * Preserves scale and translation; adds the delta to the existing rotation.
 */
export function rotateElement(element: PdfElement, angleDeltaRad: number): PdfElement {
  const ctm = element.graphicsState.ctm;
  const decomp = decomposeMatrix(ctm);
  const newAngle = decomp.rotation + angleDeltaRad;
  const cos = Math.cos(newAngle);
  const sin = Math.sin(newAngle);
  const newCtm: readonly [number, number, number, number, number, number] = [
    decomp.scaleX * cos,
    decomp.scaleX * sin,
    -decomp.scaleY * sin,
    decomp.scaleY * cos,
    ctm[4], // translation preserved
    ctm[5],
  ];
  return { ...element, graphicsState: { ...element.graphicsState, ctm: newCtm } };
}

/**
 * Convert PDF element bounds to SVG coordinates.
 * PDF uses bottom-left origin; SVG uses top-left origin.
 *
 * For text: delegates to computeTextSvgBounds from @aurochs-renderer/pdf/svg (SoT).
 * This is the SAME computation used by the SVG renderer for text positioning,
 * ensuring selection rectangles can never diverge from rendered text.
 */
export function elementToSvgBounds(args: {
  readonly element: PdfElement;
  readonly elementIndex: number;
  readonly pageIndex: number;
  readonly pageHeight: number;
}): PdfElementBounds {
  const { element, elementIndex, pageIndex, pageHeight } = args;
  const id = createElementId(pageIndex, elementIndex);

  if (element.type === "text") {
    const bounds = computeTextSvgBounds(element, pageHeight);
    return { id, ...bounds };
  }

  if (element.type === "path") {
    const bounds = getPathBounds(element);
    return {
      id,
      x: bounds.x,
      y: pageHeight - bounds.y - bounds.height,
      width: bounds.width,
      height: bounds.height,
      rotation: getElementRotationDeg(element),
    };
  }

  if (element.type === "image") {
    // Image size/position determined by CTM
    const ctm = element.graphicsState.ctm;
    const w = Math.abs(ctm[0]);
    const h = Math.abs(ctm[3]);
    const x = ctm[4];
    const y = ctm[5];
    return {
      id,
      x,
      y: pageHeight - y - h,
      width: w,
      height: h,
      rotation: getElementRotationDeg(element),
    };
  }

  return { id, x: 0, y: 0, width: 0, height: 0, rotation: 0 };
}

/** Calculate bounding box for a path from its operations. */
function getPathBounds(path: PdfElement & { type: "path" }): { x: number; y: number; width: number; height: number } {
  // eslint-disable-next-line no-restricted-syntax -- accumulator for bounds
  let minX = Infinity;
  // eslint-disable-next-line no-restricted-syntax -- accumulator for bounds
  let minY = Infinity;
  // eslint-disable-next-line no-restricted-syntax -- accumulator for bounds
  let maxX = -Infinity;
  // eslint-disable-next-line no-restricted-syntax -- accumulator for bounds
  let maxY = -Infinity;

  for (const op of path.operations) {
    if (op.type === "rect") {
      minX = Math.min(minX, op.x);
      minY = Math.min(minY, op.y);
      maxX = Math.max(maxX, op.x + op.width);
      maxY = Math.max(maxY, op.y + op.height);
    } else if ("point" in op) {
      minX = Math.min(minX, op.point.x);
      minY = Math.min(minY, op.point.y);
      maxX = Math.max(maxX, op.point.x);
      maxY = Math.max(maxY, op.point.y);
    } else if ("end" in op) {
      minX = Math.min(minX, op.end.x);
      minY = Math.min(minY, op.end.y);
      maxX = Math.max(maxX, op.end.x);
      maxY = Math.max(maxY, op.end.y);
    }
  }

  if (!isFinite(minX)) { return { x: 0, y: 0, width: 0, height: 0 }; }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// =============================================================================
// Editor State
// =============================================================================

/** Text edit state for inline editing. */
export type PdfTextEditState =
  | { readonly active: false }
  | {
      readonly active: true;
      readonly elementId: PdfElementId;
      readonly initialText: string;
      readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    };

/** PDF editor state. */
export type PdfEditorState = {
  readonly documentHistory: UndoRedoHistory<PdfDocument>;
  readonly currentPageIndex: number;
  readonly selection: SelectionState<PdfElementId>;
  readonly drag: DragState<PdfElementId>;
  readonly textEdit: PdfTextEditState;
  readonly clipboard: ClipboardContent<readonly PdfElement[]> | undefined;
};

// =============================================================================
// Element Update Helpers
// =============================================================================

/**
 * Apply a position delta (SVG coordinates) to a PDF element.
 * Converts SVG delta (top-left, Y down) to PDF delta (bottom-left, Y up).
 */
export function moveElement(element: PdfElement, dx: number, dy: number): PdfElement {
  if (element.type === "text") {
    return { ...element, x: element.x + dx, y: element.y - dy };
  }

  if (element.type === "path") {
    const operations = element.operations.map((op) => {
      if (op.type === "rect") {
        return { ...op, x: op.x + dx, y: op.y - dy };
      }
      if ("point" in op) {
        return { ...op, point: { x: op.point.x + dx, y: op.point.y - dy } };
      }
      if ("end" in op) {
        return {
          ...op,
          end: { x: op.end.x + dx, y: op.end.y - dy },
          ...("cp1" in op ? { cp1: { x: op.cp1.x + dx, y: op.cp1.y - dy } } : {}),
          ...("cp2" in op ? { cp2: { x: op.cp2.x + dx, y: op.cp2.y - dy } } : {}),
        };
      }
      return op;
    });
    return { ...element, operations };
  }

  if (element.type === "image") {
    const ctm = [...element.graphicsState.ctm] as [number, number, number, number, number, number];
    ctm[4] += dx;
    ctm[5] -= dy;
    return { ...element, graphicsState: { ...element.graphicsState, ctm } };
  }

  return element;
}

/**
 * Update a specific element in a document page.
 */
export function updateElementInDocument(args: {
  readonly document: PdfDocument;
  readonly elementId: PdfElementId;
  readonly updater: (element: PdfElement) => PdfElement;
}): PdfDocument {
  const { document, elementId, updater } = args;
  const { pageIndex, elementIndex } = parseElementId(elementId);
  const page = document.pages[pageIndex];
  if (!page) { return document; }

  const newElements = page.elements.map((el, i) => {
    if (i === elementIndex) { return updater(el); }
    return el;
  });

  const newPages = document.pages.map((p, i) => {
    if (i === pageIndex) { return { ...p, elements: newElements }; }
    return p;
  });

  return { ...document, pages: newPages };
}
