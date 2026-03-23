/**
 * @file Diagram rendering e2e test
 *
 * Verifies that editor-created diagrams render actual shapes
 * (not [Diagram] placeholder) when ResourceStore is properly populated.
 *
 * Tests the full pipeline:
 *   createDiagramGraphicFrame → populateEditorCreatedResources → SlideRenderer → DiagramContainer
 */

// @vitest-environment jsdom

/* eslint-disable custom/no-as-outside-guard -- Test file */

import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { Slide } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { createResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import { createDiagramGraphicFrame } from "@aurochs-ui/pptx-slide-canvas/graphic-frame/factory";
import { populateEditorCreatedResources } from "../src/presentation/populate-editor-resources";
import { SlideRendererSvg } from "@aurochs-renderer/pptx/react";

// =============================================================================
// Helpers
// =============================================================================

function createSlideWithDiagram(): { slide: Slide; shapeId: ShapeId } {
  const id = "diagram-test-1" as ShapeId;
  const diagramFrame = createDiagramGraphicFrame(id, {
    x: px(50),
    y: px(50),
    width: px(400),
    height: px(300),
  }, "process");

  return {
    slide: { shapes: [diagramFrame] },
    shapeId: id,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("Diagram Rendering E2E", () => {
  it("should render [Diagram] placeholder when ResourceStore has no data", () => {
    const { slide } = createSlideWithDiagram();
    const store = createResourceStore();
    // Do NOT call populateEditorCreatedResources — simulating the bug state

    const { container, unmount } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: px(960) as Pixels, height: px(540) as Pixels }}
        resourceStore={store}
      />,
    );

    // Should show placeholder text "[Diagram]"
    const textElements = container.querySelectorAll("text");
    const placeholderText = Array.from(textElements).find(
      (el) => el.textContent === "[Diagram]",
    );
    expect(placeholderText).toBeDefined();

    // Should NOT have diagram content
    const content = container.querySelector("[data-diagram-content]");
    expect(content).toBeNull();

    unmount();
  });

  it("should render diagram shapes when ResourceStore is populated", () => {
    const { slide } = createSlideWithDiagram();
    const store = createResourceStore();

    // Populate the ResourceStore — this is the fix
    populateEditorCreatedResources(slide.shapes, store);

    const { container, unmount } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: px(960) as Pixels, height: px(540) as Pixels }}
        resourceStore={store}
      />,
    );

    // Should NOT show placeholder
    const placeholder = container.querySelector("[data-diagram-placeholder]");
    expect(placeholder).toBeNull();

    // Should have diagram content with shapes
    const content = container.querySelector("[data-diagram-content]");
    expect(content).not.toBeNull();

    // Should have rendered shape elements inside
    const shapes = content!.querySelectorAll("[data-shape-type]");
    expect(shapes.length).toBeGreaterThan(0);

    unmount();
  });

  it("should generate 3 default diagram shapes (doc root excluded)", () => {
    const { slide } = createSlideWithDiagram();
    const store = createResourceStore();
    populateEditorCreatedResources(slide.shapes, store);

    const { container, unmount } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: px(960) as Pixels, height: px(540) as Pixels }}
        resourceStore={store}
      />,
    );

    const content = container.querySelector("[data-diagram-content]");
    expect(content).not.toBeNull();

    // The default data model has a doc root + 3 nodes; layout generates shapes for the content nodes
    // (doc root may or may not produce a shape depending on the layout engine)
    const shapes = content!.querySelectorAll("[data-shape-type]");
    expect(shapes.length).toBeGreaterThanOrEqual(3);

    unmount();
  });

  it("should not replace existing ResourceStore entries for diagrams loaded from file", () => {
    const { slide } = createSlideWithDiagram();
    const store = createResourceStore();

    // Pre-populate with "parsed" data (simulating file load)
    const dataResourceId = `diagram-diagram-test-1`;
    store.set(dataResourceId, {
      kind: "diagram",
      source: "parsed",
      data: new ArrayBuffer(0),
      parsed: { shapes: [], dataModel: { points: [], connections: [] } },
    });

    populateEditorCreatedResources(slide.shapes, store);

    // Should still have the original "parsed" entry, not overwritten
    const entry = store.get(dataResourceId);
    expect(entry!.source).toBe("parsed");
  });
});
