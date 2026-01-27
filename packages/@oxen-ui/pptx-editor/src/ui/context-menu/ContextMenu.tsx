/**
 * @file ContextMenu re-export
 */

import type { ContextMenuProps as OfficeContextMenuProps } from "@oxen-ui/ui-components";
import { ContextMenu as OfficeContextMenu } from "@oxen-ui/ui-components";

export type ContextMenuProps = OfficeContextMenuProps;
export const ContextMenu = OfficeContextMenu;
