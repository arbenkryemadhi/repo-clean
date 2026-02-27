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

const pmCacheTargets = [
  ".yarn/cache",
  ".yarn/unplugged",
  ".yarn/install-state.gz",
  ".pnp.cjs",
  ".pnp.loader.mjs",
  ".pnpm-store",
];

const logPrefixes = [
  "npm-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",
  "lerna-debug.log",
];

function buildCleanupPlan(options) {
  const targets = new Set(defaultTargets);

  const includePmCache = options.flagAll || options.flagPmCache;
  const includeLogs = options.flagAll || options.flagLogs;
  const includeEditor = options.flagAll || options.flagEditor;
  const includeTmp = options.flagAll || options.flagTmp;
  const includeNodeModules =
    (options.flagAll || options.flagNodeModules) &&
    !(options.flagAll && options.keepNm);

  if (includePmCache) {
    for (const target of pmCacheTargets) {
      targets.add(target);
    }
  }

  if (includeEditor) {
    for (const target of editorTargets) {
      targets.add(target);
    }
  }

  if (includeTmp) {
    for (const target of tmpTargets) {
      targets.add(target);
    }
  }

  if (includeNodeModules) {
    targets.add("node_modules");
  }

  return {
    targets,
    includeLogs,
    includeNodeModules,
    logPrefixes,
  };
}

module.exports = {
  buildCleanupPlan,
};
