/**
 * @file PNG Module
 *
 * Default export uses browser implementation.
 * Use conditional exports (browser/node) for environment-specific imports.
 */

export { encodeRgbaToPngDataUrl, encodeRgbaToPng } from "./encoder.browser";
export { isPng, PNG_SIGNATURE } from "./detector";
