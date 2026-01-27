/**
 * @file SlideCanvas creation drag tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import type { Slide } from "@oxen/pptx/domain";
import { px } from "@oxen/ooxml/domain/units";
import { createIdleDragState, createEmptySelection } from "../context/slide/state";
import type { CreationMode } from "../context/presentation/editor/types";
import type { ShapeBounds } from "../shape/creation-bounds";
import { SlideCanvas } from "./SlideCanvas";

function setSvgClientRect(svg: SVGSVGElement, width: number, height: number): void {
  const rect = {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => undefined,
  };
  Object.defineProperty(svg, "getBoundingClientRect", {
    value: () => rect,
    configurable: true,
  });
}

function createContextMenuActions() {
  return {
    hasSelection: false,
    hasClipboard: false,
    isMultiSelect: false,
    canGroup: false,
    canUngroup: false,
    canAlign: false,
    canDistribute: false,
    copy: () => undefined,
    cut: () => undefined,
    paste: () => undefined,
    duplicateSelected: () => undefined,
    deleteSelected: () => undefined,
    bringToFront: () => undefined,
    bringForward: () => undefined,
    sendBackward: () => undefined,
    sendToBack: () => undefined,
    group: () => undefined,
    ungroup: () => undefined,
    alignLeft: () => undefined,
    alignCenter: () => undefined,
    alignRight: () => undefined,
    alignTop: () => undefined,
    alignMiddle: () => undefined,
    alignBottom: () => undefined,
    distributeHorizontally: () => undefined,
    distributeVertically: () => undefined,
  };
}

function renderSlideCanvas(mode: CreationMode, onCreateFromDrag: (bounds: ShapeBounds) => void) {
  const slide: Slide = { shapes: [] };
  const selection = createEmptySelection();
  const drag = createIdleDragState();

  const result = render(
    <SlideCanvas
      slide={slide}
      selection={selection}
      drag={drag}
      width={px(1000)}
      height={px(500)}
      primaryShape={undefined}
      selectedShapes={[]}
      contextMenuActions={createContextMenuActions()}
      onSelect={() => undefined}
      onSelectMultiple={() => undefined}
      onClearSelection={() => undefined}
      onStartMove={() => undefined}
      onStartResize={() => undefined}
      onStartRotate={() => undefined}
      onDoubleClick={() => undefined}
      creationMode={mode}
      onCreate={() => undefined}
      onCreateFromDrag={onCreateFromDrag}
    />
  );

  const svg = result.container.querySelector("svg");
  if (!svg) {
    throw new Error("SVG element not found");
  }
  setSvgClientRect(svg, 1000, 500);
  return { svg };
}

describe("SlideCanvas creation drag", () => {
  it("calls onCreateFromDrag with drag bounds in creation mode", () => {
    let received: { x: number; y: number; width: number; height: number } | null = null;
    const mode: CreationMode = { type: "chart", chartType: "bar" };

    const { svg } = renderSlideCanvas(mode, (bounds) => {
      received = {
        x: Number(bounds.x),
        y: Number(bounds.y),
        width: Number(bounds.width),
        height: Number(bounds.height),
      };
    });

    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(window, { clientX: 300, clientY: 200 });
    fireEvent.pointerUp(window);

    if (!received) {
      throw new Error("Expected creation bounds to be reported.");
    }

    expect(received).toEqual({
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    });
  });

  it("does not start creation drag for pen mode", () => {
    const mode: CreationMode = { type: "pen" };
    const onCreateFromDrag = vi.fn();

    const { svg } = renderSlideCanvas(mode, onCreateFromDrag);

    fireEvent.pointerDown(svg, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.pointerMove(window, { clientX: 120, clientY: 80 });
    fireEvent.pointerUp(window);

    expect(onCreateFromDrag).not.toHaveBeenCalled();
  });
});
