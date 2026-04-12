/**
 * @file WebGL canvas component for rendering SceneGraph via GPU
 */

import { useRef, useEffect } from "react";
import type { SceneGraph } from "../../src/scene-graph/types";
import { createWebGLFigmaRenderer, type WebGLFigmaRendererInstance } from "../../src/webgl/renderer";

type Props = {
  readonly sceneGraph: SceneGraph | null;
  readonly width: number;
  readonly height: number;
};






/** WebGL canvas that renders a SceneGraph */
export function WebGLCanvas({ sceneGraph, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLFigmaRendererInstance | null>(null);

  // Single effect: init renderer + render scene graph + cleanup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sceneGraph) {return;}

    // Create renderer (gets a new GL context each time canvas changes)
    if (!rendererRef.current) {
      try {
        rendererRef.current = createWebGLFigmaRenderer({
          canvas,
          antialias: true,
          backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
        });
      } catch (e) {
        console.error("Failed to initialize WebGL renderer:", e);
        return;
      }
    }

    const renderer = rendererRef.current;
    renderSceneAsync(renderer, sceneGraph);
  }, [sceneGraph, width, height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: "100%",
        height: "auto",
        display: "block",
      }}
    />
  );
}

/** Prepare and render a scene graph asynchronously */
async function renderSceneAsync(renderer: WebGLFigmaRenderer, sceneGraph: SceneGraph) {
  try {
    await renderer.prepareScene(sceneGraph);
    renderer.render(sceneGraph);
  } catch (e) {
    console.error("WebGL render error:", e);
  }
}
