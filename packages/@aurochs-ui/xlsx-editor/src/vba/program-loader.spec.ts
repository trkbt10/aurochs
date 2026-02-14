/**
 * @file VBA Program Loader Tests
 */

import { describe, it, expect, vi } from "vitest";
import type { ZipPackage } from "@aurochs/zip";
import { loadVbaProgramFromPackage, hasVbaProject } from "./program-loader";

// =============================================================================
// Mock ZipPackage Factory
// =============================================================================

function createMockZipPackage(options: {
  readonly hasVbaProject: boolean;
  readonly vbaProjectContent?: Uint8Array | null;
}): ZipPackage {
  return {
    exists(path: string): boolean {
      if (path === "xl/vbaProject.bin") {
        return options.hasVbaProject;
      }
      return false;
    },
    readBinary(path: string): ArrayBuffer | null {
      if (path === "xl/vbaProject.bin" && options.vbaProjectContent) {
        return options.vbaProjectContent.buffer.slice(0) as ArrayBuffer;
      }
      return null;
    },
    readText(): string | null {
      return null;
    },
    listFiles(): readonly string[] {
      return options.hasVbaProject ? ["xl/vbaProject.bin"] : [];
    },
    writeText(): void {},
    writeBinary(): void {},
    remove(): void {},
    toBlob(): Promise<Blob> {
      return Promise.resolve(new Blob());
    },
    toArrayBuffer(): Promise<ArrayBuffer> {
      return Promise.resolve(new ArrayBuffer(0));
    },
    asPresentationFile() {
      return this;
    },
  } satisfies ZipPackage;
}

// =============================================================================
// hasVbaProject Tests
// =============================================================================

describe("hasVbaProject", () => {
  it("should return true when vbaProject.bin exists", () => {
    const pkg = createMockZipPackage({ hasVbaProject: true });
    expect(hasVbaProject(pkg)).toBe(true);
  });

  it("should return false when vbaProject.bin does not exist", () => {
    const pkg = createMockZipPackage({ hasVbaProject: false });
    expect(hasVbaProject(pkg)).toBe(false);
  });
});

// =============================================================================
// loadVbaProgramFromPackage Tests
// =============================================================================

describe("loadVbaProgramFromPackage", () => {
  it("should return undefined when vbaProject.bin does not exist", () => {
    const pkg = createMockZipPackage({ hasVbaProject: false });
    const result = loadVbaProgramFromPackage(pkg);
    expect(result).toBeUndefined();
  });

  it("should return undefined when readBinary returns null", () => {
    const pkg = createMockZipPackage({
      hasVbaProject: true,
      vbaProjectContent: null,
    });
    const result = loadVbaProgramFromPackage(pkg);
    expect(result).toBeUndefined();
  });

  it("should return undefined and log warning for invalid vbaProject.bin content", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const pkg = createMockZipPackage({
      hasVbaProject: true,
      vbaProjectContent: new Uint8Array([0, 1, 2, 3, 4]), // Invalid content
    });

    const result = loadVbaProgramFromPackage(pkg);

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to parse vbaProject.bin:"),
      expect.any(String)
    );

    warnSpy.mockRestore();
  });
});
