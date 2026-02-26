#!/usr/bin/env node
/* repo-clean: remove common repo build outputs and caches */

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");

const argv = process.argv.slice(2);
const args = new Set(argv);

const allowedFlags = new Set([
  "--dry-run",
  "--help",
  "-h",
  "--version",
  "-v",
  "--force",
  "--all",
  "--keep-nm",
  "--node-modules",
  "--pm-cache",
  "--logs",
  "--editor",
  "--tmp",
]);

function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function getClosestFlag(input) {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const flag of allowedFlags) {
    const dist = editDistance(input, flag);
    if (dist < bestDistance) {
      best = flag;
      bestDistance = dist;
    }
  }

  if (!best) return null;
  if (bestDistance > 3) return null;
  return best;
}

const unknownFlags = argv.filter(
  (arg) => arg.startsWith("-") && !allowedFlags.has(arg),
);
if (unknownFlags.length > 0) {
  const unknownList = unknownFlags.join(", ");
  const flagLabel = unknownFlags.length === 1 ? "flag" : "flags";
  const suggestions = unknownFlags
    .map((flag) => {
      const suggestion = getClosestFlag(flag);
      return suggestion ? { flag, suggestion } : null;
    })
    .filter(Boolean);
  let suggestionText = "";
  if (suggestions.length === 1 && unknownFlags.length === 1) {
    suggestionText = ` Did you mean ${suggestions[0].suggestion}?`;
  } else if (suggestions.length > 0) {
    const pairs = suggestions.map(
      (item) => `${item.flag} -> ${item.suggestion}`,
    );
    suggestionText = ` Did you mean: ${pairs.join(", ")}?`;
  }
  console.error(
    `Unknown ${flagLabel}: ${unknownList}. This looks like a typo.${suggestionText} Run repo-clean --help for valid options.`,
  );
  process.exit(2);
}

const dryRun = args.has("--dry-run");
const help = args.has("--help") || args.has("-h");
const version = args.has("--version") || args.has("-v");
const force = args.has("--force");

const flagAll = args.has("--all");
const keepNm = args.has("--keep-nm");

const flagNodeModules = args.has("--node-modules");
const flagPmCache = args.has("--pm-cache");
const flagLogs = args.has("--logs");
const flagEditor = args.has("--editor");
const flagTmp = args.has("--tmp");

if (version) {
  console.log(require("../package.json").version);
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

async function confirmNodeModulesRemoval() {
  if (!process.stdin.isTTY) {
    let input = "";
    try {
      input = fs.readFileSync(0, "utf8");
    } catch {
      input = "";
    }
    const answer = input.trim().toLowerCase();
    return answer === "y" || answer === "yes";
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (
      await rl.question(
        "Safety check: this will remove node_modules. Are you sure? [y/N]: ",
      )
    )
      .trim()
      .toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function main() {
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
  const includeNodeModules =
    (flagAll || flagNodeModules) && !(flagAll && keepNm);

  if (includePmCache) for (const t of pmCacheTargets) targets.add(t);
  if (includeEditor) for (const t of editorTargets) targets.add(t);
  if (includeTmp) for (const t of tmpTargets) targets.add(t);
  if (includeNodeModules) targets.add("node_modules");

  if (includeNodeModules && !dryRun && !force) {
    const confirmed = await confirmNodeModulesRemoval();
    if (!confirmed) {
      console.log("Aborted. No files were removed.");
      process.exit(1);
    }
  }

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
}

main().catch((err) => {
  const msg = err && err.message ? err.message : String(err);
  console.error(`Error: ${msg}`);
  process.exit(1);
});
