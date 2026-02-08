/**
 * @file PPT → PPTX converter
 *
 * Converts a PptPresentation domain model into a PPTX ZIP package.
 */

import { createEmptyZipPackage, type ZipPackage } from "@aurochs/zip";
import type { PptPresentation, PptSlide } from "../domain/types";
import type { PptParseContext } from "../parse-context";
import { APP_XML, ROOT_RELS_XML, MINIMAL_THEME, MINIMAL_SLIDE_MASTER, MINIMAL_SLIDE_LAYOUT } from "./template";
import {
  buildContentTypesXml,
  buildPresentationXml,
  buildPresentationRelsXml,
  buildSlideRelsXml,
  buildLayoutRelsXml,
  buildMasterRelsXml,
  buildNotesSlideXml,
  buildNotesRelsXml,
  RT_HYPERLINK,
  RT_NOTES,
  type SlideRelationship,
} from "./presentation-xml";
import { buildSlideXml } from "./slide-xml";
import { embedSlideImages, buildImageRelationships, collectUsedImageIndices } from "./image-embed";

export type PptxConvertResult = {
  readonly pkg: ZipPackage;
};

/**
 * Convert a PptPresentation domain model to a PPTX ZipPackage.
 */
export function convertPptToPptx(ppt: PptPresentation, _ctx: PptParseContext): PptxConvertResult {
  const pkg = createEmptyZipPackage();
  const slideCount = ppt.slides.length;

  // Static structure
  pkg.writeText("_rels/.rels", ROOT_RELS_XML);
  pkg.writeText("docProps/app.xml", APP_XML);
  pkg.writeText("ppt/theme/theme1.xml", MINIMAL_THEME);
  pkg.writeText("ppt/slideMasters/slideMaster1.xml", MINIMAL_SLIDE_MASTER);
  pkg.writeText("ppt/slideMasters/_rels/slideMaster1.xml.rels", buildMasterRelsXml());
  pkg.writeText("ppt/slideLayouts/slideLayout1.xml", MINIMAL_SLIDE_LAYOUT);
  pkg.writeText("ppt/slideLayouts/_rels/slideLayout1.xml.rels", buildLayoutRelsXml());

  // Track which slides have notes and all image extensions
  const hasNotes: boolean[] = [];
  const allImageExtensions = new Set<string>();

  // Generate slides
  for (let i = 0; i < slideCount; i++) {
    const slide = ppt.slides[i];
    const slideIdx = i + 1;

    // Embed images for this slide
    const usedIndices = collectUsedImageIndices(slide.shapes);
    const embedResult = embedSlideImages(pkg, ppt.images, usedIndices, slideIdx, 2);
    for (const ext of embedResult.extensions) {
      allImageExtensions.add(ext);
    }

    // Build image references map (pictureIndex → rId)
    const imageRefs = new Map<number, string>();
    for (const [idx, { rId }] of embedResult.imageMap) {
      imageRefs.set(idx, rId);
    }

    // Collect hyperlinks
    const hyperlinkRels: SlideRelationship[] = [];
    const hyperlinkMap = new Map<string, string>();
    collectHyperlinks(slide, hyperlinkMap, hyperlinkRels, embedResult.imageMap.size + 2);

    // Build relationships
    const extraRels: SlideRelationship[] = [...buildImageRelationships(embedResult.imageMap), ...hyperlinkRels];

    // Notes
    const slideHasNotes = !!slide.notes;
    hasNotes.push(slideHasNotes);
    if (slideHasNotes) {
      const notesRId = `rId${extraRels.length + 2}`;
      extraRels.push({
        id: notesRId,
        type: RT_NOTES,
        target: `../notesSlides/notesSlide${slideIdx}.xml`,
      });

      pkg.writeText(`ppt/notesSlides/notesSlide${slideIdx}.xml`, buildNotesSlideXml(slide.notes!));
      pkg.writeText(`ppt/notesSlides/_rels/notesSlide${slideIdx}.xml.rels`, buildNotesRelsXml(slideIdx));
    }

    // Write slide XML
    const slideXml = buildSlideXml(slide, imageRefs, hyperlinkMap);
    pkg.writeText(`ppt/slides/slide${slideIdx}.xml`, slideXml);
    pkg.writeText(`ppt/slides/_rels/slide${slideIdx}.xml.rels`, buildSlideRelsXml(extraRels));
  }

  // Presentation
  pkg.writeText("ppt/presentation.xml", buildPresentationXml(slideCount, ppt.slideSize));
  pkg.writeText("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(slideCount));

  // Content types
  pkg.writeText(
    "[Content_Types].xml",
    buildContentTypesXml(slideCount, {
      hasNotes,
      imageExtensions: Array.from(allImageExtensions),
    }),
  );

  return { pkg };
}

/**
 * Collect hyperlinks from all shapes in a slide.
 */
function collectHyperlinks(
  slide: PptSlide,
  hyperlinkMap: Map<string, string>,
  rels: SlideRelationship[],
  startRId: number,
): void {
  let rIdCounter = startRId;

  function walkShape(shape: PptPresentation["slides"][number]["shapes"][number]): void {
    if (shape.textBody) {
      for (const para of shape.textBody.paragraphs) {
        for (const run of para.runs) {
          if (run.properties.hyperlink && !hyperlinkMap.has(run.properties.hyperlink)) {
            const rId = `rId${rIdCounter++}`;
            hyperlinkMap.set(run.properties.hyperlink, rId);
            rels.push({
              id: rId,
              type: RT_HYPERLINK,
              target: run.properties.hyperlink,
              targetMode: "External",
            });
          }
        }
      }
    }
    if (shape.children) {
      for (const child of shape.children) {
        walkShape(child);
      }
    }
  }

  for (const shape of slide.shapes) {
    walkShape(shape);
  }
}
