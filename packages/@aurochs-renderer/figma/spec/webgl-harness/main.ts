/**
 * @file WebGL test harness entry point
 *
 * Minimal browser entry that exposes a render function for Puppeteer.
 * Receives a SceneGraph JSON, renders it via WebGLFigmaRenderer,
 * and returns a PNG data URL of the canvas.
 */

import type { SceneGraph, SceneNode } from "../../src/scene-graph/types";
import { WebGLFigmaRenderer } from "../../src/webgl/renderer";

declare global {
  interface Window {
    renderSceneGraph: (json: string) => Promise<string>;
  }
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

let renderer: WebGLFigmaRenderer | null = null;

/**
 * Restore Uint8Array fields that were base64-encoded for JSON transport.
 * Walks the scene graph and converts `{ __base64: "..." }` back to Uint8Array.
 */
function restoreUint8Arrays(node: Record<string, unknown>): void {
  for (const key of Object.keys(node)) {
    const val = node[key];
    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>;
      if (typeof obj.__base64 === "string") {
        // Decode base64 to Uint8Array
        const binary = atob(obj.__base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        node[key] = bytes;
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object") {
            restoreUint8Arrays(item as Record<string, unknown>);
          }
        }
      } else {
        restoreUint8Arrays(obj);
      }
    }
  }
}

window.renderSceneGraph = async (json: string): Promise<string> => {
  const sceneGraph = JSON.parse(json) as SceneGraph;

  // Restore Uint8Array fields from base64
  restoreUint8Arrays(sceneGraph as unknown as Record<string, unknown>);

  canvas.width = sceneGraph.width;
  canvas.height = sceneGraph.height;
  canvas.style.width = `${sceneGraph.width}px`;
  canvas.style.height = `${sceneGraph.height}px`;

  if (!renderer) {
    renderer = new WebGLFigmaRenderer({
      canvas,
      pixelRatio: 1,
      antialias: true,
      backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
    });
  }

  await renderer.prepareScene(sceneGraph);
  renderer.render(sceneGraph);

  return canvas.toDataURL("image/png");
};

// Signal readiness
document.title = "ready";
