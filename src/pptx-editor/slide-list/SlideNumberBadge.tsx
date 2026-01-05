/**
 * @file Slide number badge component
 *
 * Displays slide number positioned outside the slide thumbnail.
 */

import type { SlideNumberBadgeProps } from "./types";
import { getNumberBadgeStyle } from "./styles";

/**
 * Slide number badge positioned outside the thumbnail
 */
export function SlideNumberBadge({
  number,
  orientation,
}: SlideNumberBadgeProps) {
  return <span style={getNumberBadgeStyle(orientation)}>{number}</span>;
}
