/**
 * @file TSV CLI program definition and command registration
 */

import { Command } from "commander";
import { runInfo } from "./commands/info";
import { runShow } from "./commands/show";
import { runConvert } from "./commands/convert";
import { output, type OutputMode } from "@aurochs-cli/cli-core";
import {
  formatInfoPretty,
  formatShowPretty,
  formatConvertPretty,
} from "./output/pretty-output";

/**
 * Create the TSV CLI program with all registered commands.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("tsv")
    .description("CLI tool for inspecting and converting TSV files")
    .version("0.1.0")
    .option("-o, --output <mode>", "Output mode (json|pretty)", "pretty");

  program
    .command("info")
    .description("Display TSV file metadata")
    .argument("<file>", "TSV file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runInfo(file);
      output({ result, mode, prettyFormatter: formatInfoPretty });
    });

  program
    .command("show")
    .description("Display TSV content as a formatted table")
    .argument("<file>", "TSV file path")
    .option("--limit <n>", "Maximum number of records to display")
    .action(async (file: string, options: { limit?: string }) => {
      const mode = program.opts().output as OutputMode;
      const limit = options.limit ? parseInt(options.limit, 10) : undefined;
      const result = await runShow(file, { limit });
      output({ result, mode, prettyFormatter: formatShowPretty });
    });

  program
    .command("convert")
    .description("Convert TSV to XLSX")
    .argument("<file>", "TSV file path")
    .option("--out <path>", "Output XLSX file path (default: input with .xlsx extension)")
    .option("--sheet <name>", "Sheet name (default: Sheet1)")
    .action(async (file: string, options: { out?: string; sheet?: string }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runConvert(file, {
        output: options.out,
        sheetName: options.sheet,
      });
      output({ result, mode, prettyFormatter: formatConvertPretty });
    });

  return program;
}
