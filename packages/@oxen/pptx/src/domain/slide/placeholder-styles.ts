/**
 * @file Placeholder type to master style mappings
 *
 * Centralizes the mapping from placeholder types (title, body, etc.)
 * to their corresponding master text styles.
 */

/**
 * Master text style names in PresentationML
 */
export type MasterTextStyleName = "p:titleStyle" | "p:bodyStyle" | "p:otherStyle";

/**
 * Map placeholder type to master text style key
 *
 * Per ECMA-376 Part 1, Section 19.3.1.49 (txStyles):
 * - p:titleStyle: Title and centered title placeholders
 * - p:bodyStyle: Body and subtitle placeholders
 * - p:otherStyle: All other shapes (obj, sldNum, dt, ftr, shapes)
 */
export const PLACEHOLDER_TO_TEXT_STYLE: Record<string, MasterTextStyleName> = {
  ctrTitle: "p:titleStyle",
  title: "p:titleStyle",
  subTitle: "p:bodyStyle",
  body: "p:bodyStyle",
  textBox: "p:bodyStyle",
  // Per ECMA-376: obj, dt, ftr, sldNum use p:otherStyle
  obj: "p:otherStyle",
  dt: "p:otherStyle",
  ftr: "p:otherStyle",
  sldNum: "p:otherStyle",
};

/**
 * Title placeholder types (use p:titleStyle)
 */
export const TITLE_TYPES: readonly string[] = ["title", "subTitle", "ctrTitle"];

/**
 * Check if a placeholder type uses title style
 */
export function isTitleType(type: string): boolean {
  return TITLE_TYPES.includes(type);
}

/**
 * Get master text style name for a placeholder type
 * Per ECMA-376: unknown types default to p:otherStyle
 */
export function getTextStyleName(type: string): MasterTextStyleName {
  return PLACEHOLDER_TO_TEXT_STYLE[type] ?? "p:otherStyle";
}
