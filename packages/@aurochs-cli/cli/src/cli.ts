#!/usr/bin/env node
import { Command } from "commander";
import { createProgram as createPptxProgram } from "@aurochs-cli/pptx-cli";
import { createProgram as createDocxProgram } from "@aurochs-cli/docx-cli";
import { createProgram as createXlsxProgram } from "@aurochs-cli/xlsx-cli";
import pkg from "../package.json";

const program = new Command();

program.name("aurochs").description("Unified CLI for Office document inspection").version(pkg.version);

program.addCommand(createPptxProgram());
program.addCommand(createDocxProgram());
program.addCommand(createXlsxProgram());

program.parse();
