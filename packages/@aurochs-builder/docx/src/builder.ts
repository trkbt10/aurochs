/**
 * @file DOCX Builder
 *
 * Builds a complete DOCX file from a DocxBuildSpec.
 * Template-free: generates DOCX from scratch using the exporter.
 */

import { exportDocx } from "@aurochs-office/docx/exporter";
import type { DocxBuildSpec, DocxBuildData } from "./types";
import { convertDocument, countBlockContentSpecs } from "./spec-converter";

/**
 * Build a DOCX file from a build specification.
 *
 * @param spec - The build specification
 * @returns The DOCX file as a Uint8Array
 */
export async function buildDocx(spec: DocxBuildSpec): Promise<Uint8Array> {
  const document = convertDocument(spec);
  return exportDocx(document);
}

/**
 * Get build metadata from a specification (for CLI output).
 */
export function getBuildData(spec: DocxBuildSpec): DocxBuildData {
  const { paragraphCount, tableCount } = countBlockContentSpecs(spec.content);

  return {
    outputPath: spec.output,
    paragraphCount,
    tableCount,
  };
}
