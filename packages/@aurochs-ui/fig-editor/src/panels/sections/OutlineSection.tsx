/** @file Outline conversion controls. */

import type { CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";

type OutlineSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

const buttonStyle: CSSProperties = {
  width: "100%",
  border: `1px solid ${colorTokens.border.primary}`,
  background: colorTokens.background.secondary,
  color: colorTokens.text.primary,
  borderRadius: 4,
  padding: "6px 8px",
  cursor: "pointer",
  fontSize: fontTokens.size.sm,
};

const noteStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
  lineHeight: 1.4,
};

function supportsOutline(node: FigDesignNode): boolean {
  return node.type === "RECTANGLE"
    || node.type === "ROUNDED_RECTANGLE"
    || node.type === "ELLIPSE"
    || node.type === "LINE"
    || node.type === "REGULAR_POLYGON"
    || node.type === "STAR"
    || node.type === "VECTOR"
    || node.type === "TEXT";
}

/** Convert shape/text nodes to explicit VECTOR paths when source geometry is available. */
export function OutlineSection({ node, dispatch }: OutlineSectionProps) {
  const enabled = supportsOutline(node);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        style={{ ...buttonStyle, opacity: enabled ? 1 : 0.5, cursor: enabled ? "pointer" : "default" }}
        disabled={!enabled}
        onClick={() => dispatch({ type: "OUTLINE_SELECTION" })}
      >
        Outline selection
      </button>
      {node.type === "TEXT" && (
        <div style={noteStyle}>
          Text outlines require glyph path data in the fig document.
        </div>
      )}
    </div>
  );
}
