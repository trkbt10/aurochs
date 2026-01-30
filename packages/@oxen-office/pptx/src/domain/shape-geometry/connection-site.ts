/**
 * @file Connection Site Calculator
 *
 * Calculates resolved connection site positions for connectors.
 * Uses the guide engine to resolve formula-based coordinates.
 *
 * Connection sites are points on a shape where connectors can attach.
 * Each site has a position (x, y) and an angle indicating the
 * preferred incoming connector direction.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.7 (cxn - Connection Site)
 * @see ECMA-376 Part 1, Section 20.1.9.6 (cxnLst - Connection Site List)
 */

import type { CustomGeometry, Geometry } from "../shape";
import type { Degrees, Pixels } from "@oxen-office/ooxml/domain/units";
import { deg, px } from "@oxen-office/ooxml/domain/units";
import {
  createGuideContext,
  evaluateGuides,
  evaluateExpression,
  type GuideContext,
} from "./guide-engine";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved connection site with actual pixel coordinates.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.7
 */
export type ResolvedConnectionSite = {
  /** Connection site index (0-based) */
  readonly index: number;
  /** Resolved X position in pixels */
  readonly x: Pixels;
  /** Resolved Y position in pixels */
  readonly y: Pixels;
  /** Incoming connector angle in degrees */
  readonly angle: Degrees;
};

/**
 * Connection site lookup result
 */
export type ConnectionSiteLookup = {
  /** All resolved connection sites */
  readonly sites: readonly ResolvedConnectionSite[];
  /** Get a specific site by index */
  readonly getSite: (index: number) => ResolvedConnectionSite | undefined;
  /** Total number of sites */
  readonly count: number;
};

// =============================================================================
// Preset Shape Connection Sites
// =============================================================================

/**
 * Default connection sites for preset shapes.
 *
 * Most preset shapes have 4 connection sites at cardinal positions:
 * - Index 0: Top center
 * - Index 1: Right center
 * - Index 2: Bottom center
 * - Index 3: Left center
 *
 * Angles are in degrees, indicating preferred incoming direction:
 * - 270: From above (top site)
 * - 0: From right (right site)
 * - 90: From below (bottom site)
 * - 180: From left (left site)
 *
 * @see ECMA-376 Part 1, Section 20.1.9.18 (prstGeom)
 */
function getPresetConnectionSites(
  preset: string,
  width: number,
  height: number,
): readonly ResolvedConnectionSite[] {
  // Most shapes use the standard 4-point connection sites
  const standardSites: ResolvedConnectionSite[] = [
    { index: 0, x: px(width / 2), y: px(0), angle: deg(270) },         // Top
    { index: 1, x: px(width), y: px(height / 2), angle: deg(0) },      // Right
    { index: 2, x: px(width / 2), y: px(height), angle: deg(90) },     // Bottom
    { index: 3, x: px(0), y: px(height / 2), angle: deg(180) },        // Left
  ];

  // Handle special cases for shapes with different connection site layouts
  switch (preset) {
    case "line":
    case "straightConnector1":
    case "bentConnector2":
    case "bentConnector3":
    case "bentConnector4":
    case "bentConnector5":
    case "curvedConnector2":
    case "curvedConnector3":
    case "curvedConnector4":
    case "curvedConnector5":
      // Lines/connectors have 2 connection sites at start and end
      return [
        { index: 0, x: px(0), y: px(0), angle: deg(180) },             // Start
        { index: 1, x: px(width), y: px(height), angle: deg(0) },      // End
      ];

    case "triangle":
    case "rtTriangle":
      // Triangles may have 3 connection sites at vertices
      return [
        { index: 0, x: px(width / 2), y: px(0), angle: deg(270) },     // Top
        { index: 1, x: px(width), y: px(height), angle: deg(45) },     // Bottom right
        { index: 2, x: px(0), y: px(height), angle: deg(135) },        // Bottom left
      ];

    case "ellipse":
    case "circle":
      // Ellipses use standard 4-point sites on the circumference
      return standardSites;

    case "diamond":
      // Diamonds have sites at the 4 vertices
      return [
        { index: 0, x: px(width / 2), y: px(0), angle: deg(270) },     // Top
        { index: 1, x: px(width), y: px(height / 2), angle: deg(0) },  // Right
        { index: 2, x: px(width / 2), y: px(height), angle: deg(90) }, // Bottom
        { index: 3, x: px(0), y: px(height / 2), angle: deg(180) },    // Left
      ];

    case "hexagon": {
      // Hexagons have 6 connection sites
      return [
        { index: 0, x: px(width / 2), y: px(0), angle: deg(270) },              // Top
        { index: 1, x: px(width), y: px(height * 0.25), angle: deg(315) },      // Top right
        { index: 2, x: px(width), y: px(height * 0.75), angle: deg(45) },       // Bottom right
        { index: 3, x: px(width / 2), y: px(height), angle: deg(90) },          // Bottom
        { index: 4, x: px(0), y: px(height * 0.75), angle: deg(135) },          // Bottom left
        { index: 5, x: px(0), y: px(height * 0.25), angle: deg(225) },          // Top left
      ];
    }

    case "octagon": {
      // Octagons have 8 connection sites
      const oct = 0.293; // ~tan(22.5°) for octagon proportions
      return [
        { index: 0, x: px(width / 2), y: px(0), angle: deg(270) },
        { index: 1, x: px(width * (1 - oct)), y: px(height * oct), angle: deg(315) },
        { index: 2, x: px(width), y: px(height / 2), angle: deg(0) },
        { index: 3, x: px(width * (1 - oct)), y: px(height * (1 - oct)), angle: deg(45) },
        { index: 4, x: px(width / 2), y: px(height), angle: deg(90) },
        { index: 5, x: px(width * oct), y: px(height * (1 - oct)), angle: deg(135) },
        { index: 6, x: px(0), y: px(height / 2), angle: deg(180) },
        { index: 7, x: px(width * oct), y: px(height * oct), angle: deg(225) },
      ];
    }

    default:
      // Default to standard 4-point sites
      return standardSites;
  }
}

// =============================================================================
// Custom Geometry Connection Sites
// =============================================================================

/**
 * Resolve connection sites from custom geometry using the guide engine.
 *
 * Connection site positions in custom geometry may reference guides
 * or use formula expressions that need to be evaluated.
 *
 * @param geom - Custom geometry with connection sites
 * @param width - Shape width in pixels
 * @param height - Shape height in pixels
 * @returns Resolved connection sites with pixel coordinates
 *
 * @see ECMA-376 Part 1, Section 20.1.9.7 (cxn)
 * @see ECMA-376 Part 1, Section 20.1.9.6 (cxnLst)
 */
function resolveCustomConnectionSites(
  geom: CustomGeometry,
  width: number,
  height: number,
): readonly ResolvedConnectionSite[] {
  const sites = geom.connectionSites ?? [];
  if (sites.length === 0) {
    // No custom sites defined - use default 4-point sites
    return getPresetConnectionSites("rect", width, height);
  }

  // Create guide context with shape dimensions and adjust values
  const context = createGuideContext(width, height, geom.adjustValues ?? []);

  // Evaluate all guides first (order matters)
  evaluateGuides(geom.guides ?? [], context);

  // Resolve each connection site
  return sites.map((site, index) => {
    // Resolve position coordinates
    // The position may be stored as Pixels (already converted) or may need
    // formula evaluation. We need to handle both cases.
    const x = resolveCoordinate(site.position.x, context);
    const y = resolveCoordinate(site.position.y, context);

    return {
      index,
      x: px(x),
      y: px(y),
      angle: site.angle,
    };
  });
}

/**
 * Resolve a coordinate value that may be a guide reference or formula.
 *
 * @param value - Coordinate value (may be a number or string reference)
 * @param context - Guide context for resolution
 * @returns Resolved numeric value
 */
function resolveCoordinate(
  value: Pixels | number | string,
  context: GuideContext,
): number {
  // If it's already a number (Pixels brand), use it directly
  if (typeof value === "number") {
    return value;
  }

  // If it's a string, evaluate as expression
  return evaluateExpression(String(value), context);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Calculate resolved connection sites for a geometry.
 *
 * Returns a lookup object that provides access to all connection sites
 * with their resolved pixel coordinates.
 *
 * Per ECMA-376 Part 1, Section 20.1.9.7:
 * - Connection sites specify where connectors can attach to a shape
 * - Each site has a position (x, y) and an incoming angle
 * - The angle indicates the preferred direction for incoming connectors
 *
 * @param geometry - Shape geometry (preset or custom)
 * @param width - Shape width in pixels
 * @param height - Shape height in pixels
 * @returns Connection site lookup with resolved coordinates
 *
 * @see ECMA-376 Part 1, Section 20.1.9.7 (cxn)
 */
export function calculateConnectionSites(
  geometry: Geometry | undefined,
  width: number,
  height: number,
): ConnectionSiteLookup {
  const resolveSites = (): readonly ResolvedConnectionSite[] => {
    if (!geometry) {
      // No geometry - use default rectangle sites
      return getPresetConnectionSites("rect", width, height);
    }
    if (geometry.type === "preset") {
      // Preset geometry - use predefined sites
      return getPresetConnectionSites(geometry.preset, width, height);
    }
    // Custom geometry - resolve using guide engine
    return resolveCustomConnectionSites(geometry, width, height);
  };

  const sites = resolveSites();

  return {
    sites,
    count: sites.length,
    getSite: (index: number) => sites.find((s) => s.index === index),
  };
}

/**
 * Get the connection site position for a connector endpoint.
 *
 * Used when rendering connectors to determine where they should
 * attach to their connected shapes.
 *
 * @param geometry - Target shape geometry
 * @param width - Target shape width
 * @param height - Target shape height
 * @param siteIndex - Connection site index
 * @returns Site position and angle, or undefined if not found
 *
 * @see ECMA-376 Part 1, Section 19.3.1.12 (stCxn/endCxn)
 */
export function getConnectionPoint(
  {
    geometry,
    width,
    height,
    siteIndex,
  }: {
    readonly geometry: Geometry | undefined;
    readonly width: number;
    readonly height: number;
    readonly siteIndex: number;
  },
): { x: Pixels; y: Pixels; angle: Degrees } | undefined {
  const lookup = calculateConnectionSites(geometry, width, height);
  const site = lookup.getSite(siteIndex);

  if (!site) {
    return undefined;
  }

  return {
    x: site.x,
    y: site.y,
    angle: site.angle,
  };
}

/**
 * Calculate the connector endpoint position considering shape transform.
 *
 * Applies shape rotation and flip transforms to the connection site
 * to get the final world-space position.
 *
 * @param siteX - Connection site X in shape coordinates
 * @param siteY - Connection site Y in shape coordinates
 * @param shapeX - Shape X position
 * @param shapeY - Shape Y position
 * @param shapeWidth - Shape width
 * @param shapeHeight - Shape height
 * @param rotation - Shape rotation in degrees
 * @param flipH - Horizontal flip
 * @param flipV - Vertical flip
 * @returns World-space position
 *
 * @see ECMA-376 Part 1, Section 20.1.7.5 (xfrm)
 */
export function transformConnectionPoint(
  {
    siteX,
    siteY,
    shapeX,
    shapeY,
    shapeWidth,
    shapeHeight,
    rotation = 0,
    flipH = false,
    flipV = false,
  }: {
    readonly siteX: number;
    readonly siteY: number;
    readonly shapeX: number;
    readonly shapeY: number;
    readonly shapeWidth: number;
    readonly shapeHeight: number;
    readonly rotation?: number;
    readonly flipH?: boolean;
    readonly flipV?: boolean;
  },
): { x: Pixels; y: Pixels } {
  // Apply flip transforms
  // eslint-disable-next-line no-restricted-syntax
  let x = flipH ? shapeWidth - siteX : siteX;
  // eslint-disable-next-line no-restricted-syntax
  let y = flipV ? shapeHeight - siteY : siteY;

  // Apply rotation around shape center
  if (rotation !== 0) {
    const cx = shapeWidth / 2;
    const cy = shapeHeight / 2;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Translate to origin, rotate, translate back
    const dx = x - cx;
    const dy = y - cy;
    x = cx + dx * cos - dy * sin;
    y = cy + dx * sin + dy * cos;
  }

  // Translate to world coordinates
  return {
    x: px(shapeX + x),
    y: px(shapeY + y),
  };
}
