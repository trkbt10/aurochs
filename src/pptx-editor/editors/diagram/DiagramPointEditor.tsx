/**
 * @file DiagramPointEditor - Editor for individual diagram point (node)
 *
 * Edits a single DiagramPoint: modelId (readonly), type, textBody, propertySet.
 */

import type { CSSProperties } from "react";
import type { DiagramPoint, DiagramPropertySet } from "../../../pptx/domain/diagram";
import type { TextBody } from "../../../pptx/domain/text";
import type { EditorProps } from "../../types";
import { Accordion, FieldGroup, FieldRow } from "../../ui/layout";
import { Input, Toggle } from "../../ui/primitives";
import { TextBodyEditor } from "../text/TextBodyEditor";

export type DiagramPointEditorProps = EditorProps<DiagramPoint> & {
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
  marginBottom: "2px",
};

// =============================================================================
// Sub-Components
// =============================================================================

type PropertySetDisplayProps = {
  readonly propertySet: DiagramPropertySet | undefined;
  readonly disabled?: boolean;
  readonly onChange: (propertySet: DiagramPropertySet) => void;
};

/**
 * Display and edit some DiagramPropertySet fields
 */
function PropertySetEditor({ propertySet, disabled, onChange }: PropertySetDisplayProps) {
  const ps = propertySet ?? {};

  const handleStringChange = (key: keyof DiagramPropertySet, value: string | number) => {
    const strValue = String(value);
    onChange({ ...ps, [key]: strValue || undefined });
  };

  const handleBoolChange = (key: keyof DiagramPropertySet, value: boolean) => {
    onChange({ ...ps, [key]: value });
  };

  return (
    <div style={containerStyle}>
      <FieldRow>
        <FieldGroup label="Layout Type">
          <Input
            value={ps.layoutTypeId ?? ""}
            onChange={(v) => handleStringChange("layoutTypeId", v)}
            disabled={disabled}
            placeholder="(none)"
          />
        </FieldGroup>
        <FieldGroup label="Style Type">
          <Input
            value={ps.quickStyleTypeId ?? ""}
            onChange={(v) => handleStringChange("quickStyleTypeId", v)}
            disabled={disabled}
            placeholder="(none)"
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Color Type">
          <Input
            value={ps.colorTypeId ?? ""}
            onChange={(v) => handleStringChange("colorTypeId", v)}
            disabled={disabled}
            placeholder="(none)"
          />
        </FieldGroup>
        <FieldGroup label="Presentation Name">
          <Input
            value={ps.presentationName ?? ""}
            onChange={(v) => handleStringChange("presentationName", v)}
            disabled={disabled}
            placeholder="(none)"
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <Toggle
          checked={ps.placeholder ?? false}
          onChange={(v) => handleBoolChange("placeholder", v)}
          disabled={disabled}
          label="Placeholder"
        />
        <Toggle
          checked={ps.customText ?? false}
          onChange={(v) => handleBoolChange("customText", v)}
          disabled={disabled}
          label="Custom Text"
        />
      </FieldRow>

      {ps.placeholderText !== undefined && (
        <FieldGroup label="Placeholder Text">
          <Input
            value={ps.placeholderText}
            onChange={(v) => handleStringChange("placeholderText", v)}
            disabled={disabled}
          />
        </FieldGroup>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for DiagramPoint type.
 *
 * Features:
 * - Display modelId (readonly)
 * - Display type
 * - Edit textBody via TextBodyEditor
 * - Edit propertySet (basic fields)
 */
export function DiagramPointEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: DiagramPointEditorProps) {
  const handleTextBodyChange = (textBody: TextBody) => {
    onChange({ ...value, textBody });
  };

  const handlePropertySetChange = (propertySet: DiagramPropertySet) => {
    onChange({ ...value, propertySet });
  };

  const displayType = value.type ?? "(default)";

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Identity Info (read-only) */}
      <div style={infoStyle}>
        <div>
          <span style={labelStyle}>Model ID</span>
          <br />
          <code style={{ fontSize: "11px" }}>{value.modelId}</code>
        </div>
        {value.type && (
          <div>
            <span style={labelStyle}>Type</span>
            <br />
            {displayType}
          </div>
        )}
        {value.connectionId && (
          <div>
            <span style={labelStyle}>Connection ID</span>
            <br />
            <code style={{ fontSize: "11px" }}>{value.connectionId}</code>
          </div>
        )}
      </div>

      {/* Text Body */}
      {value.textBody && (
        <Accordion title="Text Content" defaultExpanded>
          <TextBodyEditor
            value={value.textBody}
            onChange={handleTextBodyChange}
            disabled={disabled}
          />
        </Accordion>
      )}

      {/* Property Set */}
      <Accordion title="Properties" defaultExpanded={false}>
        <PropertySetEditor
          propertySet={value.propertySet}
          onChange={handlePropertySetChange}
          disabled={disabled}
        />
      </Accordion>
    </div>
  );
}

/**
 * Create a default DiagramPoint
 */
export function createDefaultDiagramPoint(modelId?: string): DiagramPoint {
  return {
    modelId: modelId ?? `point-${Date.now()}`,
    type: "node",
  };
}
