/**
 * Syncs version from root package.json to publish packages.
 * Run this after `changeset version` to keep publish packages in sync.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

interface PackageJson {
  name: string;
  version: string;
  [key: string]: unknown;
}

interface PluginJson {
  version: string;
  [key: string]: unknown;
}

interface MarketplaceJson {
  metadata: { version: string; [key: string]: unknown };
  plugins: Array<{ version: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function main(): void {
  const rootPkg = readJson<PackageJson>(join(ROOT, "package.json"));
  const version = rootPkg.version;

  console.log(`Syncing version: ${version}`);

  // Publish packages
  const publishPackages = [
    "publish/aurochs/package.json",
    "publish/aurochs-office-viewer/package.json",
  ];

  for (const rel of publishPackages) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) {
      console.log(`  Skip (not found): ${rel}`);
      continue;
    }
    const pkg = readJson<PackageJson>(path);
    if (pkg.version !== version) {
      pkg.version = version;
      writeJson(path, pkg);
      console.log(`  Updated: ${rel}`);
    } else {
      console.log(`  Already up-to-date: ${rel}`);
    }
  }

  // Claude plugin files
  const pluginPath = join(ROOT, ".claude-plugin/plugin.json");
  if (existsSync(pluginPath)) {
    const plugin = readJson<PluginJson>(pluginPath);
    if (plugin.version !== version) {
      plugin.version = version;
      writeJson(pluginPath, plugin);
      console.log(`  Updated: .claude-plugin/plugin.json`);
    }
  }

  const marketplacePath = join(ROOT, ".claude-plugin/marketplace.json");
  if (existsSync(marketplacePath)) {
    const marketplace = readJson<MarketplaceJson>(marketplacePath);
    let updated = false;
    if (marketplace.metadata.version !== version) {
      marketplace.metadata.version = version;
      updated = true;
    }
    for (const pl of marketplace.plugins) {
      if (pl.version !== version) {
        pl.version = version;
        updated = true;
      }
    }
    if (updated) {
      writeJson(marketplacePath, marketplace);
      console.log(`  Updated: .claude-plugin/marketplace.json`);
    }
  }

  console.log("Done.");
}

main();
