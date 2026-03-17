/**
 * @file PdfLayerPanel - Layer panel for PDF editor
 *
 * Uses react-editor-ui's LayerItem component (SoT for layer item rendering).
 * Format-specific details (icon, label) are injected via props.
 */

import { useCallback, useMemo, type PointerEvent as ReactPointerEvent } from "react";
import type { PdfPage, PdfElement } from "@aurochs/pdf";
import { InspectorSection } from "@aurochs-ui/ui-components/layout";
import { LayerItem } from "react-editor-ui/LayerItem";
import { TextBoxIcon, PictureIcon, PenIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { PdfElementId } from "./types";
import { createElementId } from "./types";

// =============================================================================
// Types
// =============================================================================

export type PdfLayerPanelProps = {
  readonly page: PdfPage | undefined;
  readonly pageIndex: number;
  readonly selectedElementIds: readonly PdfElementId[];
  readonly onSelect: (elementId: PdfElementId, addToSelection: boolean) => void;
  readonly onClearSelection: () => void;
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
    case "path": return "Path";
    case "image": return "Image";
    default: return `Element ${index + 1}`;
  }
}

function getElementIcon(element: PdfElement) {
  switch (element.type) {
    case "text": return <TextBoxIcon {...ICON_PROPS} />;
    case "image": return <PictureIcon {...ICON_PROPS} />;
    case "path": return <PenIcon {...ICON_PROPS} />;
    default: return <PenIcon {...ICON_PROPS} />;
  }
}

// =============================================================================
// Component
// =============================================================================

/** Layer panel for PDF editor, using react-editor-ui LayerItem for each row. */
export function PdfLayerPanel({
  page,
  pageIndex,
  selectedElementIds,
  onSelect,
  onClearSelection,
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
      <InspectorSection title="Layers" badge={0}>
        <div style={{ padding: "24px 16px", textAlign: "center", color: "#888", fontSize: "13px" }}>
          No elements
        </div>
      </InspectorSection>
    );
  }

  // Reverse order: topmost element first (visual stacking)
  const reversedIndices: number[] = [];
  for (let i = page.elements.length - 1; i >= 0; i--) {
    reversedIndices.push(i);
  }

  return (
    <InspectorSection title="Layers" badge={page.elements.length}>
      <div role="tree" aria-label="Layers" onClick={onClearSelection}>
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
    </InspectorSection>
  );
}
