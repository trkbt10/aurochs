/**
 * @file PNG Encoder
 *
 * Re-exports from browser implementation.
 * Node.js users should import from "./encoder.node" directly or use conditional exports.
 */

export { encodeRgbaToPngDataUrl, encodeRgbaToPng } from "./encoder.browser";
