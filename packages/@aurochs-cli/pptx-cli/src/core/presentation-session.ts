/**
 * @file Presentation session - stateful presentation builder
 *
 * Core logic for building presentations incrementally.
 * Used by both CLI commands and MCP server.
 */

import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadPptxBundleFromBuffer } from "@aurochs-office/pptx/app/pptx-loader";
import { openPresentation, type Presentation } from "@aurochs-office/pptx/app";
import type { Slide as ApiSlide } from "@aurochs-office/pptx/app/types";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import type { ZipPackage } from "@aurochs/zip";
import { createZipFileAdapter } from "@aurochs-office/opc";
import { parseXml, serializeDocument } from "@aurochs/xml";
import {
  applySlideOperations,
  processSlideElements,
  getExistingShapeIds,
  applyThemeEditsToPackage,
  applySlideTransition,
  applyAnimations,
  applyComments,
  applyNotes,
  type SlideModInput as BuilderSlideModInput,
  type ShapeSpec as BuilderShapeSpec,
  type ImageSpec,
  type ConnectorSpec,
  type TableSpec,
  type GroupSpec,
  type TableUpdateSpec,
  type SlideTransitionSpec,
  type AnimationSpec,
  type CommentSpec,
  type NotesSpec,
  type ThemeEditSpec,
} from "@aurochs-builder/pptx";
import { renderSlideSvg, createRenderContext, createEmptySlideSvg } from "@aurochs-renderer/pptx";

// =============================================================================
// Types
// =============================================================================

export type SessionInfo = {
  readonly slideCount: number;
  readonly width: number;
  readonly height: number;
  readonly title?: string;
};

export type RenderResult = {
  readonly svg: string;
  readonly warnings: readonly { message: string }[];
};

export type AddSlideResult = {
  readonly slideNumber: number;
};

export type ModifySlideResult = {
  readonly elementsAdded: number;
};

export type AddShapeResult = {
  readonly shapeId: string;
};

export type RemoveSlideResult = {
  readonly removedSlideNumber: number;
  readonly newSlideCount: number;
};

export type ReorderSlideResult = {
  readonly fromPosition: number;
  readonly toPosition: number;
};

export type DuplicateSlideResult = {
  readonly sourceSlideNumber: number;
  readonly newSlideNumber: number;
};

export type AddImageResult = {
  readonly imageId: string;
};

export type AddConnectorResult = {
  readonly connectorId: string;
};

export type AddTableResult = {
  readonly tableId: string;
};

export type AddGroupResult = {
  readonly groupId: string;
};

export type UpdateTableResult = {
  readonly updated: boolean;
};

export type SetTransitionResult = {
  readonly applied: boolean;
};

export type AddAnimationsResult = {
  readonly animationsAdded: number;
};

export type AddCommentsResult = {
  readonly commentsAdded: number;
};

export type SetSpeakerNotesResult = {
  readonly applied: boolean;
};

/** Slide modification input specification */
export type SlideModInput = BuilderSlideModInput;
/** Shape specification */
export type ShapeSpec = BuilderShapeSpec;

// =============================================================================
// Session
// =============================================================================

export type PresentationSession = {
  /** Load a template to start a new presentation */
  readonly load: (templatePath: string, title?: string) => Promise<SessionInfo>;
  /** Load from buffer */
  readonly loadFromBuffer: (buffer: ArrayBuffer, specDir?: string, title?: string) => Promise<SessionInfo>;
  /** Add a new slide */
  readonly addSlide: (layoutPath?: string, position?: number) => Promise<AddSlideResult>;
  /** Remove a slide */
  readonly removeSlide: (slideNumber: number) => Promise<RemoveSlideResult>;
  /** Reorder a slide (move from one position to another) */
  readonly reorderSlide: (fromPosition: number, toPosition: number) => Promise<ReorderSlideResult>;
  /** Duplicate a slide */
  readonly duplicateSlide: (sourceSlideNumber: number, insertAt?: number) => Promise<DuplicateSlideResult>;
  /** Modify a slide (add elements, background, etc.) */
  readonly modifySlide: (input: SlideModInput) => Promise<ModifySlideResult>;
  /** Add a single shape (convenience) */
  readonly addShape: (slideNumber: number, spec: ShapeSpec) => Promise<AddShapeResult>;
  /** Add an image */
  readonly addImage: (slideNumber: number, spec: Omit<ImageSpec, "type">) => Promise<AddImageResult>;
  /** Add a connector */
  readonly addConnector: (slideNumber: number, spec: Omit<ConnectorSpec, "type">) => Promise<AddConnectorResult>;
  /** Add a table */
  readonly addTable: (slideNumber: number, spec: Omit<TableSpec, "type">) => Promise<AddTableResult>;
  /** Add a group of shapes */
  readonly addGroup: (slideNumber: number, spec: Omit<GroupSpec, "type">) => Promise<AddGroupResult>;
  /** Update a table */
  readonly updateTable: (slideNumber: number, spec: TableUpdateSpec) => Promise<UpdateTableResult>;
  /** Set slide transition */
  readonly setTransition: (slideNumber: number, spec: SlideTransitionSpec) => Promise<SetTransitionResult>;
  /** Add animations to a slide */
  readonly addAnimations: (slideNumber: number, specs: readonly AnimationSpec[]) => Promise<AddAnimationsResult>;
  /** Add comments to a slide */
  readonly addComments: (slideNumber: number, specs: readonly CommentSpec[]) => Promise<AddCommentsResult>;
  /** Set speaker notes */
  readonly setSpeakerNotes: (slideNumber: number, spec: NotesSpec) => Promise<SetSpeakerNotesResult>;
  /** Apply theme edits */
  readonly applyTheme: (theme: ThemeEditSpec) => void;
  /** Render a slide to SVG */
  readonly renderSlide: (slideNumber: number) => RenderResult;
  /** Export to ArrayBuffer */
  readonly exportBuffer: () => Promise<ArrayBuffer>;
  /** Get current info */
  readonly getInfo: () => SessionInfo | null;
  /** Get slide count */
  readonly getSlideCount: () => number;
  /** Check if session is active */
  readonly isActive: () => boolean;
};

type SessionState = {
  zipPackage: ZipPackage | null;
  presentation: Presentation | null;
  slideCount: number;
  specDir: string;
  title: string | undefined;
};

function getDefaultLayoutPath(zipPackage: ZipPackage): string {
  const layouts = zipPackage
    .listFiles()
    .filter((f) => f.startsWith("ppt/slideLayouts/slideLayout") && f.endsWith(".xml"));
  if (layouts.length === 0) {
    throw new Error("No slide layouts found");
  }
  return layouts[0]!;
}

function refreshPresentation(state: SessionState): void {
  if (!state.zipPackage) {
    return;
  }
  const presentationFile = state.zipPackage.asPresentationFile();
  state.presentation = openPresentation(presentationFile);
  state.slideCount = state.presentation.count;
}

/**
 * Create a new presentation session.
 */
export function createPresentationSession(): PresentationSession {
  const state: SessionState = {
    zipPackage: null,
    presentation: null,
    slideCount: 0,
    specDir: "",
    title: undefined,
  };

  const session: PresentationSession = {
    async load(templatePath: string, title?: string): Promise<SessionInfo> {
      state.specDir = dirname(templatePath);
      state.title = title;

      const fileBuffer = await readFile(templatePath);
      const buffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength,
      ) as ArrayBuffer;

      return session.loadFromBuffer(buffer, state.specDir, title);
    },

    async loadFromBuffer(buffer: ArrayBuffer, specDir?: string, title?: string): Promise<SessionInfo> {
      const { zipPackage, presentationFile } = await loadPptxBundleFromBuffer(buffer);

      state.zipPackage = zipPackage;
      state.presentation = openPresentation(presentationFile);
      state.slideCount = state.presentation.count;
      state.specDir = specDir ?? "";
      state.title = title;

      return {
        slideCount: state.slideCount,
        width: state.presentation.size.width,
        height: state.presentation.size.height,
        title,
      };
    },

    async addSlide(layoutPath?: string, position?: number): Promise<AddSlideResult> {
      if (!state.zipPackage) {
        throw new Error("No active session");
      }

      const result = await applySlideOperations(state.zipPackage, {
        addSlides: [
          {
            layoutPath: layoutPath ?? getDefaultLayoutPath(state.zipPackage),
            insertAt: position !== undefined ? position - 1 : undefined,
          },
        ],
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      refreshPresentation(state);
      return { slideNumber: state.slideCount };
    },

    async removeSlide(slideNumber: number): Promise<RemoveSlideResult> {
      if (!state.zipPackage) {
        throw new Error("No active session");
      }

      if (slideNumber < 1 || slideNumber > state.slideCount) {
        throw new Error(`Invalid slide number: ${slideNumber}. Valid range: 1-${state.slideCount}`);
      }

      const result = await applySlideOperations(state.zipPackage, {
        removeSlides: [{ slideNumber }],
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      refreshPresentation(state);
      return { removedSlideNumber: slideNumber, newSlideCount: state.slideCount };
    },

    async reorderSlide(fromPosition: number, toPosition: number): Promise<ReorderSlideResult> {
      if (!state.zipPackage) {
        throw new Error("No active session");
      }

      if (fromPosition < 1 || fromPosition > state.slideCount) {
        throw new Error(`Invalid from position: ${fromPosition}. Valid range: 1-${state.slideCount}`);
      }
      if (toPosition < 1 || toPosition > state.slideCount) {
        throw new Error(`Invalid to position: ${toPosition}. Valid range: 1-${state.slideCount}`);
      }

      const result = await applySlideOperations(state.zipPackage, {
        reorderSlides: [{ from: fromPosition - 1, to: toPosition - 1 }],
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      refreshPresentation(state);
      return { fromPosition, toPosition };
    },

    async duplicateSlide(sourceSlideNumber: number, insertAt?: number): Promise<DuplicateSlideResult> {
      if (!state.zipPackage) {
        throw new Error("No active session");
      }

      if (sourceSlideNumber < 1 || sourceSlideNumber > state.slideCount) {
        throw new Error(`Invalid source slide: ${sourceSlideNumber}. Valid range: 1-${state.slideCount}`);
      }

      const insertPosition = insertAt !== undefined ? insertAt - 1 : undefined;
      const result = await applySlideOperations(state.zipPackage, {
        duplicateSlides: [{ sourceSlideNumber, insertAt: insertPosition }],
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      refreshPresentation(state);
      return { sourceSlideNumber, newSlideNumber: state.slideCount };
    },

    async modifySlide(input: SlideModInput): Promise<ModifySlideResult> {
      if (!state.zipPackage || !state.presentation) {
        throw new Error("No active session");
      }

      return processSlideElements(
        { zipPackage: state.zipPackage, presentation: state.presentation, specDir: state.specDir },
        input,
      );
    },

    async addShape(slideNumber: number, spec: ShapeSpec): Promise<AddShapeResult> {
      if (!state.presentation) {
        throw new Error("No active session");
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const existingIds = getExistingShapeIds(apiSlide);
      const nextId = String(Math.max(0, ...existingIds.map(Number).filter((n) => !Number.isNaN(n))) + 1);

      await session.modifySlide({ slideNumber, addShapes: [spec] });

      return { shapeId: nextId };
    },

    async addImage(slideNumber: number, spec: Omit<ImageSpec, "type">): Promise<AddImageResult> {
      if (!state.presentation) {
        throw new Error("No active session");
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const existingIds = getExistingShapeIds(apiSlide);
      const nextId = String(Math.max(0, ...existingIds.map(Number).filter((n) => !Number.isNaN(n))) + 1);

      await session.modifySlide({ slideNumber, addImages: [{ ...spec, type: "image" }] });

      return { imageId: nextId };
    },

    async addConnector(slideNumber: number, spec: Omit<ConnectorSpec, "type">): Promise<AddConnectorResult> {
      if (!state.presentation) {
        throw new Error("No active session");
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const existingIds = getExistingShapeIds(apiSlide);
      const nextId = String(Math.max(0, ...existingIds.map(Number).filter((n) => !Number.isNaN(n))) + 1);

      await session.modifySlide({ slideNumber, addConnectors: [{ ...spec, type: "connector" }] });

      return { connectorId: nextId };
    },

    async addTable(slideNumber: number, spec: Omit<TableSpec, "type">): Promise<AddTableResult> {
      if (!state.presentation) {
        throw new Error("No active session");
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const existingIds = getExistingShapeIds(apiSlide);
      const nextId = String(Math.max(0, ...existingIds.map(Number).filter((n) => !Number.isNaN(n))) + 1);

      await session.modifySlide({ slideNumber, addTables: [{ ...spec, type: "table" }] });

      return { tableId: nextId };
    },

    async addGroup(slideNumber: number, spec: Omit<GroupSpec, "type">): Promise<AddGroupResult> {
      if (!state.presentation) {
        throw new Error("No active session");
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const existingIds = getExistingShapeIds(apiSlide);
      const nextId = String(Math.max(0, ...existingIds.map(Number).filter((n) => !Number.isNaN(n))) + 1);

      await session.modifySlide({ slideNumber, addGroups: [{ ...spec, type: "group" }] });

      return { groupId: nextId };
    },

    async updateTable(slideNumber: number, spec: TableUpdateSpec): Promise<UpdateTableResult> {
      if (!state.presentation) {
        throw new Error("No active session");
      }

      await session.modifySlide({ slideNumber, updateTables: [spec] });

      return { updated: true };
    },

    async setTransition(slideNumber: number, spec: SlideTransitionSpec): Promise<SetTransitionResult> {
      if (!state.zipPackage || !state.presentation) {
        throw new Error("No active session");
      }

      if (slideNumber < 1 || slideNumber > state.slideCount) {
        throw new Error(`Invalid slide: ${slideNumber}. Valid range: 1-${state.slideCount}`);
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const slidePath = `ppt/slides/${apiSlide.filename}.xml`;
      const slideXml = state.zipPackage.readText(slidePath);
      if (!slideXml) {
        throw new Error(`Could not read slide XML: ${slidePath}`);
      }

      const slideDoc = parseXml(slideXml);
      const updatedDoc = applySlideTransition(slideDoc, spec);
      const updatedXml = serializeDocument(updatedDoc, { declaration: true, standalone: true });
      state.zipPackage.writeText(slidePath, updatedXml);

      return { applied: true };
    },

    async addAnimations(slideNumber: number, specs: readonly AnimationSpec[]): Promise<AddAnimationsResult> {
      if (!state.zipPackage || !state.presentation) {
        throw new Error("No active session");
      }

      if (slideNumber < 1 || slideNumber > state.slideCount) {
        throw new Error(`Invalid slide: ${slideNumber}. Valid range: 1-${state.slideCount}`);
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const slidePath = `ppt/slides/${apiSlide.filename}.xml`;
      const slideXml = state.zipPackage.readText(slidePath);
      if (!slideXml) {
        throw new Error(`Could not read slide XML: ${slidePath}`);
      }

      const slideDoc = parseXml(slideXml);
      const result = applyAnimations(slideDoc, specs);
      const updatedXml = serializeDocument(result.doc, { declaration: true, standalone: true });
      state.zipPackage.writeText(slidePath, updatedXml);

      return { animationsAdded: result.added };
    },

    async addComments(slideNumber: number, specs: readonly CommentSpec[]): Promise<AddCommentsResult> {
      if (!state.zipPackage || !state.presentation) {
        throw new Error("No active session");
      }

      if (slideNumber < 1 || slideNumber > state.slideCount) {
        throw new Error(`Invalid slide: ${slideNumber}. Valid range: 1-${state.slideCount}`);
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const slidePath = `ppt/slides/${apiSlide.filename}.xml`;

      applyComments(state.zipPackage, slidePath, specs);

      return { commentsAdded: specs.length };
    },

    async setSpeakerNotes(slideNumber: number, spec: NotesSpec): Promise<SetSpeakerNotesResult> {
      if (!state.zipPackage || !state.presentation) {
        throw new Error("No active session");
      }

      if (slideNumber < 1 || slideNumber > state.slideCount) {
        throw new Error(`Invalid slide: ${slideNumber}. Valid range: 1-${state.slideCount}`);
      }

      const apiSlide = state.presentation.getSlide(slideNumber);
      const slidePath = `ppt/slides/${apiSlide.filename}.xml`;

      applyNotes(state.zipPackage, slidePath, spec);

      return { applied: true };
    },

    applyTheme(theme: ThemeEditSpec): void {
      if (!state.zipPackage) {
        throw new Error("No active session");
      }
      applyThemeEditsToPackage(state.zipPackage, theme);
    },

    renderSlide(slideNumber: number): RenderResult {
      if (!state.zipPackage || !state.presentation) {
        throw new Error("No active session");
      }

      if (slideNumber < 1 || slideNumber > state.slideCount) {
        throw new Error(`Invalid slide: ${slideNumber}. Valid range: 1-${state.slideCount}`);
      }

      const slideSize = state.presentation.size;

      try {
        const apiSlide = state.presentation.getSlide(slideNumber);
        const renderContext = createRenderContext({
          apiSlide: apiSlide as ApiSlide,
          zip: createZipFileAdapter(state.zipPackage),
          slideSize,
        });

        const domainSlide = parseSlide(apiSlide.content);
        if (!domainSlide) {
          return { svg: createEmptySlideSvg(slideSize), warnings: [{ message: "Failed to parse slide" }] };
        }

        const result = renderSlideSvg(domainSlide, renderContext);
        return { svg: result.svg, warnings: result.warnings.map((w) => ({ message: w.message })) };
      } catch (error) {
        return { svg: createEmptySlideSvg(slideSize), warnings: [{ message: (error as Error).message }] };
      }
    },

    async exportBuffer(): Promise<ArrayBuffer> {
      if (!state.zipPackage) {
        throw new Error("No active session");
      }
      return state.zipPackage.toArrayBuffer();
    },

    getInfo(): SessionInfo | null {
      if (!state.presentation) {
        return null;
      }
      return {
        slideCount: state.slideCount,
        width: state.presentation.size.width,
        height: state.presentation.size.height,
        title: state.title,
      };
    },

    getSlideCount: () => state.slideCount,

    isActive: () => state.zipPackage !== null,
  };

  return session;
}
