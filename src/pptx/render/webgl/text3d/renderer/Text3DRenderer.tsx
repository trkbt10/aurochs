/**
 * @file React component for WebGL 3D text rendering
 *
 * Provides a React wrapper around the Three.js 3D text renderer.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import { useEffect, useRef, type CSSProperties } from "react";
import type { Scene3d, Shape3d } from "../../../../domain/index";
import {
  createText3DRendererAsync,
  shouldUseWebGL3D,
  type Text3DRenderer as IText3DRenderer,
  type Text3DRenderConfig,
  type Text3DRunConfig,
} from "./core";

// =============================================================================
// Component Props
// =============================================================================

/**
 * Configuration for a single text run (re-export for convenience)
 */
export type { Text3DRunConfig };

export type Text3DRendererProps = {
  /** Text runs to render - supports mixed styles */
  readonly runs: readonly Text3DRunConfig[];
  /** 3D scene configuration */
  readonly scene3d?: Scene3d;
  /** 3D shape configuration */
  readonly shape3d?: Shape3d;
  /** Container width in pixels */
  readonly width: number;
  /** Container height in pixels */
  readonly height: number;
  /** CSS class name */
  readonly className?: string;
  /** CSS styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * WebGL 3D text renderer component
 *
 * Renders text with 3D effects using Three.js WebGL renderer.
 * Supports mixed styles - each run can have different font properties and colors.
 * Falls back to display nothing if WebGL is not available.
 */
export function Text3DRenderer({
  runs,
  scene3d,
  shape3d,
  width,
  height,
  className,
  style,
}: Text3DRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<IText3DRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize renderer (async - uses Web Worker for glyph extraction)
  useEffect(() => {
    if (!containerRef.current) {return;}

    // Check if we should use WebGL 3D
    if (!shouldUseWebGL3D(scene3d, shape3d)) {
      return;
    }

    // Check WebGL support
    if (!isWebGLAvailable()) {
      console.warn("WebGL not available, 3D text rendering disabled");
      return;
    }

    const config: Text3DRenderConfig = {
      runs,
      scene3d,
      shape3d,
      width,
      height,
      pixelRatio: window.devicePixelRatio || 1,
    };

    // Track if component is still mounted
    let isMounted = true;
    let animationId: number | null = null;

    // Async initialization
    const initRenderer = async () => {
      try {
        const renderer = await createText3DRendererAsync(config);

        // Check if still mounted after async operation
        if (!isMounted || !containerRef.current) {
          renderer.dispose();
          return;
        }

        rendererRef.current = renderer;
        const canvas = renderer.getCanvas();

        // Style canvas
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";

        // Add to container
        containerRef.current.appendChild(canvas);

        // Render loop
        function animate() {
          if (rendererRef.current && isMounted) {
            rendererRef.current.render();
            animationId = requestAnimationFrame(animate);
          }
        }
        animate();
      } catch (error) {
        console.error("Failed to create 3D text renderer:", error);
      }
    };

    initRenderer();

    return () => {
      // Cleanup
      isMounted = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        const canvas = rendererRef.current.getCanvas();
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []); // Only run on mount

  // Update renderer when props change
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.update({
        runs,
        scene3d,
        shape3d,
        width,
        height,
        pixelRatio: window.devicePixelRatio || 1,
      });
    }
  }, [runs, scene3d, shape3d, width, height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    />
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if WebGL is available
 */
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return gl instanceof WebGLRenderingContext;
  } catch {
    return false;
  }
}

/**
 * Check if 3D text rendering should be used
 */
export function shouldRender3DText(scene3d?: Scene3d, shape3d?: Shape3d): boolean {
  return shouldUseWebGL3D(scene3d, shape3d) && isWebGLAvailable();
}
