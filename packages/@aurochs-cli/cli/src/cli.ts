#!/usr/bin/env node
/** @file Unified CLI entry point */
import { Command } from "commander";
import { createProgram as createPptxProgram } from "@aurochs-cli/pptx-cli";
import { createProgram as createDocxProgram } from "@aurochs-cli/docx-cli";
import { createProgram as createXlsxProgram } from "@aurochs-cli/xlsx-cli";
import { createProgram as createPdfProgram } from "@aurochs-cli/pdf-cli";
import { createProgram as createFigProgram } from "@aurochs-cli/fig-cli";
import { convert, getSupportedExtensions, getSupportedOutputExtensions, type OutputFormat } from "./convert";
import pkg from "../package.json";

const program = new Command();

program.name("aurochs").description("Unified CLI for Office document inspection").version(pkg.version);

// -------------------------------------------------------------------------
// Top-level -i / -o conversion interface (ffmpeg-style)
// -------------------------------------------------------------------------

program
  .option("-i, --input <file>", "Input file path for conversion")
  .option("-o, --output <file>", "Output file path (supports %d for multi-page, e.g. slide_%d.svg)")
  .option("-f, --format <type>", "Output format (markdown, svg, text, png)");

// -------------------------------------------------------------------------
// Subcommands (existing format-specific CLIs)
// -------------------------------------------------------------------------

program.addCommand(createPptxProgram());
program.addCommand(createDocxProgram());
program.addCommand(createXlsxProgram());
program.addCommand(createPdfProgram());
program.addCommand(createFigProgram());

// -------------------------------------------------------------------------
// Hook: if -i is specified and no subcommand matched, run conversion
// -------------------------------------------------------------------------

program.hook("preAction", async (_thisCommand, actionCommand) => {
  // If a subcommand is being executed, let it run normally
  if (actionCommand !== program) {
    return;
  }
});

const VALID_FORMATS: readonly OutputFormat[] = ["markdown", "svg", "text", "png"];

program.action(async () => {
  const opts = program.opts<{ input?: string; output?: string; format?: string }>();

  if (!opts.input) {
    // No -i and no subcommand: show help
    program.help();
    return;
  }

  // Validate -f if provided
  if (opts.format && !VALID_FORMATS.includes(opts.format as OutputFormat)) {
    const supported = VALID_FORMATS.join(", ");
    console.error(`Error: Unsupported output format "${opts.format}". Supported: ${supported}`);
    process.exitCode = 1;
    return;
  }

  const outputFormat = opts.format as OutputFormat | undefined;

  // PNG to stdout is not allowed (binary data)
  if (!opts.output) {
    const effectiveFormat = outputFormat ?? "markdown";
    if (effectiveFormat === "png") {
      console.error("Error: PNG output requires -o (cannot write binary to stdout)");
      process.exitCode = 1;
      return;
    }
  }

  try {
    const result = await convert(opts.input, {
      outputPath: opts.output,
      outputFormat,
    });

    // If no output file specified, write to stdout
    if (!opts.output) {
      const text = result.pages.map((p) => p.content as string).join("\n\n");
      console.log(text);
    } else {
      const legacySuffix = result.isLegacy ? ` (converted from legacy format)` : "";
      const pageInfo = result.pages.length > 1 ? ` (${result.pages.length} pages)` : "";
      console.error(
        `Converted ${result.inputFormat}${legacySuffix} → ${result.outputFormat}${pageInfo} → ${opts.output}`,
      );
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exitCode = 1;
  }
});

program.addHelpText(
  "after",
  `
Conversion mode (ffmpeg-style):
  aurochs -i <file>                    Convert to Markdown (stdout)
  aurochs -i <file> -o <file>          Convert (format inferred from extension)
  aurochs -i <file> -f svg             Convert to SVG (stdout)
  aurochs -i <file> -o slide_%d.svg    Multi-page SVG output
  aurochs -i <file> -o slide_%d.png    Multi-page PNG output

Supported input formats:  ${getSupportedExtensions().join(", ")}
Supported output formats: ${getSupportedOutputExtensions().join(", ")}

Examples:
  aurochs -i presentation.pptx                          # → Markdown (stdout)
  aurochs -i presentation.pptx -o output.md             # → Markdown file
  aurochs -i presentation.pptx -o slide_%d.svg          # → SVG per slide
  aurochs -i presentation.pptx -o slide_%d.png          # → PNG per slide
  aurochs -i spreadsheet.xlsx -f svg                    # → SVG (stdout)
  aurochs -i spreadsheet.xlsx -o output.txt             # → ASCII text
  aurochs -i document.doc -o output.md                  # → Markdown (legacy format)
  aurochs -i report.pdf -o page_%d.svg                  # → SVG per page
  aurochs -i design.fig -o frame_%d.svg                 # → SVG per page
  aurochs -i design.fig                                 # → Markdown (stdout)`,
);

program.parse();
