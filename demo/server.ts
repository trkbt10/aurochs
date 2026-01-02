#!/usr/bin/env bun
/**
 * @file Demo server for live PPTX viewing
 * Browse and view PPTX files with on-the-fly parsing
 */

import { Hono } from "hono";
import * as fs from "node:fs";
import * as path from "node:path";
import JSZip from "jszip";
import type { PresentationFile, SlideSize } from "../src/pptx";
import { openPresentation } from "../src/pptx";
import { parseTiming } from "../src/pptx/parser/timing-parser";
import { getChild, isXmlElement, parseXml, type XmlElement } from "../src/xml";
const app = new Hono();

const FIXTURE_DIRS = ["fixtures/poi-test-data/test-data/slideshow", "fixtures/poi-test-data/test-data/xmldsign"];

// Serve animation player script
app.get("/animation-player.js", (c) => {
  const scriptPath = path.resolve(import.meta.dir, "animation-player.js");
  const content = fs.readFileSync(scriptPath, "utf-8");
  return c.text(content, 200, { "Content-Type": "application/javascript" });
});

/**
 * Find p:timing element in slide content
 */
function findTimingElement(doc: { children: readonly unknown[] }): XmlElement | undefined {
  for (const child of doc.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    // p:sld > p:timing
    const timing = getChild(child, "p:timing");
    if (timing) {
      return timing;
    }
  }
  return undefined;
}

/**
 * Count animation nodes in timing tree
 */
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

type FileCache = Map<string, { text: string; buffer: ArrayBuffer }>;

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

function findPptxFiles(): Array<{ name: string; path: string; dir: string }> {
  const files: Array<{ name: string; path: string; dir: string }> = [];

  for (const dir of FIXTURE_DIRS) {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) continue;

    const entries = fs.readdirSync(fullDir);
    for (const entry of entries) {
      if (entry.endsWith(".pptx")) {
        files.push({
          name: entry,
          path: path.join(fullDir, entry),
          dir: path.basename(dir),
        });
      }
    }
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

// Index page - list all PPTX files
app.get("/", (c) => {
  const files = findPptxFiles();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PPTX Live Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
    }
    .header {
      background: #16213e;
      padding: 20px;
      border-bottom: 1px solid #0f3460;
    }
    .header h1 { font-size: 24px; font-weight: 500; }
    .header p { color: #888; margin-top: 5px; }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .stats {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat {
      background: #16213e;
      padding: 15px 20px;
      border-radius: 8px;
      border: 1px solid #0f3460;
    }
    .stat-value { font-size: 28px; font-weight: bold; color: #e94560; }
    .stat-label { color: #888; font-size: 12px; text-transform: uppercase; }
    .file-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 10px;
    }
    .file-item {
      background: #16213e;
      border: 1px solid #0f3460;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
    }
    .file-item:hover {
      border-color: #e94560;
      transform: translateY(-2px);
    }
    .file-item a {
      color: #fff;
      text-decoration: none;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-dir {
      color: #888;
      font-size: 11px;
      background: #0f3460;
      padding: 2px 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>PPTX Live Demo</h1>
      <p>Click on a file to parse and view it in real-time</p>
    </div>
  </div>
  <div class="container">
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${files.length}</div>
        <div class="stat-label">PPTX Files</div>
      </div>
    </div>
    <div class="file-grid">
      ${files
        .map(
          (f) => `
        <div class="file-item">
          <a href="/view/${encodeURIComponent(f.name)}">${f.name}</a>
          <span class="file-dir">${f.dir}</span>
        </div>`,
        )
        .join("")}
    </div>
  </div>
</body>
</html>`;

  return c.html(html);
});

// View a specific PPTX file
app.get("/view/:filename", async (c) => {
  const filename = decodeURIComponent(c.req.param("filename"));
  const files = findPptxFiles();
  const file = files.find((f) => f.name === filename);

  if (!file) {
    return c.html(`<h1>File not found: ${filename}</h1>`, 404);
  }

  try {
    const startTime = performance.now();

    // Read and parse PPTX
    const pptxBuffer = fs.readFileSync(file.path);
    const jszip = await JSZip.loadAsync(pptxBuffer);
    const cache = await preloadZipFiles(jszip);
    const presentationFile = createPresentationFile(cache);

    // Open presentation using new API
    const presentation = openPresentation(presentationFile);
    const slideSize: SlideSize = presentation.size;
    const slideInfos = presentation.list();

    const endTime = performance.now();
    const parseTime = Math.round(endTime - startTime);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename} - PPTX Viewer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
    }
    .header {
      background: #16213e;
      padding: 15px 20px;
      border-bottom: 1px solid #0f3460;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .back-btn {
      color: #e94560;
      text-decoration: none;
      font-size: 14px;
    }
    .back-btn:hover { text-decoration: underline; }
    .header h1 { font-size: 16px; font-weight: 500; }
    .header-right {
      display: flex;
      gap: 20px;
      font-size: 13px;
      color: #888;
    }
    .header-right span { color: #e94560; }
    .slide-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 30px 20px;
    }
    .slide-card {
      background: #16213e;
      border: 1px solid #0f3460;
      border-radius: 8px;
      padding: 20px;
      width: 100%;
      max-width: 800px;
    }
    .slide-card h2 {
      font-size: 14px;
      font-weight: 500;
      color: #e94560;
    }
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .anim-link {
      font-size: 12px;
      color: #58a6ff;
      text-decoration: none;
    }
    .anim-link:hover {
      text-decoration: underline;
    }
    .anim-info {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .anim-count {
      background: #0f3460;
      color: #4ade80;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .anim-types {
      color: #888;
      font-family: monospace;
    }
    .slide-wrapper {
      background: #fff;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .slide-wrapper .slide {
      transform-origin: top left;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <a href="/" class="back-btn">&larr; Back</a>
      <h1>${filename}</h1>
    </div>
    <div class="header-right">
      <div>Slides: <span>${presentation.count}</span></div>
      <div>Size: <span>${slideSize.width}x${slideSize.height}</span></div>
      <div>App Version: <span>${presentation.appVersion ?? "N/A"}</span></div>
      <div>Parsed in: <span>${parseTime}ms</span></div>
    </div>
  </div>
  <div class="slide-container">
    ${slideInfos
      .map((info) => {
        const slide = presentation.getSlide(info.number);
        const slideSvg = slide.renderSVG();
        const scale = Math.min(760 / slideSize.width, 1);

        // Parse timing/animation info from slide XML
        const slideXml = cache.get(`ppt/slides/slide${info.number}.xml`)?.text;
        let animInfo = "";
        if (slideXml) {
          try {
            const doc = parseXml(slideXml);
            const timingEl = findTimingElement(doc);
            if (timingEl) {
              const timing = parseTiming(timingEl);
              const counts = countAnimations(timing);
              const typeList = Object.entries(counts.types)
                .map(([t, c]) => `${t}:${c}`)
                .join(", ");
              animInfo = `
                <div class="anim-info">
                  <span class="anim-count">${counts.total} animations</span>
                  <span class="anim-types">${typeList}</span>
                </div>`;
            }
          } catch {
            // Ignore timing parse errors
          }
        }

        return `
      <div class="slide-card">
        <div class="slide-header">
          <h2>Slide ${info.number}</h2>
          ${animInfo ? `<a href="/anim/${encodeURIComponent(filename)}/${info.number}" class="anim-link">View Animations</a>` : ""}
        </div>
        ${animInfo}
        <div class="slide-wrapper" style="width:${slideSize.width * scale}px;height:${slideSize.height * scale}px;">
          <div style="transform:scale(${scale});transform-origin:left top;">${slideSvg}</div>
        </div>
      </div>`;
      })
      .join("")}
  </div>
</body>
</html>`;

    return c.html(html);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return c.html(
      `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Error - ${filename}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #1a1a2e;
      color: #eee;
      padding: 40px;
    }
    .error-box {
      background: #2d1b1b;
      border: 1px solid #5c2828;
      border-radius: 8px;
      padding: 20px;
      max-width: 600px;
    }
    h1 { color: #e94560; margin-bottom: 10px; }
    pre { color: #ff8a8a; white-space: pre-wrap; }
    a { color: #e94560; }
  </style>
</head>
<body>
  <div class="error-box">
    <h1>Error parsing ${filename}</h1>
    <pre>${errorMessage}</pre>
    <p style="margin-top: 20px;"><a href="/">&larr; Back to list</a></p>
  </div>
</body>
</html>`,
      500,
    );
  }
});

// Animation viewer for specific slide
app.get("/anim/:filename/:slide", async (c) => {
  const filename = decodeURIComponent(c.req.param("filename"));
  const slideNum = parseInt(c.req.param("slide"), 10);
  const files = findPptxFiles();
  const file = files.find((f) => f.name === filename);

  if (!file) {
    return c.html(`<h1>File not found: ${filename}</h1>`, 404);
  }

  try {
    const pptxBuffer = fs.readFileSync(file.path);
    const jszip = await JSZip.loadAsync(pptxBuffer);
    const cache = await preloadZipFiles(jszip);
    const presentationFile = createPresentationFile(cache);
    const presentation = openPresentation(presentationFile);
    const slideSize = presentation.size;

    if (slideNum < 1 || slideNum > presentation.count) {
      return c.html(`<h1>Slide ${slideNum} not found</h1>`, 404);
    }

    const slide = presentation.getSlide(slideNum);
    const slideHtml = slide.renderHTML();

    // Parse timing
    const slideXml = cache.get(`ppt/slides/slide${slideNum}.xml`)?.text;
    let timingData = null;
    let timingTree = "";

    if (slideXml) {
      const doc = parseXml(slideXml);
      const timingEl = findTimingElement(doc);
      if (timingEl) {
        timingData = parseTiming(timingEl);
        timingTree = renderTimingTree(timingData);
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animation Viewer - ${filename} Slide ${slideNum}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      min-height: 100vh;
    }
    .header {
      background: #161b22;
      padding: 12px 20px;
      border-bottom: 1px solid #30363d;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .back-btn { color: #58a6ff; text-decoration: none; font-size: 14px; }
    .header h1 { font-size: 16px; font-weight: 500; }
    .nav-btns { display: flex; gap: 8px; }
    .nav-btn {
      background: #21262d;
      border: 1px solid #30363d;
      color: #c9d1d9;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .nav-btn:hover { background: #30363d; }
    .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .main {
      display: grid;
      grid-template-columns: 1fr 400px;
      height: calc(100vh - 50px);
    }
    .slide-panel {
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0d1117;
      overflow: auto;
    }
    .slide-container {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      overflow: hidden;
      position: relative;
    }
    .slide-html {
      width: ${slideSize.width}px;
      height: ${slideSize.height}px;
      transform-origin: top left;
    }
    .timing-panel {
      background: #161b22;
      border-left: 1px solid #30363d;
      overflow-y: auto;
      padding: 16px;
    }
    .timing-panel h2 {
      font-size: 14px;
      color: #58a6ff;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #30363d;
    }
    .timing-tree {
      font-family: 'SF Mono', Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
    }
    .tree-node {
      margin-left: 16px;
      border-left: 1px solid #30363d;
      padding-left: 12px;
    }
    .tree-node:first-child { margin-top: 8px; }
    .node-type {
      color: #ff7b72;
      font-weight: 600;
    }
    .node-type.parallel { color: #a5d6ff; }
    .node-type.sequence { color: #7ee787; }
    .node-type.animate { color: #ffa657; }
    .node-type.set { color: #d2a8ff; }
    .node-type.animateEffect { color: #f778ba; }
    .node-type.animateMotion { color: #79c0ff; }
    .node-attr {
      color: #8b949e;
      font-size: 11px;
    }
    .node-target {
      color: #7ee787;
      background: rgba(126, 231, 135, 0.1);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .no-timing {
      color: #8b949e;
      font-style: italic;
    }
    .playback-controls {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #30363d;
    }
    .play-btn {
      background: #238636;
      border: none;
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .play-btn:hover { background: #2ea043; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <a href="/view/${encodeURIComponent(filename)}" class="back-btn">&larr; Back to slides</a>
      <h1>${filename} - Slide ${slideNum}</h1>
    </div>
    <div class="nav-btns">
      <button class="nav-btn" ${slideNum <= 1 ? "disabled" : ""} onclick="navigateSlide(${slideNum - 1})">&larr; Prev</button>
      <button class="nav-btn" ${slideNum >= presentation.count ? "disabled" : ""} onclick="navigateSlide(${slideNum + 1})">Next &rarr;</button>
      <script>
        function navigateSlide(num) {
          const url = new URL('/anim/${encodeURIComponent(filename)}/' + num, location.origin);
          url.search = location.search; // Preserve query params (auto, etc.)
          location.href = url.toString();
        }
      </script>
    </div>
  </div>
  <div class="main">
    <div class="slide-panel">
      <div class="slide-container" id="slideContainer">
        <div class="slide-html" id="slideContent">${slideHtml}</div>
      </div>
    </div>
    <div class="timing-panel">
      <h2>Animation Timeline</h2>
      ${timingTree || '<p class="no-timing">No animations on this slide</p>'}
      ${
        timingData
          ? `
      <div class="playback-controls">
        <button class="play-btn" onclick="playAnimations()">Play</button>
        <button class="nav-btn" onclick="player.resetAnimatedShapes();">Reset</button>
        <button class="nav-btn" onclick="showAllShapes()">Show All</button>
        <label style="margin-left:12px;font-size:12px;color:#8b949e;cursor:pointer;">
          <input type="checkbox" id="autoPlay" onchange="toggleAutoPlay(this.checked)"> Auto
        </label>
      </div>
      <div id="debugLog" style="margin-top:12px;font-size:11px;color:#8b949e;max-height:200px;overflow-y:auto;"></div>`
          : ""
      }
    </div>
  </div>
  <script src="/animation-player.js"></script>
  <script>
    // Scale slide to fit
    const container = document.getElementById('slideContainer');
    const content = document.getElementById('slideContent');
    const maxWidth = window.innerWidth - 450;
    const maxHeight = window.innerHeight - 100;
    const scaleX = maxWidth / ${slideSize.width};
    const scaleY = maxHeight / ${slideSize.height};
    const scale = Math.min(scaleX, scaleY, 1);
    content.style.transform = 'scale(' + scale + ')';
    container.style.width = (${slideSize.width} * scale) + 'px';
    container.style.height = (${slideSize.height} * scale) + 'px';

    // Timing data
    const timingData = ${timingData ? JSON.stringify(timingData) : "null"};
    const debugLog = document.getElementById('debugLog');

    function log(msg) {
      console.log(msg);
      if (debugLog) {
        debugLog.innerHTML += msg + '<br>';
        debugLog.scrollTop = debugLog.scrollHeight;
      }
    }

    // Find shape element by OOXML ID
    function findShape(shapeId) {
      const el = document.querySelector('[data-ooxml-id="' + shapeId + '"]');
      log('Finding shape ' + shapeId + ': ' + (el ? 'found' : 'NOT FOUND'));
      return el;
    }

    // Create player instance using external animation engine
    const player = PptxAnimationPlayer.createPlayer({
      findElement: findShape,
      log: log
    });

    // Set timing data for reset functionality
    player.setTimingData(timingData);

    // Initial state: hide animated elements (presentation mode)
    player.resetAnimatedShapes();

    // Show all shapes (no animation)
    function showAllShapes() {
      const shapes = document.querySelectorAll('[data-ooxml-id]');
      log('Showing ' + shapes.length + ' shapes');
      shapes.forEach(el => player.showElement(el));
    }

    // Play animations using the animation player
    async function playAnimations() {
      await player.play(timingData);
    }

    // Auto-play toggle
    let autoPlayEnabled = new URLSearchParams(location.search).has('auto');
    function toggleAutoPlay(enabled) {
      autoPlayEnabled = enabled;
      const url = new URL(location.href);
      if (enabled) {
        url.searchParams.set('auto', '1');
      } else {
        url.searchParams.delete('auto');
      }
      history.replaceState({}, '', url);
      if (enabled) playAnimations();
    }

    // Check URL param and auto-play on load
    if (autoPlayEnabled) {
      document.getElementById('autoPlay').checked = true;
      setTimeout(() => playAnimations(), 500);
    }
  </script>
</body>
</html>`;

    return c.html(html);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return c.html(`<h1>Error: ${errorMessage}</h1>`, 500);
  }
});

/**
 * Render timing tree as HTML
 */
function renderTimingTree(timing: ReturnType<typeof parseTiming>): string {
  if (!timing?.rootTimeNode) return "";

  function renderNode(node: unknown, depth: number = 0): string {
    if (!node || typeof node !== "object") return "";
    const n = node as Record<string, unknown>;
    const type = String(n.type ?? "unknown");
    const children = Array.isArray(n.children) ? n.children : [];

    let attrs: string[] = [];
    if (n.duration !== undefined) attrs.push(`dur:${n.duration}`);
    if (n.delay !== undefined && n.delay !== 0) attrs.push(`delay:${n.delay}`);
    if (n.presetId !== undefined) attrs.push(`preset:${n.presetId}`);
    if (n.presetClass !== undefined) attrs.push(`class:${n.presetClass}`);

    // Target info
    let targetInfo = "";
    if (n.target && typeof n.target === "object") {
      const t = n.target as Record<string, unknown>;
      if (t.shapeId) targetInfo = `<span class="node-target">shape:${t.shapeId}</span>`;
    }

    // Attribute names
    if (Array.isArray(n.attributeNames) && n.attributeNames.length > 0) {
      attrs.push(`attrs:[${n.attributeNames.join(",")}]`);
    }

    const attrStr = attrs.length > 0 ? ` <span class="node-attr">${attrs.join(" ")}</span>` : "";
    const childrenHtml = children.map((c) => renderNode(c, depth + 1)).join("");

    return `<div class="tree-node">
      <span class="node-type ${type}">${type}</span>${attrStr} ${targetInfo}
      ${childrenHtml}
    </div>`;
  }

  return `<div class="timing-tree">${renderNode(timing.rootTimeNode)}</div>`;
}

const port = 6874;
console.log(`PPTX Demo Server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
