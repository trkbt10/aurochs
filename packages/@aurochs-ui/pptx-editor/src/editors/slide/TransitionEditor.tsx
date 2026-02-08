/**
 * @file TransitionEditor - Editor for slide transition
 *
 * Edits SlideTransition: type, duration, advanceOnClick, advanceAfter.
 */

import { useCallback, type CSSProperties } from "react";
import type { SlideTransition, TransitionType } from "@aurochs-office/pptx/domain/transition";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Toggle, Input, SearchableSelect } from "@aurochs-ui/ui-components/primitives";
import type {
  SearchableSelectOption,
  SearchableSelectItemProps,
} from "@aurochs-ui/ui-components/primitives/SearchableSelect";
import { TransitionPreview } from "../../ui/transition-preview";

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

const transitionItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const transitionLabelStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

// =============================================================================
// Constants
// =============================================================================

/**
 * Transition types organized by category
 */
const TRANSITION_CATEGORIES = {
  Basic: [
    { value: "none", label: "None" },
    { value: "cut", label: "Cut" },
    { value: "fade", label: "Fade" },
    { value: "dissolve", label: "Dissolve" },
  ],
  Subtle: [
    { value: "wipe", label: "Wipe" },
    { value: "push", label: "Push" },
    { value: "pull", label: "Pull" },
    { value: "cover", label: "Cover" },
    { value: "split", label: "Split" },
  ],
  Exciting: [
    { value: "blinds", label: "Blinds" },
    { value: "checker", label: "Checker" },
    { value: "comb", label: "Comb" },
    { value: "strips", label: "Strips" },
    { value: "randomBar", label: "Random Bar" },
  ],
  Dynamic: [
    { value: "circle", label: "Circle" },
    { value: "diamond", label: "Diamond" },
    { value: "plus", label: "Plus" },
    { value: "wedge", label: "Wedge" },
    { value: "wheel", label: "Wheel" },
    { value: "zoom", label: "Zoom" },
    { value: "newsflash", label: "Newsflash" },
  ],
  Random: [{ value: "random", label: "Random" }],
} as const;

/**
 * Build searchable select options from categories
 */
function buildTransitionOptions(): SearchableSelectOption<string>[] {
  return Object.entries(TRANSITION_CATEGORIES).flatMap(([category, transitions]) =>
    transitions.map((t) => ({
      value: t.value,
      label: t.label,
      group: category,
      keywords: [t.value],
    })),
  );
}

const transitionOptions = buildTransitionOptions();

// =============================================================================
// Render Functions
// =============================================================================

/**
 * Render a transition item with preview
 */
function renderTransitionItem({ option }: SearchableSelectItemProps<string>) {
  return (
    <div style={transitionItemStyle}>
      <TransitionPreview type={option.value as TransitionType} size={20} />
      <span style={transitionLabelStyle}>{option.label}</span>
    </div>
  );
}

/**
 * Render the selected transition value with preview
 */
function renderTransitionValue(option: SearchableSelectOption<string>) {
  return (
    <div style={transitionItemStyle}>
      <TransitionPreview type={option.value as TransitionType} size={16} />
      <span style={transitionLabelStyle}>{option.label}</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for SlideTransition type.
 *
 * Features:
 * - Select transition type with animated preview
 * - Edit duration (ms)
 * - Toggle advanceOnClick
 * - Edit advanceAfter (ms)
 * - Display sound info (read-only)
 */
export function TransitionEditor({ value, onChange, disabled, className, style }: TransitionEditorProps) {
  // Handle undefined value
  const transition = value ?? createDefaultTransition();

  const handleTypeChange = useCallback(
    (type: string) => {
      if (type === "none" || type === "") {
        onChange(undefined);
      } else {
        onChange({ ...transition, type: type as TransitionType });
      }
    },
    [transition, onChange],
  );

  const handleDurationChange = useCallback(
    (duration: string | number) => {
      const numValue = typeof duration === "number" ? duration : parseInt(duration, 10);
      onChange({ ...transition, duration: isNaN(numValue) ? undefined : numValue });
    },
    [transition, onChange],
  );

  const handleAdvanceOnClickChange = useCallback(
    (advanceOnClick: boolean) => {
      onChange({ ...transition, advanceOnClick });
    },
    [transition, onChange],
  );

  const handleAdvanceAfterChange = useCallback(
    (advanceAfter: string | number) => {
      const numValue = typeof advanceAfter === "number" ? advanceAfter : parseInt(advanceAfter, 10);
      const resolvedValue = isNaN(numValue) || numValue <= 0 ? undefined : numValue;
      onChange({ ...transition, advanceAfter: resolvedValue });
    },
    [transition, onChange],
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldGroup label="Transition Type">
        <SearchableSelect
          value={transition.type}
          onChange={handleTypeChange}
          options={transitionOptions}
          renderItem={renderTransitionItem}
          renderValue={renderTransitionValue}
          searchPlaceholder="Search transitions..."
          disabled={disabled}
          dropdownWidth={240}
          maxHeight={320}
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

          {transition.sound && <div style={infoStyle}>Sound: {transition.sound.name ?? "Embedded sound"}</div>}
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
