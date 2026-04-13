/**
 * @file CLI program definition for fig-cli
 */

import { Command } from "commander";
import { output, type OutputMode } from "@aurochs-cli/cli-core";
import { runInfo } from "./commands/info";
import { runList } from "./commands/list";
import { runShow } from "./commands/show";
import { runExtract } from "./commands/extract";
import { runPreview } from "./commands/preview";
import {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatPreviewPretty,
} from "./output/pretty-output";

function parseStrictPositiveInteger(value: string, label: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`Error: ${label} must be a positive integer`);
    process.exitCode = 1;
    return null;
  }
  return parsed;
}

/** Create the fig CLI program with all subcommands */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("fig")
    .description("CLI tool for inspecting Figma .fig files")
    .version("0.1.0")
    .option("-o, --output <mode>", "Output mode (json|pretty)", "pretty");

  program
    .command("info")
    .description("Display fig file metadata")
    .argument("<file>", "Fig file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runInfo(file);
      output({ result, mode, prettyFormatter: formatInfoPretty });
    });

  program
    .command("list")
    .description("List pages with summary")
    .argument("<file>", "Fig file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runList(file);
      output({ result, mode, prettyFormatter: formatListPretty });
    });

  program
    .command("show")
    .description("Display detailed page content")
    .argument("<file>", "Fig file path")
    .argument("<page>", "Page number (1-based)")
    .action(async (file: string, page: string) => {
      const pageNumber = parseStrictPositiveInteger(page, "Page number");
      if (pageNumber === null) {
        return;
      }
      const mode = program.opts().output as OutputMode;
      const result = await runShow(file, pageNumber);
      output({ result, mode, prettyFormatter: formatShowPretty });
    });

  program
    .command("extract")
    .description("Extract text from pages")
    .argument("<file>", "Fig file path")
    .option("--pages <range>", 'Page range (e.g., "1,3-5")')
    .action(async (file: string, options: { pages?: string }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runExtract(file, options);
      output({ result, mode, prettyFormatter: formatExtractPretty });
    });

  program
    .command("preview")
    .description("Render one page or all pages as SVG")
    .argument("<file>", "Fig file path")
    .argument("[page]", "Page number (1-based, omit for all pages)")
    .option("--width <value>", "Output SVG width")
    .option("--height <value>", "Output SVG height")
    .option("--background <color>", "SVG background color")
    .action(
      async (
        file: string,
        page: string | undefined,
        options: { width?: string; height?: string; background?: string },
      ) => {
        const parsedPageNumber = page === undefined ? undefined : parseStrictPositiveInteger(page, "Page number");
        if (parsedPageNumber === null) {
          return;
        }
        const pageNumber = parsedPageNumber;

        const width = options.width === undefined ? undefined : Number.parseFloat(options.width);
        const height = options.height === undefined ? undefined : Number.parseFloat(options.height);

        const mode = program.opts().output as OutputMode;
        const result = await runPreview(file, pageNumber, {
          width,
          height,
          backgroundColor: options.background,
        });
        output({ result, mode, prettyFormatter: formatPreviewPretty });
      },
    );

  return program;
}
