/**
 * @file Paragraph renderer component
 *
 * Renders DocxParagraph with appropriate formatting and content.
 */

import type { CSSProperties, ReactNode, MouseEvent } from "react";
import type { DocxParagraph, DocxParagraphContent } from "@oxen/docx/domain/paragraph";
import type { DocxRun } from "@oxen/docx/domain/run";
import type { ElementId } from "./DocumentCanvas";
import { RunRenderer, computeRunStyles } from "./RunRenderer";

// Selection colors using design tokens
const SELECTION_OUTLINE = "2px solid var(--selection-primary)";
const SELECTION_BG = "color-mix(in srgb, var(--selection-primary) 5%, transparent)";
const EDITING_BG = "color-mix(in srgb, var(--selection-primary) 8%, transparent)";

// =============================================================================
// Types
// =============================================================================

export type ParagraphRendererProps = {
  /** Paragraph to render */
  readonly paragraph: DocxParagraph;
  /** Element ID for selection */
  readonly elementId: ElementId;
  /** Whether this element is selected */
  readonly isSelected: boolean;
  /** Whether this element is being edited */
  readonly isEditing: boolean;
  /** Click handler */
  readonly onClick: (event: MouseEvent) => void;
  /** Double-click handler */
  readonly onDoubleClick: () => void;
};

// =============================================================================
// Style Computation
// =============================================================================

/**
 * Compute CSS styles from paragraph properties.
 */
export function computeParagraphStyles(
  paragraph: DocxParagraph
): CSSProperties {
  const properties = paragraph.properties;
  const style: CSSProperties = {
    margin: 0,
    minHeight: "1em",
  };

  if (!properties) {
    return style;
  }

  // Text alignment
  if (properties.jc) {
    switch (properties.jc) {
      case "left":
      case "start":
        style.textAlign = "left";
        break;
      case "center":
        style.textAlign = "center";
        break;
      case "right":
      case "end":
        style.textAlign = "right";
        break;
      case "both":
      case "distribute":
        style.textAlign = "justify";
        break;
    }
  }

  // Spacing (before/after in twips: 1 twip = 1/20 point)
  if (properties.spacing) {
    if (properties.spacing.before) {
      const points = properties.spacing.before / 20;
      style.marginTop = `${points}pt`;
    }
    if (properties.spacing.after) {
      const points = properties.spacing.after / 20;
      style.marginBottom = `${points}pt`;
    }
    // Line height
    if (properties.spacing.line) {
      if (properties.spacing.lineRule === "exact") {
        // Exact line height in twips
        const points = properties.spacing.line / 20;
        style.lineHeight = `${points}pt`;
      } else if (properties.spacing.lineRule === "atLeast") {
        // Minimum line height
        const points = properties.spacing.line / 20;
        style.minHeight = `${points}pt`;
      } else {
        // Auto: value is 1/240 of single line spacing
        const multiple = properties.spacing.line / 240;
        style.lineHeight = String(multiple);
      }
    }
  }

  // Indentation (in twips)
  if (properties.ind) {
    if (properties.ind.left) {
      const points = properties.ind.left / 20;
      style.marginLeft = `${points}pt`;
    }
    if (properties.ind.right) {
      const points = properties.ind.right / 20;
      style.marginRight = `${points}pt`;
    }
    if (properties.ind.firstLine) {
      const points = properties.ind.firstLine / 20;
      style.textIndent = `${points}pt`;
    }
    if (properties.ind.hanging) {
      const points = properties.ind.hanging / 20;
      style.textIndent = `-${points}pt`;
      style.paddingLeft = `${points}pt`;
    }
  }

  // Background shading
  if (properties.shd?.fill && properties.shd.fill !== "auto") {
    style.backgroundColor = `#${properties.shd.fill}`;
  }

  // Direction
  if (properties.bidi) {
    style.direction = "rtl";
  }

  return style;
}

// =============================================================================
// Content Rendering
// =============================================================================

/**
 * Render paragraph content item.
 */
function renderParagraphContent(
  content: DocxParagraphContent,
  index: number
): ReactNode {
  switch (content.type) {
    case "run":
      return <RunRenderer key={index} run={content} />;

    case "hyperlink":
      return (
        <a
          key={index}
          href={content.anchor ? `#${content.anchor}` : undefined}
          title={content.tooltip}
          style={{
            color: "var(--accent-secondary)",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {content.content.map((run, runIndex) => (
            <RunRenderer key={runIndex} run={run} />
          ))}
        </a>
      );

    case "bookmarkStart":
    case "bookmarkEnd":
      // Bookmarks are invisible markers
      return <span key={index} id={`bookmark-${content.id}`} />;

    case "commentRangeStart":
    case "commentRangeEnd":
      // Comment markers are invisible
      return <span key={index} data-comment-id={content.id} />;

    default:
      return null;
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Render a paragraph with all its content and formatting.
 */
export function ParagraphRenderer({
  paragraph,
  elementId,
  isSelected,
  isEditing,
  onClick,
  onDoubleClick,
}: ParagraphRendererProps): ReactNode {
  const paragraphStyle = computeParagraphStyles(paragraph);
  const defaultRunStyle = computeRunStyles(paragraph.properties?.rPr);

  // Container style for selection state
  const containerStyle: CSSProperties = {
    cursor: "text",
    outline: isSelected ? SELECTION_OUTLINE : "none",
    backgroundColor: isSelected ? SELECTION_BG : "transparent",
    position: "relative",
  };

  // Editing mode style
  if (isEditing) {
    containerStyle.backgroundColor = EDITING_BG;
  }

  // Handle click
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick(e);
  };

  // Handle double click
  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDoubleClick();
  };

  // Check if paragraph is empty
  const isEmpty = paragraph.content.length === 0 ||
    paragraph.content.every((c) => {
      if (c.type !== "run") return true;
      return c.content.length === 0 ||
        c.content.every((rc) => rc.type === "text" && rc.value === "");
    });

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-element-id={elementId}
    >
      <p style={{ ...paragraphStyle, ...defaultRunStyle }}>
        {paragraph.content.map((content, index) =>
          renderParagraphContent(content, index)
        )}
        {isEmpty && <span style={{ visibility: "hidden" }}>{"\u00A0"}</span>}
      </p>
    </div>
  );
}
