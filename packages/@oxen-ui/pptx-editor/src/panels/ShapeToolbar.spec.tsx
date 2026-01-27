/**
 * @file ShapeToolbar interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { ShapeId } from "@oxen/pptx/domain/types";
import { ShapeToolbar } from "./ShapeToolbar";

describe("ShapeToolbar", () => {
  it("calls delete handler with selected ids", () => {
    const calls: { ids?: readonly ShapeId[] } = {};
    const handleDelete = (shapeIds: readonly ShapeId[]) => {
      calls.ids = shapeIds;
    };

    const { getByTitle } = render(
      <ShapeToolbar
        canUndo
        canRedo
        selectedIds={["shape-1"]}
        primaryShape={undefined}
        onUndo={() => {}}
        onRedo={() => {}}
        onDelete={handleDelete}
        onDuplicate={() => {}}
        onReorder={() => {}}
        onShapeChange={() => {}}
      />
    );

    fireEvent.click(getByTitle("Delete (Del)"));
    expect(calls.ids).toEqual(["shape-1"]);
  });

  it("calls reorder handler for the primary shape", () => {
    const calls: { args?: { id: ShapeId; direction: string } } = {};
    const handleReorder = (shapeId: ShapeId, direction: "front" | "back" | "forward" | "backward") => {
      calls.args = { id: shapeId, direction };
    };

    const { getByTitle } = render(
      <ShapeToolbar
        canUndo={false}
        canRedo={false}
        selectedIds={["shape-1"]}
        primaryShape={undefined}
        onUndo={() => {}}
        onRedo={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onReorder={handleReorder}
        onShapeChange={() => {}}
      />
    );

    fireEvent.click(getByTitle("Bring Forward"));
    expect(calls.args).toEqual({ id: "shape-1", direction: "forward" });
  });
});
