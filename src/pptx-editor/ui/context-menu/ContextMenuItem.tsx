/**
 * @file ContextMenuItem re-export
 */

import type { ContextMenuItemProps as OfficeContextMenuItemProps } from "../../../office-editor-components";
import { ContextMenuItem as OfficeContextMenuItem } from "../../../office-editor-components";

export type ContextMenuItemProps = OfficeContextMenuItemProps;
export const ContextMenuItem = OfficeContextMenuItem;
