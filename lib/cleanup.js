const fs = require("node:fs");
const path = require("node:path");

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function removePath(absPath, dryRun) {
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

function gatherRootLogs(cwd, logPrefixes) {
  const found = [];
  let entries;

  try {
    entries = fs.readdirSync(cwd, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (
      logPrefixes.some(
        (prefix) => entry.name === prefix || entry.name.startsWith(prefix),
      )
    ) {
      found.push(entry.name);
    }
  }

  return found;
}

function removeTargets(cwd, targets, dryRun) {
  let removedCount = 0;

  for (const rel of Array.from(targets).sort()) {
    const absPath = path.join(cwd, rel);
    if (removePath(absPath, dryRun)) {
      removedCount += 1;
    }
  }

  return removedCount;
}

function removeRootLogs(cwd, logPrefixes, dryRun) {
  let removedCount = 0;
  const logs = gatherRootLogs(cwd, logPrefixes);

  for (const name of logs.sort()) {
    const absPath = path.join(cwd, name);
    if (removePath(absPath, dryRun)) {
      removedCount += 1;
    }
  }

  return removedCount;
}

module.exports = {
  removeTargets,
  removeRootLogs,
};
