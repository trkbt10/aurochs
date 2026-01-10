/**
 * @file WordArt Thumbnail Generator
 *
 * Generates static thumbnail images for WordArt presets using a single
 * shared WebGL renderer to avoid context exhaustion.
 *
 * Browser limits: ~8-16 active WebGL contexts
 * Solution: Render once, convert to data URL, dispose renderer
 */

import { useState, useEffect, useRef } from "react";
import { createText3DRendererAsync, type Text3DRenderConfig } from "@lib/pptx/render/webgl/text3d";
import { extractText3DRuns } from "@lib/pptx/render/react/primitives";
import type { DemoWordArtPreset } from "./wordart-demo-presets";
import {
  demoColorContext,
  createTextBody,
  createParagraph,
  createTextRun,
  createRunProperties,
  getPrimaryColor,
  demoFillToMaterial3DFill,
  buildShape3dFromPreset,
  buildScene3dFromPreset,
} from "./demo-utils";

// =============================================================================
// Thumbnail Generation
// =============================================================================

type ThumbnailCache = Map<string, string>;

/**
 * Generate a single thumbnail data URL for a preset
 */
async function generateThumbnail(
  preset: DemoWordArtPreset,
  width: number,
  height: number,
): Promise<string> {
  const primaryColor = getPrimaryColor(preset);
  const fill = demoFillToMaterial3DFill(preset.fill);

  const fontFamily = preset.fontFamily ?? "Arial";
  const textBody = createTextBody([
    createParagraph([
      createTextRun("Aa", createRunProperties({
        fontSize: 14,
        fontFamily,
        bold: preset.bold === true,
        italic: preset.italicAngle !== undefined,
        color: primaryColor,
      })),
    ]),
  ]);

  // Use library function for layout
  const baseRuns = extractText3DRuns(
    textBody,
    width,
    height,
    demoColorContext,
    undefined,
    undefined,
    () => undefined,
  );
  const runs = baseRuns.map((run) => ({ ...run, fill }));

  const config: Text3DRenderConfig = {
    runs,
    width,
    height,
    pixelRatio: 1, // Lower quality for thumbnails
    scene3d: buildScene3dFromPreset(preset),
    shape3d: buildShape3dFromPreset(preset, {
      maxExtrusion: 15,
      maxBevelWidth: 3,
      maxBevelHeight: 3,
    }),
  };

  try {
    const renderer = await createText3DRendererAsync(config);
    renderer.render();
    const dataUrl = renderer.getCanvas().toDataURL("image/png");
    renderer.dispose();
    return dataUrl;
  } catch (error) {
    console.warn(`Failed to generate thumbnail for ${preset.id}:`, error);
    return "";
  }
}

/**
 * Hook to generate WordArt thumbnails as static images.
 * Uses a queue to render one at a time, avoiding WebGL context exhaustion.
 */
export function useWordArtThumbnails(presets: readonly DemoWordArtPreset[]): ThumbnailCache {
  const [thumbnails, setThumbnails] = useState<ThumbnailCache>(new Map());
  const isGeneratingRef = useRef(false);
  const queueRef = useRef<DemoWordArtPreset[]>([]);

  useEffect(() => {
    // Reset on preset change
    setThumbnails(new Map());
    queueRef.current = [...presets];

    const processQueue = async () => {
      if (isGeneratingRef.current) {return;}
      isGeneratingRef.current = true;

      while (queueRef.current.length > 0) {
        const preset = queueRef.current.shift();
        if (!preset) {continue;}

        // Small delay between renders to let browser release resources
        await new Promise((resolve) => setTimeout(resolve, 50));

        const dataUrl = await generateThumbnail(preset, 100, 40);

        setThumbnails((prev) => {
          const next = new Map(prev);
          next.set(preset.id, dataUrl);
          return next;
        });
      }

      isGeneratingRef.current = false;
    };

    processQueue();

    return () => {
      // Cancel pending work
      queueRef.current = [];
      isGeneratingRef.current = false;
    };
  }, [presets]);

  return thumbnails;
}
