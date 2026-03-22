/**
 * @file CustomColorsEditor - Editor for custom colors (a:custClrLst)
 *
 * Flat list of named custom colors with add/remove/edit support.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.1 (custClrLst)
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { CustomColor } from "@aurochs-office/pptx/domain/theme/types";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import {
  OptionalPropertySection,
  EditablePropertyList,
  type EditablePropertyListItem,
} from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type CustomColorsEditorProps = {
  readonly customColors: readonly CustomColor[];
  readonly onAdd: (color: CustomColor) => void;
  readonly onRemove: (index: number) => void;
  readonly onUpdate: (index: number, color: CustomColor) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const itemInnerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const labelStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const swatchStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: radiusTokens.sm,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  cursor: "pointer",
  flexShrink: 0,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for custom colors list (a:custClrLst).
 */
export function CustomColorsEditor({
  customColors,
  onAdd,
  onRemove,
  onUpdate,
  disabled,
}: CustomColorsEditorProps) {
  const items = useMemo<readonly EditablePropertyListItem[]>(
    () => customColors.map((c, i) => ({ key: String(i), label: c.name ?? `Custom ${i + 1}` })),
    [customColors],
  );

  const handleAdd = useCallback(
    (name: string) => {
      onAdd({ name, color: "000000", type: "srgb" });
    },
    [onAdd],
  );

  const handleRemove = useCallback(
    (key: string) => {
      onRemove(Number(key));
    },
    [onRemove],
  );

  const handleColorChange = useCallback(
    (index: number) => (hex: string) => {
      const current = customColors[index];
      onUpdate(index, { ...current, color: hex });
    },
    [customColors, onUpdate],
  );

  const renderItem = useCallback(
    (item: EditablePropertyListItem) => {
      const index = Number(item.key);
      const color = customColors[index]?.color ?? "000000";
      return (
        <div style={itemInnerStyle}>
          <ColorPickerPopover
            value={color}
            onChange={handleColorChange(index)}
            disabled={disabled}
            trigger={
              <div style={{ ...swatchStyle, backgroundColor: `#${color}` }} />
            }
          />
          <span style={labelStyle}>{item.label}</span>
        </div>
      );
    },
    [customColors, handleColorChange, disabled],
  );

  return (
    <OptionalPropertySection title="Custom Colors" defaultExpanded={false}>
      <EditablePropertyList
        items={items}
        renderItem={renderItem}
        onAdd={handleAdd}
        onRemove={handleRemove}
        disabled={disabled}
        addPlaceholder="Color name"
      />
    </OptionalPropertySection>
  );
}
