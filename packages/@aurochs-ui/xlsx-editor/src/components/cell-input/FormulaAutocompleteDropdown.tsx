/**
 * @file FormulaAutocompleteDropdown
 *
 * Renders a list of formula function candidates for autocomplete.
 * Positioned absolutely below the input element.
 */

import { type CSSProperties } from "react";
import type { FormulaFunctionDefinition } from "@aurochs-office/xlsx/formula/functionRegistry";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components";

export type FormulaAutocompleteDropdownProps = {
  readonly candidates: readonly FormulaFunctionDefinition[];
  readonly highlightedIndex: number;
  readonly onSelect: (index: number) => void;
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  zIndex: 1000,
  minWidth: 200,
  maxWidth: 360,
  maxHeight: 200,
  overflowY: "auto",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderRadius: 4,
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  marginTop: 2,
};

const itemBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: fontTokens.size.sm,
};

const nameStyle: CSSProperties = {
  fontWeight: 600,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  flexShrink: 0,
};

const descStyle: CSSProperties = {
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export function FormulaAutocompleteDropdown({
  candidates,
  highlightedIndex,
  onSelect,
}: FormulaAutocompleteDropdownProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <div style={dropdownStyle} data-testid="formula-autocomplete-dropdown">
      {candidates.map((fn, index) => {
        const isHighlighted = index === highlightedIndex;
        const desc = fn.description?.ja ?? fn.description?.en ?? "";
        return (
          <div
            key={fn.name}
            style={{
              ...itemBaseStyle,
              backgroundColor: isHighlighted
                ? `var(--bg-hover, ${colorTokens.background.tertiary})`
                : "transparent",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              onSelect(index);
            }}
            data-testid={`formula-autocomplete-item-${fn.name}`}
          >
            <span style={nameStyle}>{fn.name}</span>
            {desc && <span style={descStyle}>{desc}</span>}
          </div>
        );
      })}
    </div>
  );
}
