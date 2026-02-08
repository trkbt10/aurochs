/**
 * @file CellFormattingEditor - Shared table cell formatting editor
 *
 * Provides vertical alignment, background color, text wrap, and border controls.
 * Format-specific packages provide slots for custom background/border editors.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { ToggleButton, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import type { CellFormatting, VerticalAlignment } from "../types/cell-formatting";
import type { CellFormattingFeatures } from "../types/feature-flags";
import type { MixedContext } from "../types/mixed";
import { isMixedField } from "../types/mixed";

// =============================================================================
// Types
// =============================================================================

export type CellFormattingEditorProps = {
  readonly value: CellFormatting;
  readonly onChange: (update: Partial<CellFormatting>) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly features?: CellFormattingFeatures;
  readonly mixed?: MixedContext;
  /** Slot: format-specific background editor (PPTX FillEditor, etc.). */
  readonly renderBackgroundEditor?: () => ReactNode;
  /** Slot: format-specific border editor. */
  readonly renderBorderEditor?: () => ReactNode;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, rgba(255, 255, 255, 0.06))",
  margin: "4px 0",
};

const wrapRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const wrapLabelStyle: CSSProperties = {
  fontSize: "12px",
  userSelect: "none",
};

// =============================================================================
// Alignment options
// =============================================================================

const VERTICAL_ALIGNMENTS: readonly { value: VerticalAlignment; label: string }[] = [
  { value: "top", label: "\u2191" },
  { value: "center", label: "\u2195" },
  { value: "bottom", label: "\u2193" },
];

// =============================================================================
// Component
// =============================================================================

export function CellFormattingEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  features,
  mixed,
  renderBackgroundEditor,
  renderBorderEditor,
}: CellFormattingEditorProps) {
  const showVerticalAlignment = features?.showVerticalAlignment !== false;
  const showBackgroundColor = features?.showBackgroundColor !== false;
  const showWrapText = features?.showWrapText === true;
  const showBorders = features?.showBorders !== false;

  const handleVerticalAlignmentChange = useCallback(
    (alignment: VerticalAlignment) => onChange({ verticalAlignment: alignment }),
    [onChange],
  );

  const handleWrapTextChange = useCallback((checked: boolean) => onChange({ wrapText: checked }), [onChange]);

  const handleBackgroundColorChange = useCallback((hex: string) => onChange({ backgroundColor: hex }), [onChange]);

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      {/* Vertical Alignment */}
      {showVerticalAlignment && (
        <FieldGroup label="Vertical Align">
          <div style={rowStyle}>
            {VERTICAL_ALIGNMENTS.map(({ value: align, label }) => (
              <ToggleButton
                key={align}
                pressed={!isMixedField(mixed, "verticalAlignment") && value.verticalAlignment === align}
                onChange={() => handleVerticalAlignmentChange(align)}
                label={label}
                ariaLabel={`Align ${align}`}
                disabled={disabled}
                mixed={isMixedField(mixed, "verticalAlignment")}
              />
            ))}
          </div>
        </FieldGroup>
      )}

      {/* Background Color */}
      {showBackgroundColor && (
        <>
          {showVerticalAlignment && <div style={separatorStyle} />}
          {renderBackgroundEditor ? (
            renderBackgroundEditor()
          ) : (
            <FieldGroup label="Background" inline labelWidth={72}>
              <input
                type="color"
                value={
                  value.backgroundColor
                    ? value.backgroundColor.startsWith("#")
                      ? value.backgroundColor
                      : `#${value.backgroundColor}`
                    : "#FFFFFF"
                }
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                disabled={disabled}
              />
            </FieldGroup>
          )}
        </>
      )}

      {/* Wrap Text */}
      {showWrapText && (
        <>
          <div style={separatorStyle} />
          <div style={wrapRowStyle}>
            <Toggle checked={value.wrapText ?? false} onChange={handleWrapTextChange} disabled={disabled} />
            <span style={wrapLabelStyle}>Wrap Text</span>
          </div>
        </>
      )}

      {/* Borders */}
      {showBorders && renderBorderEditor && (
        <>
          <div style={separatorStyle} />
          {renderBorderEditor()}
        </>
      )}
    </div>
  );
}
