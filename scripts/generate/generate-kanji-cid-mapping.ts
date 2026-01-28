/**
 * Script to generate kanji CID-to-Unicode mappings from Adobe CMap resources
 *
 * Usage: bun run scripts/generate/generate-kanji-cid-mapping.ts --cmapUrl <url> --output <path>
 *
 * This script:
 * 1. Downloads UniJIS-UCS2-H from Adobe's cmap-resources
 * 2. Parses the CMap format to extract Unicode → CID mappings
 * 3. Reverses to CID → Unicode mappings
 * 4. Generates TypeScript code for kanji range (CJK Unified Ideographs)
 */

type Args = {
  readonly cmapUrl: string;
  readonly outputPath: string;
};

const DEFAULT_CMAP_URL =
  "https://raw.githubusercontent.com/adobe-type-tools/cmap-resources/master/Adobe-Japan1-7/CMap/UniJIS-UCS2-H";

// CJK Unified Ideographs range: U+4E00 - U+9FFF
const CJK_START = 0x4e00;
const CJK_END = 0x9fff;

function parseArgs(argv: readonly string[]): Args {
  const args = [...argv];
  let cmapUrl: string | null = null;
  let outputPath: string | null = null;

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) {break;}

    if (arg === "--cmapUrl") {
      const value = args.shift();
      if (!value) {throw new Error("--cmapUrl requires a value");}
      cmapUrl = value;
      continue;
    }
    if (arg === "--output") {
      const value = args.shift();
      if (!value) {throw new Error("--output requires a value");}
      outputPath = value;
      continue;
    }

    throw new Error(`Unknown arg: ${arg}`);
  }

  if (!cmapUrl || !outputPath) {
    throw new Error(
      [
        'Missing required args: "--cmapUrl" and "--output".',
        "",
        "Example:",
        `  bun run scripts/generate/generate-kanji-cid-mapping.ts --cmapUrl ${DEFAULT_CMAP_URL} --output packages/@oxen/pdf/src/domain/font/japan1-kanji-mappings.ts`,
      ].join("\n"),
    );
  }

  return { cmapUrl, outputPath };
}

async function fetchCMap(cmapUrl: string): Promise<string> {
  console.log("Fetching CMap from:", cmapUrl);
  const response = await fetch(cmapUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch CMap: ${response.status}`);
  }
  return response.text();
}

type CIDMapping = {
  cid: number;
  unicode: number;
};

function parseCMap(content: string): CIDMapping[] {
  const mappings: CIDMapping[] = [];

  // Parse cidrange sections: <START> <END> CID
  // Format: beginbfrange ... endbfrange sections
  const rangeRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(\d+)/g;
  let match: RegExpExecArray | null;

  while ((match = rangeRegex.exec(content)) !== null) {
    const startUnicode = parseInt(match[1], 16);
    const endUnicode = parseInt(match[2], 16);
    const startCID = parseInt(match[3], 10);

    for (let i = 0; i <= endUnicode - startUnicode; i++) {
      const unicode = startUnicode + i;
      const cid = startCID + i;

      // Only include CJK Unified Ideographs (漢字)
      if (unicode >= CJK_START && unicode <= CJK_END) {
        mappings.push({ cid, unicode });
      }
    }
  }

  return mappings;
}

function generateTypeScript(mappings: CIDMapping[], cmapUrl: string): string {
  // Sort by CID
  mappings.sort((a, b) => a.cid - b.cid);

  // Encode as binary: each mapping = 4 bytes (CID: uint16, Unicode: uint16)
  const buffer = new ArrayBuffer(mappings.length * 4);
  const view = new DataView(buffer);
  mappings.forEach(({ cid, unicode }, i) => {
    view.setUint16(i * 4, cid, false); // big-endian
    view.setUint16(i * 4 + 2, unicode, false);
  });

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  const base64 = Buffer.from(bytes).toString("base64");

  return `/**
 * Kanji (CJK Unified Ideographs) CID-to-Unicode mappings for Adobe-Japan1
 *
 * Auto-generated from Adobe CMap resources (UniJIS-UCS2-H)
 * Source: ${cmapUrl}
 *
 * Coverage: U+4E00 - U+9FFF (CJK Unified Ideographs)
 * Total mappings: ${mappings.length}
 * Format: Base64-encoded binary (4 bytes per mapping: CID uint16 + Unicode uint16)
 */

// prettier-ignore
const D="${base64}";

export const JAPAN1_KANJI_MAPPINGS: ReadonlyMap<number, string> = (() => {
  const m = new Map<number, string>();
  const b = Uint8Array.from(atob(D), c => c.charCodeAt(0));
  const v = new DataView(b.buffer);
  for (let i = 0; i < b.length; i += 4) {
    m.set(v.getUint16(i, false), String.fromCodePoint(v.getUint16(i + 2, false)));
  }
  return m;
})();
`;
}

async function main() {
  try {
    const { cmapUrl, outputPath } = parseArgs(process.argv.slice(2));
    const content = await fetchCMap(cmapUrl);
    console.log("CMap fetched, parsing...");

    const mappings = parseCMap(content);
    console.log(`Found ${mappings.length} kanji mappings`);

    const tsCode = generateTypeScript(mappings, cmapUrl);

    // Write to file
    await Bun.write(outputPath, tsCode);
    console.log(`Generated: ${outputPath}`);

    // Stats
    const minCID = Math.min(...mappings.map((m) => m.cid));
    const maxCID = Math.max(...mappings.map((m) => m.cid));
    console.log(`CID range: ${minCID} - ${maxCID}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
