/**
 * @file Blank PPTX package builder
 *
 * Composes a minimal but spec-compliant PPTX `PackageFile` by delegating
 * every part to the SoT builders in `@aurochs-builder/pptx/builders`
 * (themed parts) and `@aurochs-office/pptx/builders` (auxiliary parts).
 * No XML strings live here — every part is built from the typed XML
 * element constructors and serialized through `@aurochs/xml`.
 */

import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { PackageFile } from "@aurochs-office/opc";
import { createEmptyZipPackage } from "@aurochs/zip";
import { serializeDocument, type XmlDocument } from "@aurochs/xml";
import {
  buildAppProperties,
  buildBlankSlide,
  buildContentTypes,
  buildLayoutDocument,
  buildLayoutRels,
  buildMasterRels,
  buildPresentation,
  buildPresentationRels,
  buildRootRels,
  buildSlideMaster,
  buildSlideRels,
  buildThemeFromExportOptions,
  defaultThemeExportOptions,
} from "@aurochs-builder/pptx/builders";
import {
  buildPresProps,
  buildViewProps,
  buildTableStyles,
} from "@aurochs-office/pptx/builders";

export type BlankPptxSlideSize = {
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * Optional auxiliary parts that PowerPoint emits on save but does not
 * require on read. Setting these to `true` produces a file whose part
 * graph matches the canonical Office output, which avoids the round
 * of "no such part" notices some downstream tools emit.
 */
export type BlankPptxAuxiliaryOptions = {
  /** Emit ppt/presProps.xml + presentation rel + content type. */
  readonly includePresProps?: boolean;
  /** Emit ppt/viewProps.xml + presentation rel + content type. */
  readonly includeViewProps?: boolean;
  /** Emit ppt/tableStyles.xml + presentation rel + content type. */
  readonly includeTableStyles?: boolean;
};

/**
 * Create a minimal blank PPTX `PackageFile` with the given slide count
 * and slide size. The returned package contains:
 *   - presentation.xml (with sldSz/notesSz/sldIdLst/sldMasterIdLst)
 *   - one slide master + one blank slide layout
 *   - `slideCount` blank slides bound to slideLayout1
 *   - the default theme
 *
 * Auxiliary parts (presProps / viewProps / tableStyles) are included
 * by default because PowerPoint repairs them in on first save and
 * pre-emitting them prevents the warning dialog. Pass `auxiliary:
 * { includeXxx: false }` to opt out.
 */
export function createBlankPptxPackageFile(
  slideCount: number,
  slideSize: BlankPptxSlideSize,
  auxiliary?: BlankPptxAuxiliaryOptions,
): PackageFile {
  if (!Number.isInteger(slideCount) || slideCount < 1) {
    throw new Error(`createBlankPptxPackageFile: invalid slideCount: ${slideCount}`);
  }
  if (!slideSize) {
    throw new Error("createBlankPptxPackageFile: slideSize is required");
  }

  const includePresProps = auxiliary?.includePresProps ?? true;
  const includeViewProps = auxiliary?.includeViewProps ?? true;
  const includeTableStyles = auxiliary?.includeTableStyles ?? true;

  const pkg = createEmptyZipPackage();
  const themeOptions = defaultThemeExportOptions();
  const layoutCount = 1;
  const sizeForBuilder = { width: Number(slideSize.width), height: Number(slideSize.height) };

  writeXml(pkg, "_rels/.rels", buildRootRels());
  writeXml(pkg, "[Content_Types].xml", buildContentTypes({
    layoutCount,
    slideCount,
    hasPresProps: includePresProps,
    hasViewProps: includeViewProps,
    hasTableStyles: includeTableStyles,
  }));
  writeXml(pkg, "docProps/app.xml", buildAppProperties({ slideCount }));

  writeXml(pkg, "ppt/presentation.xml", buildPresentation({ slideSize: sizeForBuilder, slideCount }));
  writeXml(pkg, "ppt/_rels/presentation.xml.rels", buildPresentationRels({
    slideCount,
    includePresProps,
    includeViewProps,
    includeTableStyles,
  }));

  writeXml(pkg, "ppt/theme/theme1.xml", buildThemeFromExportOptions(themeOptions));

  writeXml(pkg, "ppt/slideMasters/slideMaster1.xml", buildSlideMaster(themeOptions, layoutCount));
  writeXml(pkg, "ppt/slideMasters/_rels/slideMaster1.xml.rels", buildMasterRels(layoutCount));

  writeXml(pkg, "ppt/slideLayouts/slideLayout1.xml", buildLayoutDocument({ name: "Blank", type: "blank" }));
  writeXml(pkg, "ppt/slideLayouts/_rels/slideLayout1.xml.rels", buildLayoutRels());

  for (let i = 1; i <= slideCount; i++) {
    writeXml(pkg, `ppt/slides/slide${i}.xml`, buildBlankSlide());
    writeXml(pkg, `ppt/slides/_rels/slide${i}.xml.rels`, buildSlideRels());
  }

  if (includePresProps) {
    writeXml(pkg, "ppt/presProps.xml", buildPresProps());
  }
  if (includeViewProps) {
    writeXml(pkg, "ppt/viewProps.xml", buildViewProps());
  }
  if (includeTableStyles) {
    writeXml(pkg, "ppt/tableStyles.xml", buildTableStyles());
  }

  return pkg.asPresentationFile();
}

function writeXml(
  pkg: ReturnType<typeof createEmptyZipPackage>,
  path: string,
  doc: XmlDocument,
): void {
  pkg.writeText(path, serializeDocument(doc, { declaration: true, standalone: true }));
}
