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
import type { LayerPlacement, LayerPlacements } from "../../layout/layer-placements";

function resolveInspectorPlacement(
  showInspector: boolean,
  placements: Partial<LayerPlacements> | undefined,
  defaultPlacement: LayerPlacement,
): LayerPlacement {
  if (!showInspector) {
    return { type: "hidden" };
  }
  return placements?.inspector ?? defaultPlacement;
}

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

/**
 * Optional tab label overrides.
 */
export type TabLabelOverrides = {
  readonly properties?: string;
  readonly slide?: string;
  readonly resources?: string;
};

export type UseEditorLayersParams = {
  readonly thumbnailComponent: ReactNode;
  readonly canvasComponent: ReactNode;
  readonly tabContents: TabContents;
  readonly tabLabelOverrides?: TabLabelOverrides;
  readonly showInspector: boolean;
  readonly activeTab: string;
  readonly onTabChange: (tabId: string) => void;
  readonly inspectorPanelStyle: CSSProperties;
  readonly placements?: Partial<LayerPlacements>;
};

export type UseEditorLayersResult = {
  readonly layers: LayerDefinition[];
};

function buildPivotItems(tabContents: TabContents, labelOverrides?: TabLabelOverrides): PivotBehavior["items"] {
  return RIGHT_PANEL_TABS.map((tab) => ({
    id: tab.id,
    label: labelOverrides?.[tab.id] ?? tab.label,
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
  tabLabelOverrides,
  showInspector,
  activeTab,
  onTabChange,
  inspectorPanelStyle,
  placements,
}: UseEditorLayersParams): UseEditorLayersResult {
  const pivotItems = useMemo(() => buildPivotItems(tabContents, tabLabelOverrides), [tabContents, tabLabelOverrides]);

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
    const canvasLayer: LayerDefinition = {
      id: "canvas",
      gridArea: "canvas",
      component: canvasComponent,
    };

    const defaultThumbnailPlacement: LayerPlacement = { type: "grid", gridArea: "thumbnails", scrollable: true };
    const thumbnailPlacement = placements?.thumbnails ?? defaultThumbnailPlacement;

    const layers: LayerDefinition[] = [];

    if (thumbnailPlacement.type !== "hidden") {
      layers.push({
        id: "thumbnails",
        component: thumbnailComponent,
        gridArea: thumbnailPlacement.type === "grid" ? thumbnailPlacement.gridArea : undefined,
        drawer: thumbnailPlacement.type === "drawer" ? thumbnailPlacement.drawer : undefined,
        width: thumbnailPlacement.type === "drawer" ? thumbnailPlacement.width : undefined,
        height: thumbnailPlacement.type === "drawer" ? thumbnailPlacement.height : undefined,
        position: thumbnailPlacement.type === "drawer" ? thumbnailPlacement.position : undefined,
        zIndex: thumbnailPlacement.type === "drawer" ? thumbnailPlacement.zIndex : undefined,
        scrollable: thumbnailPlacement.scrollable,
      });
    }

    layers.push(canvasLayer);

    const defaultInspectorPlacement: LayerPlacement = { type: "grid", gridArea: "inspector" };
    const inspectorPlacement = resolveInspectorPlacement(showInspector, placements, defaultInspectorPlacement);

    if (inspectorPlacement.type !== "hidden") {
      layers.push({
        id: "inspector",
        component: inspectorComponent,
        gridArea: inspectorPlacement.type === "grid" ? inspectorPlacement.gridArea : undefined,
        drawer: inspectorPlacement.type === "drawer" ? inspectorPlacement.drawer : undefined,
        width: inspectorPlacement.type === "drawer" ? inspectorPlacement.width : undefined,
        height: inspectorPlacement.type === "drawer" ? inspectorPlacement.height : undefined,
        position: inspectorPlacement.type === "drawer" ? inspectorPlacement.position : undefined,
        zIndex: inspectorPlacement.type === "drawer" ? inspectorPlacement.zIndex : undefined,
        scrollable: inspectorPlacement.scrollable,
      });
    }

    return layers;
  }, [placements, showInspector, thumbnailComponent, canvasComponent, inspectorComponent]);

  return { layers };
}
