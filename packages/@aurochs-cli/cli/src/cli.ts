#!/usr/bin/env node
import { Command } from "commander";
import { createProgram as createPptxProgram } from "@aurochs-cli/pptx-cli";
import { createProgram as createDocxProgram } from "@aurochs-cli/docx-cli";
import { createProgram as createXlsxProgram } from "@aurochs-cli/xlsx-cli";

const program = new Command();

program.name("aurochs").description("Unified CLI for Office document inspection").version("0.1.0");

program.addCommand(createPptxProgram());
program.addCommand(createDocxProgram());
program.addCommand(createXlsxProgram());

program.parse();
