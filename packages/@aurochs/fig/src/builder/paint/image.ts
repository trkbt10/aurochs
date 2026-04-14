/**
 * @file Image paint builder
 *
 * Builds IMAGE paint objects for .fig files.
 *
 * The imageRef is a hex string (typically SHA1 hash, 40 chars) that
 * corresponds to a file in the ZIP's images/ directory. Internally,
 * Figma stores this as `image.hash` (a byte array) in the Kiwi format.
 */

import type { ImagePaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  SCALE_MODE_VALUES,
  type BlendMode,
  type ScaleMode,
} from "../../constants";

/**
 * Convert a hex string to a byte array.
 * If the string is not valid hex, returns the string's char codes
 * as a byte array (for non-hex refs like "test-checkerboard").
 */
function hexToBytes(hex: string): number[] {
  // Check if it looks like a hex string (even length, hex chars only)
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return bytes;
  }
  // Non-hex ref: encode as UTF-8 bytes
  return Array.from(new TextEncoder().encode(hex));
}

/** Image paint builder instance */
export type ImagePaintBuilder = {
  scaleMode: (mode: ScaleMode) => ImagePaintBuilder;
  rotation: (degrees: number) => ImagePaintBuilder;
  scale: (factor: number) => ImagePaintBuilder;
  filters: (filters: NonNullable<ImagePaint["filters"]>) => ImagePaintBuilder;
  opacity: (value: number) => ImagePaintBuilder;
  visible: (value: boolean) => ImagePaintBuilder;
  blendMode: (mode: BlendMode) => ImagePaintBuilder;
  build: () => ImagePaint;
};

/** Create an image paint builder */
function createImagePaintBuilder(imageRef: string): ImagePaintBuilder {
  const state = {
    imageRef,
    scaleMode: "FILL" as ScaleMode,
    opacity: 1,
    visible: true,
    blendMode: "NORMAL" as BlendMode,
    rotation: 0,
    scalingFactor: 1,
    filters: undefined as ImagePaint["filters"],
  };

  const builder: ImagePaintBuilder = {
    scaleMode(mode: ScaleMode) {
      state.scaleMode = mode;
      return builder;
    },

    rotation(degrees: number) {
      state.rotation = degrees;
      return builder;
    },

    scale(factor: number) {
      state.scalingFactor = factor;
      return builder;
    },

    /** Set image filters */
    filters(filters: NonNullable<ImagePaint["filters"]>) {
      state.filters = filters;
      return builder;
    },

    opacity(value: number) {
      state.opacity = Math.max(0, Math.min(1, value));
      return builder;
    },

    visible(value: boolean) {
      state.visible = value;
      return builder;
    },

    blendMode(mode: BlendMode) {
      state.blendMode = mode;
      return builder;
    },

    build(): ImagePaint {
      return {
        type: { value: PAINT_TYPE_VALUES.IMAGE, name: "IMAGE" },
        opacity: state.opacity,
        visible: state.visible,
        blendMode: { value: BLEND_MODE_VALUES[state.blendMode], name: state.blendMode },
        // Kiwi format: image.hash is a byte array referencing the image file
        image: {
          hash: hexToBytes(state.imageRef),
        },
        imageRef: state.imageRef,
        imageScaleMode: { value: SCALE_MODE_VALUES[state.scaleMode], name: state.scaleMode },
        rotation: state.rotation !== 0 ? state.rotation : undefined,
        scalingFactor: state.scalingFactor !== 1 ? state.scalingFactor : undefined,
        filters: state.filters,
      };
    },
  };

  return builder;
}

/**
 * Create an image paint
 */
export function imagePaint(imageRef: string): ImagePaintBuilder {
  return createImagePaintBuilder(imageRef);
}
