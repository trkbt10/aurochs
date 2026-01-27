/**
 * @file Layers tab component for right panel
 *
 * Wraps LayerPanel for use as a pivot tab in the inspector panel.
 */

import type { CSSProperties } from "react";
import type { Slide, Shape } from "@oxen/pptx/domain/index";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { SelectionState } from "../../context/slide/state";
import type { ShapeHierarchyTarget } from "../../shape/hierarchy";
import { LayerPanel } from "../LayerPanel";
import { InspectorSection } from "@oxen-ui/ui-components/layout";

export type LayersTabProps = {
  /** Current slide */
  readonly slide: Slide;
  /** Current selection state */
  readonly selection: SelectionState;
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Callback when a shape is selected */
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
  /** Callback when multiple shapes are selected */
  readonly onSelectMultiple: (shapeIds: readonly ShapeId[], primaryId?: ShapeId) => void;
  /** Callback to group shapes */
  readonly onGroup: (shapeIds: readonly ShapeId[]) => void;
  /** Callback to ungroup a shape */
  readonly onUngroup: (shapeId: ShapeId) => void;
  /** Callback to move a shape in the hierarchy */
  readonly onMoveShape: (shapeId: ShapeId, target: ShapeHierarchyTarget) => void;
  /** Callback to update multiple shapes */
  readonly onUpdateShapes: (shapeIds: readonly ShapeId[], updater: (shape: Shape) => Shape) => void;
  /** Callback to clear selection */
  readonly onClearSelection: () => void;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

/**
 * Layers tab component.
 *
 * Displays the layer hierarchy panel within the right panel pivot tabs.
 */
export function LayersTab({
  slide,
  selection,
  primaryShape,
  onSelect,
  onSelectMultiple,
  onGroup,
  onUngroup,
  onMoveShape,
  onUpdateShapes,
  onClearSelection,
}: LayersTabProps) {
  return (
    <div style={containerStyle}>
      <InspectorSection title="Layers" badge={slide.shapes.length}>
        <LayerPanel
          slide={slide}
          selection={selection}
          primaryShape={primaryShape}
          onSelect={onSelect}
          onSelectMultiple={onSelectMultiple}
          onGroup={onGroup}
          onUngroup={onUngroup}
          onMoveShape={onMoveShape}
          onUpdateShapes={onUpdateShapes}
          onClearSelection={onClearSelection}
        />
      </InspectorSection>
    </div>
  );
}
