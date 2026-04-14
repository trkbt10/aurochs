#!/usr/bin/env bun
/**
 * @file CLI entry point for tsv-cli
 */

import { createProgram } from "./program";

createProgram().parse();
