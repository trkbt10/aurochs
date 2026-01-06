/**
 * @file Core types for render
 *
 * Shared types used by both HTML and SVG renderers.
 */

import type { ColorContext, FontScheme } from "../../domain/resolution";
import type { SlideSize, Shape } from "../../domain";

// =============================================================================
// Render Options
// =============================================================================

/**
 * Rendering dialect
 */
export type RenderDialect = "ecma376" | "libreoffice" | "powerpoint";

/**
 * Line spacing calculation mode
 */
export type LineSpacingMode = "standard" | "compat";

/**
 * Baseline alignment mode
 */
export type BaselineMode = "standard" | "css";

/**
 * Table scaling mode
 *
 * Controls how tables are sized when their natural dimensions
 * differ from the graphicFrame's xfrm.
 *
 * - natural: Use table's natural size (ECMA-376 compliant)
 * - stretchToFit: Scale to fill xfrm (PowerPoint-like)
 * - uniformFit: Scale uniformly to fit xfrm (preserves aspect ratio)
 */
export type TableScalingMode = "natural" | "stretchToFit" | "uniformFit";

/**
 * Render options
 */
export type RenderOptions = {
  readonly dialect: RenderDialect;
  readonly lineSpacingMode: LineSpacingMode;
  readonly baselineMode: BaselineMode;
  readonly libreofficeLineSpacingFactor: number;
  readonly libreofficeAscenderOverride?: number;
  readonly tableScalingMode: TableScalingMode;
  /**
   * Enable WebGL 3D text rendering.
   * When true, text with complex 3D effects uses WebGL/Three.js instead of SVG.
   * @default true
   */
  readonly enable3DText?: boolean;
};

/**
 * Default render options
 */
export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  dialect: "ecma376",
  lineSpacingMode: "standard",
  baselineMode: "standard",
  libreofficeLineSpacingFactor: 1,
  tableScalingMode: "natural", // ECMA-376 compliant: no scaling
};

// =============================================================================
// Resource Resolution
// =============================================================================

/**
 * Resource resolver for looking up embedded resources
 */
export type ResourceResolver = {
  /**
   * Resolve a resource ID to a data URL or path
   */
  readonly resolve: (id: string) => string | undefined;

  /**
   * Get MIME type for a resource
   */
  readonly getMimeType: (id: string) => string | undefined;

  /**
   * Get raw file path for a resource ID (without converting to data URL)
   */
  readonly getFilePath: (id: string) => string | undefined;

  /**
   * Read raw file content from path
   */
  readonly readFile: (path: string) => Uint8Array | null;

  /**
   * Get the first resource path matching a relationship type
   * @see ECMA-376 Part 2 (Open Packaging Conventions)
   */
  readonly getResourceByType?: (relType: string) => string | undefined;
};

// =============================================================================
// Warning Collection
// =============================================================================

/**
 * Render warning
 */
export type RenderWarning = {
  readonly type: "unsupported" | "fallback" | "error";
  readonly message: string;
  readonly element?: string;
  /** Additional details such as ECMA-376 specification references */
  readonly details?: string;
};

/**
 * Warning collector
 */
export type WarningCollector = {
  readonly add: (warning: RenderWarning) => void;
  readonly getAll: () => readonly RenderWarning[];
  readonly hasErrors: () => boolean;
};

// =============================================================================
// Resolved Background
// =============================================================================

/**
 * Resolved background fill (after inheritance resolution).
 *
 * This is separate from domain types because:
 * 1. Domain types represent ECMA-376 structure (resourceId references)
 * 2. This represents the resolved result (data URLs, computed values)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path) for radial/path gradients
 */
export type ResolvedBackgroundFill =
  | { readonly type: "solid"; readonly color: string }
  | {
      readonly type: "gradient";
      readonly angle: number;
      readonly stops: readonly { readonly position: number; readonly color: string }[];
      /**
       * True if this is a radial (path) gradient.
       * Per ECMA-376 Part 1, Section 20.1.8.46 (a:path):
       * - path="circle" creates a circular radial gradient
       * - path="rect" creates a rectangular gradient
       * - path="shape" follows the shape boundary
       */
      readonly isRadial?: boolean;
      /**
       * Center position for radial gradients (percentages 0-100).
       * Derived from a:fillToRect element.
       * Default is center (50%, 50%) when not specified.
       */
      readonly radialCenter?: { readonly cx: number; readonly cy: number };
    }
  | { readonly type: "image"; readonly dataUrl: string; readonly mode: "stretch" | "tile" };

// =============================================================================
// Core Render Context (format-agnostic)
// =============================================================================

/**
 * Core render context shared by both HTML and SVG renderers.
 * Does NOT include format-specific utilities like StyleCollector.
 */
export type CoreRenderContext = {
  /** Slide dimensions */
  readonly slideSize: SlideSize;

  /** Render options */
  readonly options: RenderOptions;

  /** Color resolution context */
  readonly colorContext: ColorContext;

  /** Resource resolver */
  readonly resources: ResourceResolver;

  /** Warning collector */
  readonly warnings: WarningCollector;

  /** Current shape ID counter */
  readonly getNextShapeId: () => string;

  /**
   * Pre-resolved background fill (after slide → layout → master inheritance).
   * If provided, this takes precedence over the slide's parsed background.
   */
  readonly resolvedBackground?: ResolvedBackgroundFill;

  /**
   * Font scheme for resolving theme font references (+mj-lt, +mn-lt, etc.).
   * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
   */
  readonly fontScheme?: FontScheme;

  /**
   * Non-placeholder shapes from slide layout.
   * These are decorative shapes that should be rendered behind slide content.
   *
   * Per ECMA-376 Part 1, Section 19.3.1.39 (sldLayout):
   * Layout shapes provide visual decoration that is inherited by slides.
   * Only non-placeholder shapes are included here.
   *
   * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
   */
  readonly layoutShapes?: readonly Shape[];
};
