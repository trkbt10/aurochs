/**
 * @file PDF graphics state stack
 *
 * Manages the graphics state stack for PDF rendering.
 */

import type { PdfBBox, PdfMatrix } from "../coordinate";
import { multiplyMatrices } from "../coordinate";
import { createDefaultGraphicsState } from "./defaults";
import type { PdfGraphicsState, PdfLineCap, PdfLineJoin, PdfTextRenderingMode } from "./types";

// =============================================================================
// Graphics State Stack
// =============================================================================











/** GraphicsStateStack */
export class GraphicsStateStack {
  private stack: PdfGraphicsState[] = [];
  private current: PdfGraphicsState;

  constructor(initial?: PdfGraphicsState) {
    if (initial) {
      this.current = {
        ...initial,
        clipBBox: initial.clipBBox ? cloneBBox(initial.clipBBox) : undefined,
        fillColor: {
          ...initial.fillColor,
          components: [...initial.fillColor.components],
        },
        strokeColor: {
          ...initial.strokeColor,
          components: [...initial.strokeColor.components],
        },
        dashArray: [...initial.dashArray],
      };
    } else {
      this.current = createDefaultGraphicsState();
    }
  }

  /** q operator: save graphics state */
  push(): void {
    this.stack.push({
      ...this.current,
      clipBBox: this.current.clipBBox ? cloneBBox(this.current.clipBBox) : undefined,
    });
  }

  /** Q operator: restore graphics state */
  pop(): void {
    const prev = this.stack.pop();
    if (prev) {
      this.current = prev;
    }
  }

  /** Get current state (copy) */
  get(): PdfGraphicsState {
    return {
      ...this.current,
      clipBBox: this.current.clipBBox ? cloneBBox(this.current.clipBBox) : undefined,
    };
  }

  // --- CTM Operations ---

  /** cm operator: concatenate matrix to CTM */
  concatMatrix(matrix: PdfMatrix): void {
    this.current = {
      ...this.current,
      ctm: multiplyMatrices(matrix, this.current.ctm),
    };
  }

  // --- Clip Operations ---

  setClipBBox(bbox: PdfBBox): void {
    const [x1, y1, x2, y2] = bbox;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    const prev = this.current.clipBBox;
    const next = intersectBBoxOrDefault(prev, minX, minY, maxX, maxY);

    this.current = {
      ...this.current,
      clipBBox: next,
    };
  }

  // --- Color Operations ---

  /** g operator: set fill gray */
  setFillGray(gray: number): void {
    this.current = {
      ...this.current,
      fillColor: {
        colorSpace: "DeviceGray",
        components: [gray],
      },
    };
  }

  /** G operator: set stroke gray */
  setStrokeGray(gray: number): void {
    this.current = {
      ...this.current,
      strokeColor: {
        colorSpace: "DeviceGray",
        components: [gray],
      },
    };
  }

  /** rg operator: set fill RGB */
  setFillRgb(r: number, g: number, b: number): void {
    this.current = {
      ...this.current,
      fillColor: {
        colorSpace: "DeviceRGB",
        components: [r, g, b],
      },
    };
  }

  /** RG operator: set stroke RGB */
  setStrokeRgb(r: number, g: number, b: number): void {
    this.current = {
      ...this.current,
      strokeColor: {
        colorSpace: "DeviceRGB",
        components: [r, g, b],
      },
    };
  }

  /** k operator: set fill CMYK */
  setFillCmyk(c: number, m: number, y: number, k: number): void {
    this.current = {
      ...this.current,
      fillColor: {
        colorSpace: "DeviceCMYK",
        components: [c, m, y, k],
      },
    };
  }

  /** K operator: set stroke CMYK */
  setStrokeCmyk(c: number, m: number, y: number, k: number): void {
    this.current = {
      ...this.current,
      strokeColor: {
        colorSpace: "DeviceCMYK",
        components: [c, m, y, k],
      },
    };
  }

  // --- Line Style Operations ---

  /** w operator: set line width */
  setLineWidth(width: number): void {
    this.current = {
      ...this.current,
      lineWidth: width,
    };
  }

  /** J operator: set line cap */
  setLineCap(cap: PdfLineCap): void {
    this.current = {
      ...this.current,
      lineCap: cap,
    };
  }

  /** j operator: set line join */
  setLineJoin(join: PdfLineJoin): void {
    this.current = {
      ...this.current,
      lineJoin: join,
    };
  }

  /** M operator: set miter limit */
  setMiterLimit(limit: number): void {
    this.current = {
      ...this.current,
      miterLimit: limit,
    };
  }

  /** d operator: set dash pattern */
  setDashPattern(array: readonly number[], phase: number): void {
    this.current = {
      ...this.current,
      dashArray: [...array],
      dashPhase: phase,
    };
  }

  // --- Alpha Operations ---

  /** Set fill alpha (from extended graphics state) */
  setFillAlpha(alpha: number): void {
    this.current = {
      ...this.current,
      fillAlpha: alpha,
    };
  }

  /** Set stroke alpha (from extended graphics state) */
  setStrokeAlpha(alpha: number): void {
    this.current = {
      ...this.current,
      strokeAlpha: alpha,
    };
  }

  // --- Text State Operations (PDF Reference 9.3) ---

  /** Tc operator: set character spacing */
  setCharSpacing(spacing: number): void {
    this.current = {
      ...this.current,
      charSpacing: spacing,
    };
  }

  /** Tw operator: set word spacing */
  setWordSpacing(spacing: number): void {
    this.current = {
      ...this.current,
      wordSpacing: spacing,
    };
  }

  /** Tz operator: set horizontal scaling (percentage, e.g., 100 = normal) */
  setHorizontalScaling(scale: number): void {
    this.current = {
      ...this.current,
      horizontalScaling: scale,
    };
  }

  /** TL operator: set text leading */
  setTextLeading(leading: number): void {
    this.current = {
      ...this.current,
      textLeading: leading,
    };
  }

  /** Tr operator: set text rendering mode */
  setTextRenderingMode(mode: PdfTextRenderingMode): void {
    this.current = {
      ...this.current,
      textRenderingMode: mode,
    };
  }

  /** Ts operator: set text rise */
  setTextRise(rise: number): void {
    this.current = {
      ...this.current,
      textRise: rise,
    };
  }
}

function cloneBBox(bbox: PdfBBox): PdfBBox {
  const [x1, y1, x2, y2] = bbox;
  return [x1, y1, x2, y2];
}

function intersectBBoxOrDefault(
  prev: PdfBBox | undefined,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): PdfBBox {
  if (!prev) {
    return [minX, minY, maxX, maxY];
  }
  return [
    Math.max(prev[0], minX),
    Math.max(prev[1], minY),
    Math.min(prev[2], maxX),
    Math.min(prev[3], maxY),
  ];
}
