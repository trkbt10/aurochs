/**
 * @file EffectsEditor - Editor for Effects type
 *
 * Edits all ECMA-376 effect types with a split-panel UI.
 * Left panel: categorized effect list with toggles.
 * Right panel: detail editor for selected effect.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effect)
 */

import type { Effects } from "@oxen/pptx/domain/types";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import { EffectsEditorPanel } from "./effects";

export type EffectsEditorProps = EditorProps<Effects>;

/**
 * Editor for Effects type (all ECMA-376 effects).
 * Uses a split-panel layout inspired by Adobe Photoshop Layer Styles.
 *
 * @see ECMA-376 Part 1, Section 20.1.8
 */
export function EffectsEditor({
  value,
  onChange,
  disabled,
}: EffectsEditorProps) {
  return (
    <EffectsEditorPanel
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

/**
 * Create default effects (empty)
 */
export function createDefaultEffects(): Effects {
  return {};
}
