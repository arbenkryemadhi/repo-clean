#!/usr/bin/env node
/* repo-clean: remove common repo build outputs and caches */

const fs = require("node:fs");
const path = require("node:path");

const argv = process.argv.slice(2);
const args = new Set(argv);

const dryRun = args.has("--dry-run");
const help = args.has("--help") || args.has("-h");

const flagAll = args.has("--all");
const keepNm = args.has("--keep-nm");

const flagNodeModules = args.has("--node-modules");
const flagPmCache = args.has("--pm-cache");
const flagLogs = args.has("--logs");
const flagEditor = args.has("--editor");
const flagTmp = args.has("--tmp");

if (help) {
  console.log(`repo-clean

Usage:
  repo-clean [--dry-run] [--node-modules] [--pm-cache] [--logs] [--editor] [--tmp]
  repo-clean --all [--keep-nm] [--dry-run]

Defaults (no flags):
  Removes build outputs + framework caches:
    dist, build, coverage, .next, .turbo, .vite, .parcel-cache, .cache

Flags:
  --dry-run        Print what would be removed
  --node-modules   Also remove node_modules
  --pm-cache       Also remove package manager caches/stores (Yarn/Pnpm artifacts)
  --logs           Also remove common debug log files in the repo root
  --editor         Also remove editor/IDE folders (.vscode, .idea)
  --tmp            Also remove tmp/temp folders
  --all            Default + all flags above
  --keep-nm        With --all, keep node_modules (do not remove it)
`);
  process.exit(0);
}

const cwd = process.cwd();

const defaultTargets = [
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".vite",
  ".parcel-cache",
  ".cache",
];

const editorTargets = [".vscode", ".idea"];
const tmpTargets = ["tmp", "temp"];

// Mix of directories + files that can exist in a repo for Yarn/Pnpm setups.
// (No globs; exact known paths only.)
const pmCacheTargets = [
  ".yarn/cache",
  ".yarn/unplugged",
  ".yarn/install-state.gz",
  ".pnp.cjs",
  ".pnp.loader.mjs",
  ".pnpm-store",
];

// Log file prefixes to delete in repo root (covers e.g. npm-debug.log.123)
const logPrefixes = [
  "npm-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",
  "lerna-debug.log",
];

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function removePath(absPath) {
  if (!exists(absPath)) return false;

  if (dryRun) {
    console.log(`[dry-run] would remove: ${absPath}`);
    return true;
  }

  fs.rmSync(absPath, {
    recursive: true,
    force: true,
    maxRetries: 2,
    retryDelay: 50,
  });
  console.log(`removed: ${absPath}`);
  return true;
}

function gatherRootLogs() {
  const found = [];
  let entries;
  try {
    entries = fs.readdirSync(cwd, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const name = ent.name;
    if (logPrefixes.some((p) => name === p || name.startsWith(p))) {
      found.push(name);
    }
  }
  return found;
}

// Determine what to remove
const targets = new Set(defaultTargets);

const includePmCache = flagAll || flagPmCache;
const includeLogs = flagAll || flagLogs;
const includeEditor = flagAll || flagEditor;
const includeTmp = flagAll || flagTmp;

// node_modules inclusion logic:
// - default: off
// - --node-modules: on
// - --all: on, unless --keep-nm is also present
const includeNodeModules = (flagAll || flagNodeModules) && !(flagAll && keepNm);

if (includePmCache) for (const t of pmCacheTargets) targets.add(t);
if (includeEditor) for (const t of editorTargets) targets.add(t);
if (includeTmp) for (const t of tmpTargets) targets.add(t);
if (includeNodeModules) targets.add("node_modules");

// Remove fixed targets
let removedCount = 0;

for (const rel of Array.from(targets).sort()) {
  const abs = path.join(cwd, rel);
  if (removePath(abs)) removedCount += 1;
}

// Remove root log files (if enabled)
if (includeLogs) {
  const logs = gatherRootLogs();
  for (const name of logs.sort()) {
    const abs = path.join(cwd, name);
    if (removePath(abs)) removedCount += 1;
  }
}

const nmNote =
  flagAll && keepNm
    ? " (kept node_modules)"
    : includeNodeModules
      ? " (includes node_modules)"
      : "";
const mode = dryRun ? "done (dry-run)" : "done";
console.log(
  `${mode}. ${dryRun ? "would remove" : "removed"} ${removedCount} item(s).${nmNote}`,
);
