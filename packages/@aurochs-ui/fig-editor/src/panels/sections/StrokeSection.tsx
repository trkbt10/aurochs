/**
 * @file Stroke property section
 *
 * Uses shared UI components for input and layout.
 */

import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

type StrokeSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Stroke property editor section.
 */
export function StrokeSection({ node, dispatch }: StrokeSectionProps) {
  const strokeWeight = typeof node.strokeWeight === "number" ? node.strokeWeight : 0;
  const hasStrokes = node.strokes.length > 0 || strokeWeight > 0;

  if (!hasStrokes) {
    return (
      <div style={{ fontSize: fontTokens.size.md, color: colorTokens.text.tertiary }}>
        No strokes
      </div>
    );
  }

  return (
    <FieldGroup label="Weight" inline labelWidth={50}>
      <Input
        type="number"
        value={strokeWeight}
        min={0}
        step={0.5}
        onChange={(v) => {
          dispatch({
            type: "UPDATE_NODE",
            nodeId: node.id,
            updater: (n) => ({ ...n, strokeWeight: v as number }),
          });
        }}
        width={80}
      />
    </FieldGroup>
  );
}
