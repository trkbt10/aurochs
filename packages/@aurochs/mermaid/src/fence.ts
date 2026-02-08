/**
 * @file Mermaid fence wrapper
 */

/** Wrap content in a fenced Mermaid code block. */
export function wrapInMermaidFence(content: string): string {
  return `\`\`\`mermaid\n${content}\n\`\`\``;
}
