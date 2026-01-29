/**
 * @file PPTX Exporter
 *
 * Main API for exporting PresentationDocument to PPTX format.
 * Uses ZipPackage for unified ZIP handling (shared with pptx-loader).
 *
 * Phase 1 (MVP): Simple pass-through - exports the original PPTX with updated XML.
 * Phase 10: Extended support for chart and embedded workbook updates.
 *
 * @see @oxen/zip - Shared ZIP abstraction
 * @see src/pptx/app/pptx-loader.ts - Corresponding load functionality
 */

import type { PresentationDocument, SlideWithId } from "../app/presentation-document";
import type { Slide as ApiSlide } from "../app/types";
import type { GraphicFrame, PresentationFile, Slide } from "../domain";
import type { ResourceId } from "../domain/types";
import type { XmlDocument } from "@oxen/xml";
import { serializeDocument } from "@oxen/xml";
import { parseDataUrl } from "@oxen/buffer";
import { resolveRelationshipTargetPath } from "@oxen-office/ooxml/opc";
import {
  createEmptyZipPackage,
  isBinaryFile,
  type ZipPackage,
} from "@oxen/zip";
import { parseSlide } from "../parser/slide/slide-parser";
import { detectSlideChanges, type ShapeChange, type PropertyChange } from "../patcher/core/shape-differ";
import { patchSlideXml } from "../patcher/slide/slide-patcher";
import { addMedia, type MediaType } from "../patcher/resources/media-manager";
import { addOleObject, getOleTypeFromFile } from "../patcher/resources/ole-manager";
import { embedFonts } from "../patcher/resources/font-manager";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for PPTX export
 */
export type ExportOptions = {
  /** Compression level (0-9, default: 6) */
  readonly compressionLevel?: number;
};

/**
 * Result of PPTX export
 */
export type ExportResult = {
  /** Generated PPTX as Blob */
  readonly blob: Blob;
  /** Size in bytes */
  readonly size: number;
};

/**
 * Chart update for export
 */
export type ChartUpdate = {
  /** Path to chart XML (e.g., "ppt/charts/chart1.xml") */
  readonly chartPath: string;
  /** Updated chart XML document */
  readonly chartXml: XmlDocument;
};

/**
 * Workbook (embedding) update for export
 */
export type WorkbookUpdate = {
  /** Path to workbook in PPTX (e.g., "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx") */
  readonly workbookPath: string;
  /** Updated workbook as binary buffer */
  readonly workbookBuffer: ArrayBuffer;
};

/**
 * Layout update for export (Phase 9)
 */
export type LayoutUpdate = {
  /** Path to layout XML (e.g., "ppt/slideLayouts/slideLayout1.xml") */
  readonly layoutPath: string;
  /** Updated layout XML document */
  readonly layoutXml: XmlDocument;
};

/**
 * Master update for export (Phase 9)
 */
export type MasterUpdate = {
  /** Path to master XML (e.g., "ppt/slideMasters/slideMaster1.xml") */
  readonly masterPath: string;
  /** Updated master XML document */
  readonly masterXml: XmlDocument;
};

/**
 * Theme update for export (Phase 9)
 */
export type ThemeUpdate = {
  /** Path to theme XML (e.g., "ppt/theme/theme1.xml") */
  readonly themePath: string;
  /** Updated theme XML document */
  readonly themeXml: XmlDocument;
};

/**
 * Extended export options with chart and workbook updates
 */
export type ExtendedExportOptions = ExportOptions & {
  /** Chart updates to apply (Phase 10) */
  readonly chartUpdates?: readonly ChartUpdate[];
  /** Workbook (embedding) updates to apply (Phase 10) */
  readonly workbookUpdates?: readonly WorkbookUpdate[];
};

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export a PresentationDocument to PPTX format.
 *
 * Phase 1 (MVP): Passes through the original PPTX, updating slide XML from apiSlide.content.
 * Phase 10: Supports chart XML and embedded workbook updates via ExtendedExportOptions.
 *
 * @example
 * ```typescript
 * const result = await exportPptx(document);
 * // Download the file
 * const url = URL.createObjectURL(result.blob);
 * const a = document.createElement("a");
 * a.href = url;
 * a.download = "presentation.pptx";
 * a.click();
 * ```
 *
 * @example With chart updates (Phase 10)
 * ```typescript
 * const result = await exportPptx(document, {
 *   chartUpdates: [
 *     { chartPath: "ppt/charts/chart1.xml", chartXml: updatedChartXml }
 *   ],
 *   workbookUpdates: [
 *     { workbookPath: "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx", workbookBuffer: updatedXlsx }
 *   ]
 * });
 * ```
 */
export async function exportPptx(
  doc: PresentationDocument,
  options: ExtendedExportOptions = {},
): Promise<ExportResult> {
  // Validate that we have a source presentation file
  if (!doc.presentationFile) {
    throw new Error("PresentationDocument must have a presentationFile for export");
  }

  // Create a ZipPackage and copy all files from source
  const pkg = copyPresentationFileToPackage(doc.presentationFile);

  // Embed fonts if present (from PDF import)
  if (doc.embeddedFonts && doc.embeddedFonts.length > 0) {
    embedFonts(pkg, doc.embeddedFonts);
  }

  // Update slide XMLs with editor changes applied
  for (const slideWithId of doc.slides) {
    if (slideWithId.apiSlide) {
      const slidePath = `ppt/slides/${slideWithId.apiSlide.filename}.xml`;

      // Get the updated XML with editor changes applied (including media embedding)
      const updatedXml = applySlideEditsWithMedia({
        originalXml: slideWithId.apiSlide.content,
        editedSlide: slideWithId.slide,
        slidePath,
        pkg,
      });

      const xml = serializeDocument(updatedXml, {
        declaration: true,
        standalone: true,
      });
      pkg.writeText(slidePath, xml);
    }
  }

  // Phase 10: Apply chart updates
  if (options.chartUpdates) {
    for (const update of options.chartUpdates) {
      const xml = serializeDocument(update.chartXml, {
        declaration: true,
        standalone: true,
      });
      pkg.writeText(update.chartPath, xml);
    }
  }

  // Phase 10: Apply workbook (embedding) updates
  if (options.workbookUpdates) {
    for (const update of options.workbookUpdates) {
      pkg.writeBinary(update.workbookPath, update.workbookBuffer);
    }
  }

  // Phase 9: Collect and apply master/layout/theme updates from document
  const { layoutUpdates, masterUpdates, themeUpdates } = collectMasterLayoutThemeUpdates(doc);

  for (const update of layoutUpdates) {
    const xml = serializeDocument(update.layoutXml, {
      declaration: true,
      standalone: true,
    });
    pkg.writeText(update.layoutPath, xml);
  }

  for (const update of masterUpdates) {
    const xml = serializeDocument(update.masterXml, {
      declaration: true,
      standalone: true,
    });
    pkg.writeText(update.masterPath, xml);
  }

  for (const update of themeUpdates) {
    const xml = serializeDocument(update.themeXml, {
      declaration: true,
      standalone: true,
    });
    pkg.writeText(update.themePath, xml);
  }

  // Generate the PPTX
  const blob = await pkg.toBlob({
    compressionLevel: options.compressionLevel,
  });

  return {
    blob,
    size: blob.size,
  };
}

/**
 * Export a PresentationDocument to PPTX as ArrayBuffer.
 *
 * Useful for Node.js environments or when you need to process the buffer further.
 * Supports the same extended options as exportPptx for chart and workbook updates.
 */
export async function exportPptxAsBuffer(
  doc: PresentationDocument,
  options: ExtendedExportOptions = {},
): Promise<ArrayBuffer> {
  if (!doc.presentationFile) {
    throw new Error("PresentationDocument must have a presentationFile for export");
  }

  const pkg = copyPresentationFileToPackage(doc.presentationFile);

  // Embed fonts if present (from PDF import)
  if (doc.embeddedFonts && doc.embeddedFonts.length > 0) {
    embedFonts(pkg, doc.embeddedFonts);
  }

  // Update slide XMLs with editor changes applied
  for (const slideWithId of doc.slides) {
    if (slideWithId.apiSlide) {
      const slidePath = `ppt/slides/${slideWithId.apiSlide.filename}.xml`;

      // Get the updated XML with editor changes applied (including media embedding)
      const updatedXml = applySlideEditsWithMedia({
        originalXml: slideWithId.apiSlide.content,
        editedSlide: slideWithId.slide,
        slidePath,
        pkg,
      });

      const xml = serializeDocument(updatedXml, {
        declaration: true,
        standalone: true,
      });
      pkg.writeText(slidePath, xml);
    }
  }

  // Phase 10: Apply chart updates
  if (options.chartUpdates) {
    for (const update of options.chartUpdates) {
      const xml = serializeDocument(update.chartXml, {
        declaration: true,
        standalone: true,
      });
      pkg.writeText(update.chartPath, xml);
    }
  }

  // Phase 10: Apply workbook (embedding) updates
  if (options.workbookUpdates) {
    for (const update of options.workbookUpdates) {
      pkg.writeBinary(update.workbookPath, update.workbookBuffer);
    }
  }

  // Phase 9: Collect and apply master/layout/theme updates from document
  const { layoutUpdates, masterUpdates, themeUpdates } = collectMasterLayoutThemeUpdates(doc);

  for (const update of layoutUpdates) {
    const xml = serializeDocument(update.layoutXml, {
      declaration: true,
      standalone: true,
    });
    pkg.writeText(update.layoutPath, xml);
  }

  for (const update of masterUpdates) {
    const xml = serializeDocument(update.masterXml, {
      declaration: true,
      standalone: true,
    });
    pkg.writeText(update.masterPath, xml);
  }

  for (const update of themeUpdates) {
    const xml = serializeDocument(update.themeXml, {
      declaration: true,
      standalone: true,
    });
    pkg.writeText(update.themePath, xml);
  }

  return pkg.toArrayBuffer({
    compressionLevel: options.compressionLevel,
  });
}

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Copy all files from PresentationFile to a new ZipPackage.
 *
 * This creates a new package with all the original content,
 * which can then be modified before export.
 */
function copyPresentationFileToPackage(file: PresentationFile): ZipPackage {
  // Require listFiles() for proper export
  if (!file.listFiles) {
    throw new Error(
      "PresentationFile must implement listFiles() for export. " +
        "Ensure the file was loaded using loadPptxFromBuffer or similar.",
    );
  }

  const pkg = createEmptyZipPackage();
  const paths = file.listFiles();

  for (const path of paths) {
    if (isBinaryFile(path)) {
      const content = file.readBinary(path);
      if (content) {
        pkg.writeBinary(path, content);
      }
    } else {
      const content = file.readText(path);
      if (content) {
        pkg.writeText(path, content);
      }
    }
  }

  return pkg;
}

/**
 * Apply editor changes to slide XML with media embedding support.
 *
 * Compares the original slide (parsed from XML) with the edited slide,
 * embeds any data: URL media, and applies detected changes to the XML document.
 *
 * @param originalXml - The original slide XML document
 * @param editedSlide - The edited slide domain object
 * @param slidePath - Path to the slide in the package
 * @param pkg - ZipPackage for media embedding
 * @returns Updated XML document with changes applied
 */
type ApplySlideEditsWithMediaOptions = {
  readonly originalXml: XmlDocument;
  readonly editedSlide: Slide;
  readonly slidePath: string;
  readonly pkg: ZipPackage;
};

function applySlideEditsWithMedia(
  { originalXml, editedSlide, slidePath, pkg }: ApplySlideEditsWithMediaOptions,
): XmlDocument {
  // Parse the original XML to get the original domain slide
  const originalSlide = parseSlide(originalXml);
  if (!originalSlide) {
    // If parsing fails, return original unchanged
    return originalXml;
  }

  // Detect changes between original and edited slides
  const changes = detectSlideChanges(originalSlide, editedSlide);

  // If no changes, return original
  if (changes.length === 0) {
    return originalXml;
  }

  // Process media changes and get updated changes with embedded rIds
  const processedChanges = processMediaChanges(changes, slidePath, pkg);

  // Apply changes to XML
  return patchSlideXml(originalXml, processedChanges);
}

/**
 * Process changes to embed data: URL media and replace with rIds.
 */
function processMediaChanges(
  changes: readonly ShapeChange[],
  slidePath: string,
  pkg: ZipPackage,
): readonly ShapeChange[] {
  return changes.map((change): ShapeChange => {
    if (change.type === "added") {
      // Process added shapes for data: URL media
      return processAddedShapeMedia(change, slidePath, pkg);
    }
    if (change.type === "modified") {
      // Process modified shapes for blipFill changes
      return processModifiedShapeMedia(change, slidePath, pkg);
    }
    return change;
  });
}

/**
 * Process added shape for data: URL media or OLE embedData.
 */
function processAddedShapeMedia(
  change: Extract<ShapeChange, { type: "added" }>,
  slidePath: string,
  pkg: ZipPackage,
): Extract<ShapeChange, { type: "added" }> {
  const shape = change.shape;

  // Process pictures with data: URL
  if (shape.type === "pic") {
    const resourceId = shape.blipFill?.resourceId;
    if (!resourceId || !isDataUrl(resourceId)) {
      return change;
    }

    // Embed the media and get new rId
    const rId = embedDataUrlMedia(pkg, slidePath, resourceId);

    // Return updated change with new resourceId
    return {
      ...change,
      shape: {
        ...shape,
        blipFill: {
          ...shape.blipFill,
          resourceId: rId,
        },
      },
    };
  }

  // Process OLE objects with embedData
  if (shape.type === "graphicFrame") {
    const processedFrame = processOleGraphicFrame(shape, slidePath, pkg);
    if (processedFrame !== shape) {
      return {
        ...change,
        shape: processedFrame,
      };
    }
  }

  return change;
}

/**
 * Process GraphicFrame with OLE embedData.
 * Embeds the data and replaces embedData with resourceId.
 */
function processOleGraphicFrame(
  frame: GraphicFrame,
  slidePath: string,
  pkg: ZipPackage,
): GraphicFrame {
  if (frame.content.type !== "oleObject") {
    return frame;
  }

  const oleData = frame.content.data;
  if (!oleData.embedData || !oleData.originalFilename) {
    return frame;
  }

  // Get OLE type from filename
  const oleType = getOleTypeFromFile(oleData.originalFilename);
  if (!oleType) {
    throw new Error(`Unsupported OLE file type: ${oleData.originalFilename}`);
  }

  // Embed the OLE object and get rId
  const result = addOleObject(pkg, oleData.embedData, oleType, slidePath);

  // Return updated frame with resourceId and without embedData
  return {
    ...frame,
    content: {
      type: "oleObject",
      data: {
        resourceId: result.rId as ResourceId,
        progId: result.progId,
        name: oleData.name,
        showAsIcon: oleData.showAsIcon,
        // Remove embedData and originalFilename as they're now embedded
      },
    },
  };
}

/**
 * Process modified shape for blipFill changes with data: URL.
 */
function processModifiedShapeMedia(
  change: Extract<ShapeChange, { type: "modified" }>,
  slidePath: string,
  pkg: ZipPackage,
): Extract<ShapeChange, { type: "modified" }> {
  const processedPropertyChanges = change.changes.map((propChange): PropertyChange => {
    if (propChange.property !== "blipFill") {
      return propChange;
    }

    const newValue = propChange.newValue as { resourceId?: string } | undefined;
    if (!newValue?.resourceId || !isDataUrl(newValue.resourceId)) {
      return propChange;
    }

    // Embed the media and get new rId
    const rId = embedDataUrlMedia(pkg, slidePath, newValue.resourceId);

    // Return updated property change with new resourceId
    return {
      ...propChange,
      newValue: {
        ...newValue,
        resourceId: rId,
      },
    };
  });

  return {
    ...change,
    changes: processedPropertyChanges,
  };
}

// =============================================================================
// Data URL Media Helpers
// =============================================================================

/**
 * Check if a string is a data: URL.
 */
function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

/**
 * Embed media from data: URL using media-manager.
 */
function embedDataUrlMedia(pkg: ZipPackage, slidePath: string, dataUrl: string): string {
  const { mimeType, data } = parseDataUrl(dataUrl);
  const mediaType = mimeTypeToMediaType(mimeType);
  const result = addMedia({ pkg, mediaData: data, mediaType, referringPart: slidePath });
  return result.rId;
}

/**
 * Convert MIME type string to MediaType.
 */
function mimeTypeToMediaType(mimeType: string): MediaType {
  const mapping: Record<string, MediaType> = {
    "image/png": "image/png",
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/gif": "image/gif",
    "image/svg+xml": "image/svg+xml",
    "video/mp4": "video/mp4",
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mpeg",
  };

  const mediaType = mapping[mimeType];
  if (!mediaType) {
    throw new Error(`Unsupported media type: ${mimeType}`);
  }
  return mediaType;
}

// =============================================================================
// Phase 9: Master/Layout/Theme Collection (ECMA-376 Part 2)
// =============================================================================

const REL_SLIDE_LAYOUT =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout";
const REL_SLIDE_MASTER =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster";
const REL_THEME =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";

type CollectedUpdates = {
  readonly layoutUpdates: readonly LayoutUpdate[];
  readonly masterUpdates: readonly MasterUpdate[];
  readonly themeUpdates: readonly ThemeUpdate[];
};

/**
 * Collect layout/master/theme updates from document.
 *
 * Deduplicates by path since multiple slides may share the same layout/master/theme.
 * First occurrence wins to preserve edits on earlier slides.
 */
function collectMasterLayoutThemeUpdates(doc: PresentationDocument): CollectedUpdates {
  const layoutMap = new Map<string, XmlDocument>();
  const masterMap = new Map<string, XmlDocument>();
  const themeMap = new Map<string, XmlDocument>();

  for (const slideWithId of doc.slides) {
    if (!slideWithId.apiSlide) {
      continue;
    }

    const layoutPath = resolveLayoutPath(slideWithId);
    if (layoutPath && slideWithId.apiSlide.layout && !layoutMap.has(layoutPath)) {
      layoutMap.set(layoutPath, slideWithId.apiSlide.layout);
    }

    const masterPath = resolveMasterPath(slideWithId.apiSlide);
    if (masterPath && slideWithId.apiSlide.master && !masterMap.has(masterPath)) {
      masterMap.set(masterPath, slideWithId.apiSlide.master);
    }

    const themePath = resolveThemePath(slideWithId.apiSlide);
    if (themePath && slideWithId.apiSlide.theme && !themeMap.has(themePath)) {
      themeMap.set(themePath, slideWithId.apiSlide.theme);
    }
  }

  return {
    layoutUpdates: Array.from(layoutMap.entries()).map(
      ([layoutPath, layoutXml]) => ({ layoutPath, layoutXml }),
    ),
    masterUpdates: Array.from(masterMap.entries()).map(
      ([masterPath, masterXml]) => ({ masterPath, masterXml }),
    ),
    themeUpdates: Array.from(themeMap.entries()).map(
      ([themePath, themeXml]) => ({ themePath, themeXml }),
    ),
  };
}

function resolveLayoutPath(slideWithId: SlideWithId): string | undefined {
  if (slideWithId.layoutPathOverride) {
    return slideWithId.layoutPathOverride;
  }
  const apiSlide = slideWithId.apiSlide;
  if (!apiSlide) {
    return undefined;
  }
  const relTarget = apiSlide.relationships.getTargetByType(REL_SLIDE_LAYOUT);
  if (!relTarget) {
    return undefined;
  }
  return resolvePptxRelationshipTargetPath(`ppt/slides/${apiSlide.filename}.xml`, relTarget);
}

function resolveMasterPath(apiSlide: ApiSlide): string | undefined {
  const relTarget = apiSlide.layoutRelationships.getTargetByType(REL_SLIDE_MASTER);
  if (!relTarget) {
    return undefined;
  }
  return resolvePptxRelationshipTargetPath("ppt/slideLayouts/dummy.xml", relTarget);
}

function resolveThemePath(apiSlide: ApiSlide): string | undefined {
  const relTarget = apiSlide.masterRelationships.getTargetByType(REL_THEME);
  if (!relTarget) {
    return undefined;
  }
  return resolvePptxRelationshipTargetPath("ppt/slideMasters/dummy.xml", relTarget);
}

function resolvePptxRelationshipTargetPath(basePath: string, relTarget: string): string {
  if (relTarget.startsWith("ppt/")) {
    return relTarget;
  }
  return resolveRelationshipTargetPath(basePath, relTarget);
}
