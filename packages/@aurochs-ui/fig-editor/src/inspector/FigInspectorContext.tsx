/**
 * @file Inspector hover/highlight synchronization context.
 *
 * Kept separate from FigEditorContext so that inspector interactions
 * (hover over a tree row, hover over an overlay rect) do not trigger
 * re-renders of editor-wide consumers (PropertyPanel, LayerPanel,
 * Toolbar). Only components that actually visualize inspector hover
 * state subscribe to this context.
 *
 * The context is intentionally optional: FigInspectorOverlay /
 * FigInspectorPanel work standalone with internal state when the
 * provider is absent, and share state when it is present.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FigNodeId } from "@aurochs/fig/domain";

type FigInspectorContextValue = {
  readonly hoveredId: FigNodeId | null;
  readonly setHoveredId: (id: FigNodeId | null) => void;
};

const FigInspectorContext = createContext<FigInspectorContextValue | null>(null);

type FigInspectorProviderProps = {
  readonly children: ReactNode;
};

/**
 * Shared hover-state provider for the fig inspector overlay and panel.
 *
 * Wrap the subtree that contains both the canvas overlay and the tree
 * panel to synchronize hover highlights across them.
 */
export function FigInspectorProvider({ children }: FigInspectorProviderProps) {
  const [hoveredId, setHoveredIdState] = useState<FigNodeId | null>(null);

  const setHoveredId = useCallback((id: FigNodeId | null) => {
    setHoveredIdState(id);
  }, []);

  const value = useMemo<FigInspectorContextValue>(
    () => ({ hoveredId, setHoveredId }),
    [hoveredId, setHoveredId],
  );

  return (
    <FigInspectorContext.Provider value={value}>{children}</FigInspectorContext.Provider>
  );
}

/**
 * Access the inspector hover context, returning null when no provider
 * is present. Components should fall back to internal state in that case.
 */
export function useFigInspectorContextOptional(): FigInspectorContextValue | null {
  return useContext(FigInspectorContext);
}
