/**
 * @file HTML output primitives
 *
 * Type-safe HTML string generation using branded types.
 */

// =============================================================================
// Branded HTML String Type
// =============================================================================

/**
 * Branded type for safe HTML strings
 *
 * This ensures that only properly escaped or intentionally raw HTML
 * can be used in HTML output positions.
 */
export type HtmlString = string & { readonly __brand: "html" };

/**
 * Escape text for safe HTML output
 */
export function escapeHtml(text: string): HtmlString {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return escaped as HtmlString;
}

/**
 * Mark a string as safe HTML (use with caution)
 *
 * Only use this for:
 * - Static HTML fragments
 * - HTML that has already been properly escaped
 * - SVG content
 */
export function unsafeHtml(html: string): HtmlString {
  return html as HtmlString;
}

/**
 * Join multiple HTML strings
 */
export function joinHtml(parts: readonly HtmlString[], separator = ""): HtmlString {
  return parts.join(separator) as HtmlString;
}

/**
 * Empty HTML string
 */
export const EMPTY_HTML: HtmlString = "" as HtmlString;

// =============================================================================
// Attribute Helpers
// =============================================================================

/**
 * Build HTML attributes string
 */
export function buildAttrs(attrs: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      continue;
    }
    if (value === true) {
      parts.push(key);
    } else {
      // Escape attribute value
      const escaped = String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;");
      parts.push(`${key}="${escaped}"`);
    }
  }

  return parts.join(" ");
}

/**
 * Build class attribute from class names
 */
export function buildClass(...classNames: (string | undefined | false)[]): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * Build style attribute from style object
 */
export function buildStyle(styles: Record<string, string | number | undefined>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined) {
      continue;
    }
    // Convert camelCase to kebab-case
    const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    parts.push(`${kebabKey}: ${value}`);
  }

  return parts.join("; ");
}

// =============================================================================
// Element Creation
// =============================================================================

/**
 * Create an HTML element
 */
export function createElement(
  tag: string,
  attrs: Record<string, string | number | boolean | undefined>,
  ...children: readonly HtmlString[]
): HtmlString {
  const attrStr = buildAttrs(attrs);
  const openTag = attrStr ? `<${tag} ${attrStr}>` : `<${tag}>`;

  if (children.length === 0) {
    // Self-closing for void elements
    if (isVoidElement(tag)) {
      return unsafeHtml(attrStr ? `<${tag} ${attrStr}/>` : `<${tag}/>`);
    }
    return unsafeHtml(`${openTag}</${tag}>`);
  }

  return unsafeHtml(`${openTag}${children.join("")}</${tag}>`);
}

/**
 * Check if tag is a void element (no closing tag)
 */
function isVoidElement(tag: string): boolean {
  const voidElements = [
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ];
  return voidElements.includes(tag.toLowerCase());
}

/**
 * Create a div element
 */
export function div(
  attrs: Record<string, string | number | boolean | undefined>,
  ...children: readonly HtmlString[]
): HtmlString {
  return createElement("div", attrs, ...children);
}

/**
 * Create a span element
 */
export function span(
  attrs: Record<string, string | number | boolean | undefined>,
  ...children: readonly HtmlString[]
): HtmlString {
  return createElement("span", attrs, ...children);
}

/**
 * Create a paragraph element
 */
export function p(
  attrs: Record<string, string | number | boolean | undefined>,
  ...children: readonly HtmlString[]
): HtmlString {
  return createElement("p", attrs, ...children);
}

/**
 * Create an image element
 */
export function img(attrs: {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  style?: string;
  class?: string;
}): HtmlString {
  return createElement("img", attrs);
}

/**
 * Create an anchor element
 */
export function a(
  attrs: { href: string; target?: string; title?: string; class?: string; style?: string },
  ...children: readonly HtmlString[]
): HtmlString {
  return createElement("a", attrs, ...children);
}
