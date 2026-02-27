#!/usr/bin/env node
/* repo-clean: remove common repo build outputs and caches */

const { parseCliArgs } = require("../lib/args");
const { buildCleanupPlan } = require("../lib/targets");
const { removeTargets, removeRootLogs } = require("../lib/cleanup");
const { confirmNodeModulesRemoval } = require("../lib/confirm");
const { version: packageVersion } = require("../package.json");

const argv = process.argv.slice(2);
const parsed = parseCliArgs(argv);

if (!parsed.ok) {
  console.error(parsed.error);
  process.exit(parsed.exitCode);
}

const { dryRun, help, version, force, flagAll, keepNm } = parsed.options;

if (version) {
  console.log(packageVersion);
  process.exit(0);
}

if (help) {
  console.log(`repo-clean

Usage:
  repo-clean [--dry-run] [--node-modules] [--pm-cache] [--logs] [--editor] [--tmp] [--force]
  repo-clean --all [--keep-nm] [--dry-run]
  repo-clean --version | -v

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
  --force          Skip confirmation prompt for node_modules removal
  --version, -v    Print CLI version
`);
  process.exit(0);
}

const cwd = process.cwd();

async function main() {
  const cleanupPlan = buildCleanupPlan(parsed.options);
  const { targets, includeLogs, includeNodeModules, logPrefixes } = cleanupPlan;

  if (includeNodeModules && !dryRun && !force) {
    const confirmed = await confirmNodeModulesRemoval();
    if (!confirmed) {
      console.log("Aborted. No files were removed.");
      process.exit(1);
    }
  }

  let removedCount = removeTargets(cwd, targets, dryRun);

  if (includeLogs) {
    removedCount += removeRootLogs(cwd, logPrefixes, dryRun);
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
}

main().catch((err) => {
  const msg = err && err.message ? err.message : String(err);
  console.error(`Error: ${msg}`);
  process.exit(1);
});
