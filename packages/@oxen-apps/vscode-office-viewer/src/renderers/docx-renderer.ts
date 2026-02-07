/**
 * @file DOCX Renderer
 *
 * Converts a DOCX file buffer into HTML for webview display.
 */

import {
  loadDocx,
  halfPointsToPoints,
  type DocxDocument,
  type DocxBlockContent,
  type DocxParagraph,
  type DocxTable,
  type DocxTableRow,
  type DocxTableCell,
  type DocxRun,
  type DocxRunProperties,
  type DocxRunContent,
  type DocxParagraphContent,
  type DocxHyperlink,
  type DocxColor,
} from "@oxen-office/docx";

/**
 * Render a DOCX file to HTML string.
 */
export async function renderDocxHtml(data: Uint8Array): Promise<string> {
  const doc = await loadDocx(data);
  return renderDocxDocumentHtml(doc);
}

/**
 * Render a DocxDocument domain model to HTML string.
 */
export function renderDocxDocumentHtml(doc: DocxDocument): string {
  const blocks = doc.body.content;
  return blocks.map((block) => renderBlock(block)).join("\n");
}

function renderBlock(block: DocxBlockContent): string {
  switch (block.type) {
    case "paragraph":
      return renderParagraph(block);
    case "table":
      return renderTable(block);
    default:
      return "";
  }
}

function renderParagraph(para: DocxParagraph): string {
  const props = para.properties;
  const outlineLevel = props?.outlineLvl;
  const styles: string[] = [];

  // Alignment
  if (props?.jc) {
    const alignMap: Record<string, string> = {
      left: "left",
      center: "center",
      right: "right",
      both: "justify",
      distribute: "justify",
    };
    const align = alignMap[props.jc];
    if (align) {
      styles.push(`text-align:${align}`);
    }
  }

  // Indentation
  if (props?.ind) {
    if (props.ind.left !== undefined) {
      const px = Math.round(Number(props.ind.left) / 20 * 1.333);
      styles.push(`padding-left:${px}px`);
    }
    if (props.ind.firstLine !== undefined) {
      const px = Math.round(Number(props.ind.firstLine) / 20 * 1.333);
      styles.push(`text-indent:${px}px`);
    }
  }

  // Spacing
  if (props?.spacing) {
    if (props.spacing.before !== undefined) {
      const px = Math.round(Number(props.spacing.before) / 20 * 1.333);
      styles.push(`margin-top:${px}px`);
    }
    if (props.spacing.after !== undefined) {
      const px = Math.round(Number(props.spacing.after) / 20 * 1.333);
      styles.push(`margin-bottom:${px}px`);
    }
  }

  // Background shading
  if (props?.shd?.fill && props.shd.fill !== "auto") {
    styles.push(`background-color:#${props.shd.fill}`);
  }

  const content = para.content.map((c) => renderParagraphContent(c)).join("");
  const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";

  // Heading level
  if (outlineLevel !== undefined) {
    const level = Math.min(Math.max(Number(outlineLevel) + 1, 1), 6);
    return `<h${level}${styleAttr}>${content}</h${level}>`;
  }

  // Empty paragraph → line break
  if (content.trim() === "") {
    return `<p${styleAttr}>&nbsp;</p>`;
  }

  return `<p${styleAttr}>${content}</p>`;
}

function renderParagraphContent(content: DocxParagraphContent): string {
  switch (content.type) {
    case "run":
      return renderRun(content);
    case "hyperlink":
      return renderHyperlink(content);
    default:
      return "";
  }
}

function renderRun(run: DocxRun): string {
  const styles = buildRunStyles(run.properties);
  const content = run.content.map((c) => renderRunContent(c)).join("");
  if (styles.length === 0) {
    return content;
  }
  return `<span style="${styles.join(";")}">${content}</span>`;
}

function renderHyperlink(link: DocxHyperlink): string {
  const content = link.content.map((c) => renderParagraphContent(c)).join("");
  return `<a class="docx-link">${content}</a>`;
}

function buildRunStyles(props: DocxRunProperties | undefined): string[] {
  if (!props) {
    return [];
  }
  const styles: string[] = [];

  if (props.b) {
    styles.push("font-weight:bold");
  }
  if (props.i) {
    styles.push("font-style:italic");
  }

  if (props.u && props.u.val !== "none") {
    styles.push("text-decoration:underline");
  }

  if (props.color) {
    const hex = resolveColor(props.color);
    if (hex) {
      styles.push(`color:#${hex}`);
    }
  }

  if (props.sz) {
    const pt = halfPointsToPoints(props.sz);
    styles.push(`font-size:${pt}pt`);
  }

  if (props.rFonts) {
    const font = props.rFonts.ascii ?? props.rFonts.hAnsi ?? props.rFonts.eastAsia;
    if (font) {
      styles.push(`font-family:"${escapeHtml(font)}",sans-serif`);
    }
  }

  if (props.highlight && props.highlight !== "none") {
    styles.push(`background-color:${highlightToColor(props.highlight)}`);
  }

  if (props.vertAlign === "superscript") {
    styles.push("vertical-align:super", "font-size:smaller");
  } else if (props.vertAlign === "subscript") {
    styles.push("vertical-align:sub", "font-size:smaller");
  }

  return styles;
}

function renderRunContent(content: DocxRunContent): string {
  switch (content.type) {
    case "text":
      return escapeHtml(content.value);
    case "break":
      return "<br>";
    case "tab":
      return "&emsp;";
    default:
      return "";
  }
}

function renderTable(table: DocxTable): string {
  const rows = table.rows.map((row) => renderTableRow(row)).join("\n");
  return `<table class="docx-table">\n${rows}\n</table>`;
}

function renderTableRow(row: DocxTableRow): string {
  const cells = row.cells.map((cell) => renderTableCell(cell)).join("\n");
  return `<tr>${cells}</tr>`;
}

function renderTableCell(cell: DocxTableCell): string {
  const styles: string[] = [];
  const props = cell.properties;

  if (props?.shd?.fill && props.shd.fill !== "auto") {
    styles.push(`background-color:#${props.shd.fill}`);
  }

  if (props?.tcBorders) {
    for (const edge of ["top", "bottom", "left", "right"] as const) {
      const border = props.tcBorders[edge];
      if (border && border.val !== "none" && border.val !== "nil") {
        const color = border.color && border.color !== "auto" ? `#${border.color}` : "var(--vscode-panel-border)";
        styles.push(`border-${edge}:1px solid ${color}`);
      }
    }
  }

  const content = cell.content.map((block) => renderBlock(block)).join("\n");
  const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
  const colspanAttr = buildColspanAttr(props?.gridSpan);

  return `<td${styleAttr}${colspanAttr}>${content}</td>`;
}

function buildColspanAttr(gridSpan: unknown): string {
  if (gridSpan && Number(gridSpan) > 1) {
    return ` colspan="${gridSpan}"`;
  }
  return "";
}

function resolveColor(color: DocxColor): string | undefined {
  if (color.val && color.val !== "auto") {
    return color.val;
  }
  return undefined;
}

function highlightToColor(highlight: string): string {
  const map: Record<string, string> = {
    yellow: "#ffff00",
    green: "#00ff00",
    cyan: "#00ffff",
    magenta: "#ff00ff",
    blue: "#0000ff",
    red: "#ff0000",
    darkBlue: "#000080",
    darkCyan: "#008080",
    darkGreen: "#008000",
    darkMagenta: "#800080",
    darkRed: "#800000",
    darkYellow: "#808000",
    darkGray: "#808080",
    lightGray: "#c0c0c0",
    black: "#000000",
    white: "#ffffff",
  };
  return map[highlight] ?? "#ffff00";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
