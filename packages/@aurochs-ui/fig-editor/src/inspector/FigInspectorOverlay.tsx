/**
 * @file Fig-specific inspector overlay for the editor canvas.
 *
 * Reads the active page from FigEditorContext, collects inspector box
 * geometry, and renders `InspectorCanvasOverlay` in the host EditorCanvas
 * page coordinate system. No pan/zoom of its own — the host canvas owns
 * the viewport.
 *
 * Hover highlight is synchronized through FigInspectorContext when
 * present, falling back to local state otherwise so the component can
 * be used independently.
 *
 * The category registry is injectable so non-default Fig category maps
 * can be supplied without forking the overlay.
 */
import { useMemo, useState } from "react";
import type { NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";
import { InspectorCanvasOverlay } from "@aurochs-ui/editor-controls/inspector";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { useFigEditor } from "../context/FigEditorContext";
import { FIG_NODE_CATEGORY_REGISTRY } from "./fig-node-categories";
import { collectDesignBoxes } from "./fig-inspector-adapter";
import { useFigInspectorContextOptional } from "./FigInspectorContext";

export type FigInspectorOverlayProps = {
  /**
   * Category registry. Defaults to the shipped Fig registry.
   * Provide a custom registry to recolor/relabel categories without
   * forking this component.
   */
  readonly registry?: NodeCategoryRegistry;
  /** Include nodes with `visible === false`. Default: false. */
  readonly showHiddenNodes?: boolean;
  /**
   * Whether the overlay intercepts pointer events. Default: false so
   * the editor's own hit areas remain clickable beneath the overlay.
   * Set to true for an "inspect-only" mode.
   */
  readonly interactive?: boolean;
  /**
   * Called on overlay rect click. Only fires when `interactive` is true.
   */
  readonly onNodeClick?: (nodeId: FigNodeId) => void;
};

/**
 * Drop-in overlay for FigEditor's canvas children.
 *
 * @example
 * ```tsx
 * const [inspect, setInspect] = useState(false);
 * <FigEditor
 *   initialDocument={doc}
 *   canvasOverlay={inspect ? <FigInspectorOverlay /> : null}
 * />
 * ```
 */
export function FigInspectorOverlay({
  registry = FIG_NODE_CATEGORY_REGISTRY,
  showHiddenNodes = false,
  interactive = false,
  onNodeClick,
}: FigInspectorOverlayProps) {
  const { activePage, nodeSelection } = useFigEditor();
  const inspectorCtx = useFigInspectorContextOptional();
  const [localHoveredId, setLocalHoveredId] = useState<FigNodeId | null>(null);

  const hoveredId = inspectorCtx ? inspectorCtx.hoveredId : localHoveredId;
  const setHoveredId = inspectorCtx ? inspectorCtx.setHoveredId : setLocalHoveredId;

  const boxes = useMemo(() => {
    const children: readonly FigDesignNode[] = activePage?.children ?? [];
    return collectDesignBoxes(children, showHiddenNodes);
  }, [activePage, showHiddenNodes]);

  const handleHover = (id: string | null) => {
    setHoveredId((id as FigNodeId | null) ?? null);
  };

  const handleClick = (id: string) => {
    onNodeClick?.(id as FigNodeId);
  };

  return (
    <InspectorCanvasOverlay
      boxes={boxes}
      registry={registry}
      highlightedNodeId={nodeSelection.primaryId ?? null}
      hoveredNodeId={hoveredId}
      onNodeHover={handleHover}
      onNodeClick={handleClick}
      interactive={interactive}
    />
  );
}
