/**
 * @file Run renderer component
 *
 * Renders DocxRun content with appropriate formatting.
 */

import type { CSSProperties, ReactNode } from "react";
import type {
  DocxRun,
  DocxRunProperties,
  DocxRunContent,
  DocxHighlightColor,
} from "@oxen/docx/domain/run";

// =============================================================================
// Types
// =============================================================================

export type RunRendererProps = {
  /** Run to render */
  readonly run: DocxRun;
};

export type RunContentRendererProps = {
  /** Run content to render */
  readonly content: DocxRunContent;
  /** Inherited run properties */
  readonly properties?: DocxRunProperties;
};

// =============================================================================
// Highlight Color Mapping
// =============================================================================

const HIGHLIGHT_COLORS: Record<DocxHighlightColor, string> = {
  black: "#000000",
  blue: "#0000FF",
  cyan: "#00FFFF",
  green: "#00FF00",
  magenta: "#FF00FF",
  red: "#FF0000",
  yellow: "#FFFF00",
  white: "#FFFFFF",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  darkGray: "#808080",
  lightGray: "#C0C0C0",
  none: "transparent",
};

// =============================================================================
// Style Computation
// =============================================================================

/**
 * Compute CSS styles from run properties.
 */
export function computeRunStyles(
  properties: DocxRunProperties | undefined
): CSSProperties {
  if (!properties) {
    return {};
  }

  const style: CSSProperties = {};

  // Font weight
  if (properties.b) {
    style.fontWeight = "bold";
  }

  // Font style
  if (properties.i) {
    style.fontStyle = "italic";
  }

  // Text decoration
  const decorations: string[] = [];
  if (properties.u && properties.u.val !== "none") {
    decorations.push("underline");
  }
  if (properties.strike || properties.dstrike) {
    decorations.push("line-through");
  }
  if (decorations.length > 0) {
    style.textDecoration = decorations.join(" ");
    // Double strikethrough uses double line style
    // @see ECMA-376-1:2016 Section 17.3.2.9 (dstrike)
    if (properties.dstrike) {
      style.textDecorationStyle = "double";
    }
  }

  // Text transform
  if (properties.caps) {
    style.textTransform = "uppercase";
  } else if (properties.smallCaps) {
    style.fontVariant = "small-caps";
  }

  // Text color
  if (properties.color?.val) {
    style.color = `#${properties.color.val}`;
  }

  // Font size (half-points to pixels: halfPoints / 2 = points, points * 4/3 ≈ pixels)
  if (properties.sz) {
    // sz is in half-points, so sz/2 = points, and we convert to px
    const points = properties.sz / 2;
    style.fontSize = `${points}pt`;
  }

  // Font family
  if (properties.rFonts?.ascii) {
    style.fontFamily = properties.rFonts.ascii;
  }

  // Highlight (background color)
  if (properties.highlight && properties.highlight !== "none") {
    style.backgroundColor = HIGHLIGHT_COLORS[properties.highlight];
  }

  // Vertical alignment (superscript/subscript)
  if (properties.vertAlign === "superscript") {
    style.verticalAlign = "super";
    style.fontSize = "0.75em";
  } else if (properties.vertAlign === "subscript") {
    style.verticalAlign = "sub";
    style.fontSize = "0.75em";
  }

  // Letter spacing (character spacing in twips: 1 twip = 1/20 point)
  if (properties.spacing) {
    const points = properties.spacing / 20;
    style.letterSpacing = `${points}pt`;
  }

  // Hidden text
  if (properties.vanish) {
    style.display = "none";
  }

  return style;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Render a single run content item.
 */
export function RunContentRenderer({
  content,
}: RunContentRendererProps): ReactNode {
  switch (content.type) {
    case "text":
      return <>{content.value}</>;

    case "tab":
      return <span style={{ whiteSpace: "pre" }}>{"\t"}</span>;

    case "break":
      if (content.breakType === "page") {
        return (
          <span
            style={{
              display: "block",
              pageBreakAfter: "always",
              height: 0,
            }}
          />
        );
      }
      return <br />;

    case "symbol":
      // Render symbol character with specified font
      return (
        <span
          style={{
            fontFamily: content.font,
          }}
        >
          {String.fromCharCode(parseInt(content.char, 16))}
        </span>
      );

    default:
      return null;
  }
}

/**
 * Render a text run with formatting.
 */
export function RunRenderer({ run }: RunRendererProps): ReactNode {
  const style = computeRunStyles(run.properties);

  // If no content, return empty span to maintain DOM structure
  if (run.content.length === 0) {
    return <span style={style} />;
  }

  return (
    <span style={style}>
      {run.content.map((content, index) => (
        <RunContentRenderer
          key={index}
          content={content}
          properties={run.properties}
        />
      ))}
    </span>
  );
}
