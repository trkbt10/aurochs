/**
 * @file Unit tests for shape/resize.ts
 */

import {
  calculateAspectDelta,
  applyMinConstraints,
  resizeFromNW,
  resizeFromN,
  resizeFromNE,
  resizeFromE,
  resizeFromSE,
  resizeFromS,
  resizeFromSW,
  resizeFromW,
  calculateResizeBounds,
  calculateScaleFactors,
  calculateRelativePosition,
  calculateMultiResizeBounds,
  type ResizeBounds,
  type ResizeOptions,
} from "./resize";

// =============================================================================
// Test Fixtures
// =============================================================================

const defaultOptions: ResizeOptions = {
  aspectLocked: false,
  minWidth: 10,
  minHeight: 10,
};

const aspectLockedOptions: ResizeOptions = {
  aspectLocked: true,
  minWidth: 10,
  minHeight: 10,
};

const squareBounds: ResizeBounds = {
  x: 100,
  y: 100,
  width: 100,
  height: 100,
};

const wideBounds: ResizeBounds = {
  x: 100,
  y: 100,
  width: 200,
  height: 100,
};

// =============================================================================
// calculateAspectDelta Tests
// =============================================================================

describe("calculateAspectDelta", () => {
  it("returns original deltas when aspect not locked", () => {
    const result = calculateAspectDelta({ dw: 50, dh: 30, aspectRatio: 2, aspectLocked: false });
    expect(result).toEqual({ dw: 50, dh: 30 });
  });

  it("uses width delta when larger (aspect locked)", () => {
    // aspectRatio = 2, dw = 100, dh = 10
    // aspectDw = dh * aspectRatio = 10 * 2 = 20
    // |dw| = 100 > |aspectDw| = 20, so use dw
    const result = calculateAspectDelta({ dw: 100, dh: 10, aspectRatio: 2, aspectLocked: true });
    expect(result.dw).toBe(100);
    expect(result.dh).toBe(50); // 100 / 2
  });

  it("uses height delta when larger (aspect locked)", () => {
    // aspectRatio = 2, dw = 10, dh = 100
    // aspectDw = dh * aspectRatio = 100 * 2 = 200
    // |dw| = 10 < |aspectDw| = 200, so use dh
    const result = calculateAspectDelta({ dw: 10, dh: 100, aspectRatio: 2, aspectLocked: true });
    expect(result.dw).toBe(200); // 100 * 2
    expect(result.dh).toBe(100);
  });

  it("handles negative deltas", () => {
    const result = calculateAspectDelta({ dw: -50, dh: -25, aspectRatio: 2, aspectLocked: true });
    expect(result.dw).toBe(-50);
    expect(result.dh).toBe(-25);
  });
});

// =============================================================================
// applyMinConstraints Tests
// =============================================================================

describe("applyMinConstraints", () => {
  it("returns original dimensions when above minimums", () => {
    const result = applyMinConstraints({ width: 100, height: 80, minWidth: 10, minHeight: 10 });
    expect(result).toEqual({ width: 100, height: 80 });
  });

  it("enforces minimum width", () => {
    const result = applyMinConstraints({ width: 5, height: 80, minWidth: 10, minHeight: 10 });
    expect(result.width).toBe(10);
    expect(result.height).toBe(80);
  });

  it("enforces minimum height", () => {
    const result = applyMinConstraints({ width: 100, height: 5, minWidth: 10, minHeight: 10 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(10);
  });

  it("enforces both minimums", () => {
    const result = applyMinConstraints({ width: 5, height: 5, minWidth: 10, minHeight: 10 });
    expect(result).toEqual({ width: 10, height: 10 });
  });
});

// =============================================================================
// resizeFromNW Tests
// =============================================================================

describe("resizeFromNW", () => {
  it("shrinks from top-left when dragging right-down", () => {
    const result = resizeFromNW({ initial: squareBounds, dx: 20, dy: 20, options: defaultOptions });
    expect(result.x).toBe(120);
    expect(result.y).toBe(120);
    expect(result.width).toBe(80);
    expect(result.height).toBe(80);
  });

  it("expands from top-left when dragging left-up", () => {
    const result = resizeFromNW({ initial: squareBounds, dx: -20, dy: -20, options: defaultOptions });
    expect(result.x).toBe(80);
    expect(result.y).toBe(80);
    expect(result.width).toBe(120);
    expect(result.height).toBe(120);
  });

  it("enforces minimum size", () => {
    const result = resizeFromNW({ initial: squareBounds, dx: 100, dy: 100, options: defaultOptions });
    expect(result.width).toBe(10);
    expect(result.height).toBe(10);
  });

  it("maintains aspect ratio when locked", () => {
    const result = resizeFromNW({ initial: wideBounds, dx: -50, dy: -25, options: aspectLockedOptions });
    // Initial aspect ratio is 2:1, should maintain it
    expect(result.width / result.height).toBeCloseTo(2, 5);
  });
});

// =============================================================================
// resizeFromN Tests
// =============================================================================

describe("resizeFromN", () => {
  it("shrinks from top when dragging down", () => {
    const result = resizeFromN(squareBounds, 20, defaultOptions);
    expect(result.x).toBe(100);
    expect(result.y).toBe(120);
    expect(result.width).toBe(100);
    expect(result.height).toBe(80);
  });

  it("expands from top when dragging up", () => {
    const result = resizeFromN(squareBounds, -20, defaultOptions);
    expect(result.x).toBe(100);
    expect(result.y).toBe(80);
    expect(result.width).toBe(100);
    expect(result.height).toBe(120);
  });

  it("centers width change when aspect locked", () => {
    const result = resizeFromN(squareBounds, -20, aspectLockedOptions);
    // Height increases by 20, width should also increase by 20 (1:1 ratio)
    // Width centered: x shifts by (100 - 120) / 2 = -10
    expect(result.height).toBe(120);
    expect(result.width).toBe(120);
    expect(result.x).toBe(90);
  });
});

// =============================================================================
// resizeFromNE Tests
// =============================================================================

describe("resizeFromNE", () => {
  it("expands right and up", () => {
    const result = resizeFromNE({ initial: squareBounds, dx: 20, dy: -20, options: defaultOptions });
    expect(result.x).toBe(100);
    expect(result.y).toBe(80);
    expect(result.width).toBe(120);
    expect(result.height).toBe(120);
  });
});

// =============================================================================
// resizeFromE Tests
// =============================================================================

describe("resizeFromE", () => {
  it("expands right when dragging right", () => {
    const result = resizeFromE(squareBounds, 20, defaultOptions);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.width).toBe(120);
    expect(result.height).toBe(100);
  });

  it("centers height change when aspect locked", () => {
    const result = resizeFromE(squareBounds, 20, aspectLockedOptions);
    expect(result.width).toBe(120);
    expect(result.height).toBe(120);
    expect(result.y).toBe(90); // centered
  });
});

// =============================================================================
// resizeFromSE Tests
// =============================================================================

describe("resizeFromSE", () => {
  it("expands right and down", () => {
    const result = resizeFromSE({ initial: squareBounds, dx: 20, dy: 20, options: defaultOptions });
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.width).toBe(120);
    expect(result.height).toBe(120);
  });

  it("shrinks left and up", () => {
    const result = resizeFromSE({ initial: squareBounds, dx: -20, dy: -20, options: defaultOptions });
    expect(result.width).toBe(80);
    expect(result.height).toBe(80);
  });
});

// =============================================================================
// resizeFromS Tests
// =============================================================================

describe("resizeFromS", () => {
  it("expands down when dragging down", () => {
    const result = resizeFromS(squareBounds, 20, defaultOptions);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.width).toBe(100);
    expect(result.height).toBe(120);
  });

  it("centers width change when aspect locked", () => {
    const result = resizeFromS(squareBounds, 20, aspectLockedOptions);
    expect(result.height).toBe(120);
    expect(result.width).toBe(120);
    expect(result.x).toBe(90); // centered
  });
});

// =============================================================================
// resizeFromSW Tests
// =============================================================================

describe("resizeFromSW", () => {
  it("expands left and down", () => {
    const result = resizeFromSW({ initial: squareBounds, dx: -20, dy: 20, options: defaultOptions });
    expect(result.x).toBe(80);
    expect(result.y).toBe(100);
    expect(result.width).toBe(120);
    expect(result.height).toBe(120);
  });
});

// =============================================================================
// resizeFromW Tests
// =============================================================================

describe("resizeFromW", () => {
  it("expands left when dragging left", () => {
    const result = resizeFromW(squareBounds, -20, defaultOptions);
    expect(result.x).toBe(80);
    expect(result.y).toBe(100);
    expect(result.width).toBe(120);
    expect(result.height).toBe(100);
  });

  it("shrinks left when dragging right", () => {
    const result = resizeFromW(squareBounds, 20, defaultOptions);
    expect(result.x).toBe(120);
    expect(result.width).toBe(80);
  });

  it("centers height change when aspect locked", () => {
    const result = resizeFromW(squareBounds, -20, aspectLockedOptions);
    expect(result.width).toBe(120);
    expect(result.height).toBe(120);
    expect(result.y).toBe(90); // centered
  });
});

// =============================================================================
// calculateResizeBounds Tests
// =============================================================================

describe("calculateResizeBounds", () => {
  it("dispatches to correct handler for each handle", () => {
    const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

    for (const handle of handles) {
      const result = calculateResizeBounds({ handle, initial: squareBounds, dx: 10, dy: 10, options: defaultOptions });
      expect(result).toBeDefined();
      expect(typeof result.x).toBe("number");
      expect(typeof result.y).toBe("number");
      expect(typeof result.width).toBe("number");
      expect(typeof result.height).toBe("number");
    }
  });
});

// =============================================================================
// Multi-Selection Resize Tests
// =============================================================================

describe("calculateScaleFactors", () => {
  it("calculates correct scale factors", () => {
    const oldBounds: ResizeBounds = { x: 0, y: 0, width: 100, height: 50 };
    const newBounds: ResizeBounds = { x: 0, y: 0, width: 200, height: 100 };

    const { scaleX, scaleY } = calculateScaleFactors(oldBounds, newBounds);

    expect(scaleX).toBe(2);
    expect(scaleY).toBe(2);
  });

  it("returns 1 for zero-width old bounds", () => {
    const oldBounds: ResizeBounds = { x: 0, y: 0, width: 0, height: 50 };
    const newBounds: ResizeBounds = { x: 0, y: 0, width: 100, height: 100 };

    const { scaleX, scaleY } = calculateScaleFactors(oldBounds, newBounds);

    expect(scaleX).toBe(1);
    expect(scaleY).toBe(2);
  });
});

describe("calculateRelativePosition", () => {
  it("calculates relative position within bounds", () => {
    const shapeBounds: ResizeBounds = { x: 150, y: 125, width: 50, height: 50 };
    const combinedBounds: ResizeBounds = { x: 100, y: 100, width: 200, height: 100 };

    const { relX, relY } = calculateRelativePosition(shapeBounds, combinedBounds);

    expect(relX).toBe(0.25); // (150 - 100) / 200
    expect(relY).toBe(0.25); // (125 - 100) / 100
  });

  it("returns 0 for zero-size combined bounds", () => {
    const shapeBounds: ResizeBounds = { x: 100, y: 100, width: 50, height: 50 };
    const combinedBounds: ResizeBounds = { x: 100, y: 100, width: 0, height: 0 };

    const { relX, relY } = calculateRelativePosition(shapeBounds, combinedBounds);

    expect(relX).toBe(0);
    expect(relY).toBe(0);
  });
});

describe("calculateMultiResizeBounds", () => {
  it("scales shape proportionally", () => {
    const shapeBounds: ResizeBounds = { x: 100, y: 100, width: 50, height: 50 };
    const combinedOld: ResizeBounds = { x: 0, y: 0, width: 200, height: 200 };
    const combinedNew: ResizeBounds = { x: 0, y: 0, width: 400, height: 400 };

    const result = calculateMultiResizeBounds(shapeBounds, combinedOld, combinedNew);

    // Position should double (relative position 0.5 * 400 = 200)
    expect(result.x).toBe(200);
    expect(result.y).toBe(200);
    // Size should double
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  it("handles offset combined bounds", () => {
    const shapeBounds: ResizeBounds = { x: 150, y: 150, width: 50, height: 50 };
    const combinedOld: ResizeBounds = { x: 100, y: 100, width: 100, height: 100 };
    const combinedNew: ResizeBounds = { x: 200, y: 200, width: 200, height: 200 };

    const result = calculateMultiResizeBounds(shapeBounds, combinedOld, combinedNew);

    // relX = (150 - 100) / 100 = 0.5
    // newX = 200 + 0.5 * 200 = 300
    expect(result.x).toBe(300);
    expect(result.y).toBe(300);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });
});
