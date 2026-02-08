/**
 * @file Mermaid label/id escaping utilities
 */

/**
 * Escape a text string for use inside a Mermaid node label.
 * Mermaid uses `"` for quoted labels; we escape inner quotes and strip newlines.
 */
export function escapeMermaidLabel(text: string): string {
  return text
    .replace(/"/g, "#quot;")
    .replace(/\n/g, " ")
    .replace(/\r/g, "");
}

/**
 * Sanitize a string for use as a Mermaid node ID.
 * IDs must be alphanumeric (with underscores). Non-matching chars are replaced.
 */
export function sanitizeNodeId(id: string): string {
  const sanitized = id.replace(/[^a-zA-Z0-9_]/g, "_");
  // Ensure it starts with a letter
  if (/^[0-9]/.test(sanitized)) {
    return `n${sanitized}`;
  }
  return sanitized || "node";
}
