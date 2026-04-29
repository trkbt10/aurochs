/**
 * @file [Content_Types].xml builder
 *
 * Authoritative builder for the OPC content-type manifest of a PPTX
 * package.
 *
 * @see ECMA-376 Part 2, §10.1.2 (Content Types Stream)
 */

import {
  serializeContentTypes,
  STANDARD_CONTENT_TYPE_DEFAULTS,
  type ContentTypeEntry,
} from "@aurochs-office/opc";
import type { XmlDocument } from "@aurochs/xml";
import { CONTENT_TYPES } from "../../domain/content-types";

/**
 * Configuration for {@link buildContentTypes}.
 *
 * Each numeric "count" field describes how many of that part-kind
 * exist; the corresponding `Override` entries are emitted with the
 * conventional zero-padded part names (e.g. `slide1.xml`, `slide2.xml`).
 *
 * Fields default to 0 / false so callers only set what their package
 * actually carries.
 */
export type BuildContentTypesOptions = {
  /** Number of slides referenced by the deck. Required (>=1). */
  readonly slideCount: number;
  /** Number of slide layouts authored. Required (>=1). */
  readonly layoutCount: number;
  /** When true, register an Override for /ppt/notesMasters/notesMaster1.xml. */
  readonly hasNotesMaster?: boolean;
  /**
   * Number of notes slides (`notesSlide{N}.xml`) referenced. Defaults to 0.
   * When this is greater than 0, the notes-master Override is also
   * implied — pass `hasNotesMaster: true` explicitly to opt in.
   */
  readonly notesSlideCount?: number;
  /** When true, register Overrides for the handout master. */
  readonly hasHandoutMaster?: boolean;
  /** When true, register Override for /ppt/presProps.xml. */
  readonly hasPresProps?: boolean;
  /** When true, register Override for /ppt/viewProps.xml. */
  readonly hasViewProps?: boolean;
  /** When true, register Override for /ppt/tableStyles.xml. */
  readonly hasTableStyles?: boolean;
  /** When true, register Override for /docProps/app.xml. Defaults to true. */
  readonly hasExtendedProperties?: boolean;
  /** When true, register Override for /docProps/core.xml. */
  readonly hasCoreProperties?: boolean;
  /** Optional default extension entries (e.g. "png" → image/png). */
  readonly extensionDefaults?: readonly { readonly extension: string; readonly contentType: string }[];
};

/**
 * Build [Content_Types].xml from a typed configuration.
 */
export function buildContentTypes(options: BuildContentTypesOptions): XmlDocument {
  validatePositiveInt("slideCount", options.slideCount);
  validatePositiveInt("layoutCount", options.layoutCount);

  const entries: ContentTypeEntry[] = [
    ...STANDARD_CONTENT_TYPE_DEFAULTS,
    ...(options.extensionDefaults ?? []).map((d): ContentTypeEntry => ({
      kind: "default",
      extension: d.extension,
      contentType: d.contentType,
    })),
    { kind: "override", partName: "/ppt/presentation.xml", contentType: CONTENT_TYPES.PRESENTATION },
    { kind: "override", partName: "/ppt/slideMasters/slideMaster1.xml", contentType: CONTENT_TYPES.SLIDE_MASTER },
    { kind: "override", partName: "/ppt/theme/theme1.xml", contentType: CONTENT_TYPES.THEME },
  ];

  for (let i = 1; i <= options.layoutCount; i++) {
    entries.push({
      kind: "override",
      partName: `/ppt/slideLayouts/slideLayout${i}.xml`,
      contentType: CONTENT_TYPES.SLIDE_LAYOUT,
    });
  }

  for (let i = 1; i <= options.slideCount; i++) {
    entries.push({
      kind: "override",
      partName: `/ppt/slides/slide${i}.xml`,
      contentType: CONTENT_TYPES.SLIDE,
    });
  }

  if (options.hasNotesMaster) {
    entries.push({ kind: "override", partName: "/ppt/notesMasters/notesMaster1.xml", contentType: CONTENT_TYPES.NOTES_MASTER });
  }

  const notesSlideCount = options.notesSlideCount ?? 0;
  for (let i = 1; i <= notesSlideCount; i++) {
    entries.push({
      kind: "override",
      partName: `/ppt/notesSlides/notesSlide${i}.xml`,
      contentType: CONTENT_TYPES.NOTES,
    });
  }

  if (options.hasHandoutMaster) {
    entries.push({ kind: "override", partName: "/ppt/handoutMasters/handoutMaster1.xml", contentType: CONTENT_TYPES.HANDOUT_MASTER });
  }

  if (options.hasPresProps) {
    entries.push({ kind: "override", partName: "/ppt/presProps.xml", contentType: CONTENT_TYPES.PRES_PROPS });
  }
  if (options.hasViewProps) {
    entries.push({ kind: "override", partName: "/ppt/viewProps.xml", contentType: CONTENT_TYPES.VIEW_PROPS });
  }
  if (options.hasTableStyles) {
    entries.push({ kind: "override", partName: "/ppt/tableStyles.xml", contentType: CONTENT_TYPES.TABLE_STYLES });
  }

  const hasExtendedProps = options.hasExtendedProperties ?? true;
  if (hasExtendedProps) {
    entries.push({ kind: "override", partName: "/docProps/app.xml", contentType: CONTENT_TYPES.EXTENDED_PROPERTIES });
  }
  if (options.hasCoreProperties) {
    entries.push({ kind: "override", partName: "/docProps/core.xml", contentType: CONTENT_TYPES.CORE_PROPERTIES });
  }

  return { children: [serializeContentTypes(entries)] };
}

function validatePositiveInt(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`buildContentTypes: ${name} must be a positive integer, got ${value}`);
  }
}
