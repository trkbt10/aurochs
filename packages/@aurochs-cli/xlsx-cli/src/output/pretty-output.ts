/**
 * @file Pretty output formatters for CLI
 */

import type { InfoData } from "../commands/info";
import type { ListData } from "../commands/list";
import type { ShowData } from "../commands/show";
import type { ExtractData } from "../commands/extract";
import type { BuildData } from "../commands/build";
import type { VerifyData } from "../commands/verify";
import type { StringsData, RichTextRunJson } from "../commands/strings";
import type { FormulasData } from "../commands/formulas";
import type { NamesData } from "../commands/names";
import type { TablesData } from "../commands/tables";
import type { CommentsData } from "../commands/comments";
import type { AutofilterData } from "../commands/autofilter";
import type { ValidationData } from "../commands/validation";
import type { ConditionalData } from "../commands/conditional";
import type { HyperlinksData } from "../commands/hyperlinks";
import type { StylesData, ColorJson } from "../commands/styles";
import type { PreviewData } from "../commands/preview";

/**
 * Format workbook info for pretty display.
 */
export function formatInfoPretty(data: InfoData): string {
  const lines = [
    `Sheets: ${data.sheetCount}`,
    `Sheet Names: ${data.sheetNames.join(", ")}`,
    `Shared Strings: ${data.sharedStringCount}`,
    `Total Rows: ${data.totalRows}`,
    `Total Cells: ${data.totalCells}`,
  ];

  return lines.join("\n");
}

/**
 * Format sheet list for pretty display.
 */
export function formatListPretty(data: ListData): string {
  if (data.sheets.length === 0) {
    return "No sheets found";
  }

  return data.sheets
    .map((sheet) => {
      const parts = [
        `${sheet.name}:`,
        `  Rows: ${sheet.rowCount}`,
        `  Cells: ${sheet.cellCount}`,
      ];

      if (sheet.range) {
        parts.push(`  Range: ${sheet.range}`);
      }
      if (sheet.mergedCellCount) {
        parts.push(`  Merged Cells: ${sheet.mergedCellCount}`);
      }
      if (sheet.formulaCount) {
        parts.push(`  Formulas: ${sheet.formulaCount}`);
      }
      if (sheet.hasAutoFilter) {
        parts.push(`  Auto Filter: yes`);
      }

      return parts.join("\n");
    })
    .join("\n\n");
}

/**
 * Format sheet content for pretty display.
 */
export function formatShowPretty(data: ShowData): string {
  const lines = [`Sheet: ${data.sheetName}`];

  if (data.range) {
    lines.push(`Range: ${data.range}`);
  }

  lines.push("");

  if (data.rows.length === 0) {
    lines.push("(empty)");
  } else {
    for (const row of data.rows) {
      const cellValues = row.cells.map((c) => `${c.ref}=${c.value ?? ""}`).join(", ");
      lines.push(`Row ${row.rowNumber}: ${cellValues}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format extracted data for pretty display.
 */
export function formatExtractPretty(data: ExtractData): string {
  const header = `Sheet: ${data.sheetName} (${data.format.toUpperCase()})`;
  return `${header}\n${"=".repeat(header.length)}\n${data.content}`;
}

/**
 * Format build result for pretty display.
 */
export function formatBuildPretty(data: BuildData): string {
  return `Built: ${data.outputPath}`;
}

function formatRunProps(run: RichTextRunJson): string {
  const props: string[] = [];
  if (run.bold) {
    props.push("bold");
  }
  if (run.italic) {
    props.push("italic");
  }
  if (run.underline) {
    props.push("underline");
  }
  if (run.strike) {
    props.push("strike");
  }
  if (run.fontSize) {
    props.push(`size:${run.fontSize}`);
  }
  if (run.fontName) {
    props.push(`font:${run.fontName}`);
  }
  if (run.color) {
    props.push(`color:${run.color}`);
  }
  return props.length > 0 ? ` [${props.join(", ")}]` : "";
}

/**
 * Format shared strings for pretty display.
 */
export function formatStringsPretty(data: StringsData): string {
  const lines = [`Shared Strings: ${data.count}`];
  lines.push("");

  for (const item of data.strings) {
    if (item.type === "plain") {
      lines.push(`[${item.index}] "${item.text}"`);
    } else {
      lines.push(`[${item.index}] (rich) "${item.text}"`);
      if (item.runs) {
        for (const run of item.runs) {
          const props = formatRunProps(run);
          lines.push(`    "${run.text}"${props}`);
        }
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format formulas for pretty display.
 */
export function formatFormulasPretty(data: FormulasData): string {
  const lines = [`Total Formulas: ${data.totalCount}`];
  lines.push("");

  for (const sheet of data.sheets) {
    lines.push(`Sheet: ${sheet.sheetName}`);
    for (const f of sheet.formulas) {
      const stored = f.storedValue === null ? "(empty)" : String(f.storedValue);
      if (f.calculatedValue !== undefined) {
        const calc = f.calculatedValue === null ? "(empty)" : String(f.calculatedValue);
        lines.push(`  ${f.ref}: =${f.formula} -> ${calc} (stored: ${stored})`);
      } else {
        lines.push(`  ${f.ref}: =${f.formula} = ${stored}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
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
 * Format defined names for pretty display.
 */
export function formatNamesPretty(data: NamesData): string {
  if (data.count === 0) {
    return "No defined names found";
  }

  const lines = [`Defined Names: ${data.count}`];
  lines.push("");

  for (const name of data.names) {
    const parts = [`${name.name}`];
    if (name.scope) {
      parts.push(`(scope: ${name.scope})`);
    }
    if (name.hidden) {
      parts.push("[hidden]");
    }
    lines.push(parts.join(" "));
    lines.push(`  = ${name.formula}`);
  }

  return lines.join("\n");
}

/**
 * Format table definitions for pretty display.
 */
export function formatTablesPretty(data: TablesData): string {
  if (data.count === 0) {
    return "No tables found";
  }

  const lines = [`Tables: ${data.count}`];
  lines.push("");

  for (const table of data.tables) {
    lines.push(`${table.name} (${table.ref})`);
    lines.push(`  Sheet: ${table.sheetName}`);
    if (table.displayName && table.displayName !== table.name) {
      lines.push(`  Display Name: ${table.displayName}`);
    }
    lines.push(`  Columns: ${table.columns.map((c) => c.name).join(", ")}`);
    if (table.headerRowCount !== 1) {
      lines.push(`  Header Rows: ${table.headerRowCount}`);
    }
    if (table.totalsRowCount > 0) {
      lines.push(`  Totals Rows: ${table.totalsRowCount}`);
    }
    if (table.styleInfo) {
      lines.push(`  Style: ${table.styleInfo.name}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Format cell comments for pretty display.
 */
export function formatCommentsPretty(data: CommentsData): string {
  if (data.totalCount === 0) {
    return "No comments found";
  }

  const lines = [`Total Comments: ${data.totalCount}`];
  lines.push("");

  for (const sheet of data.sheets) {
    lines.push(`Sheet: ${sheet.sheetName}`);
    for (const comment of sheet.comments) {
      const author = comment.author ? ` (${comment.author})` : "";
      lines.push(`  ${comment.ref}${author}: ${comment.text}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Format auto filter configurations for pretty display.
 */
export function formatAutofilterPretty(data: AutofilterData): string {
  if (data.totalCount === 0) {
    return "No auto filters found";
  }

  const lines = [`Auto Filters: ${data.totalCount}`];
  lines.push("");

  for (const sheet of data.sheets) {
    lines.push(`Sheet: ${sheet.sheetName}`);
    lines.push(`  Range: ${sheet.ref}`);

    if (sheet.filterColumns.length > 0) {
      lines.push(`  Filter Columns:`);
      for (const col of sheet.filterColumns) {
        const parts = [`    Column ${col.colId}: ${col.filterType}`];
        if (col.values && col.values.length > 0) {
          const valuesStr = col.values.slice(0, 5).join(", ");
          const suffix = col.values.length > 5 ? ` ... (${col.values.length} total)` : "";
          parts.push(`      Values: ${valuesStr}${suffix}`);
        }
        if (col.conditions) {
          for (const cond of col.conditions) {
            parts.push(`      ${cond.operator ?? "equal"} "${cond.val ?? ""}"`);
          }
        }
        if (col.dynamicType) {
          parts.push(`      Type: ${col.dynamicType}`);
        }
        if (col.top10) {
          const dir = col.top10.top ? "top" : "bottom";
          const unit = col.top10.percent ? "%" : "";
          parts.push(`      ${dir} ${col.top10.val}${unit}`);
        }
        lines.push(parts.join("\n"));
      }
    }

    if (sheet.sortState) {
      lines.push(`  Sort State: ${sheet.sortState.ref}`);
      if (sheet.sortState.conditions) {
        for (const cond of sheet.sortState.conditions) {
          const dir = cond.descending ? "descending" : "ascending";
          lines.push(`    ${cond.ref}: ${dir}`);
        }
      }
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Format data validation rules for pretty display.
 */
export function formatValidationPretty(data: ValidationData): string {
  if (data.totalCount === 0) {
    return "No data validations found";
  }

  const lines = [`Data Validations: ${data.totalCount}`];
  lines.push("");

  for (const sheet of data.sheets) {
    lines.push(`Sheet: ${sheet.sheetName}`);
    for (const v of sheet.validations) {
      lines.push(`  ${v.sqref}: ${v.type ?? "any"}`);
      if (v.operator) {
        lines.push(`    Operator: ${v.operator}`);
      }
      if (v.formula1) {
        lines.push(`    Formula1: ${v.formula1}`);
      }
      if (v.formula2) {
        lines.push(`    Formula2: ${v.formula2}`);
      }
      if (v.errorStyle) {
        lines.push(`    Error Style: ${v.errorStyle}`);
      }
      if (v.promptTitle || v.prompt) {
        lines.push(`    Prompt: ${v.promptTitle ?? ""} - ${v.prompt ?? ""}`);
      }
      if (v.errorTitle || v.error) {
        lines.push(`    Error: ${v.errorTitle ?? ""} - ${v.error ?? ""}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Format conditional formatting rules for pretty display.
 */
export function formatConditionalPretty(data: ConditionalData): string {
  if (data.totalCount === 0) {
    return "No conditional formatting found";
  }

  const lines = [`Conditional Formatting: ${data.totalCount}`];
  lines.push("");

  for (const sheet of data.sheets) {
    lines.push(`Sheet: ${sheet.sheetName}`);
    for (const cf of sheet.formattings) {
      lines.push(`  Range: ${cf.sqref}`);
      for (const rule of cf.rules) {
        const parts = [`    [${rule.priority ?? "-"}] ${rule.type}`];
        if (rule.operator) {
          parts[0] += ` (${rule.operator})`;
        }
        if (rule.dxfId !== undefined) {
          parts.push(`      DXF ID: ${rule.dxfId}`);
        }
        if (rule.stopIfTrue) {
          parts.push(`      Stop If True: yes`);
        }
        if (rule.formulas.length > 0) {
          parts.push(`      Formulas: ${rule.formulas.join(", ")}`);
        }
        lines.push(parts.join("\n"));
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Format hyperlinks for pretty display.
 */
export function formatHyperlinksPretty(data: HyperlinksData): string {
  if (data.totalCount === 0) {
    return "No hyperlinks found";
  }

  const lines = [`Hyperlinks: ${data.totalCount}`];
  lines.push("");

  for (const sheet of data.sheets) {
    lines.push(`Sheet: ${sheet.sheetName}`);
    for (const h of sheet.hyperlinks) {
      const target = h.target ?? h.location ?? "(no target)";
      lines.push(`  ${h.ref}: ${target}`);
      if (h.display && h.display !== h.target) {
        lines.push(`    Display: ${h.display}`);
      }
      if (h.tooltip) {
        lines.push(`    Tooltip: ${h.tooltip}`);
      }
      if (h.targetMode) {
        lines.push(`    Mode: ${h.targetMode}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Format preview result for pretty display.
 */
export function formatPreviewPretty(data: PreviewData): string {
  const lines: string[] = [];
  for (let i = 0; i < data.sheets.length; i++) {
    const sheet = data.sheets[i]!;
    if (i > 0) {
      lines.push("");
    }
    lines.push(`Sheet: ${sheet.name} (${sheet.rowCount} rows, ${sheet.colCount} columns)`);
    lines.push("");
    lines.push(sheet.ascii);
  }
  return lines.join("\n");
}

// =============================================================================
// Styles Formatting Helpers
// =============================================================================

function formatColorValue(color: ColorJson | undefined): string {
  if (!color) {
    return "none";
  }
  switch (color.type) {
    case "rgb":
      return `#${color.value}`;
    case "theme":
      return color.tint !== undefined ? `theme:${color.theme} (tint:${color.tint})` : `theme:${color.theme}`;
    case "indexed":
      return `indexed:${color.index}`;
    case "auto":
      return "auto";
    default:
      return "unknown";
  }
}

/**
 * Format stylesheet definitions for pretty display.
 */
export function formatStylesPretty(data: StylesData): string {
  const lines = [
    "Stylesheet Summary",
    "=".repeat(18),
    `  Fonts: ${data.summary.fontCount}`,
    `  Fills: ${data.summary.fillCount}`,
    `  Borders: ${data.summary.borderCount}`,
    `  Number Formats: ${data.summary.numberFormatCount}`,
    `  Cell XFs: ${data.summary.cellXfCount}`,
    `  Cell Styles: ${data.summary.cellStyleCount}`,
    `  DXFs: ${data.summary.dxfCount}`,
  ];

  // Fonts
  if (data.fonts.length > 0) {
    lines.push("", "Fonts", "-".repeat(5));
    for (const f of data.fonts) {
      const props: string[] = [];
      if (f.bold) props.push("bold");
      if (f.italic) props.push("italic");
      if (f.underline) props.push(`underline:${f.underline}`);
      if (f.strikethrough) props.push("strike");
      if (f.color) props.push(`color:${formatColorValue(f.color)}`);
      if (f.scheme) props.push(`scheme:${f.scheme}`);
      const propsStr = props.length > 0 ? ` [${props.join(", ")}]` : "";
      lines.push(`  [${f.id}] ${f.name} ${f.size}pt${propsStr}`);
    }
  }

  // Fills
  if (data.fills.length > 0) {
    lines.push("", "Fills", "-".repeat(5));
    for (const f of data.fills) {
      if (f.type === "none") {
        lines.push(`  [${f.id}] none`);
      } else if (f.type === "pattern") {
        const fg = f.fgColor ? ` fg:${formatColorValue(f.fgColor)}` : "";
        const bg = f.bgColor ? ` bg:${formatColorValue(f.bgColor)}` : "";
        lines.push(`  [${f.id}] pattern:${f.patternType}${fg}${bg}`);
      } else if (f.type === "gradient") {
        const deg = f.degree !== undefined ? ` ${f.degree}deg` : "";
        lines.push(`  [${f.id}] gradient:${f.gradientType}${deg}`);
      }
    }
  }

  // Borders
  if (data.borders.length > 0) {
    lines.push("", "Borders", "-".repeat(7));
    for (const b of data.borders) {
      const sides: string[] = [];
      if (b.left?.style) sides.push(`L:${b.left.style}`);
      if (b.right?.style) sides.push(`R:${b.right.style}`);
      if (b.top?.style) sides.push(`T:${b.top.style}`);
      if (b.bottom?.style) sides.push(`B:${b.bottom.style}`);
      if (b.diagonal?.style) sides.push(`D:${b.diagonal.style}`);
      const borderStr = sides.length > 0 ? sides.join(" ") : "none";
      lines.push(`  [${b.id}] ${borderStr}`);
    }
  }

  // Number Formats
  if (data.numberFormats.length > 0) {
    lines.push("", "Number Formats (Custom)", "-".repeat(23));
    for (const nf of data.numberFormats) {
      lines.push(`  [${nf.id}] ${nf.formatCode}`);
    }
  }

  // Cell XFs
  if (data.cellXfs.length > 0) {
    lines.push("", "Cell Formats (XFs)", "-".repeat(18));
    for (const xf of data.cellXfs) {
      const refs = `font:${xf.fontId} fill:${xf.fillId} border:${xf.borderId} numFmt:${xf.numFmtId}`;
      lines.push(`  [${xf.id}] ${refs}`);
      if (xf.alignment) {
        const align: string[] = [];
        if (xf.alignment.horizontal) align.push(`h:${xf.alignment.horizontal}`);
        if (xf.alignment.vertical) align.push(`v:${xf.alignment.vertical}`);
        if (xf.alignment.wrapText) align.push("wrap");
        if (xf.alignment.shrinkToFit) align.push("shrink");
        if (xf.alignment.textRotation !== undefined) align.push(`rot:${xf.alignment.textRotation}`);
        if (align.length > 0) {
          lines.push(`    alignment: ${align.join(" ")}`);
        }
      }
    }
  }

  // Cell Styles
  if (data.cellStyles.length > 0) {
    lines.push("", "Cell Styles", "-".repeat(11));
    for (const s of data.cellStyles) {
      const builtin = s.builtinId !== undefined ? ` (builtin:${s.builtinId})` : "";
      lines.push(`  ${s.name} -> xfId:${s.xfId}${builtin}`);
    }
  }

  return lines.join("\n");
}
