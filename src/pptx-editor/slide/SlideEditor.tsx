/**
 * @file Slide editor component
 *
 * Main component that integrates all slide editing functionality.
 */

import { useRef, useEffect, useMemo, type CSSProperties } from "react";
import type { Slide } from "../../pptx/domain";
import type { Pixels } from "../../pptx/domain/types";
import type { EditorProps } from "../types";
import type { RenderContext } from "../../pptx/render/context";
import { renderSlideSvg } from "../../pptx/render/svg/renderer";
import { SlideEditorProvider, useSlideEditor } from "../context/SlideEditorContext";
import { SlideCanvas } from "./SlideCanvas";
import { ShapeSelector } from "./ShapeSelector";
import { PropertyPanel } from "./PropertyPanel";
import { ShapeToolbar } from "./ShapeToolbar";
import {
  useDragMove,
  useDragResize,
  useDragRotate,
  useKeyboardShortcuts,
} from "./hooks";

// =============================================================================
// Types
// =============================================================================

export type SlideEditorProps = EditorProps<Slide> & {
  /** Slide width */
  readonly width: Pixels;
  /** Slide height */
  readonly height: Pixels;
  /** Pre-rendered SVG content (takes precedence over renderContext) */
  readonly svgContent?: string;
  /**
   * Render context for integrated SVG rendering.
   * When provided, the editor will automatically re-render the slide to SVG on changes.
   * This enables full-fidelity rendering of all shape types including tables, charts, diagrams.
   */
  readonly renderContext?: RenderContext;
  /** Show property panel */
  readonly showPropertyPanel?: boolean;
  /** Show toolbar */
  readonly showToolbar?: boolean;
  /** Property panel position */
  readonly propertyPanelPosition?: "left" | "right";
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Internal Editor Component
// =============================================================================

type SlideEditorInternalProps = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly svgContent?: string;
  readonly renderContext?: RenderContext;
  readonly showPropertyPanel: boolean;
  readonly showToolbar: boolean;
  readonly propertyPanelPosition: "left" | "right";
  readonly onChange: (slide: Slide) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
};

function SlideEditorInternal({
  width,
  height,
  svgContent: externalSvgContent,
  renderContext,
  showPropertyPanel,
  showToolbar,
  propertyPanelPosition,
  onChange,
  className,
  style,
}: SlideEditorInternalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { slide } = useSlideEditor();

  // Integrated SVG rendering: re-render when slide changes
  const renderedSvgContent = useMemo(() => {
    // External svgContent takes precedence
    if (externalSvgContent !== undefined) {
      return externalSvgContent;
    }
    // If renderContext is provided, render the slide to SVG
    if (renderContext !== undefined) {
      const result = renderSlideSvg(slide, renderContext);
      return result.svg;
    }
    // No rendering - will use fallback in SlideCanvas
    return undefined;
  }, [slide, externalSvgContent, renderContext]);

  // Set up drag hooks
  useDragMove({
    width,
    height,
    containerRef,
  });

  useDragResize({
    width,
    height,
    containerRef,
  });

  useDragRotate({
    width,
    height,
    containerRef,
  });

  // Set up keyboard shortcuts
  useKeyboardShortcuts();

  // Sync changes back to parent
  const prevSlideRef = useRef(slide);
  useEffect(() => {
    if (prevSlideRef.current !== slide) {
      onChange(slide);
      prevSlideRef.current = slide;
    }
  }, [slide, onChange]);

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: propertyPanelPosition === "right" ? "row" : "row-reverse",
    gap: "16px",
    height: "100%",
    ...style,
  };

  const canvasAreaStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
  };

  const canvasContainerStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "var(--editor-canvas-bg, #1a1a1a)",
    borderRadius: "var(--radius-md, 8px)",
    padding: "24px",
  };

  // Calculate canvas wrapper dimensions maintaining aspect ratio
  const aspectRatio = (width as number) / (height as number);
  const canvasWrapperStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: `calc((100vh - 200px) * ${aspectRatio})`, // Limit by viewport height
    aspectRatio: `${width} / ${height}`,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
    backgroundColor: "white", // Slide background
  };

  const propertyPanelStyle: CSSProperties = {
    width: "280px",
    flexShrink: 0,
    backgroundColor: "var(--editor-panel-bg, #0a0a0a)",
    borderRadius: "var(--radius-md, 8px)",
    border: "1px solid var(--editor-border, #222)",
    overflow: "auto",
  };

  const toolbarStyle: CSSProperties = {
    backgroundColor: "var(--editor-panel-bg, #0a0a0a)",
    borderRadius: "var(--radius-md, 8px)",
    border: "1px solid var(--editor-border, #222)",
  };

  return (
    <div className={className} style={containerStyle}>
      {/* Property Panel */}
      {showPropertyPanel && (
        <div style={propertyPanelStyle}>
          <PropertyPanel />
        </div>
      )}

      {/* Canvas Area */}
      <div style={canvasAreaStyle}>
        {/* Toolbar */}
        {showToolbar && (
          <div style={toolbarStyle}>
            <ShapeToolbar direction="horizontal" />
          </div>
        )}

        {/* Canvas */}
        <div style={canvasContainerStyle}>
          <div ref={containerRef} style={canvasWrapperStyle}>
            <SlideCanvas
              svgContent={renderedSvgContent}
              width={width}
              height={height}
            />
            <ShapeSelector width={width} height={height} />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Slide editor with canvas, property panel, and toolbar.
 *
 * @example
 * ```tsx
 * // With external SVG content (pre-rendered)
 * <SlideEditor
 *   value={slide}
 *   onChange={handleSlideChange}
 *   width={px(960)}
 *   height={px(540)}
 *   svgContent={renderedSvg}
 * />
 *
 * // With integrated rendering (auto re-renders on edit)
 * <SlideEditor
 *   value={slide}
 *   onChange={handleSlideChange}
 *   width={px(960)}
 *   height={px(540)}
 *   renderContext={ctx}
 * />
 * ```
 */
export function SlideEditor({
  value,
  onChange,
  width,
  height,
  svgContent,
  renderContext,
  showPropertyPanel = true,
  showToolbar = true,
  propertyPanelPosition = "right",
  className,
  style,
}: SlideEditorProps) {
  return (
    <SlideEditorProvider initialSlide={value}>
      <SlideEditorInternal
        width={width}
        height={height}
        svgContent={svgContent}
        renderContext={renderContext}
        showPropertyPanel={showPropertyPanel}
        showToolbar={showToolbar}
        propertyPanelPosition={propertyPanelPosition}
        onChange={onChange}
        className={className}
        style={style}
      />
    </SlideEditorProvider>
  );
}
