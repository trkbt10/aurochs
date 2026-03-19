/**
 * @file ExtraColorSchemesEditor - Editor for extra color scheme list
 *
 * Multiple color scheme variants (a:extraClrSchemeLst).
 * Each entry has a name, color scheme, and color map.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.5 (extraClrSchemeLst)
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { ExtraColorScheme } from "@aurochs-office/pptx/domain/theme/types";
import {
  OptionalPropertySection,
  EditablePropertyList,
  type EditablePropertyListItem,
} from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ExtraColorSchemesEditorProps = {
  readonly extraColorSchemes: readonly ExtraColorScheme[];
  readonly onAdd: (scheme: ExtraColorScheme) => void;
  readonly onRemove: (index: number) => void;
  readonly onUpdate: (index: number, scheme: ExtraColorScheme) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const nameStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
  flex: 1,
};

const colorCountStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for extra color schemes (a:extraClrSchemeLst).
 */
export function ExtraColorSchemesEditor({
  extraColorSchemes,
  onAdd,
  onRemove,
  disabled,
}: ExtraColorSchemesEditorProps) {
  const items = useMemo<readonly EditablePropertyListItem[]>(
    () => extraColorSchemes.map((s, i) => ({ key: String(i), label: s.name ?? `Scheme ${i + 1}` })),
    [extraColorSchemes],
  );

  const handleAdd = useCallback(
    (name: string) => {
      onAdd({
        name,
        colorScheme: {},
        colorMap: {},
      });
    },
    [onAdd],
  );

  const handleRemove = useCallback(
    (key: string) => {
      onRemove(Number(key));
    },
    [onRemove],
  );

  const renderItem = useCallback(
    (item: EditablePropertyListItem) => {
      const index = Number(item.key);
      const scheme = extraColorSchemes[index];
      const colorCount = scheme ? Object.keys(scheme.colorScheme).length : 0;
      return (
        <div style={itemStyle}>
          <span style={nameStyle}>{item.label}</span>
          <span style={colorCountStyle}>{colorCount} colors</span>
        </div>
      );
    },
    [extraColorSchemes],
  );

  return (
    <OptionalPropertySection title="Extra Color Schemes" defaultExpanded={false}>
      <EditablePropertyList
        items={items}
        renderItem={renderItem}
        onAdd={handleAdd}
        onRemove={handleRemove}
        disabled={disabled}
        addPlaceholder="Scheme name"
      />
    </OptionalPropertySection>
  );
}
