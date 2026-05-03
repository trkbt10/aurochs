/** @file Section-specific property controls. */

import type { FigDesignNode } from "@aurochs/fig/domain";
import { Toggle } from "@aurochs-ui/ui-components/primitives/Toggle";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../property-mutation-target";

type SectionBehaviorSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

/** Edit SECTION node behavior fields that are modeled directly by fig Kiwi. */
export function SectionBehaviorSection({ node, target, dispatch }: SectionBehaviorSectionProps) {
  return (
    <Toggle
      checked={Boolean(node.sectionContentsHidden)}
      label="Hide section contents"
      ariaLabel="Hide section contents"
      onChange={(checked) => {
        dispatch(createPropertyTargetUpdateAction({
          target,
          updater: (current) => ({ ...current, sectionContentsHidden: checked }),
        }));
      }}
    />
  );
}
