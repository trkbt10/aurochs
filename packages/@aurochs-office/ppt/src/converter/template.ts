/**
 * @file Static-template adapters
 *
 * Thin wrappers around the @aurochs-office/pptx/builders SoT so the
 * .ppt converter can keep its current `string`-based call sites while
 * routing every byte of output through the canonical builders.
 *
 * No XML literals live here.
 */

import { serializeDocument } from "@aurochs/xml";
import {
  buildAppProperties,
  buildBlankSlideLayout,
  buildBlankSlideMaster,
  buildMinimalTheme,
  buildRootRels,
} from "@aurochs-office/pptx/builders";

const SERIALIZE_OPTS = { declaration: true, standalone: true } as const;

/** docProps/app.xml — Office extended-properties skeleton. */
export const APP_XML: string = serializeDocument(buildAppProperties(), SERIALIZE_OPTS);

/** _rels/.rels — package root relationships. */
export const ROOT_RELS_XML: string = serializeDocument(buildRootRels(), SERIALIZE_OPTS);

/** ppt/theme/theme1.xml — minimal Office theme. */
export const MINIMAL_THEME: string = serializeDocument(
  buildMinimalTheme({ name: "PPT Import Theme" }),
  SERIALIZE_OPTS,
);

/** ppt/slideMasters/slideMaster1.xml — empty master with a single layout. */
export const MINIMAL_SLIDE_MASTER: string = serializeDocument(
  buildBlankSlideMaster({ layoutCount: 1 }),
  SERIALIZE_OPTS,
);

/** ppt/slideLayouts/slideLayout1.xml — single blank layout. */
export const MINIMAL_SLIDE_LAYOUT: string = serializeDocument(
  buildBlankSlideLayout({ name: "Blank", type: "blank" }),
  SERIALIZE_OPTS,
);
