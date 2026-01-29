/**
 * @file Chart percentage parsing helpers
 */

import type { Percent } from "@oxen-office/ooxml/domain/units";
import { pct } from "@oxen-office/ooxml/domain/units";
import { getAttr, type XmlElement } from "@oxen/xml";






/**
 * Parse percentage string for chart attributes.
 */
export function parseChartPercent(value: string | undefined): Percent | undefined {
  if (!value) {return undefined;}
  const trimmed = value.trim();
  if (!trimmed) {return undefined;}
  const numeric = trimmed.endsWith("%") ? trimmed.slice(0, -1) : trimmed;
  if (!numeric) {return undefined;}
  const num = Number.parseFloat(numeric);
  if (Number.isNaN(num)) {return undefined;}
  return pct(num);
}






/**
 * Get a chart percentage attribute from element.
 */
export function getChartPercentAttr(element: XmlElement | undefined, name: string): Percent | undefined {
  if (!element) {return undefined;}
  return parseChartPercent(getAttr(element, name));
}
