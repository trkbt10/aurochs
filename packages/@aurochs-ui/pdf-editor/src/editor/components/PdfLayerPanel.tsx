/**
 * @file PdfLayerPanel - Layer panel for PDF editor
 *
 * Uses react-editor-ui's LayerItem component (SoT for layer item rendering).
 * Format-specific details (icon, label) are injected via props.
 */

import { memo, useCallback, useMemo, type PointerEvent as ReactPointerEvent } from "react";
import type { PdfPage, PdfElement, PdfElementId } from "@aurochs/pdf";
import { createElementId } from "@aurochs/pdf";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { LayerItem } from "react-editor-ui/LayerItem";
import { TextBoxIcon, PictureIcon, PenIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens, colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type PdfLayerPanelProps = {
  readonly page: PdfPage | undefined;
  readonly pageIndex: number;
  readonly selectedElementIds: readonly PdfElementId[];
  readonly onSelect: (elementId: PdfElementId, addToSelection: boolean) => void;
};

// =============================================================================
// Helpers
// =============================================================================

const ICON_PROPS = { size: iconTokens.size.sm, strokeWidth: iconTokens.strokeWidth };


function getElementLabel(element: PdfElement, index: number): string {
  switch (element.type) {
    case "text": {
      const preview = element.text.length > 24 ? element.text.slice(0, 24) + "…" : element.text;
      return preview || `Text ${index + 1}`;
    }
    case "textBlock": {
      const fullText = element.paragraphs.flatMap((p) => p.runs.map((r) => r.text)).join("");
      const preview = fullText.length > 24 ? fullText.slice(0, 24) + "…" : fullText;
      return preview || `Text Block ${index + 1}`;
    }
    case "path": return "Path";
    case "image": return "Image";
    case "table": return `Table (${element.rows.length}×${element.columns.length})`;
    default: return `Element ${index + 1}`;
  }
}

function getElementIcon(element: PdfElement) {
  switch (element.type) {
    case "text": return <TextBoxIcon {...ICON_PROPS} />;
    case "textBlock": return <TextBoxIcon {...ICON_PROPS} />;
    case "image": return <PictureIcon {...ICON_PROPS} />;
    case "path": return <PenIcon {...ICON_PROPS} />;
    case "table": return <TextBoxIcon {...ICON_PROPS} />;
    default: return <PenIcon {...ICON_PROPS} />;
  }
}

// =============================================================================
// Component
// =============================================================================

/** Layer panel for PDF editor, using react-editor-ui LayerItem for each row. */
export const PdfLayerPanel = memo(function PdfLayerPanel({
  page,
  pageIndex,
  selectedElementIds,
  onSelect,
}: PdfLayerPanelProps) {
  const selectedSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);

  const handlePointerDown = useCallback(
    (elementId: PdfElementId) => (e: ReactPointerEvent) => {
      const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
      onSelect(elementId, addToSelection);
    },
    [onSelect],
  );

  if (!page || page.elements.length === 0) {
    return (
      <OptionalPropertySection title="Layers" badge={0} defaultExpanded>
        <div style={{ padding: `${spacingTokens.xl} ${spacingTokens.lg}`, textAlign: "center", color: colorTokens.text.tertiary, fontSize: fontTokens.size.lg }}>
          No elements
        </div>
      </OptionalPropertySection>
    );
  }

  // Reverse order: topmost element first (visual stacking)
  const reversedIndices: number[] = [];
  for (let i = page.elements.length - 1; i >= 0; i--) {
    reversedIndices.push(i);
  }

  return (
    <OptionalPropertySection title="Layers" badge={page.elements.length} defaultExpanded>
      <div role="tree" aria-label="Layers">
        {reversedIndices.map((actualIndex) => {
          const element = page.elements[actualIndex];
          if (!element) { return null; }
          const id = createElementId(pageIndex, actualIndex);
          const selected = selectedSet.has(id);
          return (
            <LayerItem
              key={id}
              id={id}
              label={getElementLabel(element, actualIndex)}
              icon={getElementIcon(element)}
              depth={0}
              selected={selected}
              onPointerDown={handlePointerDown(id)}
              showVisibilityToggle={false}
              showLockToggle={false}
            />
          );
        })}
      </div>
    </OptionalPropertySection>
  );
});
