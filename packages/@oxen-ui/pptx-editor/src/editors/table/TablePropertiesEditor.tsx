/**
 * @file TablePropertiesEditor - Editor for TableProperties type
 *
 * Edits table-level properties: style options, fill, effects, and tableStyleId.
 */

import { useCallback, type CSSProperties } from "react";
import { Toggle, Input } from "@oxen-ui/ui-components/primitives";
import { Accordion, FieldGroup } from "@oxen-ui/ui-components/layout";
import { FillEditor, createNoFill } from "../color/FillEditor";
import { EffectsEditor, createDefaultEffects } from "../shape/EffectsEditor";
import type { TableProperties } from "@oxen/pptx/domain/table/types";
import type { EditorProps } from "@oxen-ui/ui-components/types";

export type TablePropertiesEditorProps = EditorProps<TableProperties> & {
  readonly style?: CSSProperties;
  /** Show effects editor */
  readonly showEffects?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const toggleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
};

/**
 * Keys for style toggle options.
 * Derived from TableProperties to ensure type safety with domain type.
 */
type StyleToggleKey = Extract<
  keyof TableProperties,
  "firstRow" | "firstCol" | "lastRow" | "lastCol" | "bandRow" | "bandCol"
>;

type StyleToggleConfig = {
  readonly key: StyleToggleKey;
  readonly label: string;
};

const STYLE_TOGGLES: readonly StyleToggleConfig[] = [
  { key: "firstRow", label: "Header Row" },
  { key: "firstCol", label: "First Column" },
  { key: "lastRow", label: "Total Row" },
  { key: "lastCol", label: "Last Column" },
  { key: "bandRow", label: "Banded Rows" },
  { key: "bandCol", label: "Banded Columns" },
];

/**
 * Editor for TableProperties type.
 */
export function TablePropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showEffects = true,
}: TablePropertiesEditorProps) {
  const updateField = useCallback(
    <K extends keyof TableProperties>(field: K, newValue: TableProperties[K]) => {
      if (newValue === undefined || newValue === false) {
        const updated = { ...value };
        delete (updated as Record<string, unknown>)[field];
        onChange(updated);
      } else {
        onChange({ ...value, [field]: newValue });
      }
    },
    [value, onChange]
  );

  const handleStyleToggle = useCallback(
    (key: StyleToggleKey, checked: boolean) => {
      updateField(key, checked || undefined);
    },
    [updateField]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Table Style ID */}
      <FieldGroup label="Table Style ID" hint="Reference to table style definition">
        <Input
          value={value.tableStyleId ?? ""}
          onChange={(v) => updateField("tableStyleId", String(v).trim() || undefined)}
          disabled={disabled}
          placeholder="(none)"
        />
      </FieldGroup>

      {/* Text Direction */}
      <Toggle
        checked={value.rtl ?? false}
        onChange={(v) => updateField("rtl", v || undefined)}
        label="Right-to-Left"
        disabled={disabled}
      />

      {/* Style Options */}
      <Accordion title="Style Options" defaultExpanded>
        <div style={toggleGridStyle}>
          {STYLE_TOGGLES.map((config) => (
            <Toggle
              key={config.key}
              checked={value[config.key] ?? false}
              onChange={(checked) => handleStyleToggle(config.key, checked)}
              label={config.label}
              disabled={disabled}
            />
          ))}
        </div>
      </Accordion>

      {/* Fill */}
      <Accordion title="Background Fill" defaultExpanded={!!value.fill}>
        <FillEditor
          value={value.fill ?? createNoFill()}
          onChange={(fill) => updateField("fill", fill.type === "noFill" ? undefined : fill)}
          disabled={disabled}
          allowedTypes={["noFill", "solidFill", "gradientFill", "patternFill"]}
        />
      </Accordion>

      {/* Effects */}
      {showEffects && (
        <Accordion title="Effects" defaultExpanded={!!value.effects}>
          <EffectsEditor
            value={value.effects ?? createDefaultEffects()}
            onChange={(effects) => {
              const hasEffects =
                effects.shadow || effects.glow || effects.reflection || effects.softEdge;
              updateField("effects", hasEffects ? effects : undefined);
            }}
            disabled={disabled}
          />
        </Accordion>
      )}
    </div>
  );
}

/**
 * Create default table properties
 */
export function createDefaultTableProperties(): TableProperties {
  return {
    firstRow: true,
    bandRow: true,
  };
}
