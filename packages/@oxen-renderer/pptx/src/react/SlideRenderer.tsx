/**
 * @file Slide Renderer
 *
 * Main component for rendering a complete slide as React SVG.
 * Combines background, shapes, and text with proper context providers.
 */

import type { Slide, SlideSize, Shape } from "@oxen-office/pptx/domain";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type { FontScheme } from "@oxen-office/ooxml/domain/font-scheme";
import type { ShapeId } from "@oxen-office/pptx/domain/types";
import type { RenderOptions } from "../render-options";
import type { ResolvedBackgroundFill } from "../background-fill";
import type { ResourceResolver } from "@oxen-office/pptx/domain/resource-resolver";
import type { ResourceStore } from "@oxen-office/pptx/domain/resource-store";
import { RenderProvider, useRenderContext } from "./context";
import { SvgDefsProvider } from "./hooks/useSvgDefs";
import { ResolvedBackgroundRenderer, BackgroundRenderer } from "./Background";
import { ShapeRenderer } from "./ShapeRenderer";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for SlideRenderer
 */
export type SlideRendererProps = {
  /** Slide to render */
  readonly slide: Slide;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
  /** Color context for color resolution */
  readonly colorContext?: ColorContext;
  /** Resource resolver */
  readonly resources?: ResourceResolver;
  /** Resource store for centralized resource management (e.g., uploaded images) */
  readonly resourceStore?: ResourceStore;
  /** Font scheme for theme fonts */
  readonly fontScheme?: FontScheme;
  /** Render options */
  readonly options?: Partial<RenderOptions>;
  /** Pre-resolved background (from inheritance chain) */
  readonly resolvedBackground?: ResolvedBackgroundFill;
  /** ID of shape currently being edited (its text will be hidden) */
  readonly editingShapeId?: ShapeId;
  /**
   * Non-placeholder shapes from slide layout.
   * These are rendered before slide shapes (behind slide content).
   * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
   */
  readonly layoutShapes?: readonly Shape[];
};

/**
 * Props for the inner slide content component
 */
type SlideContentProps = {
  readonly slide: Slide;
  readonly slideSize: SlideSize;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly editingShapeId?: ShapeId;
};

// =============================================================================
// Components
// =============================================================================

/**
 * Renders a complete slide as React SVG elements.
 *
 * This is the main entry point for React-based slide rendering.
 * It sets up all required contexts and renders:
 * 1. Background (solid, gradient, or image)
 * 2. All shapes with their content
 * 3. SVG defs for gradients, patterns, etc.
 *
 * @example
 * ```tsx
 * <svg width={960} height={540} viewBox="0 0 960 540">
 *   <SlideRenderer
 *     slide={slide}
 *     slideSize={{ width: 960, height: 540 }}
 *     colorContext={colorContext}
 *     resources={resources}
 *     editingShapeId={selectedShapeId}
 *   />
 * </svg>
 * ```
 */
export function SlideRenderer({
  slide,
  slideSize,
  colorContext,
  resources,
  resourceStore,
  fontScheme,
  options,
  resolvedBackground,
  editingShapeId,
  layoutShapes,
}: SlideRendererProps) {
  return (
    <RenderProvider
      slideSize={slideSize}
      colorContext={colorContext}
      resources={resources}
      resourceStore={resourceStore}
      fontScheme={fontScheme}
      options={options}
      resolvedBackground={resolvedBackground}
      editingShapeId={editingShapeId}
      layoutShapes={layoutShapes}
    >
      <SvgDefsProvider>
        <SlideContent
          slide={slide}
          slideSize={slideSize}
          resolvedBackground={resolvedBackground}
          editingShapeId={editingShapeId}
        />
      </SvgDefsProvider>
    </RenderProvider>
  );
}

/**
 * Inner component that renders slide content with access to contexts.
 * Each component (background, shapes) renders its own defs inline.
 * Layout shapes are read from context (per ECMA-376 Part 1, Section 19.3.1.39).
 */
function SlideContent({
  slide,
  slideSize,
  resolvedBackground,
  editingShapeId,
}: SlideContentProps) {
  const ctx = useRenderContext();
  const layoutShapes = ctx.layoutShapes;

  return (
    <>
      {/* Background (renders its own defs for gradients) */}
      <SlideBackground
        slide={slide}
        slideSize={slideSize}
        resolvedBackground={resolvedBackground}
      />

      {/* Layout shapes (decorative, rendered behind slide content) */}
      {layoutShapes?.map((shape, index) => (
        <ShapeRenderer
          key={getShapeKey(shape, index, "layout")}
          shape={shape}
        />
      ))}

      {/* Slide shapes (each renders its own defs for gradients/patterns) */}
      {slide.shapes.map((shape, index) => (
        <ShapeRenderer
          key={getShapeKey(shape, index, "slide")}
          shape={shape}
          editingShapeId={editingShapeId}
        />
      ))}
    </>
  );
}

/**
 * Props for SlideBackground
 */
type SlideBackgroundProps = {
  readonly slide: Slide;
  readonly slideSize: SlideSize;
  readonly resolvedBackground?: ResolvedBackgroundFill;
};

/**
 * Renders the slide background.
 */
function SlideBackground({ slide, slideSize, resolvedBackground }: SlideBackgroundProps) {
  if (resolvedBackground !== undefined) {
    return <ResolvedBackgroundRenderer resolvedBackground={resolvedBackground} slideSize={slideSize} />;
  }
  return <BackgroundRenderer background={slide.background} slideSize={slideSize} />;
}

/**
 * Get a unique key for a shape
 */
function getShapeKey(shape: Shape, index: number, prefix: string = "shape"): string {
  // ContentPartShape doesn't have nonVisual, so we check if the property exists
  if ("nonVisual" in shape && shape.nonVisual?.id !== undefined) {
    return `${prefix}-${shape.nonVisual.id}`;
  }
  return `${prefix}-${index}`;
}

// =============================================================================
// Standalone SVG Component
// =============================================================================

/**
 * Props for SlideRendererSvg (includes SVG wrapper)
 */
export type SlideRendererSvgProps = SlideRendererProps & {
  /** Additional className for the SVG element */
  readonly className?: string;
  /** Additional style for the SVG element */
  readonly style?: React.CSSProperties;
  /**
   * Embedded font CSS (@font-face declarations).
   * If provided, will be injected as a <style> element in the SVG.
   * Typically comes from PDF import with embedded fonts.
   */
  readonly embeddedFontCss?: string;
};

/**
 * Renders a complete slide as a standalone SVG element.
 *
 * This is a convenience wrapper that includes the outer SVG element.
 */
export function SlideRendererSvg({
  slide,
  slideSize,
  colorContext,
  resources,
  resourceStore,
  fontScheme,
  options,
  resolvedBackground,
  editingShapeId,
  layoutShapes,
  className,
  style,
  embeddedFontCss,
}: SlideRendererSvgProps) {
  const { width, height } = slideSize;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width={width as number}
      height={height as number}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={style}
    >
      {/* Embedded fonts CSS (from PDF import) */}
      {embeddedFontCss && (
        <style type="text/css">{embeddedFontCss}</style>
      )}
      <SlideRenderer
        slide={slide}
        slideSize={slideSize}
        colorContext={colorContext}
        resources={resources}
        resourceStore={resourceStore}
        fontScheme={fontScheme}
        options={options}
        resolvedBackground={resolvedBackground}
        editingShapeId={editingShapeId}
        layoutShapes={layoutShapes}
      />
    </svg>
  );
}
