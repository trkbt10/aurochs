/**
 * @file Style Section - Figma-style cell styles gallery
 *
 * Provides a grid-based gallery view of available named cell styles
 * with visual previews. Follows Figma's design patterns with:
 * - Card-based grid layout
 * - Hover interactions
 * - Visual preview with style name
 * - Current style highlight
 * - Add/delete style functionality
 *
 * Reference chain: cellStyles[n].xfId → cellStyleXfs[xfId]
 *
 * @see ECMA-376 Part 4, Section 18.8.8 (cellStyles)
 */

import { useMemo, useState, type CSSProperties } from "react";
import { Accordion, Button, Input } from "../../../../office-editor-components";
import { AddIcon, DeleteIcon } from "../../../../office-editor-components/icons";
import {
  colorTokens,
  spacingTokens,
  fontTokens,
  radiusTokens,
} from "../../../../office-editor-components/design-tokens";
import type { XlsxStyleSheet, XlsxCellXf, XlsxCellStyle } from "../../../../xlsx/domain/style/types";
import { xlsxColorToCss } from "../../../selectors/xlsx-color";

// =============================================================================
// Types
// =============================================================================

export type StyleSectionProps = {
  readonly styles: XlsxStyleSheet;
  /** Current cell's styleId (cellXfs index) - used to find matching named style */
  readonly currentStyleId: number | undefined;
  readonly disabled: boolean;
  /** Called with the cellStyles index when user selects a named style */
  readonly onStyleSelect: (cellStyleIndex: number) => void;
  /** Called with the new style name when user creates a style from current cell */
  readonly onStyleCreate?: (name: string) => void;
  /** Called with the cellStyles index when user deletes a style */
  readonly onStyleDelete?: (cellStyleIndex: number) => void;
};

type ResolvedStyle = {
  readonly index: number;
  readonly cellStyle: XlsxCellStyle;
  readonly cellStyleXf: XlsxCellXf;
};

// =============================================================================
// Styles
// =============================================================================

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  borderBottom: "1px solid var(--border-subtle)",
};

const createFormStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: spacingTokens.sm,
  borderBottom: "1px solid var(--border-subtle)",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

const cardBaseStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: spacingTokens.sm,
  borderRadius: radiusTokens.md,
  border: "1px solid var(--border-subtle)",
  backgroundColor: "var(--bg-tertiary)",
  cursor: "pointer",
  transition: "all 150ms ease",
  gap: spacingTokens.xs,
};

const cardHoverStyle: CSSProperties = {
  ...cardBaseStyle,
  backgroundColor: "var(--bg-hover)",
  borderColor: "var(--border-strong)",
};

const cardSelectedStyle: CSSProperties = {
  ...cardBaseStyle,
  backgroundColor: "rgba(68, 114, 196, 0.15)",
  borderColor: colorTokens.accent.primary,
};

const cardDisabledStyle: CSSProperties = {
  ...cardBaseStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const previewBoxStyle: CSSProperties = {
  width: 48,
  height: 32,
  borderRadius: radiusTokens.sm,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: fontTokens.size.md,
  border: "1px solid var(--border-subtle)",
  transition: "all 150ms ease",
};

const styleNameStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
};

const deleteButtonStyle: CSSProperties = {
  position: "absolute",
  top: 2,
  right: 2,
  width: 18,
  height: 18,
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: radiusTokens.sm,
  cursor: "pointer",
  opacity: 0.7,
  transition: "opacity 150ms ease",
};

const emptyMessageStyle: CSSProperties = {
  padding: spacingTokens.md,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Resolve cellStyles to their corresponding cellStyleXfs for rendering.
 * Follows the reference chain: cellStyles[n].xfId → cellStyleXfs[xfId]
 */
function resolveStyles(styles: XlsxStyleSheet): readonly ResolvedStyle[] {
  return styles.cellStyles.map((cellStyle, index) => {
    const xfId = cellStyle.xfId;
    const cellStyleXf = styles.cellStyleXfs[xfId];
    return { index, cellStyle, cellStyleXf };
  });
}

/**
 * Find the named style that matches the current cell's formatting.
 * Looks up: cellXfs[styleId].xfId → find cellStyle where cellStyle.xfId matches
 */
function findCurrentStyleIndex(
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
 * Resolve fill background color from cellStyleXf
 */
function resolveFillBackground(styles: XlsxStyleSheet, xf: XlsxCellXf): string {
  const fill = styles.fills[xf.fillId as number];
  if (!fill || fill.type === "none") {
    return "transparent";
  }
  if (fill.type === "pattern" && fill.pattern.patternType === "solid") {
    const fg = xlsxColorToCss(fill.pattern.fgColor, { indexedColors: styles.indexedColors });
    const bg = xlsxColorToCss(fill.pattern.bgColor, { indexedColors: styles.indexedColors });
    return fg ?? bg ?? "transparent";
  }
  return "transparent";
}

/**
 * Resolve font color from cellStyleXf
 */
function resolveFontColor(styles: XlsxStyleSheet, xf: XlsxCellXf): string | undefined {
  const font = styles.fonts[xf.fontId as number];
  if (!font?.color) {
    return undefined;
  }
  return xlsxColorToCss(font.color, { indexedColors: styles.indexedColors });
}

/**
 * Check if cellStyleXf has visible borders
 */
function hasBorder(styles: XlsxStyleSheet, xf: XlsxCellXf): boolean {
  const border = styles.borders[xf.borderId as number];
  if (!border) {
    return false;
  }
  return Boolean(border.left || border.right || border.top || border.bottom);
}

/**
 * Check if a style is built-in and should not be deleted
 */
function isBuiltinStyle(cellStyle: XlsxCellStyle): boolean {
  return cellStyle.builtinId !== undefined;
}

// =============================================================================
// StyleCard Component
// =============================================================================

type StyleCardProps = {
  readonly styles: XlsxStyleSheet;
  readonly resolvedStyle: ResolvedStyle;
  readonly isSelected: boolean;
  readonly disabled: boolean;
  readonly canDelete: boolean;
  readonly onClick: () => void;
  readonly onDelete?: () => void;
};

function StyleCard({
  styles,
  resolvedStyle,
  isSelected,
  disabled,
  canDelete,
  onClick,
  onDelete,
}: StyleCardProps) {
  const { cellStyle, cellStyleXf } = resolvedStyle;
  const font = styles.fonts[cellStyleXf.fontId as number];

  const backgroundColor = resolveFillBackground(styles, cellStyleXf);
  const fontColor = resolveFontColor(styles, cellStyleXf);
  const borderExists = hasBorder(styles, cellStyleXf);
  const hasUnderline = font?.underline && font.underline !== "none";

  const previewStyle: CSSProperties = {
    ...previewBoxStyle,
    backgroundColor,
    color: fontColor ?? "var(--text-primary)",
    fontWeight: font?.bold ? 700 : 400,
    fontStyle: font?.italic ? "italic" : "normal",
    textDecoration: hasUnderline ? "underline" : undefined,
    borderColor: borderExists ? "var(--border-strong)" : "var(--border-subtle)",
  };

  function getCardStyle(): CSSProperties {
    if (disabled) {
      return cardDisabledStyle;
    }
    if (isSelected) {
      return cardSelectedStyle;
    }
    return cardBaseStyle;
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled || isSelected) {
      return;
    }
    Object.assign(e.currentTarget.style, cardHoverStyle);
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled || isSelected) {
      return;
    }
    Object.assign(e.currentTarget.style, cardBaseStyle);
  }

  function handleClick() {
    if (disabled) {
      return;
    }
    onClick();
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  }

  return (
    <div
      style={getCardStyle()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={cellStyle.name}
    >
      {canDelete && onDelete && (
        <button
          type="button"
          style={deleteButtonStyle}
          onClick={handleDeleteClick}
          title="Delete style"
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.7";
          }}
        >
          <DeleteIcon size={12} />
        </button>
      )}
      <div style={previewStyle}>Aa</div>
      <div style={styleNameStyle}>{cellStyle.name}</div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Figma-style cell styles gallery section for the format panel.
 */
export function StyleSection({
  styles,
  currentStyleId,
  disabled,
  onStyleSelect,
  onStyleCreate,
  onStyleDelete,
}: StyleSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newStyleName, setNewStyleName] = useState("");

  const resolvedStyles = useMemo(() => resolveStyles(styles), [styles]);

  const currentIndex = useMemo(
    () => findCurrentStyleIndex(styles, currentStyleId),
    [styles, currentStyleId]
  );

  function handleCreateSubmit() {
    const trimmed = newStyleName.trim();
    if (trimmed.length === 0) {
      return;
    }
    if (onStyleCreate) {
      onStyleCreate(trimmed);
    }
    setNewStyleName("");
    setIsCreating(false);
  }

  function handleCreateCancel() {
    setNewStyleName("");
    setIsCreating(false);
  }

  function renderCreateForm() {
    if (!isCreating) {
      return null;
    }
    return (
      <div style={createFormStyle}>
        <Input
          value={newStyleName}
          placeholder="Style name"
          onChange={(v) => setNewStyleName(String(v))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateSubmit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleCreateCancel();
            }
          }}
          style={{ flex: 1 }}
        />
        <Button size="sm" onClick={handleCreateSubmit} disabled={newStyleName.trim().length === 0}>
          Add
        </Button>
        <Button size="sm" onClick={handleCreateCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  function renderHeader() {
    if (!onStyleCreate) {
      return null;
    }
    return (
      <div style={headerStyle}>
        <span style={{ fontSize: fontTokens.size.sm, color: colorTokens.text.secondary }}>
          {resolvedStyles.length} style{resolvedStyles.length !== 1 ? "s" : ""}
        </span>
        <Button
          size="sm"
          onClick={() => setIsCreating(true)}
          disabled={disabled || isCreating}
          title="Create style from current cell"
        >
          <AddIcon size={14} />
        </Button>
      </div>
    );
  }

  if (resolvedStyles.length === 0 && !onStyleCreate) {
    return (
      <Accordion title="Cell Styles" defaultExpanded>
        <div style={emptyMessageStyle}>No styles available</div>
      </Accordion>
    );
  }

  function renderContent() {
    if (resolvedStyles.length === 0) {
      return <div style={emptyMessageStyle}>No styles available. Create one from the current cell.</div>;
    }
    return (
      <div style={gridStyle}>
        {resolvedStyles.map((resolved) => (
          <StyleCard
            key={resolved.index}
            styles={styles}
            resolvedStyle={resolved}
            isSelected={resolved.index === currentIndex}
            disabled={disabled}
            canDelete={!isBuiltinStyle(resolved.cellStyle) && Boolean(onStyleDelete)}
            onClick={() => onStyleSelect(resolved.index)}
            onDelete={onStyleDelete ? () => onStyleDelete(resolved.index) : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <Accordion title="Cell Styles" defaultExpanded>
      {renderHeader()}
      {renderCreateForm()}
      {renderContent()}
    </Accordion>
  );
}
