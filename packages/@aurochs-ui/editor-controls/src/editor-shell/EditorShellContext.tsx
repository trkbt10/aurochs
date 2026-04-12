/**
 * @file EditorShellContext
 *
 * Provides descendant components (panel contents, canvas) with access to
 * the EditorShell's responsive state and drawer control.
 *
 * The primary use case is allowing panel content to dismiss itself after
 * completing an operation. For example, a slide thumbnail panel can call
 * `dismissDrawer("left")` after the user selects a slide, so the drawer
 * closes and the canvas is revealed — without requiring the user to
 * manually close the drawer.
 *
 * In desktop/grid mode, `dismissDrawer` is a no-op since the panels are
 * always visible. This means consumers don't need to check the current
 * mode before calling it.
 */

import { createContext, useContext } from "react";
import type { EditorLayoutMode } from "./types";

// =============================================================================
// Types
// =============================================================================

export type EditorShellContextValue = {
  /** Current responsive layout mode. */
  readonly mode: EditorLayoutMode;
  /**
   * Close the drawer for the given panel position.
   *
   * In desktop mode (panels are grid-based, not drawers) this is a no-op.
   * In tablet mode, only the right panel is a drawer.
   * In mobile mode, both panels are drawers.
   */
  readonly dismissDrawer: (position: "left" | "right") => void;
};

// =============================================================================
// Context
// =============================================================================

const Context = createContext<EditorShellContextValue | null>(null);

export const EditorShellContextProvider = Context.Provider;

/**
 * Access the EditorShell's responsive state and drawer controls.
 *
 * Must be called within an EditorShell. Returns `null` when called outside
 * of an EditorShell (e.g., in storybook isolation). Consumers should handle
 * the `null` case gracefully — typically by doing nothing.
 */
export function useEditorShellContext(): EditorShellContextValue | null {
  return useContext(Context);
}
