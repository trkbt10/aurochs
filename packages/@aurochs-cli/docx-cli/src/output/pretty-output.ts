/**
 * @file Pretty output formatters for CLI
 */

import type { InfoData } from "../commands/info";
import type { ListData } from "../commands/list";
import type { ShowData } from "../commands/show";
import type { ExtractData } from "../commands/extract";
import type { BuildData } from "../commands/build";
import type { VerifyData } from "../commands/verify";
import type { StylesData } from "../commands/styles";
import type { NumberingData } from "../commands/numbering";
import type { HeadersFootersData } from "../commands/headers-footers";
import type { TablesData } from "../commands/tables";
import type { CommentsData } from "../commands/comments";
import type { ImagesData } from "../commands/images";
import type { TocData } from "../commands/toc";
import type { PreviewData } from "../commands/preview";

/**
 * Format document info for pretty display.
 */
export function formatInfoPretty(data: InfoData): string {
  const lines = [
    `Paragraphs: ${data.paragraphCount}`,
    `Tables: ${data.tableCount}`,
    `Sections: ${data.sectionCount}`,
  ];

  if (data.pageSize) {
    lines.push(`Page Size: ${data.pageSize.width}pt × ${data.pageSize.height}pt (${data.pageSize.orientation ?? "portrait"})`);
  }

  lines.push(`Styles: ${data.hasStyles ? "yes" : "no"}`);
  lines.push(`Numbering: ${data.hasNumbering ? "yes" : "no"}`);
  lines.push(`Headers: ${data.hasHeaders ? "yes" : "no"}`);
  lines.push(`Footers: ${data.hasFooters ? "yes" : "no"}`);
  lines.push(`Comments: ${data.hasComments ? "yes" : "no"}`);
  lines.push(`Settings: ${data.hasSettings ? "yes" : "no"}`);

  if (data.settings) {
    if (data.settings.trackRevisions !== undefined) {
      lines.push(`  Track Revisions: ${data.settings.trackRevisions ? "yes" : "no"}`);
    }
    if (data.settings.defaultTabStop !== undefined) {
      lines.push(`  Default Tab Stop: ${data.settings.defaultTabStop} twips`);
    }
    if (data.settings.zoom !== undefined) {
      lines.push(`  Zoom: ${data.settings.zoom}%`);
    }
    if (data.settings.protection) {
      lines.push(`  Protection: ${data.settings.protection}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format section list for pretty display.
 */
export function formatListPretty(data: ListData): string {
  if (data.sections.length === 0) {
    return "No sections found";
  }

  return data.sections
    .map((section) => {
      const parts = [
        `Section ${section.number}:`,
        `  Paragraphs: ${section.paragraphCount}`,
        `  Tables: ${section.tableCount}`,
      ];

      if (section.pageWidth && section.pageHeight) {
        parts.push(`  Page: ${section.pageWidth}pt × ${section.pageHeight}pt`);
      }
      if (section.orientation) {
        parts.push(`  Orientation: ${section.orientation}`);
      }
      if (section.columns) {
        parts.push(`  Columns: ${section.columns}`);
      }
      if (section.firstParagraphText) {
        parts.push(`  Preview: "${section.firstParagraphText}"`);
      }

      return parts.join("\n");
    })
    .join("\n\n");
}

/**
 * Format section content for pretty display.
 */
export function formatShowPretty(data: ShowData): string {
  const lines = [`Section ${data.sectionNumber}:`];

  if (data.sectionProperties) {
    if (data.sectionProperties.type) {
      lines.push(`  Type: ${data.sectionProperties.type}`);
    }
    if (data.sectionProperties.pageSize) {
      lines.push(`  Page: ${data.sectionProperties.pageSize.width}pt × ${data.sectionProperties.pageSize.height}pt`);
    }
  }

  lines.push("");
  lines.push(`Content (${data.content.length} blocks):`);

  for (const block of data.content) {
    if (block.type === "paragraph") {
      const text = block.content
        .map((c) => ("text" in c ? c.text : ""))
        .join("")
        .trim();
      if (text) {
        const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text;
        lines.push(`  [P] ${preview}`);
      } else {
        lines.push("  [P] (empty)");
      }
    } else if (block.type === "table") {
      lines.push(`  [T] ${block.rowCount} rows × ${block.colCount} cols`);
    }
  }

  return lines.join("\n");
}

/**
 * Format extracted text for pretty display.
 */
export function formatExtractPretty(data: ExtractData): string {
  return data.sections
    .map((section) => `--- Section ${section.number} ---\n${section.text || "(empty)"}`)
    .join("\n\n");
}

/**
 * Format build result for pretty display.
 */
export function formatBuildPretty(data: BuildData): string {
  return `Built: ${data.outputPath}`;
}

/**
 * Format verification results for pretty display.
 */
export function formatVerifyPretty(data: VerifyData): string {
  const lines = [`Results: ${data.passed} passed, ${data.failed} failed`];
  lines.push("");

  for (const result of data.results) {
    const status = result.passed ? "✓" : "✗";
    lines.push(`${status} ${result.name}`);

    if (!result.passed) {
      for (const assertion of result.assertions.filter((a) => !a.passed)) {
        lines.push(`    ${assertion.path}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(assertion.actual)}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format document styles for pretty display.
 */
export function formatStylesPretty(data: StylesData): string {
  if (data.totalCount === 0) {
    return "No styles found";
  }

  const lines = [
    `Total Styles: ${data.totalCount}`,
    `  Paragraph: ${data.paragraphCount}`,
    `  Character: ${data.characterCount}`,
    `  Table: ${data.tableCount}`,
    `  Numbering: ${data.numberingCount}`,
    "",
  ];

  // Group by type
  const byType = new Map<string, typeof data.styles>();
  for (const style of data.styles) {
    const list = byType.get(style.type) ?? [];
    byType.set(style.type, [...list, style]);
  }

  for (const [type, styles] of byType) {
    lines.push(`${type.charAt(0).toUpperCase() + type.slice(1)} Styles:`);
    for (const style of styles) {
      const flags: string[] = [];
      if (style.default) {
        flags.push("default");
      }
      if (style.customStyle) {
        flags.push("custom");
      }
      if (style.qFormat) {
        flags.push("qFormat");
      }
      if (style.semiHidden) {
        flags.push("hidden");
      }

      const name = style.name ?? style.styleId;
      const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
      lines.push(`  ${style.styleId}: ${name}${flagStr}`);

      if (style.basedOn) {
        lines.push(`    Based on: ${style.basedOn}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Format numbering definitions for pretty display.
 */
export function formatNumberingPretty(data: NumberingData): string {
  if (data.abstractNumCount === 0 && data.numCount === 0) {
    return "No numbering definitions found";
  }

  const lines = [
    `Abstract Numberings: ${data.abstractNumCount}`,
    `Numbering Instances: ${data.numCount}`,
    "",
  ];

  if (data.abstractNums.length > 0) {
    lines.push("Abstract Numberings:");
    for (const an of data.abstractNums) {
      lines.push(`  [${an.abstractNumId}] ${an.multiLevelType ?? "unknown"}`);
      for (const lvl of an.levels) {
        const parts = [`    Level ${lvl.ilvl}:`];
        if (lvl.numFmt) {
          parts.push(`fmt=${lvl.numFmt}`);
        }
        if (lvl.lvlText) {
          parts.push(`text="${lvl.lvlText}"`);
        }
        if (lvl.start !== undefined) {
          parts.push(`start=${lvl.start}`);
        }
        lines.push(parts.join(" "));
      }
    }
    lines.push("");
  }

  if (data.nums.length > 0) {
    lines.push("Numbering Instances:");
    for (const num of data.nums) {
      const override = num.hasOverrides ? " [has overrides]" : "";
      lines.push(`  numId=${num.numId} -> abstractNumId=${num.abstractNumId}${override}`);
    }
  }

  return lines.join("\n").trim();
}

/**
 * Format headers and footers for pretty display.
 */
export function formatHeadersFootersPretty(data: HeadersFootersData): string {
  if (data.headerCount === 0 && data.footerCount === 0) {
    return "No headers or footers found";
  }

  const lines = [
    `Headers: ${data.headerCount}`,
    `Footers: ${data.footerCount}`,
    "",
  ];

  const headers = data.items.filter((i) => i.kind === "header");
  const footers = data.items.filter((i) => i.kind === "footer");

  if (headers.length > 0) {
    lines.push("Headers:");
    for (const h of headers) {
      lines.push(`  ${h.relId}: ${h.paragraphCount} paragraphs`);
      if (h.preview) {
        lines.push(`    "${h.preview}"`);
      }
    }
    lines.push("");
  }

  if (footers.length > 0) {
    lines.push("Footers:");
    for (const f of footers) {
      lines.push(`  ${f.relId}: ${f.paragraphCount} paragraphs`);
      if (f.preview) {
        lines.push(`    "${f.preview}"`);
      }
    }
  }

  return lines.join("\n").trim();
}

/**
 * Format tables for pretty display.
 */
export function formatTablesPretty(data: TablesData): string {
  if (data.count === 0) {
    return "No tables found";
  }

  const lines = [`Tables: ${data.count}`, ""];

  for (const table of data.tables) {
    lines.push(`Table ${table.index + 1}: ${table.rowCount} rows × ${table.colCount} cols`);
    if (table.style) {
      lines.push(`  Style: ${table.style}`);
    }
    if (table.firstCellPreview) {
      lines.push(`  First cell: "${table.firstCellPreview}"`);
    }
  }

  return lines.join("\n").trim();
}

/**
 * Format images for pretty display.
 */
export function formatImagesPretty(data: ImagesData): string {
  if (data.count === 0) {
    return "No images found";
  }

  const lines = [`Images: ${data.count}`, ""];

  for (const img of data.images) {
    const name = img.name || `Image ${img.index + 1}`;
    lines.push(`[${img.index}] ${name} (${img.type})`);

    if (img.description) {
      lines.push(`  Description: ${img.description}`);
    }
    if (img.width !== undefined && img.height !== undefined) {
      // Convert EMUs to approximate pixels (914400 EMU = 1 inch, ~96 DPI)
      const widthPx = Math.round(img.width / 9525);
      const heightPx = Math.round(img.height / 9525);
      lines.push(`  Size: ${widthPx}px × ${heightPx}px`);
    }
    if (img.embedId) {
      lines.push(`  Embed ID: ${img.embedId}`);
    }
    if (img.linkId) {
      lines.push(`  Link ID: ${img.linkId}`);
    }
    if (img.position) {
      const posStr = [
        img.position.horizontal ? `H: ${img.position.horizontal}` : null,
        img.position.vertical ? `V: ${img.position.vertical}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      if (posStr) {
        lines.push(`  Position: ${posStr}`);
      }
    }
    if (img.wrap) {
      lines.push(`  Wrap: ${img.wrap}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Format TOC for pretty display.
 */
export function formatTocPretty(data: TocData): string {
  if (data.count === 0) {
    return "No headings found (no paragraphs with outline levels)";
  }

  const lines = [`Table of Contents: ${data.count} entries (max level: ${data.maxLevel})`, ""];

  for (const entry of data.entries) {
    const indent = "  ".repeat(entry.level);
    const styleStr = entry.style ? ` [${entry.style}]` : "";
    lines.push(`${indent}${entry.level}. ${entry.text}${styleStr}`);
  }

  return lines.join("\n");
}

/**
 * Format preview result for pretty display.
 */
export function formatPreviewPretty(data: PreviewData): string {
  const lines: string[] = [];
  for (let i = 0; i < data.sections.length; i++) {
    const section = data.sections[i]!;
    if (i > 0) {
      lines.push("");
    }
    lines.push(`Section ${section.number} (${section.paragraphCount} paragraphs, ${section.tableCount} tables)`);
    lines.push("");
    lines.push(section.ascii);
  }
  return lines.join("\n");
}

/**
 * Format comments for pretty display.
 */
export function formatCommentsPretty(data: CommentsData): string {
  if (data.count === 0) {
    return "No comments found";
  }

  const lines = [`Comments: ${data.count}`, ""];

  for (const comment of data.comments) {
    const dateStr = comment.date ? ` (${comment.date})` : "";
    const initialsStr = comment.initials ? ` [${comment.initials}]` : "";
    lines.push(`[${comment.id}] ${comment.author}${initialsStr}${dateStr}`);

    // Show comment text with proper indentation
    const textLines = comment.text.split("\n");
    for (const line of textLines) {
      lines.push(`  ${line}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
