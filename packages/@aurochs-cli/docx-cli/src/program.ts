import { Command } from "commander";
import { runInfo } from "./commands/info";
import { runList } from "./commands/list";
import { runShow } from "./commands/show";
import { runExtract } from "./commands/extract";
import { runBuild } from "./commands/build";
import { runPatch } from "./commands/patch";
import { runVerify } from "./commands/verify";
import { runStyles } from "./commands/styles";
import { runNumbering } from "./commands/numbering";
import { runHeadersFooters } from "./commands/headers-footers";
import { runTables } from "./commands/tables";
import { runComments } from "./commands/comments";
import { runImages } from "./commands/images";
import { runToc } from "./commands/toc";
import { runPreview } from "./commands/preview";
import { output, type OutputMode } from "@aurochs-cli/cli-core";
import {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatBuildPretty,
  formatPatchPretty,
  formatVerifyPretty,
  formatStylesPretty,
  formatNumberingPretty,
  formatHeadersFootersPretty,
  formatTablesPretty,
  formatCommentsPretty,
  formatImagesPretty,
  formatTocPretty,
  formatPreviewPretty,
} from "./output/pretty-output";
import { formatPreviewMermaid } from "./output/mermaid-output";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("docx")
    .description("CLI tool for inspecting DOCX files")
    .version("0.1.0")
    .option("-o, --output <mode>", "Output mode (json|pretty|mermaid)", "pretty");

  program
    .command("info")
    .description("Display document metadata")
    .argument("<file>", "DOCX file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runInfo(file);
      output(result, mode, formatInfoPretty);
    });

  program
    .command("list")
    .description("List sections with summary")
    .argument("<file>", "DOCX file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runList(file);
      output(result, mode, formatListPretty);
    });

  program
    .command("show")
    .description("Display section content")
    .argument("<file>", "DOCX file path")
    .argument("<section>", "Section number (1-based)")
    .action(async (file: string, section: string) => {
      const mode = program.opts().output as OutputMode;
      const sectionNumber = parseInt(section, 10);
      if (Number.isNaN(sectionNumber)) {
        console.error("Error: Section number must be a valid integer");
        process.exitCode = 1;
        return;
      }
      const result = await runShow(file, sectionNumber);
      output(result, mode, formatShowPretty);
    });

  program
    .command("extract")
    .description("Extract text from sections")
    .argument("<file>", "DOCX file path")
    .option("--sections <range>", 'Section range (e.g., "1,3-5")')
    .action(async (file: string, options: { sections?: string }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runExtract(file, options);
      output(result, mode, formatExtractPretty);
    });

  program
    .command("build")
    .description("Build DOCX from JSON specification")
    .argument("<spec>", "JSON spec file path")
    .action(async (spec: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runBuild(spec);
      output(result, mode, formatBuildPretty);
    });

  program
    .command("patch")
    .description("Patch an existing DOCX file with JSON specification")
    .argument("<spec>", "JSON patch spec file path")
    .action(async (spec: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runPatch(spec);
      output(result, mode, formatPatchPretty);
    });

  program
    .command("verify")
    .description("Verify DOCX build results against expected values")
    .argument("<path>", "Test case file or directory path")
    .option("--tag <tag>", "Filter test cases by tag")
    .action(async (specPath: string, options: { tag?: string }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runVerify(specPath, options);
      output(result, mode, formatVerifyPretty);
    });

  program
    .command("styles")
    .description("Display document styles")
    .argument("<file>", "DOCX file path")
    .option("--type <type>", "Filter by style type (paragraph|character|table|numbering)")
    .option("--all", "Include semi-hidden styles")
    .action(async (file: string, options: { type?: string; all?: boolean }) => {
      const mode = program.opts().output as OutputMode;
      const result = await runStyles(file, options);
      output(result, mode, formatStylesPretty);
    });

  program
    .command("numbering")
    .description("Display numbering definitions")
    .argument("<file>", "DOCX file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runNumbering(file);
      output(result, mode, formatNumberingPretty);
    });

  program
    .command("headers-footers")
    .description("Display headers and footers")
    .argument("<file>", "DOCX file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runHeadersFooters(file);
      output(result, mode, formatHeadersFootersPretty);
    });

  program
    .command("tables")
    .description("Display table information")
    .argument("<file>", "DOCX file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runTables(file);
      output(result, mode, formatTablesPretty);
    });

  program
    .command("comments")
    .description("Display document comments")
    .argument("<file>", "DOCX file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runComments(file);
      output(result, mode, formatCommentsPretty);
    });

  program
    .command("images")
    .description("Display embedded images")
    .argument("<file>", "DOCX file path")
    .action(async (file: string) => {
      const mode = program.opts().output as OutputMode;
      const result = await runImages(file);
      output(result, mode, formatImagesPretty);
    });

  program
    .command("toc")
    .description("Display table of contents (based on outline levels)")
    .argument("<file>", "DOCX file path")
    .option("--max-level <level>", "Maximum heading level to include (0-9)", "9")
    .action(async (file: string, options: { maxLevel?: string }) => {
      const mode = program.opts().output as OutputMode;
      const maxLevel = options.maxLevel ? parseInt(options.maxLevel, 10) : undefined;
      const result = await runToc(file, { maxLevel });
      output(result, mode, formatTocPretty);
    });

  program
    .command("preview")
    .description("Render ASCII art preview of document content")
    .argument("<file>", "DOCX file path")
    .argument("[section]", "Section number (1-based, omit for all)")
    .option("--width <columns>", "Terminal width in columns", "80")
    .action(async (file: string, section: string | undefined, options: { width: string }) => {
      const mode = program.opts().output as OutputMode;
      let sectionNumber: number | undefined;
      if (section !== undefined) {
        sectionNumber = parseInt(section, 10);
        if (Number.isNaN(sectionNumber)) {
          console.error("Error: Section number must be a valid integer");
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
      const result = await runPreview(file, sectionNumber, { width });
      output(result, mode, formatPreviewPretty, formatPreviewMermaid);
    });

  return program;
}
