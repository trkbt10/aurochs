#!/usr/bin/env bun
/**
 * @file CLI entry point for pptx-cli
 */
import { createProgram } from "./program";

createProgram().parse();
