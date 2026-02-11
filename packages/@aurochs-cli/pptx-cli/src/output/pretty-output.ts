/**
 * @file Pretty output formatter for human-readable CLI output
 */

import type { InfoData } from "../commands/info";
import type { ListData, SlideListItem } from "../commands/list";
import type { ShowData } from "../commands/show";
import type { ExtractData } from "../commands/extract";
import type { ThemeData } from "../commands/theme";
import type { BuildData } from "@aurochs-builder/pptx/types";
import type { VerifyData } from "../commands/verify";
import type { PreviewData } from "../commands/preview";
import type { InventoryData } from "../commands/inventory";
import type { TablesData } from "../commands/tables";
import type { ImagesData } from "../commands/images";
import type { DiffData } from "../commands/diff";
import type { PatchData } from "../commands/patch";

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
 * Format preview result for human-readable output.
 */
export function formatPreviewPretty(data: PreviewData): string {
  const lines: string[] = [];

  if (data.format === "svg") {
    // SVG format: output raw SVG for each slide (pipe-friendly)
    for (let i = 0; i < data.slides.length; i++) {
      const slide = data.slides[i]!;
      if (data.slides.length > 1) {
        // Multiple slides: add separator comments
        if (i > 0) {
          lines.push("");
        }
        lines.push(`<!-- Slide ${slide.number} -->`);
      }
      lines.push(slide.svg ?? "");
    }
  } else {
    // ASCII format: original behavior
    for (let i = 0; i < data.slides.length; i++) {
      const slide = data.slides[i]!;
      if (i > 0) {
        lines.push("");
      }
      lines.push(`Slide ${slide.number} (${data.slideWidth}x${data.slideHeight}px, ${slide.shapeCount} shapes)`);
      lines.push("");
      lines.push(slide.ascii ?? "");
    }
  }

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

/**
 * Format inventory summary for human-readable output.
 */
export function formatInventoryPretty(data: InventoryData): string {
  const lines: string[] = [];
  lines.push(`Slides: ${data.slides}`);
  lines.push(`Images: ${data.images}`);
  lines.push(`Tables: ${data.tables}`);
  lines.push(`Charts: ${data.charts}`);
  lines.push(`Diagrams: ${data.diagrams}`);
  if (data.textOnlySlides.length > 0) {
    lines.push(`Text-only slides: ${data.textOnlySlides.join(", ")}`);
  } else {
    lines.push("Text-only slides: (none)");
  }
  return lines.join("\n");
}

/**
 * Format table information for human-readable output.
 */
export function formatTablesPretty(data: TablesData): string {
  if (data.count === 0) {
    return "No tables found";
  }

  const lines = [`Tables: ${data.count}`, ""];

  for (const table of data.tables) {
    lines.push(`Slide ${table.slideNumber}, Table ${table.index + 1}: ${table.rowCount} rows x ${table.colCount} cols`);
    if (table.styleId) {
      lines.push(`  Style: ${table.styleId}`);
    }
    if (table.firstCellPreview) {
      lines.push(`  First cell: "${table.firstCellPreview}"`);
    }
  }

  return lines.join("\n");
}

/**
 * Format image information for human-readable output.
 */
export function formatImagesPretty(data: ImagesData): string {
  if (data.count === 0) {
    return "No images found";
  }

  const lines = [`Images: ${data.count}`, ""];

  for (const img of data.images) {
    const name = img.name || `Image ${img.index + 1}`;
    lines.push(`Slide ${img.slideNumber} [${img.index}] ${name}`);
    if (img.description) {
      lines.push(`  Description: ${img.description}`);
    }
    if (img.width != null && img.height != null) {
      lines.push(`  Size: ${img.width} x ${img.height} px`);
    }
    lines.push(`  Resource: ${img.resourceId}`);
    if (img.mediaType) {
      lines.push(`  Media: ${img.mediaType}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format contiguous numbers as ranges (e.g., [1,2,3,5,7,8] => "1-3, 5, 7-8").
 */
function formatSlideRanges(numbers: readonly number[]): string {
  if (numbers.length === 0) {
    return "(none)";
  }

  const ranges: string[] = [];
  // eslint-disable-next-line no-restricted-syntax -- mutable range tracking
  let start = numbers[0]!;
  // eslint-disable-next-line no-restricted-syntax -- mutable range tracking
  let end = start;

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] === end + 1) {
      end = numbers[i]!;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = numbers[i]!;
      end = start;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return ranges.join(", ");
}

/**
 * Format diff result for human-readable output.
 */
export function formatDiffPretty(data: DiffData): string {
  const lines: string[] = [];
  lines.push(`File A: ${data.fileA} (${data.slideCountA} slides)`);
  lines.push(`File B: ${data.fileB} (${data.slideCountB} slides)`);
  lines.push("");

  if (data.diffSlides.length === 0 && !data.addedSlides?.length && !data.removedSlides?.length) {
    lines.push("All slides identical");
  } else {
    if (data.identicalSlides.length > 0) {
      lines.push(`Identical: slides ${formatSlideRanges(data.identicalSlides)}`);
    }
    if (data.diffSlides.length > 0) {
      lines.push(`Diff: slides ${formatSlideRanges(data.diffSlides)}`);
    }
    if (data.addedSlides && data.addedSlides.length > 0) {
      lines.push(`Added in B: slides ${formatSlideRanges(data.addedSlides)}`);
    }
    if (data.removedSlides && data.removedSlides.length > 0) {
      lines.push(`Removed from A: slides ${formatSlideRanges(data.removedSlides)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format patch result for human-readable output.
 */
export function formatPatchPretty(data: PatchData): string {
  const lines: string[] = [];
  lines.push(`Source: ${data.sourcePath}`);
  lines.push(`Output: ${data.outputPath}`);
  lines.push(`Patches: ${data.patchCount}`);
  lines.push(`Slides modified: ${data.slidesModified}`);
  lines.push(`Text replacements: ${data.textReplacements}`);
  return lines.join("\n");
}
