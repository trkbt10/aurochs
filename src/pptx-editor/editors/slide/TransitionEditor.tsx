/**
 * @file TransitionEditor - Editor for slide transition
 *
 * Edits SlideTransition: type, duration, advanceOnClick, advanceAfter.
 */

import type { CSSProperties } from "react";
import type { SlideTransition, TransitionType } from "../../../pptx/domain/transition";
import type { EditorProps } from "../../types";
import type { SelectOption } from "../../types";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { Select, Toggle, Input } from "../../ui/primitives";

export type TransitionEditorProps = EditorProps<SlideTransition | undefined> & {
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const infoStyle: CSSProperties = {
  padding: "8px 12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "6px",
  fontSize: "12px",
  color: "var(--text-tertiary, #737373)",
};

// =============================================================================
// Constants
// =============================================================================

const TRANSITION_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "dissolve", label: "Dissolve" },
  { value: "wipe", label: "Wipe" },
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "cover", label: "Cover" },
  { value: "cut", label: "Cut" },
  { value: "blinds", label: "Blinds" },
  { value: "checker", label: "Checker" },
  { value: "circle", label: "Circle" },
  { value: "comb", label: "Comb" },
  { value: "diamond", label: "Diamond" },
  { value: "newsflash", label: "Newsflash" },
  { value: "plus", label: "Plus" },
  { value: "random", label: "Random" },
  { value: "randomBar", label: "Random Bar" },
  { value: "split", label: "Split" },
  { value: "strips", label: "Strips" },
  { value: "wedge", label: "Wedge" },
  { value: "wheel", label: "Wheel" },
  { value: "zoom", label: "Zoom" },
];

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for SlideTransition type.
 *
 * Features:
 * - Select transition type
 * - Edit duration (ms)
 * - Toggle advanceOnClick
 * - Edit advanceAfter (ms)
 * - Display sound info (read-only)
 */
export function TransitionEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: TransitionEditorProps) {
  // Handle undefined value
  const transition = value ?? createDefaultTransition();

  const handleTypeChange = (type: string) => {
    if (type === "none" || type === "") {
      onChange(undefined);
    } else {
      onChange({ ...transition, type: type as TransitionType });
    }
  };

  const handleDurationChange = (duration: string | number) => {
    const numValue = typeof duration === "number" ? duration : parseInt(duration, 10);
    onChange({ ...transition, duration: isNaN(numValue) ? undefined : numValue });
  };

  const handleAdvanceOnClickChange = (advanceOnClick: boolean) => {
    onChange({ ...transition, advanceOnClick });
  };

  const handleAdvanceAfterChange = (advanceAfter: string | number) => {
    const numValue = typeof advanceAfter === "number" ? advanceAfter : parseInt(advanceAfter, 10);
    onChange({ ...transition, advanceAfter: isNaN(numValue) || numValue <= 0 ? undefined : numValue });
  };

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldGroup label="Transition Type">
        <Select
          value={transition.type}
          onChange={handleTypeChange}
          options={TRANSITION_TYPE_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {transition.type !== "none" && (
        <>
          <FieldRow>
            <FieldGroup label="Duration (ms)">
              <Input
                type="number"
                value={transition.duration ?? 1000}
                onChange={handleDurationChange}
                disabled={disabled}
                min={0}
                step={100}
              />
            </FieldGroup>
            <FieldGroup label="Auto-advance (ms)">
              <Input
                type="number"
                value={transition.advanceAfter ?? 0}
                onChange={handleAdvanceAfterChange}
                disabled={disabled}
                min={0}
                step={500}
                placeholder="0 = disabled"
              />
            </FieldGroup>
          </FieldRow>

          <Toggle
            checked={transition.advanceOnClick ?? true}
            onChange={handleAdvanceOnClickChange}
            disabled={disabled}
            label="Advance on Click"
          />

          {transition.sound && (
            <div style={infoStyle}>
              Sound: {transition.sound.name ?? "Embedded sound"}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Create a default SlideTransition
 */
export function createDefaultTransition(): SlideTransition {
  return {
    type: "none",
    advanceOnClick: true,
  };
}
