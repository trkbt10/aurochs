/**
 * @file Pure state update functions for ribbon tab/group structures.
 */

import type { RibbonTabDef, RibbonGroupDef } from "./types";

/** Update a single tab by id. */
export function updateTab(
  tabs: readonly RibbonTabDef[],
  tabId: string,
  fn: (t: RibbonTabDef) => RibbonTabDef,
): readonly RibbonTabDef[] {
  return tabs.map((t) => (t.id === tabId ? fn(t) : t));
}

/** Update a single group within a tab by id. */
export function updateGroup(
  tab: RibbonTabDef,
  groupId: string,
  fn: (g: RibbonGroupDef) => RibbonGroupDef,
): RibbonTabDef {
  return { ...tab, groups: tab.groups.map((g) => (g.id === groupId ? fn(g) : g)) };
}

/** Reorder an array by moving an element from one index to another. */
export function reorder<T>(arr: readonly T[], from: number, to: number): readonly T[] {
  const result = [...arr];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}
