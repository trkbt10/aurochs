/**
 * @file Style picker dropdown for inline style selection
 *
 * Provides a popover-based picker showing all available named cell styles (cellStyles)
 * with visual previews. Users can click to apply a style to the current selection.
 *
 * Reference chain: cellStyles[n].xfId → cellStyleXfs[xfId] (format definition)
 *
 * @see ECMA-376 Part 4, Section 18.8.8 (cellStyles)
 * @see ECMA-376 Part 4, Section 18.8.9 (cellStyleXfs)
 */

import { useState, useMemo, type CSSProperties } from "react";
import { Popover, ChevronDownIcon } from "@oxen-ui/ui-components";
import {
  colorTokens,
  spacingTokens,
  fontTokens,
  radiusTokens,
} from "@oxen-ui/ui-components/design-tokens";
import type { XlsxStyleSheet, XlsxCellXf } from "@oxen/xlsx/domain/style/types";
import { StylePreview } from "./StylePreview";

export type StylePickerProps = {
  readonly styles: XlsxStyleSheet;
  /** Current cell's styleId (cellXfs index) - used to find matching named style */
  readonly currentStyleId: number | undefined;
  readonly disabled: boolean;
  /** Called with the cellStyles index when user selects a named style */
  readonly onNamedStyleSelect: (cellStyleIndex: number) => void;
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
  minWidth: 180,
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
const styleNameStyle: CSSProperties = { fontSize: fontTokens.size.xs, color: colorTokens.text.tertiary };
const itemLabelStyle: CSSProperties = { fontSize: fontTokens.size.sm };

type ResolvedCellStyle = {
  readonly index: number;
  readonly name: string;
  readonly xfId: number;
  readonly cellStyleXf: XlsxCellXf;
};

/**
 * Resolve cellStyles to their corresponding cellStyleXfs for rendering.
 * Follows the reference chain: cellStyles[n].xfId → cellStyleXfs[xfId]
 */
function resolveCellStyles(styles: XlsxStyleSheet): readonly ResolvedCellStyle[] {
  return styles.cellStyles.map((cellStyle, index) => {
    const xfId = cellStyle.xfId;
    const cellStyleXf = styles.cellStyleXfs[xfId];
    return {
      index,
      name: cellStyle.name,
      xfId,
      cellStyleXf,
    };
  });
}

/**
 * Find the named style that matches the current cell's formatting.
 * Looks up: cellXfs[styleId].xfId → find cellStyle where cellStyle.xfId matches
 */
function findCurrentCellStyleIndex(
  styles: XlsxStyleSheet,
  currentStyleId: number | undefined
): number | undefined {
  if (currentStyleId === undefined) {
    return undefined;
  }
  const currentXf = styles.cellXfs[currentStyleId];
  if (!currentXf || currentXf.xfId === undefined) {
    return undefined;
  }
  const targetXfId = currentXf.xfId;
  const matchIndex = styles.cellStyles.findIndex((cs) => cs.xfId === targetXfId);
  return matchIndex >= 0 ? matchIndex : undefined;
}

/**
 * Inline style picker with popover dropdown showing all available named cell styles.
 */
export function StylePicker({
  styles,
  currentStyleId,
  disabled,
  onNamedStyleSelect,
}: StylePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const styleOptions = useMemo(() => resolveCellStyles(styles), [styles]);

  const currentCellStyleIndex = useMemo(
    () => findCurrentCellStyleIndex(styles, currentStyleId),
    [styles, currentStyleId]
  );

  const currentStyleOption =
    currentCellStyleIndex !== undefined ? styleOptions[currentCellStyleIndex] : undefined;

  const handleSelect = (index: number) => {
    onNamedStyleSelect(index);
    setIsOpen(false);
  };

  const triggerButtonStyle = disabled ? triggerDisabledStyle : triggerStyle;
  const styleNameLabel = currentStyleOption?.name ?? "";

  function renderTriggerContent() {
    if (currentStyleOption) {
      return <StylePreview styles={styles} cellXf={currentStyleOption.cellStyleXf} size="sm" />;
    }
    return <span style={placeholderStyle}>Style</span>;
  }

  const trigger = (
    <div style={triggerButtonStyle}>
      {renderTriggerContent()}
      <span style={styleNameStyle}>{styleNameLabel}</span>
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
        <div style={headerStyle}>Cell Styles ({styles.cellStyles.length})</div>
        {styleOptions.map((opt) => (
          <div
            key={opt.index}
            style={getItemStyle(opt.index === currentCellStyleIndex)}
            onClick={() => handleSelect(opt.index)}
            onMouseEnter={(e) => {
              if (opt.index !== currentCellStyleIndex) {
                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = getItemHoverBg(opt.index === currentCellStyleIndex);
            }}
          >
            <StylePreview styles={styles} cellXf={opt.cellStyleXf} size="sm" />
            <span style={itemLabelStyle}>{opt.name}</span>
          </div>
        ))}
      </div>
    </Popover>
  );
}
