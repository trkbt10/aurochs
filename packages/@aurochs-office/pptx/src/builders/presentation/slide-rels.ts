/**
 * @file Slide-part relationship builders
 *
 * Builders for `ppt/slides/_rels/slide{N}.xml.rels` — the per-slide
 * relationship part wiring the slide to its layout.
 */

import { serializeRelationships, type OpcRelationship } from "@aurochs-office/opc";
import type { XmlDocument } from "@aurochs/xml";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";

/**
 * Options for {@link buildSlideRels} — either reference a layout by
 * canonical 1-based index or supply an explicit target path.
 */
export type BuildSlideRelsOptions =
  | { readonly layoutIndex: number }
  | { readonly layoutTarget: string };

/**
 * Build a slide's relationship document.
 *
 * - `buildSlideRels()` (no args)         — defaults to slideLayout1.
 * - `buildSlideRels(N)`                  — references slideLayout{N}.xml.
 * - `buildSlideRels({ layoutIndex: N })` — same, explicit form.
 * - `buildSlideRels({ layoutTarget })`   — exact target path. When the
 *   path begins with `ppt/`, the leading segment is stripped to make
 *   the reference relative to `ppt/slides/_rels/`.
 */
export function buildSlideRels(arg?: number | BuildSlideRelsOptions): XmlDocument {
  const target = resolveSlideLayoutTarget(arg);
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.SLIDE_LAYOUT, target },
  ];
  return { children: [serializeRelationships(rels)] };
}

function resolveSlideLayoutTarget(arg?: number | BuildSlideRelsOptions): string {
  if (arg === undefined) {
    return "../slideLayouts/slideLayout1.xml";
  }
  if (typeof arg === "number") {
    if (!Number.isInteger(arg) || arg < 1) {
      throw new Error(`buildSlideRels: layoutIndex must be a positive integer, got ${arg}`);
    }
    return `../slideLayouts/slideLayout${arg}.xml`;
  }
  if ("layoutIndex" in arg) {
    if (!Number.isInteger(arg.layoutIndex) || arg.layoutIndex < 1) {
      throw new Error(`buildSlideRels: layoutIndex must be a positive integer, got ${arg.layoutIndex}`);
    }
    return `../slideLayouts/slideLayout${arg.layoutIndex}.xml`;
  }
  return arg.layoutTarget.startsWith("ppt/") ? `../${arg.layoutTarget.slice(4)}` : arg.layoutTarget;
}
