/**
 * @file DiagramPointEditor - Editor for individual diagram point (node)
 *
 * Edits a single DiagramPoint: modelId (readonly), type, textBody, propertySet.
 */

import type { CSSProperties } from "react";
import type { DiagramPoint, DiagramPropertySet } from "@aurochs-office/diagram/domain";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { colorTokens, radiusTokens, spacingTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { Accordion, FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Input, Toggle } from "@aurochs-ui/ui-components/primitives";
import type { DiagramEditorAdapters } from "./types";

export type DiagramPointEditorProps<TTextBody, TShapeProperties> = EditorProps<DiagramPoint> & {
  readonly style?: CSSProperties;
  readonly adapters?: DiagramEditorAdapters<TTextBody, TShapeProperties>;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.md,
};

const infoStyle: CSSProperties = {
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRadius: radiusTokens.md,
  fontSize: fontTokens.size.md,
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
};

const labelStyle: CSSProperties = {
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  fontSize: fontTokens.size.sm,
  marginBottom: spacingTokens["2xs"],
};

// =============================================================================
// Sub-Components
// =============================================================================

type PropertySetDisplayProps = {
  readonly propertySet: DiagramPropertySet | undefined;
  readonly disabled?: boolean;
  readonly onChange: (propertySet: DiagramPropertySet) => void;
};

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
 * Editor for individual DiagramPoint (modelId, type, textBody, properties).
 */
export function DiagramPointEditor<TTextBody, TShapeProperties>({
  value,
  onChange,
  disabled,
  className,
  style,
  adapters,
}: DiagramPointEditorProps<TTextBody, TShapeProperties>) {
  const textBodyAdapter = adapters?.textBody;
  const shapePropertiesAdapter = adapters?.shapeProperties;

  const textBody = getTextBody({ adapter: textBodyAdapter, value: value.textBody });
  const shapeProperties = getShapeProperties({ adapter: shapePropertiesAdapter, value: value.shapeProperties });

  const handlePropertySetChange = (propertySet: DiagramPropertySet) => {
    onChange({ ...value, propertySet });
  };

  const handleShapePropertiesToggle = (enabled: boolean) => {
    if (!shapePropertiesAdapter) {
      return;
    }

    if (enabled) {
      onChange({ ...value, shapeProperties: shapePropertiesAdapter.createDefault() });
      return;
    }
    onChange({ ...value, shapeProperties: undefined });
  };

  const displayType = value.type ?? "(default)";

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <div style={infoStyle}>
        <div>
          <span style={labelStyle}>Model ID</span>
          <br />
          <code style={{ fontSize: fontTokens.size.sm }}>{value.modelId}</code>
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
            <code style={{ fontSize: fontTokens.size.sm }}>{value.connectionId}</code>
          </div>
        )}
      </div>

      {textBodyAdapter && textBody !== undefined && (
        <Accordion title="Text Content" defaultExpanded>
          {textBodyAdapter.renderEditor({
            value: textBody,
            onChange: (next) => onChange({ ...value, textBody: next }),
            disabled,
          })}
        </Accordion>
      )}

      <Accordion title="Properties" defaultExpanded={false}>
        <PropertySetEditor propertySet={value.propertySet} onChange={handlePropertySetChange} disabled={disabled} />
      </Accordion>

      {shapePropertiesAdapter && (
        <Accordion title="Shape Properties" defaultExpanded={false}>
          <Toggle
            checked={shapeProperties !== undefined}
            onChange={handleShapePropertiesToggle}
            disabled={disabled}
            label="Enable Shape Properties"
          />
          {shapeProperties !== undefined &&
            shapePropertiesAdapter.renderEditor({
              value: shapeProperties,
              onChange: (next) => onChange({ ...value, shapeProperties: next }),
              disabled,
            })}
        </Accordion>
      )}
    </div>
  );
}

/**
 * Create a default DiagramPoint with optional modelId.
 */
export function createDefaultDiagramPoint(modelId?: string): DiagramPoint {
  return {
    modelId: modelId ?? `point-${Date.now()}`,
    type: "node",
  };
}

function getTextBody<TTextBody>(params: {
  readonly adapter: DiagramEditorAdapters<TTextBody, unknown>["textBody"] | undefined;
  readonly value: unknown;
}): TTextBody | undefined {
  const { adapter, value } = params;
  if (!adapter) {
    return undefined;
  }
  return adapter.isTextBody(value) ? value : undefined;
}

function getShapeProperties<TShapeProperties>(params: {
  readonly adapter: DiagramEditorAdapters<unknown, TShapeProperties>["shapeProperties"] | undefined;
  readonly value: unknown;
}): TShapeProperties | undefined {
  const { adapter, value } = params;
  if (!adapter) {
    return undefined;
  }
  return adapter.isShapeProperties(value) ? value : undefined;
}
