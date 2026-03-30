/**
 * @file RibbonMenu — orchestrates tab bar, group strip, and customize sheet.
 */

import { useState, useCallback, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { ToolbarButton } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { SettingsIcon, AddIcon } from "@aurochs-ui/ui-components/icons";
import { colorTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { RibbonTabDef, RibbonMenuItemDef } from "./types";
import { updateTab, updateGroup, reorder } from "./state";
import { PALETTE_MIME, ITEM_MOVE_MIME, GROUP_REORDER_MIME } from "./dnd";
import { RibbonTabBar } from "./RibbonTabBar";
import { RibbonGroup } from "./RibbonGroup";
import { CustomizeSheet } from "./CustomizeSheet";

// =============================================================================
// Props
// =============================================================================

export type RibbonMenuProps = {
  readonly initialTabs: readonly RibbonTabDef[];
  readonly paletteItems: readonly RibbonMenuItemDef[];
  readonly itemRegistry: Record<string, RibbonMenuItemDef>;
  readonly onExecute: (itemId: string) => void;
  readonly children?: ReactNode;
};

// =============================================================================
// Layout styles
// =============================================================================

const ribbonStyle: CSSProperties = {
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  flexShrink: 0,
  display: "grid",
  gridTemplateRows: "auto 48px",
};

const tabRowStyle: CSSProperties = { display: "flex", alignItems: "center" };

const rightCtrlStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: spacingTokens["2xs"],
  paddingRight: spacingTokens.sm,
};

const stripStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  gap: spacingTokens.sm,
  overflow: "hidden",
};

const addGroupBase: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 40,
  minHeight: 32,
  cursor: "pointer",
  borderRight: "none",
  position: "relative",
};

function resolveAddGroupStyle(dragging: boolean): CSSProperties {
  const opacity = dragging ? 0.8 : 0.5;
  if (dragging) {
    return {
      ...addGroupBase,
      opacity,
      outline: `1px dashed var(--border-primary, ${colorTokens.border.primary})`,
      borderRadius: radiusTokens.sm,
    };
  }
  return { ...addGroupBase, opacity };
}

const contentAreaStyle: CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
};

// =============================================================================
// Component
// =============================================================================

/** Ribbon menu with tabs, groups, DnD customization, and customize sheet. */
export function RibbonMenu({ initialTabs, paletteItems, itemRegistry, onExecute, children }: RibbonMenuProps) {
  const [tabs, setTabs] = useState<readonly RibbonTabDef[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState(initialTabs[0]?.id ?? "");
  const [customizing, setCustomizing] = useState(false);
  const [dropTargetGrp, setDropTargetGrp] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<{ groupId: string; index: number } | null>(null);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [grpDragFrom, setGrpDragFrom] = useState<number | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const toggleCustomize = useCallback(() => setCustomizing((v) => !v), []);
  const done = useCallback(() => setCustomizing(false), []);

  // --- Palette DnD ---
  const palDragStart = useCallback((id: string, e: DragEvent) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(PALETTE_MIME, id);
    setIsDraggingItem(true);
  }, []);
  const palDragEnd = useCallback(() => setIsDraggingItem(false), []);

  // --- Item DnD ---
  const itemDragStart = useCallback((gId: string, idx: number, e: DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(ITEM_MOVE_MIME, JSON.stringify({ groupId: gId, index: idx }));
    setDragItem({ groupId: gId, index: idx });
    setIsDraggingItem(true);
  }, []);

  const itemDragEnd = useCallback((gId: string, idx: number, e: DragEvent) => {
    setDragItem(null);
    setIsDraggingItem(false);
    if (e.dataTransfer.dropEffect === "none") {
      setTabs((p) => updateTab(p, activeTabId, (t) => updateGroup(t, gId, (g) => ({
        ...g, items: g.items.filter((_, i) => i !== idx),
      }))));
    }
  }, [activeTabId]);

  // --- Group item drop ---
  const grpDragOver = useCallback((gId: string, e: DragEvent) => {
    if (!e.dataTransfer.types.includes(PALETTE_MIME) && !e.dataTransfer.types.includes(ITEM_MOVE_MIME)) { return; }
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(PALETTE_MIME) ? "copy" : "move";
    setDropTargetGrp(gId);
  }, []);

  const grpDragLeave = useCallback(() => setDropTargetGrp(null), []);

  const grpDrop = useCallback((tgtGrp: string, e: DragEvent) => {
    e.preventDefault();
    const palId = e.dataTransfer.getData(PALETTE_MIME);
    if (palId) {
      const item = itemRegistry[palId];
      if (item) {
        setTabs((p) => updateTab(p, activeTabId, (t) => updateGroup(t, tgtGrp, (g) => ({ ...g, items: [...g.items, item] }))));
      }
      setDropTargetGrp(null);
      return;
    }
    const moveRaw = e.dataTransfer.getData(ITEM_MOVE_MIME);
    if (moveRaw) {
      const { groupId: srcGrp, index: srcIdx } = JSON.parse(moveRaw) as { groupId: string; index: number };
      setTabs((p) => {
        const tab = p.find((t) => t.id === activeTabId);
        if (!tab) { return p; }
        const src = tab.groups.find((g) => g.id === srcGrp);
        if (!src) { return p; }
        const moved = src.items[srcIdx];
        const removed = updateTab(p, activeTabId, (t) => updateGroup(t, srcGrp, (g) => ({ ...g, items: g.items.filter((_, i) => i !== srcIdx) })));
        return updateTab(removed, activeTabId, (t) => updateGroup(t, tgtGrp, (g) => ({ ...g, items: [...g.items, moved] })));
      });
      setDragItem(null);
    }
    setDropTargetGrp(null);
  }, [activeTabId, itemRegistry]);

  // --- Group reorder ---
  const grpReorderStart = useCallback((idx: number, e: DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(GROUP_REORDER_MIME, String(idx));
    setGrpDragFrom(idx);
  }, []);

  const grpReorderOver = useCallback((idx: number, e: DragEvent) => {
    if (!e.dataTransfer.types.includes(GROUP_REORDER_MIME)) { return; }
    e.preventDefault();
  }, []);

  const grpReorderDrop = useCallback((toIdx: number) => {
    if (grpDragFrom !== null && grpDragFrom !== toIdx) {
      setTabs((p) => updateTab(p, activeTabId, (t) => ({ ...t, groups: reorder(t.groups, grpDragFrom, toIdx) })));
    }
    setGrpDragFrom(null);
  }, [grpDragFrom, activeTabId]);

  const grpReorderEnd = useCallback(() => setGrpDragFrom(null), []);

  // --- Tab ops ---
  const addTab = useCallback(() => {
    const id = `tab-${Date.now()}`;
    setTabs((p) => [...p, { id, label: "New Tab", groups: [] }]);
    setActiveTabId(id);
  }, []);

  const removeTab = useCallback((id: string) => {
    setTabs((p) => {
      const next = p.filter((t) => t.id !== id);
      if (next.length === 0) { return p; }
      if (activeTabId === id) { setActiveTabId(next[0].id); }
      return next;
    });
  }, [activeTabId]);

  const renameTab = useCallback((id: string, v: string) => {
    setTabs((p) => updateTab(p, id, (t) => ({ ...t, label: v })));
  }, []);

  const reorderTab = useCallback((from: number, to: number) => {
    setTabs((p) => reorder(p, from, to));
  }, []);

  // --- Group ops ---
  const addGroup = useCallback(() => {
    const id = `grp-${Date.now()}`;
    setTabs((p) => updateTab(p, activeTabId, (t) => ({ ...t, groups: [...t.groups, { id, label: "New", items: [] }] })));
  }, [activeTabId]);

  const removeGroup = useCallback((id: string) => {
    setTabs((p) => updateTab(p, activeTabId, (t) => ({ ...t, groups: t.groups.filter((g) => g.id !== id) })));
  }, [activeTabId]);

  const renameGroup = useCallback((id: string, v: string) => {
    setTabs((p) => updateTab(p, activeTabId, (t) => updateGroup(t, id, (g) => ({ ...g, label: v }))));
  }, [activeTabId]);

  // --- Add-group drop (creates new group with dropped item) ---
  const addGroupDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes(PALETTE_MIME) || e.dataTransfer.types.includes(ITEM_MOVE_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes(PALETTE_MIME) ? "copy" : "move";
    }
  }, []);

  const addGroupDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const palId = e.dataTransfer.getData(PALETTE_MIME);
    if (palId) {
      const item = itemRegistry[palId];
      if (item) {
        const id = `grp-${Date.now()}`;
        setTabs((p) => updateTab(p, activeTabId, (t) => ({
          ...t, groups: [...t.groups, { id, label: item.label, items: [item] }],
        })));
      }
      return;
    }
    const moveRaw = e.dataTransfer.getData(ITEM_MOVE_MIME);
    if (moveRaw) {
      const { groupId: srcGrp, index: srcIdx } = JSON.parse(moveRaw) as { groupId: string; index: number };
      const tab = tabs.find((t) => t.id === activeTabId);
      const src = tab?.groups.find((g) => g.id === srcGrp);
      if (src) {
        const moved = src.items[srcIdx];
        const id = `grp-${Date.now()}`;
        setTabs((p) => {
          const removed = updateTab(p, activeTabId, (t) => updateGroup(t, srcGrp, (g) => ({ ...g, items: g.items.filter((_, i) => i !== srcIdx) })));
          return updateTab(removed, activeTabId, (t) => ({ ...t, groups: [...t.groups, { id, label: moved.label, items: [moved] }] }));
        });
      }
    }
  }, [activeTabId, itemRegistry, tabs]);

  // --- Restore ---
  const restore = useCallback(() => {
    setTabs(initialTabs);
    setActiveTabId(initialTabs[0]?.id ?? "");
  }, [initialTabs]);

  return (
    <>
      <div role="toolbar" aria-label="Ribbon" style={ribbonStyle}>
        <div style={tabRowStyle}>
          <RibbonTabBar
            tabs={tabs}
            activeTabId={activeTabId}
            customizing={customizing}
            isDraggingItem={isDraggingItem}
            onActivate={setActiveTabId}
            onAdd={addTab}
            onRemove={removeTab}
            onRename={renameTab}
            onReorder={reorderTab}
          />
          <div style={rightCtrlStyle}>
            <ToolbarButton icon={<SettingsIcon size={12} />} label="Customize toolbar" active={customizing} onClick={toggleCustomize} size="tiny" />
          </div>
        </div>
        <div style={stripStyle}>
          {activeTab?.groups.map((g, i) => (
            <RibbonGroup
              key={g.id}
              group={g}
              groupIndex={i}
              customizing={customizing}
              isDraggingItem={isDraggingItem}
              isDropTarget={dropTargetGrp === g.id}
              onExecute={onExecute}
              onRemove={removeGroup}
              onRename={renameGroup}
              onItemDragStart={itemDragStart}
              onItemDragEnd={itemDragEnd}
              onGroupDragOver={grpDragOver}
              onGroupDragLeave={grpDragLeave}
              onGroupDrop={grpDrop}
              onGroupReorderStart={grpReorderStart}
              onGroupReorderOver={grpReorderOver}
              onGroupReorderDrop={grpReorderDrop}
              onGroupReorderEnd={grpReorderEnd}
              dragItemState={dragItem}
            />
          ))}
          {customizing && (
            <div
              style={resolveAddGroupStyle(isDraggingItem)}
              onClick={addGroup}
              title="Add group"
              onDragOver={addGroupDragOver}
              onDrop={addGroupDrop}
            >
              <AddIcon size={14} />
            </div>
          )}
        </div>
      </div>

      <div style={contentAreaStyle}>
        {children}
        {customizing && (
          <CustomizeSheet
            paletteItems={paletteItems}
            onPaletteDragStart={palDragStart}
            onPaletteDragEnd={palDragEnd}
            onRestore={restore}
            onDone={done}
          />
        )}
      </div>
    </>
  );
}
