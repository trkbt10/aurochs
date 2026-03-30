/**
 * @file Customize sheet overlay with palette and default set.
 */

import type { CSSProperties, DragEvent } from "react";
import { ToolbarButton } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import { colorTokens, spacingTokens, fontTokens, radiusTokens, shadowTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { RibbonMenuItemDef } from "./types";

// =============================================================================
// Styles
// =============================================================================

const backdrop: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.25)",
  zIndex: 10,
  display: "flex",
  justifyContent: "center",
  paddingTop: spacingTokens.lg,
};

const sheet: CSSProperties = {
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  borderRadius: radiusTokens.lg,
  boxShadow: shadowTokens.lg,
  padding: spacingTokens.lg,
  width: "90%",
  maxWidth: 720,
  maxHeight: "80%",
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.md,
};

const header: CSSProperties = {
  fontSize: fontTokens.size.lg,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

const grid: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacingTokens.sm,
};

const item: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "3px",
  width: 64,
  cursor: "grab",
};

const label: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  textAlign: "center",
  lineHeight: 1.2,
};

const defText: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
};

const defBar: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacingTokens.xs,
  padding: spacingTokens.sm,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  borderRadius: radiusTokens.md,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  cursor: "grab",
};

// =============================================================================
// Props
// =============================================================================

export type CustomizeSheetProps = {
  readonly paletteItems: readonly RibbonMenuItemDef[];
  readonly onPaletteDragStart: (id: string, e: DragEvent) => void;
  readonly onPaletteDragEnd: () => void;
  readonly onRestore: () => void;
  readonly onDone: () => void;
};

// =============================================================================
// Component
// =============================================================================

/** Overlay sheet for dragging items into the ribbon. */
export function CustomizeSheet({
  paletteItems, onPaletteDragStart, onPaletteDragEnd, onRestore, onDone,
}: CustomizeSheetProps) {
  return (
    <div style={backdrop} onClick={onDone}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={header}>Drag your favourite items into the toolbar...</div>
        <div style={grid}>
          {paletteItems.map((pi) => (
            <div
              key={pi.id}
              style={item}
              draggable
              onDragStart={(e) => onPaletteDragStart(pi.id, e)}
              onDragEnd={onPaletteDragEnd}
            >
              <ToolbarButton icon={pi.icon} label={pi.label} onClick={() => {}} size="md" />
              <span style={label}>{pi.label}</span>
            </div>
          ))}
        </div>
        <div style={defText}>...or drag the default set into the toolbar.</div>
        <div style={defBar} draggable onDragEnd={onRestore}>
          {paletteItems.slice(0, 6).map((pi) => (
            <ToolbarButton key={pi.id} icon={pi.icon} label={pi.label} onClick={() => {}} size="sm" />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    </div>
  );
}
