import * as fs from "node:fs";
import * as path from "node:path";
import JSZip from "jszip";
import type { PresentationFile } from "../../../src/pptx";
import { openPresentation } from "../../../src/pptx";
import { parseTiming } from "../../../src/pptx/parser/timing-parser";
import { getChild, isXmlElement, parseXml, type XmlElement } from "../../../src/xml";
import type { FileInfo, PresentationInfo, SlideInfo, TimingData } from "../../shared/types";

const FIXTURE_DIRS = ["fixtures/poi-test-data/test-data/slideshow", "fixtures/poi-test-data/test-data/xmldsign"];

type FileCache = Map<string, { text: string; buffer: ArrayBuffer }>;

type CachedPresentation = {
  presentation: ReturnType<typeof openPresentation>;
  cache: FileCache;
  loadedAt: number;
};

const presentationCache = new Map<string, CachedPresentation>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function findPptxFiles(): FileInfo[] {
  const files: FileInfo[] = [];

  for (const dir of FIXTURE_DIRS) {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) continue;

    const entries = fs.readdirSync(fullDir);
    for (const entry of entries) {
      if (entry.endsWith(".pptx")) {
        files.push({
          id: encodeURIComponent(entry),
          name: entry,
          path: path.join(fullDir, entry),
          dir: path.basename(dir),
        });
      }
    }
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export function getFileById(id: string): FileInfo | undefined {
  const files = findPptxFiles();
  return files.find((f) => f.id === id);
}

async function preloadZipFiles(jszip: JSZip): Promise<FileCache> {
  const cache: FileCache = new Map();
  const files = Object.keys(jszip.files);

  for (const filePath of files) {
    const file = jszip.file(filePath);
    if (file !== null && !file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(filePath, { text, buffer });
    }
  }

  return cache;
}

function createPresentationFile(cache: FileCache): PresentationFile {
  return {
    readText(filePath: string): string | null {
      const entry = cache.get(filePath);
      return entry?.text ?? null;
    },
    readBinary(filePath: string): ArrayBuffer | null {
      const entry = cache.get(filePath);
      return entry?.buffer ?? null;
    },
    exists(filePath: string): boolean {
      return cache.has(filePath);
    },
  };
}

export async function loadPresentation(fileInfo: FileInfo): Promise<CachedPresentation> {
  const cached = presentationCache.get(fileInfo.id);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL) {
    return cached;
  }

  const pptxBuffer = fs.readFileSync(fileInfo.path);
  const jszip = await JSZip.loadAsync(pptxBuffer);
  const cache = await preloadZipFiles(jszip);
  const presentationFile = createPresentationFile(cache);
  const presentation = openPresentation(presentationFile);

  const result: CachedPresentation = {
    presentation,
    cache,
    loadedAt: Date.now(),
  };

  presentationCache.set(fileInfo.id, result);
  return result;
}

export async function getPresentationInfo(fileInfo: FileInfo): Promise<PresentationInfo> {
  const startTime = performance.now();
  const { presentation } = await loadPresentation(fileInfo);
  const parseTime = Math.round(performance.now() - startTime);

  return {
    id: fileInfo.id,
    name: fileInfo.name,
    slideCount: presentation.count,
    size: presentation.size,
    appVersion: presentation.appVersion,
    parseTimeMs: parseTime,
  };
}

export async function getSlideList(fileInfo: FileInfo): Promise<SlideInfo[]> {
  const { presentation, cache } = await loadPresentation(fileInfo);
  const slideInfos = presentation.list();

  return slideInfos.map((info) => {
    const slideXml = cache.get(`ppt/slides/slide${info.number}.xml`)?.text;
    let hasAnimations = false;
    let animationCount = 0;

    if (slideXml) {
      try {
        const doc = parseXml(slideXml);
        const timingEl = findTimingElement(doc);
        if (timingEl) {
          const timing = parseTiming(timingEl);
          const counts = countAnimations(timing);
          hasAnimations = counts.total > 0;
          animationCount = counts.total;
        }
      } catch {
        // Ignore timing parse errors
      }
    }

    return {
      number: info.number,
      filename: info.filename,
      hasAnimations,
      animationCount,
    };
  });
}

export async function renderSlide(fileInfo: FileInfo, slideNum: number, mode: "svg" | "html"): Promise<string> {
  const { presentation } = await loadPresentation(fileInfo);
  const slide = presentation.getSlide(slideNum);
  return mode === "svg" ? slide.renderSVG() : slide.renderHTML();
}

export async function getTimingData(fileInfo: FileInfo, slideNum: number): Promise<TimingData> {
  const { cache } = await loadPresentation(fileInfo);
  const slideXml = cache.get(`ppt/slides/slide${slideNum}.xml`)?.text;

  if (!slideXml) {
    return {
      rootTimeNode: null,
      animatedShapeIds: [],
      animationCount: 0,
      animationTypes: {},
    };
  }

  try {
    const doc = parseXml(slideXml);
    const timingEl = findTimingElement(doc);

    if (!timingEl) {
      return {
        rootTimeNode: null,
        animatedShapeIds: [],
        animationCount: 0,
        animationTypes: {},
      };
    }

    const timing = parseTiming(timingEl);
    if (!timing) {
      return {
        rootTimeNode: null,
        animatedShapeIds: [],
        animationCount: 0,
        animationTypes: {},
      };
    }
    const counts = countAnimations(timing);
    const animatedShapeIds = extractAnimatedShapeIds(timing);

    return {
      rootTimeNode: timing.rootTimeNode,
      animatedShapeIds,
      animationCount: counts.total,
      animationTypes: counts.types,
    };
  } catch {
    return {
      rootTimeNode: null,
      animatedShapeIds: [],
      animationCount: 0,
      animationTypes: {},
    };
  }
}

function findTimingElement(doc: { children: readonly unknown[] }): XmlElement | undefined {
  for (const child of doc.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    const timing = getChild(child, "p:timing");
    if (timing) {
      return timing;
    }
  }
  return undefined;
}

function countAnimations(timing: ReturnType<typeof parseTiming>): { total: number; types: Record<string, number> } {
  const types: Record<string, number> = {};
  let total = 0;

  function countNodes(node: { type: string; children?: readonly { type: string }[] }): void {
    total++;
    types[node.type] = (types[node.type] ?? 0) + 1;
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        countNodes(child as { type: string; children?: readonly { type: string }[] });
      }
    }
  }

  if (timing?.rootTimeNode) {
    countNodes(timing.rootTimeNode as { type: string; children?: readonly { type: string }[] });
  }

  return { total, types };
}

function extractAnimatedShapeIds(timing: ReturnType<typeof parseTiming>): string[] {
  const ids = new Set<string>();

  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.target && typeof n.target === "object") {
      const t = n.target as Record<string, unknown>;
      if (t.shapeId) {
        ids.add(String(t.shapeId));
      }
    }
    if (Array.isArray(n.children)) {
      n.children.forEach(traverse);
    }
  }

  if (timing?.rootTimeNode) {
    traverse(timing.rootTimeNode);
  }

  return Array.from(ids);
}
