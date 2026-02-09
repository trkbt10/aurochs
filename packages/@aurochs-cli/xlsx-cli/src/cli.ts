#!/usr/bin/env bun
/**
 * @file CLI entry point for the XLSX inspector tool
 */
import { createProgram } from "./program";

createProgram().parse();
