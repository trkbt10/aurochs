/**
 * @file PPTX Exporter Tests
 *
 * Unit tests for the PPTX exporter.
 * Integration tests with real PPTX files are in spec/pptx-roundtrip.spec.ts
 */

import type { PresentationDocument } from "../app/presentation-document";
import type { PresentationFile, ZipFile } from "../domain";
import type { XmlDocument } from "@oxen/xml";
import { exportPptx, exportPptxAsBuffer } from "./pptx-exporter";
import { DEFAULT_RENDER_OPTIONS } from "../render/render-options";
import { px } from "@oxen/ooxml/domain/units";

const mockZip: ZipFile = { file: () => null };

describe("exportPptx", () => {
  describe("validation", () => {
    it("throws if presentationFile is missing", async () => {
      const doc: PresentationDocument = {
        presentation: {} as PresentationDocument["presentation"],
        slides: [],
        slideWidth: px(960),
        slideHeight: px(540),
        colorContext: {} as PresentationDocument["colorContext"],
        resources: {} as PresentationDocument["resources"],
        // presentationFile is undefined
      };

      await expect(exportPptx(doc)).rejects.toThrow(
        "PresentationDocument must have a presentationFile for export",
      );
    });
  });

  describe("with mock PresentationFile", () => {
    /**
     * Create a minimal mock PresentationFile for testing
     */
    function createMockPresentationFile(files: Record<string, string>): PresentationFile {
      const filePaths = Object.keys(files);
      return {
        readText(path: string): string | null {
          return files[path] ?? null;
        },
        readBinary(path: string): ArrayBuffer | null {
          const text = files[path];
          if (!text) return null;
          const encoder = new TextEncoder();
          return encoder.encode(text).buffer;
        },
        exists(path: string): boolean {
          return path in files;
        },
        listFiles(): readonly string[] {
          return filePaths;
        },
      };
    }

    it("exports a minimal PPTX structure", async () => {
      const mockFiles: Record<string, string> = {
        "[Content_Types].xml": '<?xml version="1.0"?><Types/>',
        "_rels/.rels": '<?xml version="1.0"?><Relationships/>',
        "ppt/presentation.xml": '<?xml version="1.0"?><p:presentation/>',
        "ppt/_rels/presentation.xml.rels": '<?xml version="1.0"?><Relationships/>',
        "ppt/slides/slide1.xml": '<?xml version="1.0"?><p:sld/>',
      };

      const mockContent: XmlDocument = {
        children: [
          {
            type: "element",
            name: "p:sld",
            attrs: {},
            children: [
              {
                type: "element",
                name: "p:cSld",
                attrs: {},
                children: [],
              },
            ],
          },
        ],
      };

      const doc: PresentationDocument = {
        presentation: {} as PresentationDocument["presentation"],
        slides: [
          {
            id: "slide1",
            slide: {
              shapes: [],
            },
            apiSlide: {
              number: 1,
              filename: "slide1",
              content: mockContent,
              layout: null,
              layoutTables: { idTable: {}, idxTable: new Map(), typeTable: {} },
              master: null,
              masterTables: { idTable: {}, idxTable: new Map(), typeTable: {} },
              masterTextStyles: undefined,
              theme: null,
              relationships: {
                getTarget: () => undefined,
                getType: () => undefined,
                getTargetByType: () => undefined,
                getAllTargetsByType: () => [],
              },
              layoutRelationships: {
                getTarget: () => undefined,
                getType: () => undefined,
                getTargetByType: () => undefined,
                getAllTargetsByType: () => [],
              },
              masterRelationships: {
                getTarget: () => undefined,
                getType: () => undefined,
                getTargetByType: () => undefined,
                getAllTargetsByType: () => [],
              },
              themeRelationships: {
                getTarget: () => undefined,
                getType: () => undefined,
                getTargetByType: () => undefined,
                getAllTargetsByType: () => [],
              },
              diagram: null,
              diagramRelationships: {
                getTarget: () => undefined,
                getType: () => undefined,
                getTargetByType: () => undefined,
                getAllTargetsByType: () => [],
              },
              timing: undefined,
              transition: undefined,
              themeOverrides: [],
              zip: mockZip,
              defaultTextStyle: null,
              tableStyles: null,
              slideSize: { width: px(960), height: px(540) },
              renderOptions: DEFAULT_RENDER_OPTIONS,
            },
          },
        ],
        slideWidth: px(960),
        slideHeight: px(540),
        colorContext: {} as PresentationDocument["colorContext"],
        resources: {} as PresentationDocument["resources"],
        presentationFile: createMockPresentationFile(mockFiles),
      };

      const result = await exportPptx(doc);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
      expect(result.blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
    });
  });
});

describe("exportPptxAsBuffer", () => {
  it("throws if presentationFile is missing", async () => {
    const doc: PresentationDocument = {
      presentation: {} as PresentationDocument["presentation"],
      slides: [],
      slideWidth: px(960),
      slideHeight: px(540),
      colorContext: {} as PresentationDocument["colorContext"],
      resources: {} as PresentationDocument["resources"],
    };

    await expect(exportPptxAsBuffer(doc)).rejects.toThrow(
      "PresentationDocument must have a presentationFile for export",
    );
  });
});
