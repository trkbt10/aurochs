/**
 * @file Popover positioning tests
 *
 * Covers preferred side, flip behavior, clamping, and arrow offsets.
 */

import { calculatePopoverPosition } from "./popover-position";

type RectInput = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

function createRect({ left, top, width, height }: RectInput): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("calculatePopoverPosition", () => {
  const viewport = { width: 300, height: 300 };
  const gap = 8;
  const padding = 8;
  const arrowInset = 8;

  it("positions on the preferred side when it fits", () => {
    const trigger = createRect({ left: 100, top: 100, width: 20, height: 20 });
    const content = { width: 80, height: 60 };
    const result = calculatePopoverPosition({
      triggerRect: trigger,
      contentSize: content,
      viewport,
      preferredSide: "right",
      align: "center",
      gap,
      padding,
      arrowInset,
    });

    expect(result.side).toBe("right");
    expect(result.left).toBe(128);
    expect(result.top).toBe(80);
    expect(result.arrowOffset).toBe(30);
  });

  it("flips to the opposite side when preferred does not fit", () => {
    const trigger = createRect({ left: 100, top: 100, width: 20, height: 20 });
    const content = { width: 80, height: 60 };
    const smallViewport = { width: 180, height: 300 };
    const result = calculatePopoverPosition({
      triggerRect: trigger,
      contentSize: content,
      viewport: smallViewport,
      preferredSide: "right",
      align: "center",
      gap,
      padding,
      arrowInset,
    });

    expect(result.side).toBe("left");
    expect(result.left).toBe(12);
    expect(result.top).toBe(80);
  });

  it("flips to top when bottom does not fit", () => {
    const trigger = createRect({ left: 100, top: 100, width: 20, height: 20 });
    const content = { width: 80, height: 60 };
    const shortViewport = { width: 300, height: 160 };
    const result = calculatePopoverPosition({
      triggerRect: trigger,
      contentSize: content,
      viewport: shortViewport,
      preferredSide: "bottom",
      align: "center",
      gap,
      padding,
      arrowInset,
    });

    expect(result.side).toBe("top");
    expect(result.top).toBe(32);
  });

  it("chooses the side with the most space when neither fits", () => {
    const trigger = createRect({ left: 40, top: 40, width: 20, height: 20 });
    const content = { width: 100, height: 100 };
    const crampedViewport = { width: 120, height: 120 };
    const result = calculatePopoverPosition({
      triggerRect: trigger,
      contentSize: content,
      viewport: crampedViewport,
      preferredSide: "bottom",
      align: "center",
      gap,
      padding,
      arrowInset,
    });

    expect(result.side).toBe("bottom");
  });

  it("clamps within viewport padding", () => {
    const trigger = createRect({ left: 5, top: 100, width: 20, height: 20 });
    const content = { width: 140, height: 60 };
    const result = calculatePopoverPosition({
      triggerRect: trigger,
      contentSize: content,
      viewport,
      preferredSide: "bottom",
      align: "start",
      gap,
      padding,
      arrowInset,
    });

    expect(result.left).toBe(padding);
    expect(result.arrowOffset).toBe(arrowInset);
  });

  it("honors end alignment on vertical placement", () => {
    const trigger = createRect({ left: 40, top: 40, width: 60, height: 20 });
    const content = { width: 100, height: 40 };
    const result = calculatePopoverPosition({
      triggerRect: trigger,
      contentSize: content,
      viewport,
      preferredSide: "bottom",
      align: "end",
      gap,
      padding,
      arrowInset,
    });

    expect(result.side).toBe("bottom");
    expect(result.left).toBe(padding);
  });

  it("clamps arrow offset within content bounds", () => {
    const trigger = createRect({ left: 280, top: 120, width: 20, height: 20 });
    const content = { width: 120, height: 80 };
    const result = calculatePopoverPosition({
      triggerRect: trigger,
      contentSize: content,
      viewport,
      preferredSide: "left",
      align: "center",
      gap,
      padding,
      arrowInset,
    });

    expect(result.side).toBe("left");
    expect(result.arrowOffset).toBeGreaterThanOrEqual(arrowInset);
    expect(result.arrowOffset).toBeLessThanOrEqual(content.height - arrowInset);
  });
});
