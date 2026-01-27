/**
 * @file Constants for text style resolution
 *
 * @see ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles)
 */

import type { MasterTextStyles } from "../../context";

/**
 * Mapping from placeholder type to master text style key.
 *
 * Per ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles):
 * - titleStyle: Applied to title placeholders (title, ctrTitle)
 * - bodyStyle: Applied to content placeholders (body, subTitle, obj, chart, tbl, clipArt, dgm, media, pic, sldImg)
 * - otherStyle: Applied to metadata placeholders (dt, ftr, sldNum, hdr)
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph) - Placeholder element
 * @see ECMA-376 Part 1, Section 19.7.10 (ST_PlaceholderType) - All 16 placeholder types
 * @see https://c-rex.net/samples/ooxml/e1/Part4/OOXML_P4_DOCX_ST_PlaceholderType_topic_ID0EENHIB.html
 */
export const TYPE_TO_MASTER_STYLE: Record<string, keyof MasterTextStyles> = {
  // Title placeholders → titleStyle
  ctrTitle: "titleStyle",
  title: "titleStyle",

  // Content placeholders → bodyStyle
  subTitle: "bodyStyle",
  body: "bodyStyle",
  obj: "bodyStyle",
  chart: "bodyStyle",
  tbl: "bodyStyle",
  clipArt: "bodyStyle",
  dgm: "bodyStyle",
  media: "bodyStyle",
  pic: "bodyStyle",
  sldImg: "bodyStyle", // Slide image (for Notes)

  // Metadata placeholders → otherStyle
  dt: "otherStyle",
  ftr: "otherStyle",
  sldNum: "otherStyle",
  hdr: "otherStyle",
};
