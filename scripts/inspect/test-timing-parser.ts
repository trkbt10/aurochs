/**
 * @file Test timing parser with real PPTX files
 *
 * Usage: bun run scripts/inspect/test-timing-parser.ts <pptx-path>
 */

import { parseTiming } from "@aurochs-office/pptx/parser/timing-parser/index";
import { parseXml, isXmlElement, type XmlElement } from "@aurochs/xml";
import { requireFileExists, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

async function main() {
  const usage = "bun run scripts/inspect/test-timing-parser.ts <pptx-path>";
  const args = process.argv.slice(2);
  const filePath = requirePositionalArg({ args, index: 0, name: "pptx-path", usage });
  requireFileExists(filePath, usage);

  console.log(`Testing timing parser with: ${filePath}`);

  const { cache } = await loadPptxFile(filePath);
  const filePaths = Array.from(cache.keys());

  // Find all slide files
  const slideFiles = filePaths.filter((f) => f.match(/ppt\/slides\/slide\d+\.xml$/));
  console.log(`Found ${slideFiles.length} slides`);

  for (const slideFile of slideFiles) {
    const xml = cache.get(slideFile)?.text;
    if (!xml) {
      continue;
    }

    const doc = parseXml(xml);

    // Find p:timing element
    function findTiming(el: unknown): XmlElement | null {
      if (!isXmlElement(el)) {
        return null;
      }
      if (el.name === "p:timing") {
        return el;
      }
      for (const child of el.children) {
        const found = findTiming(child);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const timing = findTiming(doc.children[0]);

    if (timing) {
      console.log(`\n=== ${slideFile} ===`);
      const result = parseTiming(timing);
      console.log(JSON.stringify(result, null, 2));
    }
  }

  console.log("\nDone!");
}

main();
