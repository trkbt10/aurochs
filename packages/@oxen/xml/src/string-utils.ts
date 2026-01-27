/**
 * @file XML string utilities
 * Common string operations for XML processing
 */

// =============================================================================
// CDATA Handling
// =============================================================================

/**
 * Regex pattern for CDATA sections
 */
const CDATA_REGEX = /<!\[CDATA\[(.*?)\]\]>/g;

/**
 * Strip CDATA wrappers from XML content.
 * Replaces `<![CDATA[content]]>` with just `content`.
 *
 * @example
 * stripCdata("<![CDATA[Hello World]]>") // "Hello World"
 * stripCdata("Some <![CDATA[inner]]> text") // "Some inner text"
 */
export function stripCdata(content: string): string {
  return content.replace(CDATA_REGEX, "$1");
}

// =============================================================================
// Whitespace Handling
// =============================================================================

/**
 * Convert tabs to non-breaking spaces for HTML display.
 * Each tab becomes 4 non-breaking spaces.
 *
 * @example
 * escapeTab("Hello\tWorld") // "Hello&nbsp;&nbsp;&nbsp;&nbsp;World"
 */
export function escapeTab(text: string): string {
  return text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
}

/**
 * Convert spaces to non-breaking spaces for HTML display.
 *
 * @example
 * escapeSpace("Hello World") // "Hello&nbsp;World"
 */
export function escapeSpace(text: string): string {
  return text.replace(/ /g, "&nbsp;");
}

/**
 * Escape both tabs and spaces to non-breaking spaces.
 * Useful for preserving whitespace in HTML output.
 *
 * @example
 * escapeWhitespace("Hello\t World") // "Hello&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;World"
 */
export function escapeWhitespace(text: string): string {
  return escapeSpace(escapeTab(text));
}

// =============================================================================
// Path/String Manipulation
// =============================================================================

/**
 * Remove trailing semicolon from a string.
 * Useful for CSS property cleanup.
 *
 * @example
 * trimTrailingSemicolon("color: red;") // "color: red"
 * trimTrailingSemicolon("color: red") // "color: red"
 */
export function trimTrailingSemicolon(str: string): string {
  return str.replace(/;$/, "");
}

/**
 * Extract filename from path without extension.
 *
 * @example
 * getBasename("ppt/slides/slide1.xml") // "slide1"
 * getBasename("slide2.xml") // "slide2"
 */
export function getBasename(path: string): string {
  const filename = path.split("/").pop() ?? "";
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
}

/**
 * Normalize internal path references.
 * Converts relative "../" paths to absolute "ppt/" paths.
 *
 * @example
 * normalizePptPath("../slides/slide1.xml") // "ppt/slides/slide1.xml"
 * normalizePptPath("slides/slide1.xml") // "slides/slide1.xml"
 */
export function normalizePptPath(target: string): string {
  return target.replace("../", "ppt/");
}

// =============================================================================
// Namespace Handling
// =============================================================================

/**
 * Replace diagram namespace prefix with presentation namespace.
 * Used for processing diagram content in slides.
 *
 * @example
 * replaceDspNamespace('{"dsp:sp": {}}') // '{"p:sp": {}}'
 */
export function replaceDspNamespace(content: string): string {
  return content.replace(/dsp:/g, "p:");
}
