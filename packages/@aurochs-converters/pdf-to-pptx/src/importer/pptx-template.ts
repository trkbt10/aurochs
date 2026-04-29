/**
 * @file Blank PPTX package builder
 *
 * Composes a minimal but spec-compliant PPTX `PackageFile` by delegating
 * every part to the SoT builders in `@aurochs-builder/pptx/builders`.
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

export type BlankPptxSlideSize = {
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * Create a minimal blank PPTX `PackageFile` with the given slide count
 * and slide size. The returned package contains:
 *   - presentation.xml (with sldSz/notesSz/sldIdLst/sldMasterIdLst)
 *   - one slide master + one blank slide layout
 *   - `slideCount` blank slides bound to slideLayout1
 *   - the default theme
 */
export function createBlankPptxPackageFile(
  slideCount: number,
  slideSize: BlankPptxSlideSize,
): PackageFile {
  if (!Number.isInteger(slideCount) || slideCount < 1) {
    throw new Error(`createBlankPptxPackageFile: invalid slideCount: ${slideCount}`);
  }
  if (!slideSize) {
    throw new Error("createBlankPptxPackageFile: slideSize is required");
  }

  const pkg = createEmptyZipPackage();
  const themeOptions = defaultThemeExportOptions();
  const layoutCount = 1;
  const sizeForBuilder = { width: Number(slideSize.width), height: Number(slideSize.height) };

  writeXml(pkg, "_rels/.rels", buildRootRels());
  writeXml(pkg, "[Content_Types].xml", buildContentTypes({ layoutCount, slideCount }));
  writeXml(pkg, "docProps/app.xml", buildAppProperties());

  writeXml(pkg, "ppt/presentation.xml", buildPresentation({ slideSize: sizeForBuilder, slideCount }));
  writeXml(pkg, "ppt/_rels/presentation.xml.rels", buildPresentationRels(slideCount));

  writeXml(pkg, "ppt/theme/theme1.xml", buildThemeFromExportOptions(themeOptions));

  writeXml(pkg, "ppt/slideMasters/slideMaster1.xml", buildSlideMaster(themeOptions, layoutCount));
  writeXml(pkg, "ppt/slideMasters/_rels/slideMaster1.xml.rels", buildMasterRels(layoutCount));

  writeXml(pkg, "ppt/slideLayouts/slideLayout1.xml", buildLayoutDocument({ name: "Blank", type: "blank" }));
  writeXml(pkg, "ppt/slideLayouts/_rels/slideLayout1.xml.rels", buildLayoutRels());

  for (let i = 1; i <= slideCount; i++) {
    writeXml(pkg, `ppt/slides/slide${i}.xml`, buildBlankSlide());
    writeXml(pkg, `ppt/slides/_rels/slide${i}.xml.rels`, buildSlideRels());
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
