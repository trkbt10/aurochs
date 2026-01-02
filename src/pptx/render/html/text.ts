/**
 * @file Text renderer
 *
 * Converts TextBody domain objects to HTML output.
 */

import type {
  BodyProperties,
  Paragraph,
  RunProperties,
  TextBody,
  TextRun,
  Transform,
} from "../../domain/index";
import type { RenderContext } from "../context";
import { resolveColor } from "../../core/dml/render/color";
import {
  a,
  buildStyle,
  div,
  EMPTY_HTML,
  escapeHtml,
  type HtmlString,
  p,
  span,
  unsafeHtml,
} from "./index";
import { createDefsCollector } from "../svg/slide-utils";
import { renderTextSvg } from "../svg/slide-text";
import { svg } from "../svg/primitives";

// =============================================================================
// Text Container Rendering
// =============================================================================

/**
 * Build text container styles from body properties
 */
function buildTextContainerStyles(bodyProps: BodyProperties): Record<string, string> {
  return {
    position: "absolute",
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
    "box-sizing": "border-box",
    overflow: bodyProps.overflow === "clip" ? "hidden" : "visible",
  };
}

// =============================================================================
// Paragraph Rendering (legacy helpers for API compatibility)
// =============================================================================

/**
 * Build paragraph styles
 */
function buildParagraphStyles(paragraph: Paragraph): Record<string, string> {
  const props = paragraph.properties;
  const styles: Record<string, string> = {
    margin: "0",
    padding: "0",
  };

  // Text alignment
  switch (props.alignment) {
    case "left":
      styles["text-align"] = "left";
      break;
    case "center":
      styles["text-align"] = "center";
      break;
    case "right":
      styles["text-align"] = "right";
      break;
    case "justify":
    case "justifyLow":
      styles["text-align"] = "justify";
      break;
  }

  // Margins
  if (props.marginLeft !== undefined) {
    styles["padding-left"] = `${props.marginLeft}px`;
  }
  if (props.marginRight !== undefined) {
    styles["padding-right"] = `${props.marginRight}px`;
  }

  // Indentation
  if (props.indent !== undefined) {
    styles["text-indent"] = `${props.indent}px`;
  }

  // Line spacing
  if (props.lineSpacing) {
    if (props.lineSpacing.type === "percent") {
      styles["line-height"] = `${props.lineSpacing.value}%`;
    } else {
      styles["line-height"] = `${props.lineSpacing.value}pt`;
    }
  }

  // Space before/after
  if (props.spaceBefore) {
    if (props.spaceBefore.type === "points") {
      styles["padding-top"] = `${props.spaceBefore.value}pt`;
    }
  }
  if (props.spaceAfter) {
    if (props.spaceAfter.type === "points") {
      styles["padding-bottom"] = `${props.spaceAfter.value}pt`;
    }
  }

  // RTL
  if (props.rtl) {
    styles.direction = "rtl";
  }

  return styles;
}

/**
 * Render bullet character
 */
function renderBullet(paragraph: Paragraph, ctx: RenderContext): HtmlString {
  const bulletStyle = paragraph.properties.bulletStyle;
  if (!bulletStyle || bulletStyle.bullet.type === "none") {
    return EMPTY_HTML;
  }

  const bulletChar = (() => {
    switch (bulletStyle.bullet.type) {
      case "char":
        return bulletStyle.bullet.char;
      case "auto":
        return "•";
      case "blip":
        return "●";
      default:
        return "";
    }
  })();

  const bulletStyles: Record<string, string> = {
    "margin-right": "0.5em",
  };

  if (bulletStyle.color && !bulletStyle.colorFollowText) {
    const hex = resolveColor(bulletStyle.color, ctx.colorContext);
    if (hex) {
      bulletStyles.color = `#${hex}`;
    }
  }

  if (bulletStyle.font && !bulletStyle.fontFollowText) {
    bulletStyles["font-family"] = bulletStyle.font;
  }

  return span({ style: buildStyle(bulletStyles), class: "bullet" }, escapeHtml(bulletChar));
}

/**
 * Build run styles from run properties
 */
function buildRunStyles(props: RunProperties | undefined, ctx: RenderContext): Record<string, string> {
  if (!props) {
    return {};
  }

  const styles: Record<string, string> = {};

  if (props.fontSize !== undefined) {
    styles["font-size"] = `${props.fontSize}pt`;
  }

  if (props.fontFamily) {
    styles["font-family"] = props.fontFamily;
  }

  if (props.bold) {
    styles["font-weight"] = "bold";
  }

  if (props.italic) {
    styles["font-style"] = "italic";
  }

  if (props.strike && props.strike !== "noStrike") {
    styles["text-decoration"] = "line-through";
  }
  if (props.underline && props.underline !== "none") {
    if (styles["text-decoration"] && styles["text-decoration"] !== "underline") {
      styles["text-decoration"] = "underline line-through";
    } else {
      styles["text-decoration"] = "underline";
    }
  }

  if (props.color) {
    const hex = resolveColor(props.color, ctx.colorContext);
    if (hex) {
      styles.color = `#${hex}`;
    }
  }

  if (props.spacing !== undefined) {
    styles["letter-spacing"] = `${props.spacing}px`;
  }

  if (props.caps === "all") {
    styles["text-transform"] = "uppercase";
  } else if (props.caps === "small") {
    styles["font-variant"] = "small-caps";
  }

  if (props.baseline !== undefined) {
    if (props.baseline > 0) {
      styles["vertical-align"] = "super";
      styles["font-size"] = "smaller";
    } else if (props.baseline < 0) {
      styles["vertical-align"] = "sub";
      styles["font-size"] = "smaller";
    }
  }

  if (props.highlightColor) {
    const hex = resolveColor(props.highlightColor, ctx.colorContext);
    if (hex) {
      styles["background-color"] = `#${hex}`;
    }
  }

  return styles;
}

/**
 * Render a text run
 */
export function renderTextRun(run: TextRun, ctx: RenderContext): HtmlString {
  switch (run.type) {
    case "text": {
      if (!run.text) {
        return EMPTY_HTML;
      }

      const styles = buildRunStyles(run.properties, ctx);
      const textHtml = escapeHtml(run.text);

      if (run.properties?.hyperlink) {
        const href = ctx.resources.resolve(run.properties.hyperlink.id) ?? "#";
        return a(
          {
            href,
            target: "_blank",
            title: run.properties.hyperlink.tooltip,
            style: buildStyle(styles),
            class: "hyperlink",
          },
          textHtml
        );
      }

      if (Object.keys(styles).length === 0) {
        return textHtml;
      }

      return span({ style: buildStyle(styles), class: "run" }, textHtml);
    }

    case "break": {
      return unsafeHtml("<br/>");
    }

    case "field": {
      const styles = buildRunStyles(run.properties, ctx);
      const textHtml = escapeHtml(run.text);

      return span(
        {
          style: buildStyle(styles),
          class: "field",
          "data-field-type": run.fieldType,
        },
        textHtml
      );
    }
  }
}

/**
 * Render a paragraph
 */
export function renderParagraph(paragraph: Paragraph, ctx: RenderContext): HtmlString {
  const paragraphStyles = buildParagraphStyles(paragraph);

  const bulletHtml = renderBullet(paragraph, ctx);
  const runsHtml = paragraph.runs.map((run) => renderTextRun(run, ctx));

  return p(
    { style: buildStyle(paragraphStyles), class: "paragraph" },
    bulletHtml,
    ...runsHtml
  );
}

// =============================================================================
// Text Body Rendering
// =============================================================================

/**
 * Render text body to HTML
 */
export function renderTextBody(
  textBody: TextBody,
  transform: Transform,
  ctx: RenderContext
): HtmlString {
  const width = transform.width as number;
  const height = transform.height as number;
  if (width <= 0 || height <= 0) {
    return EMPTY_HTML;
  }

  const defsCollector = createDefsCollector();
  const textSvg = renderTextSvg(textBody, ctx, width, height, defsCollector);
  if (!textSvg) {
    return EMPTY_HTML;
  }

  const svgChildren: HtmlString[] = [];
  const defsElement = defsCollector.toDefsElement();
  if (defsElement) {
    svgChildren.push(unsafeHtml(defsElement));
  }
  svgChildren.push(unsafeHtml(textSvg));

  const containerStyles = buildTextContainerStyles(textBody.bodyProperties);

  return div(
    { style: buildStyle(containerStyles), class: "text-body" },
    svg(
      {
        width,
        height,
        viewBox: `0 0 ${width} ${height}`,
        style: "display: block;",
      },
      ...svgChildren
    )
  );
}
