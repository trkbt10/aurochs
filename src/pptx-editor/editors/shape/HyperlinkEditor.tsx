/**
 * @file HyperlinkEditor - Editor for Hyperlink type
 *
 * Returns toggle + conditional fields (ID, Tooltip, Action).
 * @see ECMA-376 Part 1, Section 20.1.2.2.23 (hlinkClick/hlinkHover)
 */

import { Input, Toggle } from "../../ui/primitives";
import { FieldGroup } from "../../ui/layout";
import type { Hyperlink } from "../../../pptx/domain/types";
import type { EditorProps } from "../../types";

export type HyperlinkEditorProps = EditorProps<Hyperlink | undefined> & {
  /** Custom label for the toggle (default: "Enable") */
  readonly toggleLabel?: string;
};

/**
 * Returns Enable toggle + conditional ID/Tooltip/Action fields.
 */
export function HyperlinkEditor({
  value,
  onChange,
  disabled,
  toggleLabel = "Enable",
}: HyperlinkEditorProps) {
  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ id: "" });
    } else {
      onChange(undefined);
    }
  };

  const handleFieldChange = <K extends keyof Hyperlink>(
    field: K,
    newValue: Hyperlink[K]
  ) => {
    if (!value) {
      return;
    }
    onChange({ ...value, [field]: newValue });
  };

  return (
    <>
      <Toggle
        checked={!!value}
        onChange={handleToggle}
        label={toggleLabel}
        disabled={disabled}
      />
      {value && (
        <>
          <FieldGroup label="Target ID" hint="Relationship ID (r:id)">
            <Input
              value={value.id}
              onChange={(v) => handleFieldChange("id", String(v))}
              disabled={disabled}
              placeholder="rId1"
            />
          </FieldGroup>
          <FieldGroup label="Tooltip">
            <Input
              value={value.tooltip ?? ""}
              onChange={(v) => handleFieldChange("tooltip", String(v) || undefined)}
              disabled={disabled}
              placeholder="Optional"
            />
          </FieldGroup>
          <FieldGroup label="Action" hint="e.g., ppaction://hlinksldjump">
            <Input
              value={value.action ?? ""}
              onChange={(v) => handleFieldChange("action", String(v) || undefined)}
              disabled={disabled}
              placeholder="Optional"
            />
          </FieldGroup>
        </>
      )}
    </>
  );
}

/**
 * Create default Hyperlink
 */
export function createDefaultHyperlink(): Hyperlink {
  return { id: "" };
}
