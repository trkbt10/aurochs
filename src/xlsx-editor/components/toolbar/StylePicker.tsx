/**
 * @file Style picker dropdown for inline style selection
 *
 * Provides a popover-based picker showing all available cell formats (cellXfs)
 * with visual previews. Users can click to apply a style to the current selection.
 */

import { useState, useMemo, type CSSProperties } from "react";
import { Popover, ChevronDownIcon } from "../../../office-editor-components";
import {
  colorTokens,
  spacingTokens,
  fontTokens,
  radiusTokens,
} from "../../../office-editor-components/design-tokens";
import type { XlsxStyleSheet } from "../../../xlsx/domain/style/types";
import { StylePreview } from "./StylePreview";

export type StylePickerProps = {
  readonly styles: XlsxStyleSheet;
  readonly currentStyleId: number | undefined;
  readonly disabled: boolean;
  readonly onStyleSelect: (styleId: number) => void;
};

const triggerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: "4px 8px",
  fontSize: fontTokens.size.sm,
  borderRadius: radiusTokens.sm,
  border: "1px solid var(--border-subtle)",
  backgroundColor: "var(--bg-tertiary)",
  cursor: "pointer",
  height: 28,
};

const triggerDisabledStyle: CSSProperties = {
  ...triggerStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const listContainerStyle: CSSProperties = {
  maxHeight: 300,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
  minWidth: 160,
};

const headerStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  padding: spacingTokens.xs,
  borderBottom: "1px solid var(--border-subtle)",
  marginBottom: spacingTokens.xs,
};

const itemBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: spacingTokens.xs,
  borderRadius: radiusTokens.sm,
  cursor: "pointer",
  transition: "background-color 150ms ease",
};

const SELECTED_BG = "rgba(68, 114, 196, 0.15)";

function getItemStyle(isSelected: boolean): CSSProperties {
  return {
    ...itemBaseStyle,
    backgroundColor: isSelected ? SELECTED_BG : "transparent",
  };
}

function getItemHoverBg(isSelected: boolean): string {
  return isSelected ? SELECTED_BG : "transparent";
}

const placeholderStyle: CSSProperties = { color: colorTokens.text.tertiary };
const styleIdLabelStyle: CSSProperties = { fontSize: fontTokens.size.xs, color: colorTokens.text.tertiary };
const itemLabelStyle: CSSProperties = { fontSize: fontTokens.size.sm };

/**
 * Inline style picker with popover dropdown showing all available cell formats.
 */
export function StylePicker({
  styles,
  currentStyleId,
  disabled,
  onStyleSelect,
}: StylePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const styleOptions = useMemo(() => {
    return styles.cellXfs.map((xf, index) => ({
      index,
      xf,
      label: `Style ${index}`,
    }));
  }, [styles.cellXfs]);

  const currentXf =
    currentStyleId !== undefined ? styles.cellXfs[currentStyleId] : undefined;

  const handleSelect = (index: number) => {
    onStyleSelect(index);
    setIsOpen(false);
  };

  const triggerButtonStyle = disabled ? triggerDisabledStyle : triggerStyle;
  const styleIdLabel = currentStyleId !== undefined ? `#${currentStyleId}` : "";

  function renderTriggerContent() {
    if (currentXf) {
      return <StylePreview styles={styles} cellXf={currentXf} size="sm" />;
    }
    return <span style={placeholderStyle}>Style</span>;
  }

  const trigger = (
    <div style={triggerButtonStyle}>
      {renderTriggerContent()}
      <span style={styleIdLabelStyle}>{styleIdLabel}</span>
      <ChevronDownIcon size={12} />
    </div>
  );

  return (
    <Popover
      trigger={trigger}
      open={isOpen}
      onOpenChange={setIsOpen}
      side="bottom"
      align="start"
      disabled={disabled}
    >
      <div style={listContainerStyle}>
        <div style={headerStyle}>Cell Formats ({styles.cellXfs.length})</div>
        {styleOptions.map((opt) => (
          <div
            key={opt.index}
            style={getItemStyle(opt.index === currentStyleId)}
            onClick={() => handleSelect(opt.index)}
            onMouseEnter={(e) => {
              if (opt.index !== currentStyleId) {
                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = getItemHoverBg(opt.index === currentStyleId);
            }}
          >
            <StylePreview styles={styles} cellXf={opt.xf} size="sm" />
            <span style={itemLabelStyle}>{opt.label}</span>
          </div>
        ))}
      </div>
    </Popover>
  );
}
