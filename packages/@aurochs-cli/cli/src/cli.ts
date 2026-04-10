#!/usr/bin/env node
/** @file Unified CLI entry point */
import { Command } from "commander";
import { createProgram as createPptxProgram } from "@aurochs-cli/pptx-cli";
import { createProgram as createDocxProgram } from "@aurochs-cli/docx-cli";
import { createProgram as createXlsxProgram } from "@aurochs-cli/xlsx-cli";
import { createProgram as createPdfProgram } from "@aurochs-cli/pdf-cli";
import { convertToMarkdown, getSupportedExtensions } from "./convert";
import pkg from "../package.json";

const program = new Command();

program.name("aurochs").description("Unified CLI for Office document inspection").version(pkg.version);

// -------------------------------------------------------------------------
// Top-level -i / -o conversion interface (ffmpeg-style)
// -------------------------------------------------------------------------

program
  .option("-i, --input <file>", "Input file path for conversion")
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("-f, --format <type>", "Output format (markdown)", "markdown");

// -------------------------------------------------------------------------
// Subcommands (existing format-specific CLIs)
// -------------------------------------------------------------------------

program.addCommand(createPptxProgram());
program.addCommand(createDocxProgram());
program.addCommand(createXlsxProgram());
program.addCommand(createPdfProgram());

// -------------------------------------------------------------------------
// Hook: if -i is specified and no subcommand matched, run conversion
// -------------------------------------------------------------------------

program.hook("preAction", async (_thisCommand, actionCommand) => {
  // If a subcommand is being executed, let it run normally
  if (actionCommand !== program) {
    return;
  }
});

program.action(async () => {
  const opts = program.opts<{ input?: string; output?: string; format?: string }>();

  if (!opts.input) {
    // No -i and no subcommand: show help
    program.help();
    return;
  }

  if (opts.format && opts.format !== "markdown") {
    console.error(`Error: Unsupported output format "${opts.format}". Currently supported: markdown`);
    process.exitCode = 1;
    return;
  }

  try {
    const result = await convertToMarkdown(opts.input, {
      outputPath: opts.output,
    });

    // If no output file specified, write to stdout
    if (!opts.output) {
      console.log(result.markdown);
    } else {
      const ext = result.isLegacy ? ` (converted from legacy format)` : "";
      console.error(`Converted ${result.format}${ext} → ${opts.output}`);
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exitCode = 1;
  }
});

program.addHelpText(
  "after",
  `
Conversion mode:
  aurochs -i <file>              Convert to Markdown (stdout)
  aurochs -i <file> -o <file>    Convert to Markdown (file)

Supported input formats: ${getSupportedExtensions().join(", ")}

Examples:
  aurochs -i presentation.pptx
  aurochs -i spreadsheet.xlsx -o output.md
  aurochs -i document.doc
  aurochs -i report.pdf -o report.md`,
);

program.parse();
