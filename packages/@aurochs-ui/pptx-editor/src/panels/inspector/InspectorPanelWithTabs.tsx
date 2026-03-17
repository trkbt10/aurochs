/**
 * @file InspectorPanelWithTabs - pptx-editor adapter
 *
 * Bridges PivotBehavior (react-panel-layout) to the shared
 * InspectorPanelWithTabs from editor-controls/ui.
 */

import type { ReactNode, CSSProperties } from "react";
import type { PivotBehavior } from "react-panel-layout/pivot";
import {
  InspectorPanelWithTabs as SharedInspectorPanelWithTabs,
  type InspectorTab,
} from "@aurochs-ui/editor-controls/ui";

export type InspectorPanelWithTabsProps = {
  readonly pivot: PivotBehavior;
  readonly style?: CSSProperties;
};

/**
 * Adapter: converts PivotBehavior to shared InspectorPanelWithTabs props.
 */
export function InspectorPanelWithTabs({ pivot, style }: InspectorPanelWithTabsProps): ReactNode {
  const tabs: InspectorTab[] = pivot.items.map((item) => ({
    id: item.id,
    label: item.label,
    content: item.content,
    disabled: item.disabled,
  }));

  return (
    <SharedInspectorPanelWithTabs
      tabs={tabs}
      activeTabId={pivot.activeId ?? pivot.items[0]?.id ?? ""}
      onActiveTabChange={(id) => pivot.onActiveChange?.(id)}
      style={style}
    />
  );
}
