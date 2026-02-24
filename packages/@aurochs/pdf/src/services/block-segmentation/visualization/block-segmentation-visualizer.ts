/**
 * @file SVG/JSON visualizer for block segmentation debug.
 */

import path from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parsePdf } from "../../../parser/core/pdf-parser";
import type { PdfText } from "../../../domain/text";
import type { PdfPath } from "../../../domain/path";
import {
  spatialGroupingWithDiagnostics,
  type SpatialGroupingLineClusterTrace,
  type SpatialGroupingLineMergeTrace,
} from "../strategies/spatial-grouping";
import { buildBlockingZonesFromPageElements } from "../strategies/blocking-zones";
import type { GroupedText } from "../contracts/types";
import { normalizePageElementsForDisplay } from "./page-coordinate-normalization";

const GROUP_PALETTE = [
  "#E63946",
  "#2A9D8F",
  "#457B9D",
  "#F4A261",
  "#8E44AD",
  "#1D3557",
  "#FF7F11",
  "#2B9348",
] as const;

type CharEntry = { readonly char: string; readonly count: number };

export type SegmentationVisualizationSummary = {
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly textCount: number;
  readonly groupCount: number;
  readonly groupedRunCount: number;
  readonly ungroupedRunCount: number;
  readonly replacementCharRunCount: number;
  readonly emptyRunCount: number;
  readonly controlCharRunCount: number;
  readonly sourceCharCount: number;
  readonly groupedCharCount: number;
  readonly missingChars: readonly CharEntry[];
  readonly extraChars: readonly CharEntry[];
  readonly groups: readonly {
    readonly index: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly paragraphCount: number;
    readonly runCount: number;
    readonly inlineDirection: string;
    readonly alignment: string;
    readonly preview: string;
  }[];
  readonly lineMergeDiagnostics: {
    readonly traceCount: number;
    readonly decidedMergeCount: number;
    readonly finalMergeCount: number;
    readonly blockedByZoneCount: number;
    readonly hardSplitProposalCount: number;
    readonly hardMergeProposalCount: number;
    readonly strategyHistogram: Readonly<Record<string, number>>;
    readonly reasonHistogram: Readonly<Record<string, number>>;
    readonly samples: readonly {
      readonly index: number;
      readonly blockedByZone: boolean;
      readonly decisionMerge: boolean;
      readonly finalMerge: boolean;
      readonly mergeScore: number;
      readonly splitScore: number;
      readonly topReasons: readonly string[];
    }[];
  };
  readonly lineClusterDiagnostics: {
    readonly traceCount: number;
    readonly acceptedCount: number;
    readonly rejectedCount: number;
    readonly hardRejectProposalCount: number;
    readonly strategyHistogram: Readonly<Record<string, number>>;
    readonly reasonHistogram: Readonly<Record<string, number>>;
    readonly samples: readonly {
      readonly index: number;
      readonly accepted: boolean;
      readonly acceptScore: number;
      readonly rejectScore: number;
      readonly baselineDistance: number;
      readonly baselineTolerance: number;
      readonly overlapRatio: number;
      readonly topReasons: readonly string[];
    }[];
  };
  readonly coordinateNormalization: {
    readonly applied: boolean;
    readonly rotation: 0 | 90 | 180 | 270;
    readonly status: "normalized" | "identity" | "fallback";
    readonly message?: string;
  };
  readonly outputSvgPath: string;
  readonly outputJsonPath: string;
};

export type VisualizeSegmentationArgs = {
  readonly pdfPath: string;
  readonly outDir: string;
  readonly pageNumber: number;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toSvgTopY(pageHeight: number, y: number, height: number): number {
  return pageHeight - (y + height);
}

function hasControlChar(text: string): boolean {
  return Array.from(text).some((char) => {
    const code = char.codePointAt(0);
    if (code === undefined) {
      return false;
    }
    const isAsciiControl = code <= 0x1f || code === 0x7f;
    const isTabLike = code === 0x09 || code === 0x0a || code === 0x0d;
    return isAsciiControl && !isTabLike;
  });
}

function countChars(text: string): Map<string, number> {
  return Array.from(text).reduce((acc, char) => {
    const current = acc.get(char) ?? 0;
    acc.set(char, current + 1);
    return acc;
  }, new Map<string, number>());
}

function diffCharMaps(source: Map<string, number>, target: Map<string, number>): readonly CharEntry[] {
  return [...source.entries()]
    .map(([char, count]) => ({ char, count: count - (target.get(char) ?? 0) }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

function groupText(group: GroupedText): string {
  return group.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
}

function runSet(groups: readonly GroupedText[]): ReadonlySet<PdfText> {
  return new Set(groups.flatMap((group) => group.paragraphs.flatMap((paragraph) => paragraph.runs)));
}

function buildSummaryBase(args: {
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly texts: readonly PdfText[];
  readonly groups: readonly GroupedText[];
  readonly outputSvgPath: string;
  readonly outputJsonPath: string;
  readonly coordinateNormalization: SegmentationVisualizationSummary["coordinateNormalization"];
}): Omit<SegmentationVisualizationSummary, "groups" | "lineMergeDiagnostics" | "lineClusterDiagnostics"> {
  const { pdfPath, pageNumber, pageWidth, pageHeight, texts, groups, outputSvgPath, outputJsonPath, coordinateNormalization } = args;
  const groupedRuns = groups.flatMap((group) => group.paragraphs.flatMap((paragraph) => paragraph.runs));
  const groupedRunRefs = runSet(groups);
  const sourceText = texts.map((text) => text.text).join("");
  const groupedTextValue = groupedRuns.map((run) => run.text).join("");
  const sourceChars = countChars(sourceText);
  const groupedChars = countChars(groupedTextValue);

  return {
    pdfPath,
    pageNumber,
    pageWidth,
    pageHeight,
    textCount: texts.length,
    groupCount: groups.length,
    groupedRunCount: groupedRuns.length,
    ungroupedRunCount: texts.filter((text) => !groupedRunRefs.has(text)).length,
    replacementCharRunCount: texts.filter((text) => text.text.includes("\uFFFD")).length,
    emptyRunCount: texts.filter((text) => text.text.trim().length === 0).length,
    controlCharRunCount: texts.filter((text) => hasControlChar(text.text)).length,
    sourceCharCount: Array.from(sourceText).length,
    groupedCharCount: Array.from(groupedTextValue).length,
    missingChars: diffCharMaps(sourceChars, groupedChars).slice(0, 40),
    extraChars: diffCharMaps(groupedChars, sourceChars).slice(0, 40),
    coordinateNormalization,
    outputSvgPath,
    outputJsonPath,
  };
}

function groupRows(groups: readonly GroupedText[]): SegmentationVisualizationSummary["groups"] {
  return groups.map((group, index) => {
    const runCount = group.paragraphs.reduce((sum, paragraph) => sum + paragraph.runs.length, 0);
    const preview = groupText(group).replace(/\s+/g, " ").slice(0, 120);
    return {
      index,
      x: group.bounds.x,
      y: group.bounds.y,
      width: group.bounds.width,
      height: group.bounds.height,
      paragraphCount: group.paragraphs.length,
      runCount,
      inlineDirection: group.layoutInference?.inlineDirection ?? "unknown",
      alignment: group.layoutInference?.alignment ?? "unknown",
      preview,
    };
  });
}

function incrementHistogram(histogram: Map<string, number>, key: string): void {
  const next = (histogram.get(key) ?? 0) + 1;
  histogram.set(key, next);
}

function histogramToObject(histogram: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...histogram.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function buildLineMergeDiagnostics(
  traces: readonly SpatialGroupingLineMergeTrace[],
): SegmentationVisualizationSummary["lineMergeDiagnostics"] {
  const strategyHistogram = new Map<string, number>();
  const reasonHistogram = new Map<string, number>();
  const hardProposalCount = { split: 0, merge: 0 };
  for (const trace of traces) {
    for (const proposal of trace.proposals) {
      incrementHistogram(strategyHistogram, proposal.strategyId);
      incrementHistogram(reasonHistogram, proposal.reason);
      if (!proposal.hard) {
        continue;
      }
      if (proposal.action === "split") {
        hardProposalCount.split += 1;
      }
      if (proposal.action === "merge") {
        hardProposalCount.merge += 1;
      }
    }
  }

  return {
    traceCount: traces.length,
    decidedMergeCount: traces.filter((trace) => trace.decisionMerge).length,
    finalMergeCount: traces.filter((trace) => trace.finalMerge).length,
    blockedByZoneCount: traces.filter((trace) => trace.blockedByZone).length,
    hardSplitProposalCount: hardProposalCount.split,
    hardMergeProposalCount: hardProposalCount.merge,
    strategyHistogram: histogramToObject(strategyHistogram),
    reasonHistogram: histogramToObject(reasonHistogram),
    samples: traces.slice(0, 40).map((trace, index) => ({
      index,
      blockedByZone: trace.blockedByZone,
      decisionMerge: trace.decisionMerge,
      finalMerge: trace.finalMerge,
      mergeScore: trace.mergeScore,
      splitScore: trace.splitScore,
      topReasons: trace.proposals.slice(0, 3).map((proposal) => `${proposal.action}:${proposal.reason}`),
    })),
  };
}

function buildLineClusterDiagnostics(
  traces: readonly SpatialGroupingLineClusterTrace[],
): SegmentationVisualizationSummary["lineClusterDiagnostics"] {
  const strategyHistogram = new Map<string, number>();
  const reasonHistogram = new Map<string, number>();
  const hardRejectCount = traces
    .flatMap((trace) => trace.proposals)
    .filter((proposal) => proposal.hard && proposal.action === "reject").length;
  for (const trace of traces) {
    for (const proposal of trace.proposals) {
      incrementHistogram(strategyHistogram, proposal.strategyId);
      incrementHistogram(reasonHistogram, proposal.reason);
    }
  }

  return {
    traceCount: traces.length,
    acceptedCount: traces.filter((trace) => trace.accepted).length,
    rejectedCount: traces.filter((trace) => !trace.accepted).length,
    hardRejectProposalCount: hardRejectCount,
    strategyHistogram: histogramToObject(strategyHistogram),
    reasonHistogram: histogramToObject(reasonHistogram),
    samples: traces.slice(0, 40).map((trace, index) => ({
      index,
      accepted: trace.accepted,
      acceptScore: trace.acceptScore,
      rejectScore: trace.rejectScore,
      baselineDistance: trace.baselineDistance,
      baselineTolerance: trace.baselineTolerance,
      overlapRatio: trace.overlapRatio,
      topReasons: trace.proposals.slice(0, 3).map((proposal) => `${proposal.action}:${proposal.reason}`),
    })),
  };
}

function buildSvg(args: {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly texts: readonly PdfText[];
  readonly groups: readonly GroupedText[];
}): string {
  const { pageWidth, pageHeight, texts, groups } = args;
  const header = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}" viewBox="0 0 ${pageWidth} ${pageHeight}">`,
    `<rect x="0" y="0" width="${pageWidth}" height="${pageHeight}" fill="#ffffff"/>`,
  ];

  const textRects = texts.map((text) => {
    const y = toSvgTopY(pageHeight, text.y, text.height);
    const hasIssue = text.text.includes("\uFFFD") || hasControlChar(text.text) || text.text.trim().length === 0;
    const stroke = hasIssue ? "#d90429" : "#adb5bd";
    const fill = hasIssue ? "rgba(217,4,41,0.12)" : "rgba(173,181,189,0.08)";
    return [
      `<rect x="${text.x}" y="${y}" width="${Math.max(text.width, 0.2)}" height="${Math.max(text.height, 0.2)}"`,
      ` stroke="${stroke}" fill="${fill}" stroke-width="0.35">`,
      `<title>${escapeXml(text.text)}</title>`,
      `</rect>`,
    ].join("");
  });

  const groupRects = groups.flatMap((group, index) => {
    const color = GROUP_PALETTE[index % GROUP_PALETTE.length]!;
    const y = toSvgTopY(pageHeight, group.bounds.y, group.bounds.height);
    const label = `G${index} p=${group.paragraphs.length} r=${group.paragraphs.reduce((s, p) => s + p.runs.length, 0)} ` +
      `dir=${group.layoutInference?.inlineDirection ?? "unknown"} align=${group.layoutInference?.alignment ?? "unknown"}`;
    const labelY = Math.max(12, y - 3);
    return [
      `<rect x="${group.bounds.x}" y="${y}" width="${group.bounds.width}" height="${group.bounds.height}"`,
      ` stroke="${color}" fill="none" stroke-width="1.1">`,
      `<title>${escapeXml(groupText(group))}</title>`,
      `</rect>`,
      `<text x="${group.bounds.x + 2}" y="${labelY}" font-size="9" fill="${color}" font-family="monospace">`,
      `${escapeXml(label)}`,
      `</text>`,
    ];
  });

  const legend = [
    `<text x="8" y="14" font-size="10" font-family="monospace" fill="#333">`,
    `Gray: extracted runs / Red: suspicious runs / Color boxes: grouped blocks`,
    `</text>`,
  ];

  return [...header, ...legend, ...textRects, ...groupRects, `</svg>`].join("\n");
}

function outputBaseName(pdfPath: string, pageNumber: number): string {
  const basename = path.basename(pdfPath).replace(/\.pdf$/i, "");
  return `${basename}.p${pageNumber}.segmentation`;
}

/** Create SVG/JSON debug artifacts for one PDF page. */
export async function visualizeBlockSegmentation(args: VisualizeSegmentationArgs): Promise<SegmentationVisualizationSummary> {
  if (!args.pdfPath) {
    throw new Error("visualizeBlockSegmentation: pdfPath is required");
  }
  if (!args.outDir) {
    throw new Error("visualizeBlockSegmentation: outDir is required");
  }
  if (!Number.isInteger(args.pageNumber) || args.pageNumber < 1) {
    throw new Error(`visualizeBlockSegmentation: pageNumber must be >= 1 (got ${args.pageNumber})`);
  }

  const bytes = readFileSync(args.pdfPath);
  const parsed = await parsePdf(bytes, { pages: [args.pageNumber], encryption: { mode: "password", password: "" } });
  const page = parsed.pages[0];
  if (!page) {
    throw new Error(`visualizeBlockSegmentation: page ${args.pageNumber} not found`);
  }

  const texts = page.elements.filter((element): element is PdfText => element.type === "text");
  const pagePaths = page.elements.filter((element): element is PdfPath => element.type === "path");
  const normalized = await normalizePageElementsForDisplay({
    pdfBytes: bytes,
    pageNumber: args.pageNumber,
    pageWidth: page.width,
    pageHeight: page.height,
    texts,
    paths: pagePaths,
  });
  const normalizedTexts = normalized.texts;
  const blockingZones = buildBlockingZonesFromPageElements({ paths: normalized.paths });
  const grouped = spatialGroupingWithDiagnostics({
    texts: normalizedTexts,
    context: {
      blockingZones: blockingZones.length > 0 ? blockingZones : undefined,
      pageWidth: page.width,
      pageHeight: page.height,
    },
  });
  const groups = grouped.groups;
  const lineClusterDiagnostics = buildLineClusterDiagnostics(grouped.diagnostics.lineClusterTraces);
  const lineMergeDiagnostics = buildLineMergeDiagnostics(grouped.diagnostics.lineMergeTraces);
  const svg = buildSvg({ pageWidth: page.width, pageHeight: page.height, texts: normalizedTexts, groups });

  const baseName = outputBaseName(args.pdfPath, args.pageNumber);
  mkdirSync(args.outDir, { recursive: true });
  const outputSvgPath = path.resolve(args.outDir, `${baseName}.svg`);
  const outputJsonPath = path.resolve(args.outDir, `${baseName}.json`);

  writeFileSync(outputSvgPath, svg);

  const summaryBase = buildSummaryBase({
    pdfPath: path.resolve(args.pdfPath),
    pageNumber: args.pageNumber,
    pageWidth: page.width,
    pageHeight: page.height,
    texts: normalizedTexts,
    groups,
    outputSvgPath,
    outputJsonPath,
    coordinateNormalization: {
      applied: normalized.applied,
      rotation: normalized.rotation,
      status: normalized.status,
      message: normalized.message,
    },
  });
  const summary: SegmentationVisualizationSummary = {
    ...summaryBase,
    groups: groupRows(groups),
    lineMergeDiagnostics,
    lineClusterDiagnostics,
  };

  writeFileSync(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
