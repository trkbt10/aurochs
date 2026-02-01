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

export function formatExtractPretty(data: ExtractData): string {
  return data.sections
    .map((section) => `--- Section ${section.number} ---\n${section.text || "(empty)"}`)
    .join("\n\n");
}

export function formatBuildPretty(data: BuildData): string {
  return `Built: ${data.outputPath}`;
}

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
      if (style.default) flags.push("default");
      if (style.customStyle) flags.push("custom");
      if (style.qFormat) flags.push("qFormat");
      if (style.semiHidden) flags.push("hidden");

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
