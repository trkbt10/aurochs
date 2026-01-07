/**
 * @file Editor layers hook
 *
 * Builds GridLayout layer definitions from memoized panel components.
 */

import { useMemo, type ReactNode, type CSSProperties } from "react";
import type { LayerDefinition } from "react-panel-layout";
import type { PivotBehavior } from "react-panel-layout/pivot";
import { RIGHT_PANEL_TABS } from "../../layout";
import { InspectorPanelWithTabs } from "../../panels/inspector";

/**
 * Tab contents grouped into 3 categories.
 */
export type TabContents = {
  /** プロパティタブ: 選択要素 + レイヤー */
  readonly properties: ReactNode;
  /** スライドタブ: スライド情報 + レイアウト */
  readonly slide: ReactNode;
  /** リソースタブ: アセット + テーマ */
  readonly resources: ReactNode;
};

export type UseEditorLayersParams = {
  readonly thumbnailComponent: ReactNode;
  readonly canvasComponent: ReactNode;
  readonly tabContents: TabContents;
  readonly showInspector: boolean;
  readonly activeTab: string;
  readonly onTabChange: (tabId: string) => void;
  readonly inspectorPanelStyle: CSSProperties;
};

export type UseEditorLayersResult = {
  readonly layers: LayerDefinition[];
};

function buildPivotItems(tabContents: TabContents): PivotBehavior["items"] {
  return RIGHT_PANEL_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    content: tabContents[tab.id] ?? null,
    cache: true,
  }));
}

/**
 * Hook for building GridLayout layer definitions.
 */
export function useEditorLayers({
  thumbnailComponent,
  canvasComponent,
  tabContents,
  showInspector,
  activeTab,
  onTabChange,
  inspectorPanelStyle,
}: UseEditorLayersParams): UseEditorLayersResult {
  const pivotItems = useMemo(() => buildPivotItems(tabContents), [tabContents]);

  const pivotConfig = useMemo<PivotBehavior | undefined>(() => {
    if (!showInspector) {
      return undefined;
    }
    return {
      items: pivotItems,
      activeId: activeTab,
      onActiveChange: onTabChange,
    };
  }, [showInspector, pivotItems, activeTab, onTabChange]);

  const inspectorComponent = useMemo(() => {
    if (!pivotConfig) {
      return <div style={inspectorPanelStyle} />;
    }
    return <InspectorPanelWithTabs pivot={pivotConfig} style={inspectorPanelStyle} />;
  }, [pivotConfig, inspectorPanelStyle]);

  const layers = useMemo<LayerDefinition[]>(() => {
    const thumbnailLayer: LayerDefinition = {
      id: "thumbnails",
      gridArea: "thumbnails",
      component: thumbnailComponent,
      scrollable: true,
    };

    const canvasLayer: LayerDefinition = {
      id: "canvas",
      gridArea: "canvas",
      component: canvasComponent,
    };

    const inspectorLayer: LayerDefinition = {
      id: "inspector",
      gridArea: "inspector",
      component: inspectorComponent,
    };

    return [thumbnailLayer, canvasLayer, inspectorLayer];
  }, [thumbnailComponent, canvasComponent, inspectorComponent]);

  return { layers };
}
