/**
 * @file PNG Module
 *
 * Pure JavaScript PNG encoder with Canvas API fallback for browsers.
 * No external dependencies.
 */

export { encodeRgbaToPngDataUrl, encodeRgbaToPng } from "./encoder";
export { isPng, PNG_SIGNATURE } from "./detector";
