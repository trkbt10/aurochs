/**
 * @file Resolve and parse chart parts referenced from a slide
 */

import { parseXml } from "@aurochs/xml";
import { listRelationships } from "@aurochs-office/opc";
import { resolveRelationshipTargetPath } from "@aurochs-office/opc";
import { parseChart } from "@aurochs-office/chart/parser";
import { summarizeChart, type ChartSummary } from "@aurochs-office/chart/domain/summary";

type ZipPackageLike = {
  readText(path: string): string | null;
};

export type ResolvedChartJson = {
  readonly resourceId: string;
  readonly partPath?: string;
  readonly chart?: ChartSummary;
  readonly error?: string;
};

function getSlidePaths(slideFilename: string): { readonly slidePath: string; readonly relsPath: string } {
  const slidePath = `ppt/slides/${slideFilename}.xml`;
  const relsPath = `ppt/slides/_rels/${slideFilename}.xml.rels`;
  return { slidePath, relsPath };
}

/**
 * Resolve and parse chart parts referenced from a slide.
 */
export function resolveChartsForSlide(options: {
  readonly zipPackage: ZipPackageLike;
  readonly slideFilename: string;
  readonly chartResourceIds: readonly string[];
}): readonly ResolvedChartJson[] {
  const { slidePath, relsPath } = getSlidePaths(options.slideFilename);
  const relsXml = options.zipPackage.readText(relsPath);
  if (!relsXml) {
    return options.chartResourceIds.map((resourceId) => ({
      resourceId,
      error: `Could not read slide relationships: ${relsPath}`,
    }));
  }

  const relsDoc = parseXml(relsXml);
  const rels = listRelationships(relsDoc);
  const relById = new Map(rels.map((r) => [r.id, r]));

  return options.chartResourceIds.map((resourceId) => {
    const rel = relById.get(resourceId);
    if (!rel) {
      return { resourceId, error: `Missing relationship: ${resourceId}` };
    }

    const partPath = resolveRelationshipTargetPath(slidePath, rel.target);
    const chartXml = options.zipPackage.readText(partPath);
    if (!chartXml) {
      return { resourceId, partPath, error: `Could not read chart part: ${partPath}` };
    }

    const chartDoc = parseXml(chartXml);
    const chart = parseChart(chartDoc);
    if (!chart) {
      return { resourceId, partPath, error: `Failed to parse chart: ${partPath}` };
    }

    return {
      resourceId,
      partPath,
      chart: summarizeChart(chart),
    };
  });
}
