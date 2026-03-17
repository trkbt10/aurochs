/**
 * @file Item number badge component
 *
 * Displays the item number outside the thumbnail.
 */

import type { ItemNumberBadgeProps } from "./types";
import { getNumberBadgeStyle } from "./styles";

/** Number badge displayed alongside item thumbnails */
export function ItemNumberBadge({ number, orientation }: ItemNumberBadgeProps) {
  return <span style={getNumberBadgeStyle(orientation)}>{number}</span>;
}
