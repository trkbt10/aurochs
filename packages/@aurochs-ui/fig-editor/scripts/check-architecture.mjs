#!/usr/bin/env node
/**
 * @file Guard fig-editor responsibility boundaries so new files cannot
 * silently recreate flat "misc" folders.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import console from "node:console";
import process from "node:process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function rel(path) {
  return relative(packageRoot, path);
}

function entries(dir) {
  if (!existsSync(dir)) {
    errors.push(`Required architecture directory is missing: ${rel(dir)}`);
    return [];
  }
  return readdirSync(dir).map((name) => ({
    name,
    path: join(dir, name),
    stat: statSync(join(dir, name)),
  }));
}

function requireAllowedDirectFiles(dir, allowedFiles) {
  const allowed = new Set(allowedFiles);
  for (const entry of entries(dir)) {
    if (entry.stat.isFile() && !allowed.has(entry.name)) {
      errors.push(`${rel(entry.path)} is not allowed directly under ${rel(dir)}. Move it to a responsibility subfolder.`);
    }
  }
}

function requireExactDirectories(dir, expectedNames) {
  const expected = new Set(expectedNames);
  for (const entry of entries(dir)) {
    if (!entry.stat.isDirectory()) {
      continue;
    }
    if (!expected.has(entry.name)) {
      errors.push(`${rel(entry.path)} is not an approved responsibility folder. Expected one of: ${expectedNames.join(", ")}.`);
    }
  }
  for (const name of expectedNames) {
    const path = join(dir, name);
    if (!existsSync(path) || !statSync(path).isDirectory()) {
      errors.push(`Missing responsibility folder: ${rel(path)}`);
    }
  }
}

function rejectFilesMatching(dir, pattern, message) {
  for (const entry of entries(dir)) {
    if (entry.stat.isFile() && pattern.test(entry.name)) {
      errors.push(`${rel(entry.path)} ${message}`);
    }
  }
}

const src = join(packageRoot, "src");
const spec = join(packageRoot, "spec");

requireAllowedDirectFiles(join(src, "canvas"), ["FigEditorCanvas.tsx"]);
requireExactDirectories(join(src, "canvas"), ["interaction", "rendering"]);

requireAllowedDirectFiles(join(src, "panels"), []);
requireExactDirectories(join(src, "panels"), ["inspector", "layers", "pages", "properties", "sections"]);

requireAllowedDirectFiles(join(src, "panels", "sections"), []);
requireExactDirectories(join(src, "panels", "sections"), [
  "appearance",
  "component",
  "export",
  "layout",
  "paint",
  "structure",
  "text",
  "vector",
]);

requireAllowedDirectFiles(join(spec, "e2e"), ["index.html", "main.tsx", "vite.config.ts"]);
rejectFilesMatching(join(spec, "e2e"), /\.e2e\.ts$/, "must be placed in a named responsibility folder under spec/e2e/.");

if (errors.length > 0) {
  console.error("fig-editor architecture guard failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
