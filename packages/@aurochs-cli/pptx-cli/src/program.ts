/**
 * @file CLI program definition for pptx-cli
 */
import { Command } from "commander";
import { runInfo } from "./commands/info";
import { runList } from "./commands/list";
import { runShow } from "./commands/show";
import { runExtract } from "./commands/extract";
import { runTheme } from "./commands/theme";
import { runBuild } from "./commands/build";
import { runPatch } from "./commands/patch";
import { runVerify } from "./commands/verify";
import { runPreview } from "./commands/preview";
import { runInventory } from "./commands/inventory";
import { runTables } from "./commands/tables";
import { runImages } from "./commands/images";
import { runDiff } from "./commands/diff";
import { output, type OutputMode } from "@aurochs-cli/cli-core";
import {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatThemePretty,
  formatBuildPretty,
  formatPatchPretty,
  formatVerifyPretty,
  formatPreviewPretty,
  formatInventoryPretty,
  formatTablesPretty,
  formatImagesPretty,
  formatDiffPretty,
} from "./output/pretty-output";
import { formatPreviewMermaid } from "./output/mermaid-output";

/** Create the pptx CLI program with all subcommands */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("pptx")
    .description("CLI tool for inspecting PPTX files")
    .version("0.1.0")
    .option("-o, --output <mode>", "Output mode (json|pretty|mermaid)", "pretty");

  program
    .command("info")
    .description("Display presentation metadata")
    .argument("<file>", "PPTX/PPT file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runInfo(file);
      output(result, mode, formatInfoPretty);
    });

  program
    .command("list")
    .description("List slides with summary")
    .argument("<file>", "PPTX/PPT file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runList(file);
      output(result, mode, formatListPretty);
    });

  program
    .command("show")
    .description("Display slide content")
    .argument("<file>", "PPTX/PPT file path")
    .argument("<slide>", "Slide number (1-based)")
    .action(async (file: string, slide: string) => {
      const mode = program.opts().output as OutputMode;
      const slideNumber = parseInt(slide, 10);
      if (Number.isNaN(slideNumber)) {
        console.error("Error: Slide number must be a valid integer");
        process.exitCode = 1;
        return;
      }
      const result = await runShow(file, slideNumber);
      output(result, mode, formatShowPretty);
    });

  program
    .command("extract")
    .description("Extract text from slides")
    .argument("<file>", "PPTX/PPT file path")
    .option("--slides <range>", 'Slide range (e.g., "1,3-5")')
    .action(async (file: string, options: { slides?: string }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runExtract(file, options);
      output(result, mode, formatExtractPretty);
    });

  program
    .command("theme")
    .description("Display theme information (fonts, colors, styles)")
    .argument("<file>", "PPTX/PPT file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runTheme(file);
      output(result, mode, formatThemePretty);
    });

  program
    .command("build")
    .description("Build PPTX from JSON specification")
    .argument("<spec>", "JSON spec file path")
    .action(async (spec: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runBuild(spec);
      output(result, mode, formatBuildPretty);
    });

  program
    .command("patch")
    .description("Patch an existing PPTX file with JSON specification")
    .argument("<spec>", "JSON patch spec file path")
    .action(async (spec: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runPatch(spec);
      output(result, mode, formatPatchPretty);
    });

  program
    .command("verify")
    .description("Verify PPTX build results against expected values")
    .argument("<path>", "Test case file or directory path")
    .option("--tag <tag>", "Filter test cases by tag")
    .action(async (specPath: string, options: { tag?: string }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runVerify(specPath, options);
      output(result, mode, formatVerifyPretty);
    });

  program
    .command("preview")
    .description("Render ASCII art preview of a slide (omit slide number to show all)")
    .argument("<file>", "PPTX/PPT file path")
    .argument("[slide]", "Slide number (1-based, omit for all)")
    .option("--width <columns>", "Terminal width in columns", "80")
    .option("--border", "Show slide border outline")
    .action(async (file: string, slide: string | undefined, options: { width: string; border?: boolean }) => {
      const mode = program.opts().output as OutputMode;
      // eslint-disable-next-line no-restricted-syntax -- conditionally assigned from parsed input
      let slideNumber: number | undefined;
      if (slide !== undefined) {
        slideNumber = parseInt(slide, 10);
        if (Number.isNaN(slideNumber)) {
          console.error("Error: Slide number must be a valid integer");
          process.exitCode = 1;
          return;
        }
      }
      const width = parseInt(options.width, 10);
      if (Number.isNaN(width) || width < 20) {
        console.error("Error: Width must be an integer >= 20");
        process.exitCode = 1;
        return;
      }
      const result = await runPreview(file, slideNumber, { width, border: options.border });
      output(result, mode, formatPreviewPretty, formatPreviewMermaid);
    });

  program
    .command("inventory")
    .description("Display media inventory summary")
    .argument("<file>", "PPTX/PPT file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runInventory(file);
      output(result, mode, formatInventoryPretty);
    });

  program
    .command("tables")
    .description("Display table information from slides")
    .argument("<file>", "PPTX/PPT file path")
    .option("--slides <range>", 'Slide range (e.g., "1,3-5")')
    .action(async (file: string, options: { slides?: string }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runTables(file, options);
      output(result, mode, formatTablesPretty);
    });

  program
    .command("images")
    .description("Display embedded image information from slides")
    .argument("<file>", "PPTX/PPT file path")
    .option("--slides <range>", 'Slide range (e.g., "1,3-5")')
    .action(async (file: string, options: { slides?: string }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runImages(file, options);
      output(result, mode, formatImagesPretty);
    });

  program
    .command("diff")
    .description("Compare text content between two PPTX files")
    .argument("<fileA>", "First PPTX/PPT file path")
    .argument("<fileB>", "Second PPTX/PPT file path")
    .action(async (fileA: string, fileB: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runDiff(fileA, fileB);
      output(result, mode, formatDiffPretty);
    });

  return program;
}
