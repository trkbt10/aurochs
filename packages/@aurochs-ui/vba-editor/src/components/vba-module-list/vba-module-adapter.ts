/**
 * @file VBA Module Adapter
 *
 * Adapter for converting VbaModule to GroupedListItem and back.
 * Follows FormattingAdapter pattern from editor-controls.
 */

import type { ReactNode } from "react";
import type { VbaModule, VbaModuleType } from "@aurochs-office/vba";
import type {
  GroupedListItemData,
  GroupedListGroupData,
  GroupedListGroupId,
} from "@aurochs-ui/ui-components";

// =============================================================================
// Meta type for VBA items
// =============================================================================

/**
 * VBA-specific metadata attached to GroupedListItem.
 */
export type VbaModuleMeta = {
  readonly moduleType: VbaModuleType;
  readonly streamOffset: number;
};

// =============================================================================
// Group Configuration
// =============================================================================

/**
 * Group ID mapping for VBA module types.
 */
export const VBA_GROUP_IDS: Record<VbaModuleType, GroupedListGroupId> = {
  document: "document",
  form: "form",
  standard: "standard",
  class: "class",
};

/**
 * Group definitions for VBA modules.
 */
export const VBA_GROUPS: readonly GroupedListGroupData[] = [
  { id: "document", label: "Document", order: 0, canCreate: false },
  { id: "form", label: "UserForms", order: 1, canCreate: true },
  { id: "standard", label: "Modules", order: 2, canCreate: true },
  { id: "class", label: "Class Modules", order: 3, canCreate: true },
];

/**
 * Map GroupedListGroupId back to VbaModuleType.
 */
export function groupIdToModuleType(
  groupId: GroupedListGroupId
): VbaModuleType | undefined {
  const entry = Object.entries(VBA_GROUP_IDS).find(([, gid]) => gid === groupId);
  return entry?.[0] as VbaModuleType | undefined;
}

// =============================================================================
// Module Icon
// =============================================================================

/**
 * Icon map for module types.
 */
const MODULE_ICON_MAP: Record<VbaModuleType, string> = {
  standard: "[M]",
  class: "[C]",
  form: "[F]",
  document: "[D]",
};

/**
 * Get icon element for module type.
 */
export function getModuleIcon(type: VbaModuleType): ReactNode {
  return MODULE_ICON_MAP[type];
}

// =============================================================================
// Adapter Functions
// =============================================================================

/**
 * Convert VbaModule to GroupedListItemData.
 */
export function vbaModuleToListItem(
  module: VbaModule
): GroupedListItemData<VbaModuleMeta> {
  return {
    id: module.name, // Module name is unique within a VBA project
    label: module.name,
    groupId: VBA_GROUP_IDS[module.type],
    icon: getModuleIcon(module.type),
    canRename: module.type !== "document", // Document modules cannot be renamed
    canDelete: module.type !== "document", // Document modules cannot be deleted
    meta: {
      moduleType: module.type,
      streamOffset: module.streamOffset,
    },
  };
}

/**
 * Convert multiple VbaModules to GroupedListItemData.
 */
export function vbaModulesToListItems(
  modules: readonly VbaModule[]
): readonly GroupedListItemData<VbaModuleMeta>[] {
  return modules.map(vbaModuleToListItem);
}
