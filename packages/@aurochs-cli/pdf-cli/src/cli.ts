#!/usr/bin/env bun
/**
 * @file CLI entry point for pdf-cli
 */

import { createProgram } from "./program";

createProgram().parse();
