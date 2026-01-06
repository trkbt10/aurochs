/**
 * @file Layout result rendering
 *
 * Converts layout engine output to React SVG elements.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

import type { ReactNode } from "react";
import type { LayoutResult } from "../../../text-layout";
import { renderBullet } from "./bullet-render";
import { renderLine } from "./span-render";

// =============================================================================
// Types
// =============================================================================

/**
 * SVG defs management functions
 */
type DefsManager = {
  readonly getNextId: (prefix: string) => string;
  readonly addDef: (id: string, content: ReactNode) => void;
  readonly hasDef: (id: string) => boolean;
};

// =============================================================================
// Layout Rendering
// =============================================================================

/**
 * Render layout result to React SVG elements.
 *
 * Iterates through paragraphs and lines, rendering bullets and text spans.
 *
 * @param layoutResult - Output from the text layout engine
 * @param defs - SVG defs manager for gradient/pattern/filter definitions
 * @returns React elements for the text content
 */
export function renderLayoutResult(
  layoutResult: LayoutResult,
  defs: DefsManager,
): ReactNode {
  const elements: ReactNode[] = [];
  const keyCounter = { value: 0 };

  for (const para of layoutResult.paragraphs) {
    // Render bullet if present
    if (para.bullet !== undefined && para.lines.length > 0) {
      const bulletElement = renderBullet(para, keyCounter.value);
      if (bulletElement !== null) {
        elements.push(bulletElement);
      }
      keyCounter.value += 1;
    }

    // Render each line
    for (const line of para.lines) {
      const lineElements = renderLine(
        line,
        para.fontAlignment,
        keyCounter.value,
        defs,
      );
      elements.push(...lineElements);
      keyCounter.value += line.spans.length + 1;
    }
  }

  return <>{elements}</>;
}
