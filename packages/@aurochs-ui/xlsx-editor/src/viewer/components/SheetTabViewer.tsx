/**
 * @file SheetTabViewer
 *
 * Thin wrapper around SheetTabBar from @aurochs-ui/xlsx-sheet.
 * Maintains backward compatibility for viewer consumers.
 */

import { SheetTabBar, type SheetTabBarProps } from "@aurochs-ui/xlsx-sheet/core";

/**
 * Read-only sheet tab bar for viewing workbooks.
 *
 * Delegates to SheetTabBar from @aurochs-ui/xlsx-sheet.
 */
export function SheetTabViewer(props: SheetTabBarProps) {
  return <SheetTabBar {...props} />;
}
