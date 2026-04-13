#!/usr/bin/env bun
/**
 * @file CLI entry point for fig-cli
 */

import { createProgram } from "./program";

createProgram().parse();
