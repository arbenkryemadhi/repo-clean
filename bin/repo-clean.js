#!/usr/bin/env node
/* repo-clean: remove common repo junk directories */

const fs = require("node:fs");
const path = require("node:path");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const help = args.has("--help") || args.has("-h");

if (help) {
  console.log(`repo-clean

Usage:
  repo-clean [--dry-run]

Removes common directories:
  node_modules, dist, build, coverage, .next, .turbo, .cache, .vite, .parcel-cache
`);
  process.exit(0);
}

const targets = [
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  ".vite",
  ".parcel-cache",
];

const cwd = process.cwd();

let removed = 0;
for (const t of targets) {
  const p = path.join(cwd, t);
  if (!fs.existsSync(p)) continue;

  if (dryRun) {
    console.log(`[dry-run] would remove: ${p}`);
    continue;
  }

  fs.rmSync(p, { recursive: true, force: true });
  console.log(`removed: ${p}`);
  removed += 1;
}

if (!dryRun) console.log(`done. removed ${removed} item(s).`);
