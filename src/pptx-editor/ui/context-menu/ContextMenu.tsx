/**
 * @file ContextMenu re-export
 */

import type { ContextMenuProps as OfficeContextMenuProps } from "../../../office-editor-components";
import { ContextMenu as OfficeContextMenu } from "../../../office-editor-components";

export type ContextMenuProps = OfficeContextMenuProps;
export const ContextMenu = OfficeContextMenu;
