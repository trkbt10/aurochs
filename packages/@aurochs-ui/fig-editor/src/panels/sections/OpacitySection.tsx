/**
 * @file Opacity property section
 */

import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";

type OpacitySectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

export function OpacitySection({ node, dispatch }: OpacitySectionProps) {
  const opacityPercent = Math.round(node.opacity * 100);

  return (
    <FieldRow>
      <FieldGroup label="Opacity" inline labelWidth={50}>
        <Input
          type="number"
          value={opacityPercent}
          min={0}
          max={100}
          step={1}
          suffix="%"
          onChange={(v) => {
            dispatch({
              type: "UPDATE_NODE",
              nodeId: node.id,
              updater: (n) => ({ ...n, opacity: Math.max(0, Math.min(1, (v as number) / 100)) }),
            });
          }}
          width={80}
        />
      </FieldGroup>
    </FieldRow>
  );
}
