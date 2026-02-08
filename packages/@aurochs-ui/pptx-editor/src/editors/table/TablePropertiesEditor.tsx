/**
 * @file TablePropertiesEditor - Editor for TableProperties type
 *
 * Edits table-level properties: style options, fill, effects, and tableStyleId.
 * Uses shared TableStyleBandsEditor for the style option toggles.
 */

import { useCallback, type CSSProperties } from "react";
import { Toggle, Input } from "@aurochs-ui/ui-components/primitives";
import { Accordion, FieldGroup } from "@aurochs-ui/ui-components/layout";
import { FillEditor, createNoFill } from "../color/FillEditor";
import { EffectsEditor, createDefaultEffects } from "../shape/EffectsEditor";
import { TableStyleBandsEditor } from "@aurochs-ui/editor-controls/table";
import type { TableStyleBands } from "@aurochs-ui/editor-controls/types";
import type { TableProperties } from "@aurochs-office/pptx/domain/table/types";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { pptxTableAdapter } from "../../adapters/editor-controls";

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
    [value, onChange],
  );

  // Handle shared TableStyleBandsEditor onChange
  const handleBandsChange = useCallback(
    (update: Partial<TableStyleBands>) => {
      const updated = pptxTableAdapter.applyUpdate(value, update);
      onChange(updated);
    },
    [value, onChange],
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

      {/* Style Options - uses shared editor */}
      <Accordion title="Style Options" defaultExpanded>
        <TableStyleBandsEditor
          value={pptxTableAdapter.toGeneric(value)}
          onChange={handleBandsChange}
          disabled={disabled}
        />
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
              const hasEffects = effects.shadow || effects.glow || effects.reflection || effects.softEdge;
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
