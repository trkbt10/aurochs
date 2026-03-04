/**
 * @file Generate LibreOffice baseline snapshots for PDF→PPTX visual regression.
 *
 * Usage:
 *   bun packages/@aurochs-converters/pdf-to-pptx/spec/visual-regression/scripts/generate-libreoffice-snapshots.ts --all
 *   bun packages/@aurochs-converters/pdf-to-pptx/spec/visual-regression/scripts/generate-libreoffice-snapshots.ts --case k-resource-dl
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { getSampleFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { importPdf } from "../../../src/importer/pdf-importer";
import { exportPptxAsBuffer } from "@aurochs-builder/pptx/export";

type CaseDef = {
  readonly caseName: string;
  readonly snapshotName: string;
  readonly pdfPath: string;
  readonly pages: readonly number[];
};

const SNAPSHOT_ROOT = path.resolve(__dirname, "../snapshots");

const CASES: readonly CaseDef[] = [
  {
    caseName: "panel2",
    snapshotName: "pdf-import-panel2-libreoffice",
    pdfPath: getSampleFixturePath("panel2.pdf"),
    pages: [1, 2],
  },
  {
    caseName: "k-namingrule-dl",
    snapshotName: "k-namingrule-dl-libreoffice",
    pdfPath: getSampleFixturePath("k-namingrule-dl.pdf"),
    pages: [1, 2],
  },
  {
    caseName: "k-resource-dl",
    snapshotName: "k-resource-dl-libreoffice",
    pdfPath: getSampleFixturePath("k-resource-dl.pdf"),
    pages: [2, 4, 5],
  },
] as const;

type CliArgs = {
  readonly all: boolean;
  readonly caseName: string | null;
};

function parseCliArgs(argv: readonly string[]): CliArgs {
  const all = argv.includes("--all");
  const caseFlagIndex = argv.findIndex((arg) => arg === "--case");
  const caseName = caseFlagIndex >= 0 ? (argv[caseFlagIndex + 1] ?? null) : null;

  if ((all && caseName !== null) || (!all && caseName === null)) {
    throw new Error("Specify exactly one of --all or --case <name>");
  }

  if (caseName !== null && caseName.length === 0) {
    throw new Error("--case requires a non-empty value");
  }

  return { all, caseName };
}

function ensureCommandExists(command: string, args: readonly string[] = ["--version"]): void {
  try {
    execFileSync(command, [...args], { stdio: "ignore" });
  } catch (error) {
    throw new Error(`Required command not found or failed: ${command}`, { cause: error as Error });
  }
}

function resolveTargetCases(cli: CliArgs): readonly CaseDef[] {
  if (cli.all) {
    return CASES;
  }

  const found = CASES.find((c) => c.caseName === cli.caseName);
  if (!found) {
    const available = CASES.map((c) => c.caseName).join(", ");
    throw new Error(`Unknown case: ${cli.caseName}. Available: ${available}`);
  }
  return [found];
}

async function generatePptxForPage(args: {
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly outPptxPath: string;
}): Promise<void> {
  const pdfBytes = fs.readFileSync(args.pdfPath);
  const result = await importPdf(new Uint8Array(pdfBytes), {
    pages: [args.pageNumber],
    slideSize: { width: px(960), height: px(540) },
    fit: "contain",
    setWhiteBackground: true,
    addPageNumbers: false,
    grouping: { preset: "auto" },
  });

  const pptx = await exportPptxAsBuffer(result.document);
  fs.mkdirSync(path.dirname(args.outPptxPath), { recursive: true });
  fs.writeFileSync(args.outPptxPath, Buffer.from(pptx));
}

function convertPptxToSnapshotPng(args: {
  readonly pptxPath: string;
  readonly outPngPath: string;
}): void {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-to-pptx-lo-"));
  try {
    execFileSync(
      "soffice",
      [
        "--headless",
        "--convert-to",
        "pdf:impress_pdf_Export",
        "--outdir",
        workDir,
        args.pptxPath,
      ],
      { stdio: "ignore" },
    );

    const pdfPath = path.join(workDir, `${path.basename(args.pptxPath, ".pptx")}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`LibreOffice did not produce PDF: ${pdfPath}`);
    }

    const pngPrefix = args.outPngPath.replace(/\.png$/u, "");
    execFileSync("pdftoppm", ["-png", "-r", "144", "-f", "1", "-l", "1", "-singlefile", pdfPath, pngPrefix], {
      stdio: "ignore",
    });

    if (!fs.existsSync(args.outPngPath)) {
      throw new Error(`pdftoppm did not produce PNG: ${args.outPngPath}`);
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function generateCaseSnapshots(caseDef: CaseDef): Promise<void> {
  if (!fs.existsSync(caseDef.pdfPath)) {
    throw new Error(`PDF fixture not found: ${caseDef.pdfPath}`);
  }

  const snapshotDir = path.join(SNAPSHOT_ROOT, caseDef.snapshotName);
  fs.mkdirSync(snapshotDir, { recursive: true });

  const outputDir = path.resolve(__dirname, "../__output__");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const pageNumber of caseDef.pages) {
    const basename = `auto-${caseDef.caseName}-page${pageNumber}`;
    const pptxPath = path.join(outputDir, `${basename}.pptx`);
    const pngPath = path.join(snapshotDir, `slide-${pageNumber}.png`);

    await generatePptxForPage({
      pdfPath: caseDef.pdfPath,
      pageNumber,
      outPptxPath: pptxPath,
    });

    convertPptxToSnapshotPng({
      pptxPath,
      outPngPath: pngPath,
    });

    console.log(`[generated] ${caseDef.snapshotName} slide-${pageNumber}.png`);
  }
}

async function main(argv: readonly string[]): Promise<void> {
  const cli = parseCliArgs(argv);

  ensureCommandExists("soffice", ["--version"]);
  ensureCommandExists("pdftoppm", ["-v"]);

  const targets = resolveTargetCases(cli);
  for (const target of targets) {
    await generateCaseSnapshots(target);
  }
}

void main(process.argv.slice(2));
