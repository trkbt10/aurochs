/**
 * @file Exploration tests for vbaProject.bin structure
 *
 * These tests explore the MS-OVBA structure in fixture files
 * to guide parser implementation.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadZipPackage } from "@aurochs/zip";
import { openCfb } from "@aurochs-office/cfb";

const XLSM_FIXTURE = "fixtures/poi-test-data/test-data/spreadsheet/SimpleMacro.xlsm";
const DOCM_FIXTURE = "fixtures/poi-test-data/test-data/document/SimpleMacro.docm";
const PPTM_FIXTURE = "fixtures/poi-test-data/test-data/slideshow/SimpleMacro.pptm";

async function loadVbaProject(fixturePath: string, vbaPath: string): Promise<Uint8Array> {
  const bytes = readFileSync(fixturePath);
  const pkg = await loadZipPackage(bytes);
  const binary = pkg.readBinary(vbaPath);
  if (!binary) {
    throw new Error(`${vbaPath} not found in ${fixturePath}`);
  }
  return new Uint8Array(binary);
}

describe("vbaProject.bin structure exploration", () => {
  describe("XLSM - SimpleMacro.xlsm", () => {
    it("can open vbaProject.bin as CFB", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      expect(cfb.header.majorVersion).toBeOneOf([3, 4]);
    });

    it("lists root directory entries", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      const rootEntries = cfb.list();
      const names = rootEntries.map((e) => e.name);

      // MS-OVBA expected storages/streams at root
      expect(names).toContain("VBA");
      expect(names).toContain("PROJECT");
    });

    it("lists VBA storage entries", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      const vbaEntries = cfb.list(["VBA"]);
      const names = vbaEntries.map((e) => e.name);

      // MS-OVBA expected streams in VBA storage
      expect(names).toContain("dir");
      expect(names).toContain("_VBA_PROJECT");
    });

    it("can read PROJECT stream as text", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      // PROJECT stream is typically in root
      const projectBytes = cfb.readStream(["PROJECT"]);
      expect(projectBytes.length).toBeGreaterThan(0);

      // PROJECT stream is typically ASCII/UTF-8 text
      const text = new TextDecoder("utf-8").decode(projectBytes);
      expect(text).toContain("ID=");
    });

    it("can read VBA/dir stream", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      const dirBytes = cfb.readStream(["VBA", "dir"]);
      expect(dirBytes.length).toBeGreaterThan(0);

      // dir stream starts with compressed data
      // First byte should be 0x01 (signature byte for compressed container)
      expect(dirBytes[0]).toBe(0x01);
    });

    it("finds module streams in VBA storage", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      const vbaEntries = cfb.list(["VBA"]);
      const streamNames = vbaEntries.filter((e) => e.type === "stream").map((e) => e.name);

      // Should have module streams (e.g., "Module1", "ThisWorkbook", etc.)
      // Exact names depend on the VBA project content
      expect(streamNames.length).toBeGreaterThan(2); // At least dir, _VBA_PROJECT, and some modules
    });
  });

  describe("DOCM - SimpleMacro.docm", () => {
    it("has same VBA structure as XLSM", async () => {
      const vbaBytes = await loadVbaProject(DOCM_FIXTURE, "word/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      const rootEntries = cfb.list();
      const names = rootEntries.map((e) => e.name);

      expect(names).toContain("VBA");
      expect(names).toContain("PROJECT");
    });

    it("can read PROJECT stream", async () => {
      const vbaBytes = await loadVbaProject(DOCM_FIXTURE, "word/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      const projectBytes = cfb.readStream(["PROJECT"]);
      const text = new TextDecoder("utf-8").decode(projectBytes);
      expect(text).toContain("ID=");
    });
  });

  describe("PPTM - SimpleMacro.pptm", () => {
    it("has same VBA structure as XLSM", async () => {
      const vbaBytes = await loadVbaProject(PPTM_FIXTURE, "ppt/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      const rootEntries = cfb.list();
      const names = rootEntries.map((e) => e.name);

      expect(names).toContain("VBA");
      expect(names).toContain("PROJECT");
    });
  });

  describe("PROJECT stream format", () => {
    it("parses key=value pairs", async () => {
      const vbaBytes = await loadVbaProject(XLSM_FIXTURE, "xl/vbaProject.bin");
      const cfb = openCfb(vbaBytes);

      const projectBytes = cfb.readStream(["PROJECT"]);
      const text = new TextDecoder("utf-8").decode(projectBytes);

      // Parse as INI-like format
      const lines = text.split(/\r?\n/);
      const pairs = new Map<string, string>();
      for (const line of lines) {
        const eqIdx = line.indexOf("=");
        if (eqIdx > 0) {
          const key = line.slice(0, eqIdx);
          const value = line.slice(eqIdx + 1);
          pairs.set(key, value);
        }
      }

      expect(pairs.has("ID")).toBe(true);
      // May have Name, Module, etc.
    });
  });
});
