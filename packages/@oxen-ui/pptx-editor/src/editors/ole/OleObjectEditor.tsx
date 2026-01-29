/**
 * @file OleObjectEditor - Editor for OLE embedded objects
 *
 * Edits OleReference: name, showAsIcon, followColorScheme, and displays info.
 */

import type { CSSProperties } from "react";
import type { OleReference, OleObjectFollowColorScheme } from "@oxen-office/pptx/domain/shape";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import type { SelectOption } from "@oxen-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { Input, Select, Toggle } from "@oxen-ui/ui-components/primitives";

export type OleObjectEditorProps = EditorProps<OleReference> & {
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
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  color: "var(--text-secondary, #a1a1a1)",
};

const labelStyle: CSSProperties = {
  color: "var(--text-tertiary, #737373)",
  fontSize: "11px",
};

// =============================================================================
// Constants
// =============================================================================

const COLOR_SCHEME_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "(None)" },
  { value: "full", label: "Full" },
  { value: "none", label: "None" },
  { value: "textAndBackground", label: "Text and Background" },
];

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for OleReference type.
 *
 * Features:
 * - Display progId (read-only)
 * - Edit name
 * - Toggle showAsIcon
 * - Select followColorScheme
 * - Display preview image
 * - Display dimensions (imgW, imgH)
 */
export function OleObjectEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: OleObjectEditorProps) {
  const handleNameChange = (name: string | number) => {
    const strName = String(name);
    onChange({ ...value, name: strName || undefined });
  };

  const handleShowAsIconChange = (showAsIcon: boolean) => {
    onChange({ ...value, showAsIcon: showAsIcon || undefined });
  };

  const handleColorSchemeChange = (scheme: string) => {
    onChange({
      ...value,
      followColorScheme: (scheme || undefined) as OleObjectFollowColorScheme | undefined,
    });
  };

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Object Info (read-only) */}
      <div style={infoStyle}>
        {value.progId && (
          <div>
            <span style={labelStyle}>Program ID</span>
            <br />
            <code style={{ fontSize: "11px" }}>{value.progId}</code>
          </div>
        )}
        {value.resourceId && (
          <div>
            <span style={labelStyle}>Resource ID</span>
            <br />
            <code style={{ fontSize: "11px" }}>{value.resourceId}</code>
          </div>
        )}
        {(value.imgW || value.imgH) && (
          <div>
            <span style={labelStyle}>Dimensions</span>
            <br />
            {value.imgW ?? "?"} × {value.imgH ?? "?"} EMU
          </div>
        )}
        {!value.progId && !value.resourceId && (
          <span style={{ color: "var(--text-tertiary, #737373)" }}>
            Embedded OLE Object
          </span>
        )}
      </div>

      {/* Editable Fields */}
      <FieldGroup label="Name">
        <Input
          value={value.name ?? ""}
          onChange={handleNameChange}
          disabled={disabled}
          placeholder="(unnamed)"
        />
      </FieldGroup>

      <FieldRow>
        <Toggle
          checked={value.showAsIcon ?? false}
          onChange={handleShowAsIconChange}
          disabled={disabled}
          label="Show as Icon"
        />
      </FieldRow>

      <FieldGroup label="Color Scheme">
        <Select
          value={value.followColorScheme ?? ""}
          onChange={handleColorSchemeChange}
          options={COLOR_SCHEME_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Note: Preview is shown in the canvas via ResourceStore */}
    </div>
  );
}

/**
 * Create a default OleReference
 */
export function createDefaultOleReference(): OleReference {
  return {
    showAsIcon: false,
  };
}
