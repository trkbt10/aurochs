/**
 * @file WebGL canvas component for rendering SceneGraph via GPU
 */

import { useRef, useEffect } from "react";
import type { SceneGraph } from "@aurochs-renderer/fig/scene-graph";
import { createWebGLFigmaRenderer, type WebGLFigmaRendererInstance } from "@aurochs-renderer/fig/webgl";

type Props = {
  readonly sceneGraph: SceneGraph | null;
  readonly width: number;
  readonly height: number;
};

/** WebGL canvas that renders a SceneGraph */
export function WebGLCanvas({ sceneGraph, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLFigmaRendererInstance | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sceneGraph) return;

    if (!rendererRef.current) {
      try {
        rendererRef.current = createWebGLFigmaRenderer({
          canvas,
          antialias: true,
          pixelRatio: 1,
          backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
        });
      } catch (e) {
        console.error("Failed to initialize WebGL renderer:", e);
        return;
      }
    }

    const renderer = rendererRef.current;
    renderSceneAsync(renderer, canvas, sceneGraph);
  }, [sceneGraph, width, height]);

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: "100%", display: "block" }}
    />
  );
}

async function renderSceneAsync(
  renderer: WebGLFigmaRendererInstance,
  canvas: HTMLCanvasElement,
  sceneGraph: SceneGraph,
) {
  try {
    await renderer.prepareScene(sceneGraph);
    renderer.render(sceneGraph);
    syncCanvasCssSize(canvas);
  } catch (e) {
    console.error("WebGL render error:", e);
  }
}

function syncCanvasCssSize(canvas: HTMLCanvasElement): void {
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
}
