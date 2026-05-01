/**
 * @file Effects resolution — shared SoT for SceneGraph Effect → SVG filter attributes
 *
 * Both SVG string and React renderers MUST consume this output.
 *
 * The resolved filter primitives are plain data objects, not SVG strings
 * or React elements. Each consumer formats them for its own output.
 */

import type { Effect, Color, BlendMode } from "../types";
import type { IdGenerator } from "./fill";

// =============================================================================
// Resolved Filter Primitive Types
// =============================================================================

/** SVG feColorMatrix `type` attribute values (see SVG spec). */
export type FeColorMatrixType = "matrix" | "saturate" | "hueRotate" | "luminanceToAlpha";

/**
 * SVG feBlend `mode` attribute values (CSS blend modes supported by SVG).
 * Intersection of SVG spec values and CSS <blend-mode> values.
 */
export type FeBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

/** SVG feComposite `operator` attribute values. */
export type FeCompositeOperator = "over" | "in" | "out" | "atop" | "xor" | "arithmetic";

/**
 * A resolved SVG filter primitive.
 * Each variant corresponds to an SVG filter element with all attributes computed.
 */
export type ResolvedFilterPrimitive =
  | { readonly type: "feFlood"; readonly floodColor?: string; readonly floodOpacity: number; readonly result: string }
  | { readonly type: "feColorMatrix"; readonly in?: string; readonly matrixType: FeColorMatrixType; readonly values: string; readonly result?: string }
  | { readonly type: "feOffset"; readonly in?: string; readonly dx: number; readonly dy: number; readonly result?: string }
  | { readonly type: "feGaussianBlur"; readonly in?: string; readonly stdDeviation: number; readonly result?: string }
  | { readonly type: "feBlend"; readonly mode: FeBlendMode; readonly in?: string; readonly in2?: string; readonly result?: string }
  | {
      readonly type: "feComposite";
      readonly in?: string;
      readonly in2: string;
      readonly operator: FeCompositeOperator;
      readonly k2?: number;
      readonly k3?: number;
      readonly result?: string;
    }
  | { readonly type: "feMorphology"; readonly operator: "dilate" | "erode"; readonly radius: number }
  | { readonly type: "feMerge"; readonly nodes: readonly string[] };

/**
 * Complete resolved filter with all primitives and the filter ID.
 */
export type ResolvedFilter = {
  readonly id: string;
  readonly filterAttr: string;
  readonly primitives: readonly ResolvedFilterPrimitive[];
  /**
   * Filter region in userSpaceOnUse coordinates.
   * Required to prevent shadow/blur clipping — SVG's default filter region
   * (10% margin) is too small for large offsets or blur radii.
   * Set by the caller (resolveWrapper) which knows the element bounds.
   */
  readonly filterBounds?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};


// =============================================================================
// Resolution
// =============================================================================

/**
 * Convert a BlendMode to SVG feBlend mode string.
 * Returns "normal" when no blend mode is specified. Unsupported values
 * (SVG feBlend only supports a subset of CSS blend modes) fall back to
 * "normal" so renderers never emit an illegal attribute value.
 */
function effectBlendModeToSvg(bm: BlendMode | undefined): FeBlendMode {
  if (!bm) { return "normal"; }
  switch (bm) {
    case "multiply":
    case "screen":
    case "darken":
    case "lighten":
    case "overlay":
      return bm;
    default:
      return "normal";
  }
}

const ALPHA_BINARIZE_MATRIX = "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0";

function buildColorMatrix(c: Color): string {
  return `0 0 0 0 ${c.r} 0 0 0 0 ${c.g} 0 0 0 0 ${c.b} 0 0 0 ${c.a} 0`;
}

/**
 * Format a 0–1 color as CSS `rgb(r, g, b)` for SVG `flood-color`.
 * Uses the same half-ULP epsilon as colorToHex so float32 kiwi-encoded
 * channels round consistently across the rendering stack.
 */
function colorToRgb(c: Color): string {
  const r = Math.round(c.r * 255 + 1e-4);
  const g = Math.round(c.g * 255 + 1e-4);
  const b = Math.round(c.b * 255 + 1e-4);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Resolve effects to a filter definition.
 *
 * This is the exhaustive handler — adding a new Effect type without
 * handling it here will produce a TypeScript compile error (via the
 * never check at the bottom of the switch).
 */
export function resolveEffects(
  effects: readonly Effect[],
  ids: IdGenerator,
  elementBounds?: { x: number; y: number; width: number; height: number },
): ResolvedFilter | undefined {
  if (effects.length === 0) {
    return undefined;
  }

  const primitives: ResolvedFilterPrimitive[] = [];
  // Names of every drop-shadow result produced during the loop, in
  // declaration order. The terminal feMerge composites all of them
  // beneath SourceGraphic so multiple shadows accumulate instead of
  // each one overpainting the previous (matches Figma's SVG export
  // which chains `effect1_dropShadow → effect2_dropShadow → ...`).
  const dropShadowResults: string[] = [];

  for (const effect of effects) {
    switch (effect.type) {
      case "drop-shadow": {
        const isSharp = effect.radius === 0 && (!effect.spread || effect.spread === 0);
        const blendMode = effectBlendModeToSvg(effect.blendMode);

        if (isSharp) {
          // Sharp drop-shadow recipe (Figma's exact SVG export shape, used
          // for 1px edge highlights like the world-map continents in
          // Flighty 4×4). Three key differences from the blurred recipe:
          //
          //   1. SourceAlpha is binarised via a 127×alpha colorMatrix
          //      ("hardAlpha"). With anti-aliased edges, the 127× clamp
          //      makes any non-zero alpha → 1, producing a hard mask.
          //
          //   2. **hardAlpha (not SourceAlpha) is offset**. Using
          //      SourceAlpha here would bake the source's anti-aliased
          //      edge into the offset sliver — after feComposite "out"
          //      against the binarised hardAlpha, the sliver retains
          //      the 0.5..0.99 AA values instead of a clean 1.0, so the
          //      tinted shadow ends up ~30-50% transparent at the very
          //      pixels Figma draws at full opacity. Operating on
          //      hardAlpha keeps the sliver cleanly at α=1.0.
          //
          //   3. The offset hardAlpha is then composited with
          //      operator="out" against hardAlpha. "out" means *keep
          //      offsetHardAlpha where hardAlpha is NOT* — the result is
          //      exactly the 1px sliver that the offset exposed beyond
          //      the original shape edge, at full alpha.
          //
          // For tinting we use feFlood + feComposite operator="in" rather
          // than the feColorMatrix approach Figma's exporter uses. The
          // colorMatrix `[0 0 0 0 c.r ...]` form sets RGB to constants
          // while keeping the input alpha — at fully-transparent pixels
          // the output is `(c.r, c.g, c.b, 0)`. resvg-js's feMerge then
          // leaks those RGB constants through to the composited result
          // even though the alpha is zero, painting the entire filter
          // region with the shadow colour. feFlood + composite-in instead
          // produces pre-multiplied output `(c.r·α, c.g·α, c.b·α, α)`
          // with α=0 everywhere outside the sliver, eliminating the leak.
          const c = effect.color;
          const hardAlphaResult = ids.getNextId("hardAlpha");
          const offsetAlphaResult = ids.getNextId("drop-offset-alpha");
          const compositedResult = ids.getNextId("drop-composited");
          const floodResult = ids.getNextId("drop-flood");
          const tintedResult = ids.getNextId("drop-tinted");
          primitives.push(
            { type: "feColorMatrix", in: "SourceAlpha", matrixType: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0", result: hardAlphaResult },
            { type: "feOffset", in: hardAlphaResult, dx: effect.offset.x, dy: effect.offset.y, result: offsetAlphaResult },
            { type: "feComposite", in: offsetAlphaResult, in2: hardAlphaResult, operator: "out", result: compositedResult },
            { type: "feFlood", floodColor: colorToRgb(c), floodOpacity: c.a, result: floodResult },
            { type: "feComposite", in: floodResult, in2: compositedResult, operator: "in", result: tintedResult },
          );
          if (blendMode !== "normal") {
            const blendedResult = ids.getNextId("drop-blended");
            primitives.push({
              type: "feBlend",
              mode: blendMode,
              in: tintedResult,
              in2: "SourceGraphic",
              result: blendedResult,
            });
            dropShadowResults.push(blendedResult);
          } else {
            dropShadowResults.push(tintedResult);
          }
          break;
        }

        // Canonical drop-shadow recipe (matches Figma's exact SVG export):
        //
        //   feColorMatrix(SourceAlpha, 127×) → hardAlpha
        //   feOffset(hardAlpha, dx, dy)      → offsetAlpha
        //   feGaussianBlur(offsetAlpha)      → blurredAlpha
        //   if blendMode != normal:
        //     feComposite(blurredAlpha, in2=hardAlpha, op="out")
        //                                   → outsideAlpha (sliver outside shape)
        //   feColorMatrix(... , [0..r 0..g 0..b 0..0..a])
        //                                   → tinted RGBA shadow
        //
        // Recipe is mode-dependent because Figma's exporter is. For NORMAL
        // blend the shadow is just blurred-offset hardAlpha tinted; the
        // shadow shows through translucent sources (e.g. fill-opacity=0.7
        // rounded rect over its own shadow — without inside-shadow alpha
        // the rect appears too light). For non-NORMAL blends (OVERLAY etc.)
        // the inside-shadow tint would mix into the rounded-corner AA edge
        // pixels, producing the Passport/Flighty pink halo. The composite-
        // out step removes the inside-shape tint so only the outside sliver
        // remains for blend-mode mixing.
        //
        // For tinting we use feColorMatrix (Figma's exporter form). The
        // matrix `[0..r 0..g 0..b 0..0..a]` writes RGB constants and scales
        // the input alpha by `a`. After the "out" composite, alpha is non-
        // zero only in the outside sliver, so the leak that drove the sharp
        // recipe to feFlood+composite-in does not occur here.
        //
        // Spread support: feMorphology dilate/erode is applied between the
        // hardAlpha→offset chain and the blur step.
        const stdDev = effect.radius / 2;
        const c = effect.color;
        const hardAlphaResult = ids.getNextId("hardAlpha");
        const tintedResult = ids.getNextId("drop-tinted");

        primitives.push({
          type: "feColorMatrix",
          in: "SourceAlpha",
          matrixType: "matrix",
          values: ALPHA_BINARIZE_MATRIX,
          result: hardAlphaResult,
        });
        // Figma's exporter chains feOffset → feMorphology(if spread) →
        // feGaussianBlur with implicit pass-through (no `in`/`result`),
        // each consuming the previous primitive's output. We mirror that
        // shape: feOffset reads hardAlpha explicitly; feMorphology and
        // feGaussianBlur omit `in` so they consume the prior result.
        primitives.push({
          type: "feOffset",
          in: hardAlphaResult,
          dx: effect.offset.x,
          dy: effect.offset.y,
        });
        if (effect.spread && effect.spread !== 0) {
          primitives.push({
            type: "feMorphology",
            operator: effect.spread > 0 ? "dilate" : "erode",
            radius: Math.abs(effect.spread),
          });
        }
        primitives.push({ type: "feGaussianBlur", stdDeviation: stdDev });

        if (blendMode !== "normal") {
          const compositedResult = ids.getNextId("drop-composited");
          primitives.push(
            { type: "feComposite", in2: hardAlphaResult, operator: "out", result: compositedResult },
            { type: "feColorMatrix", in: compositedResult, matrixType: "matrix", values: buildColorMatrix(c), result: tintedResult },
            {
              type: "feBlend",
              mode: blendMode,
              in: tintedResult,
              in2: "SourceGraphic",
              result: ids.getNextId("drop-blended"),
            },
          );
          // The blended result is the last-pushed primitive's result.
          const last = primitives[primitives.length - 1];
          if (last.type === "feBlend" && last.result) {
            dropShadowResults.push(last.result);
          }
        } else {
          // NORMAL blend: blurred-hardAlpha is tinted directly with no
          // composite-out. The resulting tinted shadow includes both
          // the outside sliver AND the blurred inside-shape alpha, the
          // latter of which shows through translucent sources.
          primitives.push({
            type: "feColorMatrix",
            matrixType: "matrix",
            values: buildColorMatrix(c),
            result: tintedResult,
          });
          dropShadowResults.push(tintedResult);
        }
        break;
      }

      case "inner-shadow": {
        // Canonical SVG inner-shadow recipe (matches Figma's own SVG export):
        //   1. Flood the filter region with the shadow colour at its alpha.
        //   2. Keep only the portion over the source shape (feComposite "in").
        //   3. Offset and blur that silhouette.
        //   4. Subtract the original source alpha — the parts of the blurred
        //      shadow that remain AFTER subtraction are exactly the pixels
        //      that fell outside the shape, which visually read as "inside"
        //      when composited over the shape.
        //   5. Merge the source graphic under the inner shadow.
        //
        // Previously we binarized SourceAlpha via a feColorMatrix with a
        // 127× multiplier ("hardAlpha"), which destroyed antialiasing on
        // rounded corners and produced a dark halo along curved edges.
        const stdDev = effect.radius / 2;
        const floodResult = ids.getNextId("inner-flood");
        const coloredResult = ids.getNextId("inner-colored");
        const offsetResult = ids.getNextId("inner-offset");
        const blurResult = ids.getNextId("inner-blur");
        const innerResult = ids.getNextId("inner");
        primitives.push(
          { type: "feFlood", floodColor: colorToRgb(effect.color), floodOpacity: effect.color.a, result: floodResult },
          { type: "feComposite", in: floodResult, in2: "SourceAlpha", operator: "in", result: coloredResult },
          { type: "feOffset", in: coloredResult, dx: effect.offset.x, dy: effect.offset.y, result: offsetResult },
          { type: "feGaussianBlur", in: offsetResult, stdDeviation: stdDev, result: blurResult },
          { type: "feComposite", in: blurResult, in2: "SourceAlpha", operator: "out", result: innerResult },
          { type: "feMerge", nodes: ["SourceGraphic", innerResult] },
        );
        break;
      }

      case "layer-blur": {
        const stdDev = effect.radius / 2;
        primitives.push(
          { type: "feGaussianBlur", in: "SourceGraphic", stdDeviation: stdDev },
        );
        break;
      }

      case "background-blur":
        // Background blur not supported in SVG filter pipeline
        break;

      default: {
        // Exhaustiveness check: if a new Effect type is added to the union,
        // TypeScript will report an error here.
        const _exhaustive: never = effect;
        void _exhaustive;
      }
    }
  }

  // Composite every drop shadow under the source graphic in a single
  // terminal feMerge so multiple shadows accumulate. With one shadow
  // this produces feMerge[blur, SourceGraphic] (the prior shape); with
  // N shadows it produces feMerge[blur1, blur2, ..., SourceGraphic].
  if (dropShadowResults.length > 0) {
    primitives.push({
      type: "feMerge",
      nodes: [...dropShadowResults, "SourceGraphic"],
    });
  }

  if (primitives.length === 0) {
    return undefined;
  }

  const id = ids.getNextId("filter");

  // Compute filter bounds from shadow offsets/radii to prevent clipping
  const filterBounds = elementBounds ? computeFilterBounds(effects, elementBounds) : undefined;

  return {
    id,
    filterAttr: `url(#${id})`,
    primitives,
    filterBounds,
  };
}

/**
 * Compute filter region as the union of element bounds and all shadow regions.
 *
 * Each shadow extends the region by its offset + blur radius.
 * Without this, SVG's default 10% filter margin clips large shadows.
 */
function computeFilterBounds(
  effects: readonly Effect[],
  bounds: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  let minX = bounds.x;
  let minY = bounds.y;
  let maxX = bounds.x + bounds.width;
  let maxY = bounds.y + bounds.height;

  for (const effect of effects) {
    if (effect.type === "drop-shadow" || effect.type === "inner-shadow") {
      const offsetX = effect.offset.x;
      const offsetY = effect.offset.y;
      const blurExpansion = effect.radius; // 2 × stdDeviation = 2 × (radius/2) = radius
      const spreadExpansion = effect.spread ?? 0;
      const totalExpansion = blurExpansion + Math.abs(spreadExpansion);

      // Filter region expansion mirrors Figma's SVG exporter. There are
      // two regimes depending on blend mode:
      //
      // NORMAL blend (Thumbnail's drop-shadow, Avatar shadow, etc.):
      //   The shadow blur kernel reaches the full radius on EACH side,
      //   shifted by the offset. Expansion per side = radius ± offset.
      //   Negative expansion clamps to 0. This produces actual's filter
      //   region for Thumbnail (offset 0,2 radius 16): top=14, bottom=18,
      //   left=16, right=16. Verified against actual filter0_d_15_1188:
      //   x=0 y=0 width=96 height=96 around a rect at (16,14)+64×64.
      //
      // Non-NORMAL blend (OVERLAY-blended Passport pink-band):
      //   The shadow paints colour through compositing. A radius-equal
      //   expansion in the opposite-of-offset direction (the "ghost"
      //   side of the shadow) bleeds the tint into pixels outside the
      //   rounded corner. For these effects we collapse the opposite-
      //   direction expansion to 0: a downward shadow (offsetY > 0)
      //   gets upExpand = 0.
      const isNormalBlend = effect.blendMode === undefined;
      const upExpand = isNormalBlend
        ? Math.max(0, totalExpansion - offsetY)
        : (offsetY > 0 ? 0 : (totalExpansion - offsetY));
      const downExpand = isNormalBlend
        ? Math.max(0, totalExpansion + offsetY)
        : (offsetY < 0 ? 0 : (totalExpansion + offsetY));
      const leftExpand = isNormalBlend
        ? Math.max(0, totalExpansion - offsetX)
        : (offsetX > 0 ? 0 : (totalExpansion - offsetX));
      const rightExpand = isNormalBlend
        ? Math.max(0, totalExpansion + offsetX)
        : (offsetX < 0 ? 0 : (totalExpansion + offsetX));

      minX = Math.min(minX, bounds.x - leftExpand);
      minY = Math.min(minY, bounds.y - upExpand);
      maxX = Math.max(maxX, bounds.x + bounds.width + rightExpand);
      maxY = Math.max(maxY, bounds.y + bounds.height + downExpand);
    } else if (effect.type === "layer-blur") {
      const expand = effect.radius;
      minX -= expand;
      minY -= expand;
      maxX += expand;
      maxY += expand;
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
