/**
 * @file Node.js font driver
 *
 * Provides font loading from the filesystem using system font directories.
 * This module requires Node.js and cannot be used in browsers.
 */

export {
  createNodeFontLoader,
  createNodeFontLoaderWithFontsource,
  type NodeFontLoaderInstance,
} from "./node-loader";
