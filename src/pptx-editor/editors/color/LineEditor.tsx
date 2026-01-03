/**
 * @file LineEditor - Editor for Line type
 *
 * Design principle: Flat structure with inline labels.
 * No nested FieldGroups.
 * Includes optional visual preview at the top.
 */

import { useCallback, type CSSProperties } from "react";
import { Select } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { LinePreview } from "../../ui/line";
import { PixelsEditor } from "../primitives";
import { FillEditor, createDefaultSolidFill } from "./FillEditor";
import { px } from "../../../pptx/domain/types";
import type { Line, LineEnd } from "../../../pptx/domain/color";
import type { EditorProps, SelectOption } from "../../types";

// =============================================================================
// Types
// =============================================================================

export type LineEditorProps = EditorProps<Line> & {
  readonly style?: CSSProperties;
  /** Show end arrow editors */
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
];

const joinOptions: SelectOption<Line["join"]>[] = [
  { value: "round", label: "Round" },
  { value: "bevel", label: "Bevel" },
  { value: "miter", label: "Miter" },
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
  { value: "sm", label: "S" },
  { value: "med", label: "M" },
  { value: "lg", label: "L" },
];

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, rgba(255, 255, 255, 0.06))",
  margin: "4px 0",
};

// =============================================================================
// Component
// =============================================================================

export function LineEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showEnds = true,
  showPreview = true,
}: LineEditorProps) {
  const updateField = useCallback(
    <K extends keyof Line>(field: K, newValue: Line[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange]
  );

  const headEnd = value.headEnd ?? { type: "none" as const, width: "med" as const, length: "med" as const };
  const tailEnd = value.tailEnd ?? { type: "none" as const, width: "med" as const, length: "med" as const };

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Visual Preview */}
      {showPreview && (
        <LinePreview line={value} width={236} height={56} />
      )}

      {/* Width + Stroke */}
      <FieldRow>
        <FieldGroup label="Width" inline labelWidth={40} style={{ width: "100px" }}>
          <PixelsEditor
            value={value.width}
            onChange={(w) => updateField("width", w)}
            disabled={disabled}
            min={0}
            step={0.5}
          />
        </FieldGroup>
        <FieldGroup label="Stroke" inline labelWidth={44} style={{ flex: 1 }}>
          <FillEditor
            value={value.fill}
            onChange={(f) => updateField("fill", f)}
            disabled={disabled}
            allowedTypes={["noFill", "solidFill", "gradientFill", "patternFill"]}
          />
        </FieldGroup>
      </FieldRow>

      {/* Cap + Join */}
      <FieldRow>
        <FieldGroup label="Cap" inline labelWidth={28} style={{ flex: 1 }}>
          <Select
            value={value.cap}
            onChange={(v) => updateField("cap", v as Line["cap"])}
            options={capOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Join" inline labelWidth={28} style={{ flex: 1 }}>
          <Select
            value={value.join}
            onChange={(v) => updateField("join", v as Line["join"])}
            options={joinOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      {/* Compound + Dash */}
      <FieldRow>
        <FieldGroup label="Type" inline labelWidth={32} style={{ flex: 1 }}>
          <Select
            value={value.compound}
            onChange={(v) => updateField("compound", v as Line["compound"])}
            options={compoundOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Dash" inline labelWidth={32} style={{ flex: 1 }}>
          <Select
            value={typeof value.dash === "string" ? value.dash : "custom"}
            onChange={(v) => updateField("dash", v)}
            options={dashOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      {/* Line ends */}
      {showEnds && (
        <>
          <div style={separatorStyle} />
          <FieldRow>
            <FieldGroup label="Head" inline labelWidth={32} style={{ flex: 1 }}>
              <Select
                value={headEnd.type}
                onChange={(type) => {
                  if (type === "none") {
                    updateField("headEnd", undefined);
                  } else {
                    updateField("headEnd", { ...headEnd, type: type as LineEnd["type"] });
                  }
                }}
                options={lineEndTypeOptions}
                disabled={disabled}
              />
            </FieldGroup>
            {headEnd.type !== "none" && (
              <>
                <Select
                  value={headEnd.width}
                  onChange={(w) => updateField("headEnd", { ...headEnd, width: w as LineEnd["width"] })}
                  options={lineEndSizeOptions}
                  disabled={disabled}
                  style={{ width: "50px" }}
                />
                <Select
                  value={headEnd.length}
                  onChange={(l) => updateField("headEnd", { ...headEnd, length: l as LineEnd["length"] })}
                  options={lineEndSizeOptions}
                  disabled={disabled}
                  style={{ width: "50px" }}
                />
              </>
            )}
          </FieldRow>
          <FieldRow>
            <FieldGroup label="Tail" inline labelWidth={32} style={{ flex: 1 }}>
              <Select
                value={tailEnd.type}
                onChange={(type) => {
                  if (type === "none") {
                    updateField("tailEnd", undefined);
                  } else {
                    updateField("tailEnd", { ...tailEnd, type: type as LineEnd["type"] });
                  }
                }}
                options={lineEndTypeOptions}
                disabled={disabled}
              />
            </FieldGroup>
            {tailEnd.type !== "none" && (
              <>
                <Select
                  value={tailEnd.width}
                  onChange={(w) => updateField("tailEnd", { ...tailEnd, width: w as LineEnd["width"] })}
                  options={lineEndSizeOptions}
                  disabled={disabled}
                  style={{ width: "50px" }}
                />
                <Select
                  value={tailEnd.length}
                  onChange={(l) => updateField("tailEnd", { ...tailEnd, length: l as LineEnd["length"] })}
                  options={lineEndSizeOptions}
                  disabled={disabled}
                  style={{ width: "50px" }}
                />
              </>
            )}
          </FieldRow>
        </>
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
    fill: createDefaultSolidFill("000000"),
    dash: "solid",
    join: "round",
  };
}
