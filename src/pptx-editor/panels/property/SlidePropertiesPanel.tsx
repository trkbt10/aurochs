/**
 * @file Slide properties panel component
 *
 * Displays property editors for slide-level settings when no shape is selected.
 */

import type { Background } from "../../../pptx/domain/slide";
import type { SlideTransition } from "../../../pptx/domain/transition";
import { Accordion } from "../../ui/layout/Accordion";
import { BackgroundEditor, TransitionEditor } from "../../editors/index";

// =============================================================================
// Types
// =============================================================================

export type SlidePropertiesPanelProps = {
  readonly background?: Background;
  readonly transition?: SlideTransition;
  readonly onBackgroundChange: (bg: Background | undefined) => void;
  readonly onTransitionChange: (tr: SlideTransition | undefined) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Slide properties panel when no shape is selected.
 *
 * Displays editors for:
 * - Slide background
 * - Slide transition
 */
export function SlidePropertiesPanel({
  background,
  transition,
  onBackgroundChange,
  onTransitionChange,
}: SlidePropertiesPanelProps) {
  return (
    <>
      <Accordion title="Slide Background" defaultExpanded>
        {background ? (
          <BackgroundEditor value={background} onChange={onBackgroundChange} />
        ) : (
          <div
            style={{
              padding: "12px",
              textAlign: "center",
              color: "var(--text-tertiary, #737373)",
              fontSize: "12px",
            }}
          >
            No background set
          </div>
        )}
      </Accordion>

      <Accordion title="Slide Transition" defaultExpanded={false}>
        <TransitionEditor value={transition} onChange={onTransitionChange} />
      </Accordion>
    </>
  );
}
