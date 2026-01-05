/**
 * @file LineEditor component
 *
 * Adobe/Figma-style line editor with preview and full stroke controls.
 */

import { useState, useCallback, type CSSProperties } from "react";
import { Slider } from "../primitives/Slider";
import { Select } from "../primitives/Select";
import { LinePreview } from "./LinePreview";
import { FillPickerPopover } from "../color/FillPickerPopover";
import { createDefaultFill } from "../color/fill";
import { px } from "../../../pptx/domain/types";
import type { Line, LineEnd, Fill } from "../../../pptx/domain/color";
import type { EditorProps, SelectOption } from "../../types";

// =============================================================================
// Types
// =============================================================================

export type LineEditorProps = EditorProps<Line> & {
  readonly style?: CSSProperties;
  /** Show line ends section */
  readonly showEnds?: boolean;
  /** Show visual preview at top */
  readonly showPreview?: boolean;
};

// =============================================================================
// Options
// =============================================================================

const capOptions: SelectOption<Line["cap"]>[] = [
  { value: "flat", label: "Flat" },
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
];

const joinOptions: SelectOption<Line["join"]>[] = [
  { value: "round", label: "Round" },
  { value: "bevel", label: "Bevel" },
  { value: "miter", label: "Miter" },
];

const compoundOptions: SelectOption<Line["compound"]>[] = [
  { value: "sng", label: "Single" },
  { value: "dbl", label: "Double" },
  { value: "thickThin", label: "Thick-Thin" },
  { value: "thinThick", label: "Thin-Thick" },
  { value: "tri", label: "Triple" },
];

const dashOptions: SelectOption[] = [
  { value: "solid", label: "Solid" },
  { value: "dot", label: "Dot" },
  { value: "dash", label: "Dash" },
  { value: "lgDash", label: "Long Dash" },
  { value: "dashDot", label: "Dash-Dot" },
  { value: "lgDashDot", label: "Long Dash-Dot" },
  { value: "lgDashDotDot", label: "Long Dash-Dot-Dot" },
];

const lineEndTypeOptions: SelectOption<LineEnd["type"]>[] = [
  { value: "none", label: "None" },
  { value: "triangle", label: "Triangle" },
  { value: "stealth", label: "Stealth" },
  { value: "diamond", label: "Diamond" },
  { value: "oval", label: "Oval" },
  { value: "arrow", label: "Arrow" },
];

const lineEndSizeOptions: SelectOption<LineEnd["width"]>[] = [
  { value: "sm", label: "Small" },
  { value: "med", label: "Medium" },
  { value: "lg", label: "Large" },
];

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
};

const fieldStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-tertiary, #666)",
};

const sliderRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const sliderContainerStyle: CSSProperties = {
  flex: 1,
};

const sliderValueStyle: CSSProperties = {
  width: "40px",
  textAlign: "right",
  fontSize: "11px",
  color: "var(--text-secondary, #999)",
};

const accordionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 0",
  cursor: "pointer",
  userSelect: "none",
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-tertiary, #666)",
};

const accordionDisabledStyle: CSSProperties = {
  cursor: "default",
  opacity: 0.6,
};

const chevronStyle = (expanded: boolean): CSSProperties => ({
  width: "12px",
  height: "12px",
  transition: "transform 150ms ease",
  transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
});

const accordionContentStyle = (expanded: boolean): CSSProperties => ({
  overflow: "hidden",
  maxHeight: expanded ? "500px" : "0",
  opacity: expanded ? 1 : 0,
  transition: "max-height 200ms ease, opacity 150ms ease",
});

const lineEndRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "8px",
};

const lineEndFieldStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const lineEndSizeRowStyle: CSSProperties = {
  display: "flex",
  gap: "4px",
};

// =============================================================================
// Sub-components
// =============================================================================

function ChevronIcon({ style }: { readonly style?: CSSProperties }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={style}>
      <path
        d="M4.5 3L7.5 6L4.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LineEndEditorProps = {
  readonly value: LineEnd | undefined;
  readonly onChange: (value: LineEnd | undefined) => void;
  readonly label: string;
  readonly disabled?: boolean;
};

function LineEndEditor({ value, onChange, label, disabled }: LineEndEditorProps) {
  const lineEnd = value ?? { type: "none" as const, width: "med" as const, length: "med" as const };

  const handleTypeChange = useCallback(
    (type: string) => {
      if (type === "none") {
        onChange(undefined);
      } else {
        onChange({ ...lineEnd, type: type as LineEnd["type"] });
      }
    },
    [lineEnd, onChange]
  );

  return (
    <div style={lineEndFieldStyle}>
      <span style={labelStyle}>{label}</span>
      <Select
        value={lineEnd.type}
        onChange={handleTypeChange}
        options={lineEndTypeOptions}
        disabled={disabled}
      />
      {lineEnd.type !== "none" && (
        <div style={lineEndSizeRowStyle}>
          <Select
            value={lineEnd.width}
            onChange={(w) => onChange({ ...lineEnd, width: w as LineEnd["width"] })}
            options={lineEndSizeOptions}
            style={{ flex: 1 }}
            disabled={disabled}
          />
          <Select
            value={lineEnd.length}
            onChange={(l) => onChange({ ...lineEnd, length: l as LineEnd["length"] })}
            options={lineEndSizeOptions}
            style={{ flex: 1 }}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for line stroke settings.
 */
export function LineEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showEnds = true,
  showPreview = true,
}: LineEditorProps) {
  const [endsExpanded, setEndsExpanded] = useState(false);

  const updateField = useCallback(
    <K extends keyof Line>(field: K, newValue: Line[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange]
  );

  const handleWidthChange = useCallback(
    (w: number) => {
      onChange({ ...value, width: px(w) });
    },
    [value, onChange]
  );

  const handleFillChange = useCallback(
    (fill: Fill) => {
      onChange({ ...value, fill });
    },
    [value, onChange]
  );

  const handleEndsToggle = useCallback(() => {
    if (!disabled) {
      setEndsExpanded((prev) => !prev);
    }
  }, [disabled]);

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {showPreview && <LinePreview line={value} width={236} height={64} />}

      <div style={sectionStyle}>
        <span style={labelStyle}>Width</span>
        <div style={sliderRowStyle}>
          <div style={sliderContainerStyle}>
            <Slider
              value={value.width}
              onChange={handleWidthChange}
              min={0.25}
              max={20}
              step={0.25}
              showValue={false}
              disabled={disabled}
            />
          </div>
          <span style={sliderValueStyle}>{value.width.toFixed(1)}px</span>
        </div>
      </div>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <span style={labelStyle}>Dash</span>
          <Select
            value={typeof value.dash === "string" ? value.dash : "solid"}
            onChange={(v) => updateField("dash", v)}
            options={dashOptions}
            disabled={disabled}
          />
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Cap</span>
          <Select
            value={value.cap}
            onChange={(v) => updateField("cap", v as Line["cap"])}
            options={capOptions}
            disabled={disabled}
          />
        </div>
      </div>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <span style={labelStyle}>Compound</span>
          <Select
            value={value.compound}
            onChange={(v) => updateField("compound", v as Line["compound"])}
            options={compoundOptions}
            disabled={disabled}
          />
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Join</span>
          <Select
            value={value.join}
            onChange={(v) => updateField("join", v as Line["join"])}
            options={joinOptions}
            disabled={disabled}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>Stroke Color</span>
        <FillPickerPopover
          value={value.fill}
          onChange={handleFillChange}
          disabled={disabled}
        />
      </div>

      {showEnds && (
        <div>
          <div
            style={{
              ...accordionHeaderStyle,
              ...(disabled ? accordionDisabledStyle : undefined),
            }}
            onClick={handleEndsToggle}
            role="button"
          >
            <ChevronIcon style={chevronStyle(endsExpanded)} />
            <span>Line Ends</span>
          </div>
          <div style={accordionContentStyle(endsExpanded)}>
            <div style={lineEndRowStyle}>
              <LineEndEditor
                value={value.headEnd}
                onChange={(e) => updateField("headEnd", e)}
                label="Head"
                disabled={disabled}
              />
              <LineEndEditor
                value={value.tailEnd}
                onChange={(e) => updateField("tailEnd", e)}
                label="Tail"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Create a default line
 */
export function createDefaultLine(): Line {
  return {
    width: px(1),
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: createDefaultFill("solidFill"),
    dash: "solid",
    join: "round",
  };
}
