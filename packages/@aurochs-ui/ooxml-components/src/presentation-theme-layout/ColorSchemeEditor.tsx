/**
 * @file Color scheme editor component
 *
 * Flat list editor for theme colors.
 *
 * The 12 standard color slots (dk1, lt1, dk2, lt2, accent1-6, hlink, folHlink) are
 * defined by ECMA-376 Part 1, Section 20.1.6.2 (CT_ColorScheme) as required children
 * of a:clrScheme. The grouping into "Base / Accent / Hyperlink" seen in Office UI is
 * a Microsoft convention, not an ECMA-376 requirement. This editor displays all colors
 * in a flat list and supports adding, removing, and renaming entries.
 */

import React, { useCallback, useMemo, type CSSProperties } from "react";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { SchemeColorName } from "@aurochs-office/drawing-ml/domain/color";
import { SCHEME_COLOR_NAMES, SCHEME_COLOR_NAME_LABELS } from "@aurochs-office/drawing-ml/domain/color";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import {
  OptionalPropertySection,
  EditablePropertyList,
  InlineRenameLabel,
  type EditablePropertyListItem,
} from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ColorSchemeEditorProps = {
  readonly colorScheme: ColorScheme;
  readonly onColorChange: (name: string, color: string) => void;
  readonly onColorAdd?: (name: string, color: string) => void;
  readonly onColorRemove?: (name: string) => void;
  readonly onColorRename?: (oldName: string, newName: string) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const colorItemInnerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const colorLabelStyle: CSSProperties = {
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
// Helpers
// =============================================================================

const STANDARD_KEYS = new Set<string>(SCHEME_COLOR_NAMES);

function normalizeColor(color: string): string {
  return color.startsWith("#") ? color.slice(1) : color;
}

function getLabel(key: string): string {
  if (key in SCHEME_COLOR_NAME_LABELS) {
    return SCHEME_COLOR_NAME_LABELS[key as SchemeColorName];
  }
  return key;
}

/**
 * Build ordered list of color keys: standard 12 first (in ECMA-376 order),
 * then any custom keys in insertion order. All entries are removable and renamable.
 */
function buildListItems(colorScheme: ColorScheme): readonly EditablePropertyListItem[] {
  const items: EditablePropertyListItem[] = [];
  for (const key of SCHEME_COLOR_NAMES) {
    if (key in colorScheme) {
      items.push({ key, label: getLabel(key), renamable: true });
    }
  }
  for (const key of Object.keys(colorScheme)) {
    if (!STANDARD_KEYS.has(key)) {
      items.push({ key, label: key, renamable: true });
    }
  }
  return items;
}

function renderColorLabel(options: {
  label: string;
  key: string;
  onRename: ((oldKey: string, newKey: string) => void) | undefined;
  disabled?: boolean;
}): React.ReactNode {
  if (options.onRename && !options.disabled) {
    const { key, onRename } = options;
    return <InlineRenameLabel label={options.label} onRename={(newLabel) => onRename(key, newLabel)} />;
  }
  return options.label;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Color scheme editor — flat list of all theme colors.
 *
 * All entries can be renamed (double-click label) and removed.
 * Standard 12 slots are shown with human-readable labels by default.
 */
export function ColorSchemeEditor({
  colorScheme,
  onColorChange,
  onColorAdd,
  onColorRemove,
  onColorRename,
  disabled,
}: ColorSchemeEditorProps) {
  const items = useMemo(() => buildListItems(colorScheme), [colorScheme]);

  const handleColorChange = useCallback(
    (name: string) => (color: string) => {
      onColorChange(name, color);
    },
    [onColorChange],
  );

  const handleAdd = useCallback(
    (name: string) => {
      onColorAdd?.(name, "000000");
    },
    [onColorAdd],
  );

  const handleRename = useCallback(
    (oldKey: string, newKey: string) => {
      onColorRename?.(oldKey, newKey);
    },
    [onColorRename],
  );

  const renderItem = useCallback(
    (item: EditablePropertyListItem) => {
      const color = normalizeColor(colorScheme[item.key] ?? "000000");
      const label = item.label ?? item.key;
      return (
        <div style={colorItemInnerStyle}>
          <ColorPickerPopover
            value={color}
            onChange={handleColorChange(item.key)}
            disabled={disabled}
            trigger={
              <div style={{ ...swatchStyle, backgroundColor: `#${color}` }} />
            }
          />
          <div style={colorLabelStyle}>
            {renderColorLabel({ label, key: item.key, onRename: onColorRename ? handleRename : undefined, disabled })}
          </div>
        </div>
      );
    },
    [colorScheme, handleColorChange, handleRename, onColorRename, disabled],
  );

  return (
    <OptionalPropertySection title="Color Scheme" defaultExpanded>
      <EditablePropertyList
        items={items}
        renderItem={renderItem}
        onAdd={onColorAdd ? handleAdd : undefined}
        onRemove={onColorRemove}
        onRename={onColorRename ? handleRename : undefined}
        disabled={disabled}
        addPlaceholder="custom1"
      />
    </OptionalPropertySection>
  );
}
