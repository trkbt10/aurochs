#!/usr/bin/env bun
/**
 * @file CLI entry point for xlsx command
 *
 * Usage:
 *   xlsx info <file>
 *   xlsx list <file>
 *   xlsx show <file> <sheet> [--range <range>]
 *   xlsx extract <file> [--sheet <name>] [--format <csv|json>]
 *   xlsx build <spec>
 *   xlsx verify <path> [--tag <tag>]
 */

import { Command } from "commander";
import { runInfo } from "./commands/info";
import { runList } from "./commands/list";
import { runShow } from "./commands/show";
import { runExtract } from "./commands/extract";
import { runBuild } from "./commands/build";
import { runVerify } from "./commands/verify";
import { runStrings } from "./commands/strings";
import { runFormulas } from "./commands/formulas";
import { runNames } from "./commands/names";
import { runTables } from "./commands/tables";
import { runComments } from "./commands/comments";
import { output, type OutputMode } from "@oxen-cli/cli-core";
import {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatBuildPretty,
  formatVerifyPretty,
  formatStringsPretty,
  formatFormulasPretty,
  formatNamesPretty,
  formatTablesPretty,
  formatCommentsPretty,
} from "./output/pretty-output";

const program = new Command();

program
  .name("xlsx")
  .description("CLI tool for inspecting XLSX files")
  .version("0.1.0")
  .option("-o, --output <mode>", "Output mode (json|pretty)", "pretty");

program
  .command("info")
  .description("Display workbook metadata")
  .argument("<file>", "XLSX file path")
  .action(async (file: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runInfo(file);
    output(result, mode, formatInfoPretty);
  });

program
  .command("list")
  .description("List sheets with summary")
  .argument("<file>", "XLSX file path")
  .action(async (file: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runList(file);
    output(result, mode, formatListPretty);
  });

program
  .command("show")
  .description("Display sheet content")
  .argument("<file>", "XLSX file path")
  .argument("<sheet>", "Sheet name")
  .option("--range <range>", "Cell range (e.g., \"A1:C10\")")
  .action(async (file: string, sheet: string, options: { range?: string }) => {
    const mode = program.opts().output as OutputMode;
    const result = await runShow(file, sheet, options);
    output(result, mode, formatShowPretty);
  });

program
  .command("extract")
  .description("Extract data from sheet (CSV or JSON)")
  .argument("<file>", "XLSX file path")
  .option("--sheet <name>", "Sheet name (default: first sheet)")
  .option("--format <format>", "Output format (csv|json)", "csv")
  .action(async (file: string, options: { sheet?: string; format?: string }) => {
    const mode = program.opts().output as OutputMode;
    const format = options.format === "json" ? "json" : "csv";
    const result = await runExtract(file, { sheet: options.sheet, format });
    output(result, mode, formatExtractPretty);
  });

program
  .command("build")
  .description("Build XLSX from JSON specification")
  .argument("<spec>", "JSON spec file path")
  .action(async (spec: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runBuild(spec);
    output(result, mode, formatBuildPretty);
  });

program
  .command("verify")
  .description("Verify XLSX build results against expected values")
  .argument("<path>", "Test case file or directory path")
  .option("--tag <tag>", "Filter test cases by tag")
  .action(async (specPath: string, options: { tag?: string }) => {
    const mode = program.opts().output as OutputMode;
    const result = await runVerify(specPath, options);
    output(result, mode, formatVerifyPretty);
  });

program
  .command("strings")
  .description("Display shared strings with optional rich text formatting")
  .argument("<file>", "XLSX file path")
  .option("--rich-text", "Include rich text formatting details")
  .action(async (file: string, options: { richText?: boolean }) => {
    const mode = program.opts().output as OutputMode;
    const result = await runStrings(file, { richText: options.richText });
    output(result, mode, formatStringsPretty);
  });

program
  .command("formulas")
  .description("Display formulas with optional evaluation")
  .argument("<file>", "XLSX file path")
  .option("--sheet <name>", "Filter by sheet name")
  .option("--evaluate", "Evaluate formulas and show calculated values")
  .action(async (file: string, options: { sheet?: string; evaluate?: boolean }) => {
    const mode = program.opts().output as OutputMode;
    const result = await runFormulas(file, { sheet: options.sheet, evaluate: options.evaluate });
    output(result, mode, formatFormulasPretty);
  });

program
  .command("names")
  .description("Display defined names (named ranges)")
  .argument("<file>", "XLSX file path")
  .action(async (file: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runNames(file);
    output(result, mode, formatNamesPretty);
  });

program
  .command("tables")
  .description("Display table definitions (ListObjects)")
  .argument("<file>", "XLSX file path")
  .action(async (file: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runTables(file);
    output(result, mode, formatTablesPretty);
  });

program
  .command("comments")
  .description("Display cell comments")
  .argument("<file>", "XLSX file path")
  .option("--sheet <name>", "Filter by sheet name")
  .action(async (file: string, options: { sheet?: string }) => {
    const mode = program.opts().output as OutputMode;
    const result = await runComments(file, options);
    output(result, mode, formatCommentsPretty);
  });

program.parse();
