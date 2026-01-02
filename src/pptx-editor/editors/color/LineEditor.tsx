/**
 * @file LineEditor - Editor for Line type
 *
 * Edits stroke properties including width, cap, compound, dash, fill, ends, join.
 */

import { useCallback, type CSSProperties } from "react";
import { Select } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { PixelsEditor } from "../primitives";
import { FillEditor, createDefaultSolidFill } from "./FillEditor";
import { px } from "../../../pptx/domain/types";
import type { Line, LineEnd } from "../../../pptx/domain/color";
import type { EditorProps, SelectOption } from "../../types";

export type LineEditorProps = EditorProps<Line> & {
  readonly style?: CSSProperties;
  /** Show end arrow editors */
  readonly showEnds?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};


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
  { value: "lgDashDot", label: "Long Dash-Dot" },
  { value: "lgDashDotDot", label: "Long Dash-Dot-Dot" },
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
  { value: "sm", label: "Small" },
  { value: "med", label: "Medium" },
  { value: "lg", label: "Large" },
];

function LineEndEditor({
  value,
  onChange,
  label,
  disabled,
}: {
  value: LineEnd | undefined;
  onChange: (value: LineEnd | undefined) => void;
  label: string;
  disabled?: boolean;
}) {
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
    <FieldGroup label={label}>
      <Select
        value={lineEnd.type}
        onChange={handleTypeChange}
        options={lineEndTypeOptions}
        disabled={disabled}
      />
      {lineEnd.type !== "none" && (
        <FieldRow>
          <Select
            value={lineEnd.width}
            onChange={(w) => onChange({ ...lineEnd, width: w as LineEnd["width"] })}
            options={lineEndSizeOptions}
            disabled={disabled}
          />
          <Select
            value={lineEnd.length}
            onChange={(l) => onChange({ ...lineEnd, length: l as LineEnd["length"] })}
            options={lineEndSizeOptions}
            disabled={disabled}
          />
        </FieldRow>
      )}
    </FieldGroup>
  );
}






export function LineEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showEnds = true,
}: LineEditorProps) {
  const updateField = useCallback(
    <K extends keyof Line>(field: K, newValue: Line[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Width */}
      <FieldGroup label="Width">
        <PixelsEditor
          value={value.width}
          onChange={(w) => updateField("width", w)}
          disabled={disabled}
          min={0}
          step={0.5}
        />
      </FieldGroup>

      {/* Style options */}
      <FieldRow>
        <FieldGroup label="Cap" style={{ flex: 1 }}>
          <Select
            value={value.cap}
            onChange={(v) => updateField("cap", v as Line["cap"])}
            options={capOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Join" style={{ flex: 1 }}>
          <Select
            value={value.join}
            onChange={(v) => updateField("join", v as Line["join"])}
            options={joinOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Compound" style={{ flex: 1 }}>
          <Select
            value={value.compound}
            onChange={(v) => updateField("compound", v as Line["compound"])}
            options={compoundOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Dash" style={{ flex: 1 }}>
          <Select
            value={typeof value.dash === "string" ? value.dash : "custom"}
            onChange={(v) => updateField("dash", v)}
            options={dashOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      {/* Fill */}
      <FieldGroup label="Stroke Fill">
        <FillEditor
          value={value.fill}
          onChange={(f) => updateField("fill", f)}
          disabled={disabled}
          allowedTypes={["noFill", "solidFill", "gradientFill", "patternFill"]}
        />
      </FieldGroup>

      {/* Line ends */}
      {showEnds && (
        <>
          <LineEndEditor
            value={value.headEnd}
            onChange={(e) => updateField("headEnd", e)}
            label="Head End"
            disabled={disabled}
          />
          <LineEndEditor
            value={value.tailEnd}
            onChange={(e) => updateField("tailEnd", e)}
            label="Tail End"
            disabled={disabled}
          />
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
