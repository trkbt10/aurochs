/**
 * @file pngjs pure TypeScript port
 *
 * This is a port of pngjs (https://github.com/lukeapage/pngjs) to pure TypeScript.
 * Only the synchronous API (PNG.sync.read / PNG.sync.write) is ported, as this is
 * the only API surface used in this codebase.
 *
 * Original work Copyright (c) 2015 Luke Page & Original Contributors
 * Derived work Copyright (c) 2012 Kuba Niegowski
 * Licensed under the MIT License (see LICENSE.pngjs in the package root)
 */

export { pack, type PackerOptions, type PngData } from "./packer";
export { parseSync, type ParseOptions, type ParseResult } from "./parser-sync";
