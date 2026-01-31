/**
 * @file Pretty output formatter for human-readable CLI output
 */

import type { InfoData } from "../commands/info";
import type { ListData, SlideListItem } from "../commands/list";
import type { ShowData } from "../commands/show";
import type { ExtractData } from "../commands/extract";
import type { ThemeData } from "../commands/theme";
import type { BuildData } from "@oxen-builder/pptx/types";
import type { VerifyData } from "../commands/verify";

function getSlideFlags(slide: SlideListItem): string[] {
  const flags: string[] = [];
  if (slide.hasTable) {
    flags.push("table");
  }
  if (slide.hasChart) {
    flags.push("chart");
  }
  if (slide.hasImage) {
    flags.push("image");
  }
  if (slide.transitionType && slide.transitionType !== "none") {
    flags.push(`transition:${slide.transitionType}`);
  }
  return flags;
}

/**
 * Format presentation info for human-readable output.
 */
export function formatInfoPretty(data: InfoData): string {
  const lines: string[] = [];
  lines.push(`Slides: ${data.slideCount}`);
  lines.push(`Size: ${data.slideSize.width}x${data.slideSize.height} pixels`);
  lines.push(`EMU: ${data.slideSize.widthEmu}x${data.slideSize.heightEmu}`);
  if (data.appVersion !== null) {
    lines.push(`App Version: ${data.appVersion}`);
  }
  return lines.join("\n");
}

/**
 * Format slide list for human-readable output.
 */
export function formatListPretty(data: ListData): string {
  const lines: string[] = [];
  for (const slide of data.slides) {
    const parts = [`#${slide.number}`];
    if (slide.title) {
      parts.push(`"${slide.title}"`);
    }
    parts.push(`(${slide.shapeCount} shapes)`);
    const flags = getSlideFlags(slide);
    if (flags.length > 0) {
      parts.push(`[${flags.join(", ")}]`);
    }
    lines.push(parts.join(" "));
  }
  return lines.join("\n");
}

/**
 * Format slide content for human-readable output.
 */
export function formatShowPretty(data: ShowData): string {
  const lines: string[] = [];
  lines.push(`Slide ${data.number} (${data.filename})`);
  if (data.transition && data.transition.type !== "none") {
    lines.push(`Transition: ${data.transition.type}`);
  }
  lines.push(`Shapes: ${data.shapes.length}`);

  if (data.charts && data.charts.length > 0) {
    lines.push(`Charts: ${data.charts.length}`);
  }
  lines.push("");

  for (const shape of data.shapes) {
    const typePart = shape.placeholder ? `[${shape.placeholder.type ?? "ph"}]` : `(${shape.type})`;
    lines.push(`  ${shape.id}: ${shape.name} ${typePart}`);
    if (shape.text) {
      const preview = shape.text.length > 60 ? shape.text.substring(0, 60) + "..." : shape.text;
      lines.push(`      "${preview}"`);
    }
  }

  if (data.charts && data.charts.length > 0) {
    lines.push("");
    lines.push("Charts:");
    for (const c of data.charts) {
      if (c.error) {
        lines.push(`  ${c.resourceId}: ERROR ${c.error}`);
        continue;
      }
      const types = c.chart?.types ?? [];
      const typeLabel = types.length ? types.join(", ") : "(unknown)";
      lines.push(`  ${c.resourceId}: ${typeLabel}${c.partPath ? ` (${c.partPath})` : ""}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format extracted text for human-readable output.
 */
export function formatExtractPretty(data: ExtractData): string {
  const lines: string[] = [];
  for (const slide of data.slides) {
    lines.push(`--- Slide ${slide.number} ---`);
    lines.push(slide.text);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function formatFont(label: string, font: { latin?: string; eastAsian?: string; complexScript?: string }): string {
  const parts: string[] = [];
  if (font.latin) {
    parts.push(`Latin: ${font.latin}`);
  }
  if (font.eastAsian) {
    parts.push(`EA: ${font.eastAsian}`);
  }
  if (font.complexScript) {
    parts.push(`CS: ${font.complexScript}`);
  }
  return `  ${label}: ${parts.length > 0 ? parts.join(", ") : "(none)"}`;
}

/**
 * Format theme information for human-readable output.
 */
export function formatThemePretty(data: ThemeData): string {
  const lines: string[] = [];

  lines.push("Font Scheme:");
  lines.push(formatFont("Major", data.fontScheme.majorFont));
  lines.push(formatFont("Minor", data.fontScheme.minorFont));
  lines.push("");

  lines.push("Color Scheme:");
  for (const [name, color] of Object.entries(data.colorScheme)) {
    lines.push(`  ${name}: #${color}`);
  }
  lines.push("");

  lines.push("Format Scheme:");
  lines.push(`  Line styles: ${data.formatScheme.lineStyleCount}`);
  lines.push(`  Fill styles: ${data.formatScheme.fillStyleCount}`);
  lines.push(`  Effect styles: ${data.formatScheme.effectStyleCount}`);
  lines.push(`  Background fills: ${data.formatScheme.bgFillStyleCount}`);
  lines.push("");

  if (data.customColors.length > 0) {
    lines.push("Custom Colors:");
    for (const color of data.customColors) {
      lines.push(`  ${color.name ?? "(unnamed)"}: #${color.color ?? "?"}`);
    }
    lines.push("");
  }

  if (data.extraColorSchemeCount > 0) {
    lines.push(`Extra Color Schemes: ${data.extraColorSchemeCount}`);
    lines.push("");
  }

  const defaults: string[] = [];
  if (data.hasObjectDefaults.line) {
    defaults.push("line");
  }
  if (data.hasObjectDefaults.shape) {
    defaults.push("shape");
  }
  if (data.hasObjectDefaults.text) {
    defaults.push("text");
  }
  if (defaults.length > 0) {
    lines.push(`Object Defaults: ${defaults.join(", ")}`);
  }

  return lines.join("\n").trimEnd();
}

/**
 * Format build result for human-readable output.
 */
export function formatBuildPretty(data: BuildData): string {
  const lines: string[] = [];
  lines.push(`Output: ${data.outputPath}`);
  lines.push(`Slides: ${data.slideCount}`);
  lines.push(`Shapes added: ${data.shapesAdded}`);
  return lines.join("\n");
}

/**
 * Format verify result for human-readable output.
 */
export function formatVerifyPretty(data: VerifyData): string {
  const lines: string[] = [];
  const total = data.passed + data.failed;
  const status = data.failed === 0 ? "PASS" : "FAIL";

  lines.push(`${status}: ${data.passed}/${total} tests passed`);
  lines.push("");

  for (const result of data.results) {
    const icon = result.passed ? "✓" : "✗";
    lines.push(`${icon} ${result.name}`);

    if (!result.passed) {
      const failedAssertions = result.assertions.filter((a) => !a.passed);
      for (const assertion of failedAssertions) {
        lines.push(`    ${assertion.path}:`);
        lines.push(`      expected: ${JSON.stringify(assertion.expected)}`);
        lines.push(`      actual:   ${JSON.stringify(assertion.actual)}`);
      }
    }
  }

  return lines.join("\n");
}
