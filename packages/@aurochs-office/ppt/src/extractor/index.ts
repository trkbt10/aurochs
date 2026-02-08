/**
 * @file PPT record tree → domain model extraction
 */

import type { PptRecord } from "../records/types";
import { RT } from "../records/record-types";
import { findChildByType, findChildrenByType } from "../records/record-iterator";
import { parseDocumentAtom } from "../records/atoms/document";
import { parseFontEntityAtom } from "../records/atoms/text";
import { extractColorScheme } from "./color-resolver";
import { extractShapes } from "./shape-extractor";
import { extractHyperlinkMap, type HyperlinkMap } from "./hyperlink-extractor";
import type { PptStreamParseResult } from "../stream/ppt-stream";
import type { PptPresentation, PptSlide, PptSlideSize, PptEmbeddedImage } from "../domain/types";
import type { PptParseContext } from "../parse-context";
import { warnOrThrow } from "../parse-context";
import { DEFAULT_COLOR_SCHEME, type ColorScheme } from "../records/atoms/color";

/**
 * Extract a PptPresentation domain model from parsed PPT stream records.
 */
export function extractPptPresentation(
  parsed: PptStreamParseResult,
  images: readonly PptEmbeddedImage[],
  ctx: PptParseContext,
): PptPresentation {
  // Extract document-level info
  const docChildren = parsed.documentRecord.children ?? [];
  const documentAtomRecord = findChildByType(docChildren, RT.DocumentAtom);

  let slideSize: PptSlideSize;
  if (documentAtomRecord) {
    const docAtom = parseDocumentAtom(documentAtomRecord);
    slideSize = {
      widthEmu: docAtom.slideSizeXEmu,
      heightEmu: docAtom.slideSizeYEmu,
    };
  } else {
    // Default 16:9 slide size
    slideSize = { widthEmu: 12192000, heightEmu: 6858000 };
  }

  // Extract fonts from FontCollection
  const fonts = extractFonts(docChildren);

  // Extract master color scheme
  const masterColorScheme = parsed.masterRecords.length > 0
    ? extractColorScheme(parsed.masterRecords[0])
    : DEFAULT_COLOR_SCHEME;

  // Extract document-level hyperlink map
  const hyperlinkMap = extractHyperlinkMap(parsed.documentRecord);

  // Extract slides
  const slides: PptSlide[] = [];
  for (let i = 0; i < parsed.slideRecords.length; i++) {
    const slideRecord = parsed.slideRecords[i];
    try {
      const slide = extractSlide(slideRecord, fonts, masterColorScheme, hyperlinkMap, parsed.noteRecords[i]);
      slides.push(slide);
    } catch (err) {
      warnOrThrow(ctx,
        { code: "PPT_SLIDE_PARSE_FAILED", where: "extractPptPresentation", message: `Failed to extract slide ${i}: ${err instanceof Error ? err.message : String(err)}` },
        err instanceof Error ? err : new Error(String(err)),
      );
      // Add empty slide as fallback
      slides.push({ shapes: [] });
    }
  }

  return { slideSize, slides, images };
}

function extractSlide(
  slideRecord: PptRecord,
  fonts: readonly string[],
  masterColorScheme: ColorScheme,
  hyperlinkMap: HyperlinkMap,
  notesRecord?: PptRecord,
): PptSlide {
  // Use slide's own color scheme if available, otherwise master's
  const colorScheme = extractColorScheme(slideRecord) ?? masterColorScheme;

  // Extract shapes
  const shapes = extractShapes(slideRecord, fonts, colorScheme, hyperlinkMap);

  // Extract notes text
  let notes: string | undefined;
  if (notesRecord) {
    notes = extractNotesText(notesRecord, fonts, colorScheme);
  }

  return {
    shapes,
    ...(notes ? { notes } : {}),
  };
}

/**
 * Extract font names from the FontCollection in DocumentContainer.
 */
function extractFonts(docChildren: readonly PptRecord[]): readonly string[] {
  const fonts: string[] = [];

  // Find Environment container → FontCollection
  const envContainer = findChildByType(docChildren, RT.Environment);
  if (!envContainer) return fonts;

  const fontCollection = findChildByType(envContainer.children ?? [], RT.FontCollection);
  if (!fontCollection) return fonts;

  // FontCollection contains FontEntityAtom records
  const fontEntities = findChildrenByType(fontCollection.children ?? [], RT.FontEntityAtom);
  for (const fe of fontEntities) {
    const fontData = parseFontEntityAtom(fe);
    fonts.push(fontData.name);
  }

  return fonts;
}

/**
 * Extract plain text from a NotesContainer.
 *
 * Notes text lives inside PPDrawing → shape tree, same as slides.
 */
function extractNotesText(
  notesRecord: PptRecord,
  fonts: readonly string[],
  colorScheme: ColorScheme,
): string | undefined {
  // Extract shapes from the notes record (same traversal as slides: PPDrawing → shapes)
  const shapes = extractShapes(notesRecord, fonts, colorScheme);

  const textParts: string[] = [];
  for (const shape of shapes) {
    if (!shape.textBody) continue;
    for (const para of shape.textBody.paragraphs) {
      const text = para.runs.map(r => r.text).join("");
      if (text.length > 0) textParts.push(text);
    }
  }

  const text = textParts.join("\n");
  return text.length > 0 ? text : undefined;
}
